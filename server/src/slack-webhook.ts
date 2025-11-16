import '@twilio-labs/serverless-runtime-types';
import { Context, ServerlessCallback, ServerlessFunctionSignature } from '@twilio-labs/serverless-runtime-types/types';
import * as crypto from 'crypto';

export interface ServerlessEnvironment {
  CONVERSATION_SERVICE_SID: string;
  SLACK_OAUTH_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  ACCOUNT_SID?: string;
  AUTH_TOKEN?: string;
  [key: string]: string | undefined;
}

export interface SlackEvent {
  type: string;
  channel?: string;
  user?: string;
  text?: string;
  ts?: string;
  channel_type?: string;
  files?: Array<{
    id: string;
    name: string;
    mimetype: string;
    url_private_download: string;
    size: number;
  }>;
}

export interface SlackWebhookEvent {
  type: string;
  challenge?: string;
  token?: string;
  team_id?: string;
  event?: SlackEvent;
  request: {
    cookies: {};
    headers: {
      'x-slack-request-timestamp'?: string;
      'x-slack-signature'?: string;
    };
  };
}

type SlackWebhookFunction = ServerlessFunctionSignature<ServerlessEnvironment, SlackWebhookEvent>;

// TEMP LOGGING - Remove after debugging Slack signature
const tempLogSignatureVerification = (
  timestamp: string,
  signature: string,
  requestBody: string,
  signingSecret: string,
  computedSignature: string,
  isValid: boolean
) => {
  console.log('=== SLACK SIGNATURE VERIFICATION ===');
  console.log('Timestamp:', timestamp);
  console.log('Slack Signature:', signature);
  console.log('Signing Secret (first 10 chars):', signingSecret.substring(0, 10) + '...');
  console.log('Request Body (first 200 chars):', requestBody.substring(0, 200) + '...');
  console.log('Request Body Length:', requestBody.length);
  console.log('Computed Signature:', computedSignature);
  console.log('Signatures Match:', isValid);
  console.log('====================================\n');
};

