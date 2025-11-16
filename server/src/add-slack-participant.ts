import '@twilio-labs/serverless-runtime-types';
import { Context, ServerlessCallback, ServerlessFunctionSignature } from '@twilio-labs/serverless-runtime-types/types';

export interface ServerlessEnvironment {
  CONVERSATION_SERVICE_SID: string;
  SLACK_OAUTH_BOT_TOKEN: string;
  ACCOUNT_SID?: string;
  AUTH_TOKEN?: string;
  [key: string]: string | undefined;
}

export interface AddSlackParticipantEvent {
  conversationSid: string;
  slackEmail: string;
  friendlyName?: string;
  request: {
    cookies: {};
    headers: {};
  };
}

export interface SlackUser {
  id: string;
  team_id: string;
  name: string;
  real_name: string;
  profile: {
    real_name: string;
    display_name: string;
    email: string;
    image_72: string;
  };
}

export interface SlackApiResponse {
  ok: boolean;
  user?: SlackUser;
  error?: string;
}

type AddSlackParticipantFunction = ServerlessFunctionSignature<ServerlessEnvironment, AddSlackParticipantEvent>;

// TEMP LOGGING - Remove after debugging Slack integration
const tempLogSlackApiCall = (
  apiName: string,
  url: string,
  requestData?: any,
  responseStatus?: number,
  responseData?: any,
  error?: any
) => {
  console.log(`=== SLACK API CALL: ${apiName} ===`);
  console.log('URL:', url);
  if (requestData) {
    console.log('Request Data:', JSON.stringify(requestData, null, 2));
  }
  if (responseStatus) {
    console.log('Response Status:', responseStatus);
  }
  if (responseData) {
    console.log('Response Data:', JSON.stringify(responseData, null, 2));
    if (responseData.error) {
      console.log('❌ API ERROR:', responseData.error);
      if (responseData.error === 'missing_scope') {
        console.log('⚠️  MISSING SLACK OAUTH SCOPE - Required scopes for this API:');
        if (apiName === 'users.lookupByEmail') {
          console.log('   - users:read.email (REQUIRED)');
        }
        console.log('   Go to https://api.slack.com/apps → Your App → OAuth & Permissions → Scopes');
      }
    }
  }
  if (error) {
    console.log('Exception:', error);
  }
  console.log('=====================================\n');
};