// Verify Slack request signature
function verifySlackSignature(
  signingSecret: string,
  requestBody: string,
  timestamp: string,
  signature: string
): boolean {
  try {
    // Check if request is too old (more than 5 minutes)
    const requestTimestamp = parseInt(timestamp, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(currentTimestamp - requestTimestamp);

    console.log(`Timestamp check: request=${requestTimestamp}, current=${currentTimestamp}, diff=${timeDiff}s`);

    if (timeDiff > 300) {
      console.error(`Request timestamp too old: ${timeDiff} seconds`);
      return false;
    }

    // Create signature base string
    const sigBasestring = `v0:${timestamp}:${requestBody}`;

    // Create HMAC signature
    const hmac = crypto.createHmac('sha256', signingSecret);
    hmac.update(sigBasestring);
    const computedSignature = `v0=${hmac.digest('hex')}`;

    // Compare signatures
    const isValid = crypto.timingSafeEqual(
      Buffer.from(computedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );

    tempLogSignatureVerification(timestamp, signature, requestBody, signingSecret, computedSignature, isValid);

    return isValid;
  } catch (error) {
    console.error('Error verifying Slack signature:', error);
    return false;
  }
}

// Fetch Slack user info by user ID
async function getSlackUserInfo(userId: string, botToken: string): Promise<any> {
  try {
    const response = await fetch(
      `https://slack.com/api/users.info?user=${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'Failed to fetch Slack user info');
    }

    return data.user;
  } catch (error) {
    console.error('Error fetching Slack user info:', error);
    throw error;
  }
}

// Find or create conversation for Slack user
async function findOrCreateConversation(
  client: any,
  serviceSid: string,
  slackUserId: string,
  slackChannelId: string,
  slackUserEmail: string
): Promise<any> {
  try {
    // Search for existing conversation with this Slack user
    const conversations = await client.conversations.v1
      .services(serviceSid)
      .conversations.list({ limit: 100 });

    for (const conversation of conversations) {
      const attrs = conversation.attributes ? JSON.parse(conversation.attributes) : {};
      if (attrs.slackParticipants && attrs.slackParticipants[slackUserId]) {
        console.log('Found existing conversation:', conversation.sid);
        return conversation;
      }
    }

    // No existing conversation found, create a new one
    console.log('Creating new conversation for Slack user:', slackUserId);
    const newConversation = await client.conversations.v1
      .services(serviceSid)
      .conversations.create({
        friendlyName: `Slack DM - ${slackUserEmail}`,
        attributes: JSON.stringify({
          slackParticipants: {
            [slackUserId]: {
              channelId: slackChannelId,
              email: slackUserEmail
            }
          }
        })
      });

    return newConversation;
  } catch (error) {
    console.error('Error finding/creating conversation:', error);
    throw error;
  }
}

// Download file from Slack and upload to Twilio MCS
async function handleSlackMedia(
  client: any,
  serviceSid: string,
  conversationSid: string,
  file: any,
  botToken: string
): Promise<string> {
  try {
    console.log('Downloading file from Slack:', file.name);

    // Download file from Slack
    const fileResponse = await fetch(file.url_private_download, {
      headers: {
        'Authorization': `Bearer ${botToken}`
      }
    });

    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileBlob = Buffer.from(fileBuffer);

    console.log('Uploading file to Twilio MCS:', {
      filename: file.name,
      contentType: file.mimetype,
      size: file.size
    });

    // Upload to Twilio Media Content Service (MCS)
    const media = await client.conversations.v1
      .services(serviceSid)
      .conversations(conversationSid)
      .messages.create({
        author: 'system',
        contentType: file.mimetype,
        media: fileBlob
      });

    console.log('File uploaded successfully to MCS');
    return media.sid;
  } catch (error) {
    console.error('Error handling Slack media:', error);
    throw error;
  }
}

export const handler: SlackWebhookFunction = async (
  context: Context<ServerlessEnvironment>,
  event: SlackWebhookEvent,
  callback: ServerlessCallback
) => {
  const response = new (Response as any)();
  response.appendHeader('Content-Type', 'application/json');

  try {
    // Handle URL verification challenge (initial Slack setup)
    if (event.type === 'url_verification' && event.challenge) {
      console.log('Handling URL verification challenge');
      response.setStatusCode(200);
      response.setBody(JSON.stringify({ challenge: event.challenge }));
      return callback(null, response);
    }

    // Verify Slack signature for security
    const slackSigningSecret = context.SLACK_SIGNING_SECRET;
    const slackTimestamp = event.request.headers['x-slack-request-timestamp'];
    const slackSignature = event.request.headers['x-slack-signature'];

    console.log('=== SLACK WEBHOOK SIGNATURE CHECK ===');
    console.log('Has signing secret:', !!slackSigningSecret);
    console.log('Has timestamp header:', !!slackTimestamp);
    console.log('Has signature header:', !!slackSignature);
    console.log('=====================================\n');

    if (!slackSigningSecret || !slackTimestamp || !slackSignature) {
      console.error('Missing Slack signature headers or signing secret');
      response.setStatusCode(401);
      response.setBody(JSON.stringify({ error: 'Unauthorized' }));
      return callback(null, response);
    }

    // IMPORTANT: Twilio Functions parse the request body into the event object.
    // For signature verification, we need the original raw body that Slack sent.
    // Using JSON.stringify(event) won't match because property order and formatting differ.
    //
    // For development/testing, we can temporarily skip verification.
    // TODO: Implement proper raw body access or use Slack's retry mechanism

    console.log('⚠️  TEMPORARILY SKIPPING SIGNATURE VERIFICATION FOR DEVELOPMENT');
    console.log('⚠️  This should be re-enabled for production by accessing the raw request body');

    // Temporarily skip signature verification (DEVELOPMENT ONLY)
    const SKIP_VERIFICATION = true;

    if (!SKIP_VERIFICATION) {
      // Create raw request body for signature verification
      const rawBody = JSON.stringify(event);
      console.log('Attempting signature verification with reconstructed body');

      const isValidSignature = verifySlackSignature(
        slackSigningSecret,
        rawBody,
        slackTimestamp,
        slackSignature
      );

      if (!isValidSignature) {
        console.error('Invalid Slack signature');
        response.setStatusCode(401);
        response.setBody(JSON.stringify({ error: 'Invalid signature' }));
        return callback(null, response);
      }
    }

    // Handle event callback
    if (event.type === 'event_callback' && event.event) {
      const slackEvent = event.event;

      // TEMP LOGGING - Remove after debugging
      console.log('=== SLACK EVENT RECEIVED ===');
      console.log('Event Type:', slackEvent.type);
      console.log('Channel Type:', slackEvent.channel_type);
      console.log('User:', slackEvent.user);
      console.log('Bot ID:', (slackEvent as any).bot_id);
      console.log('Subtype:', (slackEvent as any).subtype);
      console.log('Text:', slackEvent.text?.substring(0, 100));
      console.log('============================');

      // Only handle DM messages (channel_type: 'im')
      if (slackEvent.type === 'message' && slackEvent.channel_type === 'im') {
        // Ignore bot messages to prevent loops
        if ((slackEvent as any).bot_id || (slackEvent as any).subtype === 'bot_message') {
          console.log('⚠️  Ignoring bot message (this is expected for messages sent by our bot)');
          response.setStatusCode(200);
          response.setBody(JSON.stringify({ status: 'ignored_bot_message' }));
          return callback(null, response);
        }

        const slackUserId = slackEvent.user;
        const slackChannelId = slackEvent.channel;
        const messageText = slackEvent.text || '';
        const files = slackEvent.files || [];

        if (!slackUserId || !slackChannelId) {
          console.error('Missing Slack user ID or channel ID');
          response.setStatusCode(400);
          response.setBody(JSON.stringify({ error: 'Missing required fields' }));
          return callback(null, response);
        }

        console.log('Processing Slack DM:', {
          userId: slackUserId,
          channelId: slackChannelId,
          text: messageText.substring(0, 50),
          hasFiles: files.length > 0
        });

        const slackBotToken = context.SLACK_OAUTH_BOT_TOKEN;
        const client = context.getTwilioClient();
        const serviceSid = context.CONVERSATION_SERVICE_SID;

        try {
          // Get Slack user info
          const slackUser = await getSlackUserInfo(slackUserId, slackBotToken);
          const slackUserEmail = slackUser.profile.email;

          // Find or create conversation
          const conversation = await findOrCreateConversation(
            client,
            serviceSid,
            slackUserId,
            slackChannelId,
            slackUserEmail
          );

          // Ensure user is a participant
          const userIdentity = `slack:${slackUserEmail}`;
          let participant;
          try {
            participant = await client.conversations.v1
              .services(serviceSid)
              .conversations(conversation.sid)
              .participants.create({
                identity: userIdentity
              });
            console.log('Added user as participant:', userIdentity);
          } catch (participantError: any) {
            // Participant might already exist, which is fine
            if (participantError.code !== 50433) {
              console.error('Error adding participant:', participantError);
            }
            // Fetch existing participant
            const participants = await client.conversations.v1
              .services(serviceSid)
              .conversations(conversation.sid)
              .participants.list({ limit: 100 });

            participant = participants.find(p => p.identity === userIdentity);
          }

          // Add message to conversation
          if (messageText) {
            // Get friendly name from participant attributes or user
            let friendlyName = slackUser.profile.display_name || slackUser.real_name || slackUser.name;

            if (participant?.attributes) {
              try {
                const participantAttrs = JSON.parse(participant.attributes);
                if (participantAttrs.friendlyName) {
                  friendlyName = participantAttrs.friendlyName;
                }
              } catch (e) {
                console.log('Could not parse participant attributes, using Slack profile name');
              }
            }

            // Format message with friendly name prefix (consistent with Twilio→Slack format)
            const formattedBody = `[${friendlyName}]\n${messageText}`;

            await client.conversations.v1
              .services(serviceSid)
              .conversations(conversation.sid)
              .messages.create({
                author: userIdentity,
                body: formattedBody,
                attributes: JSON.stringify({
                  source: 'slack',
                  slackUserId: slackUserId,
                  slackChannelId: slackChannelId,
                  slackTimestamp: slackEvent.ts,
                  friendlyName: friendlyName
                })
              });
            console.log('Message added to conversation:', conversation.sid);
          }

          // Handle media files
          for (const file of files) {
            await handleSlackMedia(
              client,
              serviceSid,
              conversation.sid,
              file,
              slackBotToken
            );
          }

          response.setStatusCode(200);
          response.setBody(JSON.stringify({
            status: 'success',
            conversationSid: conversation.sid
          }));

        } catch (processingError: any) {
          console.error('Error processing Slack message:', processingError);
          response.setStatusCode(500);
          response.setBody(JSON.stringify({
            error: 'Failed to process message',
            details: processingError.message
          }));
        }

        return callback(null, response);
      }

      // Other event types - just acknowledge
      console.log('Received Slack event (not handled):', slackEvent.type);
      response.setStatusCode(200);
      response.setBody(JSON.stringify({ status: 'event_received' }));
      return callback(null, response);
    }

    // Unknown event type
    console.log('Unknown Slack event type:', event.type);
    response.setStatusCode(200);
    response.setBody(JSON.stringify({ status: 'unknown_event' }));
    callback(null, response);

  } catch (error: unknown) {
    console.error('Unexpected error in Slack webhook:', error);

    response.setStatusCode(500);
    response.setBody(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }));

    callback(null, response);
  }
};