export const handler: AddSlackParticipantFunction = async (
  context: Context<ServerlessEnvironment>,
  event: AddSlackParticipantEvent,
  callback: ServerlessCallback
) => {
  const response = new (Response as any)();
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    // Handle preflight OPTIONS request
    if (!event.conversationSid && !event.slackEmail) {
      response.setStatusCode(200);
      return callback(null, response);
    }

    // Validate required parameters
    if (!event.conversationSid) {
      response.setStatusCode(400);
      response.setBody(JSON.stringify({
        success: false,
        error: 'Missing required parameter: conversationSid'
      }));
      return callback(null, response);
    }

    if (!event.conversationSid.startsWith('CH')) {
      response.setStatusCode(400);
      response.setBody(JSON.stringify({
        success: false,
        error: 'Invalid conversationSid format. Must start with CH'
      }));
      return callback(null, response);
    }

    if (!event.slackEmail) {
      response.setStatusCode(400);
      response.setBody(JSON.stringify({
        success: false,
        error: 'Missing required parameter: slackEmail'
      }));
      return callback(null, response);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(event.slackEmail)) {
      response.setStatusCode(400);
      response.setBody(JSON.stringify({
        success: false,
        error: 'Invalid email format'
      }));
      return callback(null, response);
    }

    const slackEmail = event.slackEmail.trim();
    const slackBotToken = context.SLACK_OAUTH_BOT_TOKEN;

    if (!slackBotToken) {
      response.setStatusCode(500);
      response.setBody(JSON.stringify({
        success: false,
        error: 'Slack bot token not configured'
      }));
      return callback(null, response);
    }

    // Fetch Slack user info by email
    console.log('Fetching Slack user info for email:', slackEmail);
    const lookupUrl = `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(slackEmail)}`;
    tempLogSlackApiCall('users.lookupByEmail', lookupUrl, { email: slackEmail });

    const slackUserResponse = await fetch(lookupUrl, {
      headers: {
        'Authorization': `Bearer ${slackBotToken}`,
        'Content-Type': 'application/json'
      }
    });

    const slackUserData = await slackUserResponse.json() as SlackApiResponse;
    tempLogSlackApiCall(
      'users.lookupByEmail',
      lookupUrl,
      { email: slackEmail },
      slackUserResponse.status,
      slackUserData
    );

    if (!slackUserData.ok || !slackUserData.user) {
      console.error('Slack API error:', slackUserData.error);

      // Improve error message for missing scope
      let errorMessage = slackUserData.error || 'Slack user not found';
      let errorDetails = 'Unable to find Slack user with provided email';

      if (slackUserData.error === 'missing_scope') {
        errorMessage = 'Missing Slack OAuth scope: users:read.email';
        errorDetails = 'Please add the users:read.email scope to your Slack app and reinstall it';
      }

      response.setStatusCode(404);
      response.setBody(JSON.stringify({
        success: false,
        error: errorMessage,
        details: errorDetails,
        code: slackUserData.error || 'slack_error'
      }));
      return callback(null, response);
    }

    const slackUser = slackUserData.user;
    console.log('Slack user found:', {
      id: slackUser.id,
      name: slackUser.name,
      realName: slackUser.real_name
    });

    // Note: Slack channel will be created automatically when first message is sent
    console.log('Slack user will be added to conversation. Channel will be auto-created on first message.');

    // Initialize Twilio client
    const client = context.getTwilioClient();
    const serviceSid = context.CONVERSATION_SERVICE_SID;

    // Create user identity with slack: prefix
    const userIdentity = `slack:${slackEmail}`;

    // Use provided friendly name, or fall back to Slack profile name
    const friendlyName = event.friendlyName?.trim() ||
      slackUser.profile.display_name ||
      slackUser.real_name ||
      slackUser.name;

    console.log('Using friendly name:', friendlyName, event.friendlyName ? '(user provided)' : '(from Slack profile)');

    try {
      // First, try to get or create the user
      let user;
      try {
        user = await client.conversations.v1.services(serviceSid).users(userIdentity).fetch();
        console.log('User already exists:', userIdentity);
      } catch (userError: any) {
        if (userError.code === 20404) {
          // User doesn't exist, create it
          console.log('Creating user:', userIdentity);
          user = await client.conversations.v1.services(serviceSid).users.create({
            identity: userIdentity,
            friendlyName: friendlyName,
            attributes: JSON.stringify({
              type: 'slack-user',
              slackUserId: slackUser.id,
              slackTeamId: slackUser.team_id,
              slackEmail: slackEmail,
              createdBy: 'conversations-demo',
              createdAt: new Date().toISOString()
            })
          });
          console.log('User created successfully:', user.identity);
        } else {
          throw userError;
        }
      }

      // Now add the user as a participant to the conversation
      console.log('Attempting to add participant to conversation:', event.conversationSid);
      let participant = await client.conversations.v1
        .services(serviceSid)
        .conversations(event.conversationSid)
        .participants.create({
          identity: userIdentity
        });

      // Update participant attributes
      console.log('Setting participant attributes with Slack metadata');
      participant = await client.conversations.v1
        .services(serviceSid)
        .conversations(event.conversationSid)
        .participants(participant.sid)
        .update({
          attributes: JSON.stringify({
            friendlyName: friendlyName,
            slackUserId: slackUser.id,
            slackEmail: slackEmail,
            type: 'slack-user'
          })
        });

      // Update conversation attributes to track Slack participants
      const conversation = await client.conversations.v1
        .services(serviceSid)
        .conversations(event.conversationSid)
        .fetch();

      const conversationAttrs = conversation.attributes ? JSON.parse(conversation.attributes) : {};

      // Enable Slack integration for this conversation
      conversationAttrs.slackEnabled = true;

      // Track Slack participants (channel info will be added by post-event.ts on first message)
      if (!conversationAttrs.slackParticipants) {
        conversationAttrs.slackParticipants = {};
      }
      conversationAttrs.slackParticipants[slackUser.id] = {
        participantSid: participant.sid,
        email: slackEmail
      };

      await client.conversations.v1
        .services(serviceSid)
        .conversations(event.conversationSid)
        .update({
          attributes: JSON.stringify(conversationAttrs)
        });

      console.log('Slack participant added successfully:', {
        participantSid: participant.sid,
        identity: participant.identity,
        slackUserId: slackUser.id,
        note: 'Slack channel will be auto-created on first message'
      });

      // Return success response
      response.setStatusCode(200);
      response.setBody(JSON.stringify({
        success: true,
        participant: {
          sid: participant.sid,
          identity: participant.identity,
          attributes: participant.attributes,
          dateCreated: participant.dateCreated,
          dateUpdated: participant.dateUpdated
        },
        user: {
          sid: user.sid,
          identity: user.identity,
          friendlyName: user.friendlyName
        },
        slackUser: {
          id: slackUser.id,
          name: slackUser.name,
          email: slackEmail
        }
      }));

    } catch (participantError: any) {
      console.error('Error with participant/user operations:', {
        error: participantError,
        message: participantError.message,
        code: participantError.code,
        status: participantError.status,
        conversationSid: event.conversationSid
      });

      let errorMessage = 'Failed to add Slack participant';
      let statusCode = 500;
      let errorCode = participantError.code || 'participant_error';

      if (participantError.code === 20404) {
        errorMessage = 'Conversation not found';
        statusCode = 404;
      } else if (participantError.message?.includes('already exists')) {
        errorMessage = 'User is already a participant in this conversation';
        statusCode = 409;
        errorCode = 'already_exists';
      } else if (participantError.message?.includes('not found')) {
        errorMessage = 'Conversation not found';
        statusCode = 404;
        errorCode = 'not_found';
      } else if (participantError.message?.includes('invalid')) {
        errorMessage = 'Invalid conversation or user data';
        statusCode = 400;
        errorCode = 'invalid_data';
      }

      response.setStatusCode(statusCode);
      response.setBody(JSON.stringify({
        success: false,
        error: errorMessage,
        details: participantError.message,
        code: errorCode
      }));
    }

    callback(null, response);

  } catch (error: unknown) {
    console.error('Unexpected error adding Slack participant:', error);

    response.setStatusCode(500);
    response.setBody(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      code: 'internal_error'
    }));

    callback(null, response);
  }
};
