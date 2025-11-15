import { Context, ServerlessCallback, ServerlessFunctionSignature } from '@twilio-labs/serverless-runtime-types/types';

export interface ServerlessEnvironment {
  CONVERSATION_SERVICE_SID?: string;
  [key: string]: string | undefined;
}

export interface ConversationWebhookEvent {
  EventType: string;
  ChatServiceSid: string;
  ConversationSid?: string;
  MessageSid?: string;
  ParticipantSid?: string;
  ClientIdentity?: string;
  Source?: string;
  Body?: string;
  DateCreated?: string;
  DateUpdated?: string;
  Author?: string;
  ParticipantIdentity?: string;
  Attributes?: string;
  Index?: number;
  RetryCount?: number;
  ConversationAttributes?: string;
  ConversationFriendlyName?: string;
  ConversationUniqueName?: string;
  ConversationMessagingServiceSid?: string;
  ParticipantLastReadMessageIndex?: number;
  ParticipantLastReadTimestamp?: string;
  ParticipantRoleSid?: string;
  Media?: Array<{
    Sid: string;
    Size: number;
    ContentType: string;
    Filename?: string;
  }>;
  request: {
    cookies: {};
    headers: {};
  };
}

export interface PreEventResponse {
  body?: string;
  author?: string;
  attributes?: string;
  friendly_name?: string;
  [key: string]: any;
}

type PreEventFunction = ServerlessFunctionSignature<ServerlessEnvironment, ConversationWebhookEvent>;

export const handler: PreEventFunction = async (
  context: Context<ServerlessEnvironment>,
  event: ConversationWebhookEvent,
  callback: ServerlessCallback
) => {
  try {
    // Validate required fields
    if (!event.EventType || !event.ChatServiceSid) {
      console.error('Invalid webhook: missing required fields', {
        hasEventType: !!event.EventType,
        hasChatServiceSid: !!event.ChatServiceSid
      });
      return callback('Missing required webhook fields');
    }

    console.log('Pre-event webhook received:', {
      eventType: event.EventType,
      conversationSid: event.ConversationSid,
      messageSid: event.MessageSid,
      participantSid: event.ParticipantSid,
      clientIdentity: event.ClientIdentity
    });

    const response: PreEventResponse = {};

    switch (event.EventType) {
      case 'onMessageAdd':
        console.log('=== PROCESSING MESSAGE ADD EVENT ===');
        console.log('Processing message add event - Full event data:', {
          EventType: event.EventType,
          ChatServiceSid: event.ChatServiceSid,
          ConversationSid: event.ConversationSid,
          MessageSid: event.MessageSid,
          ParticipantSid: event.ParticipantSid,
          ClientIdentity: event.ClientIdentity,
          Source: event.Source,
          Body: event.Body,
          Author: event.Author,
          Attributes: event.Attributes,
          DateCreated: event.DateCreated,
          Index: event.Index,
          Media: event.Media
        });

        console.log('Message Body:', JSON.stringify(event.Body));
        console.log('Message Author:', JSON.stringify(event.Author));

        if (event.Body && event.Author && event.ParticipantSid && event.ConversationSid) {
          try {
            // Fetch participant details to get friendly name
            const client = context.getTwilioClient();
            const serviceSid = event.ChatServiceSid;

            const participant = await client.conversations.v1
              .services(serviceSid)
              .conversations(event.ConversationSid)
              .participants(event.ParticipantSid)
              .fetch();

            // Extract friendly name from participant
            let friendlyName = 'Unknown';

            // Check native friendlyName (for SMS/WhatsApp)
            if (participant.messagingBinding?.friendlyName) {
              friendlyName = participant.messagingBinding.friendlyName;
            }
            // Check User object friendlyName (for logged in chat users)
            else if (participant.identity) {
              try {
                const user = await client.conversations.v1
                  .services(serviceSid)
                  .users(participant.identity)
                  .fetch();
                if (user.friendlyName) {
                  friendlyName = user.friendlyName;
                }
              } catch (userError: any) {
                console.log('Failed to fetch user:', userError.code || userError.message);
                // If user doesn't exist, fall through to check participant attributes
              }
            }
            // Check attributes.friendlyName (for chat users added via add-users)
            if (friendlyName === 'Unknown' && participant.attributes) {
              try {
                const attributes = JSON.parse(participant.attributes);
                if (attributes.friendlyName) {
                  friendlyName = attributes.friendlyName;
                }
              } catch (e) {
                console.log('Failed to parse participant attributes:', e);
              }
            }

            console.log('Extracted friendly name:', friendlyName);

            // Format message with friendly name on first line, body on subsequent lines
            response.body = `[${friendlyName}]\n${event.Body}`;
            console.log('Message body modified with friendly name:', response.body);

            // Add custom attributes to track modification
            const existingAttributes = event.Attributes ? JSON.parse(event.Attributes) : {};
            response.attributes = JSON.stringify({
              ...existingAttributes,
              processedAt: new Date().toISOString(),
              preProcessed: true,
              originalBody: event.Body,
              originalAuthor: event.Author,
              friendlyName: friendlyName,
              askAiCalled: event.Body.includes('AskAI')
            });
          } catch (error) {
            console.error('Error fetching participant details:', error);
            // Fallback to original author if participant fetch fails
            response.body = `[${event.Author}]\n${event.Body}`;

            const existingAttributes = event.Attributes ? JSON.parse(event.Attributes) : {};
            response.attributes = JSON.stringify({
              ...existingAttributes,
              processedAt: new Date().toISOString(),
              preProcessed: true,
              originalBody: event.Body,
              originalAuthor: event.Author,
              askAiCalled: event.Body.includes('AskAI')
            });
          }
        } else {
          console.log('Missing required fields for modification');
        }
        break;

      case 'onConversationAdd':
        console.log('Processing conversation add event');
        if (event.ConversationFriendlyName) {
          response.friendly_name = `[Moderated] ${event.ConversationFriendlyName}`;
        }
        break;

      case 'onParticipantAdd':
        console.log('Processing participant add event');
        break;

      case 'onMessageUpdate':
        console.log('Processing message update event');
        break;

      case 'onConversationUpdate':
        console.log('Processing conversation update event');
        break;

      case 'onParticipantUpdate':
        console.log('Processing participant update event');
        break;

      case 'onMessageRemove':
        console.log('Processing message remove event');
        break;

      case 'onConversationRemove':
        console.log('Processing conversation remove event');
        break;

      case 'onParticipantRemove':
        console.log('Processing participant remove event');
        break;

      default:
        console.log(`Unhandled event type: ${event.EventType}`);
    }

    console.log('Final response being sent to Twilio:', JSON.stringify(response, null, 2));
    callback(null, response);

  } catch (error: unknown) {
    console.error('Error in pre-event webhook:', error);

    // Return error to reject the action
    if (error instanceof Error) {
      return callback(error);
    } else {
      return callback(new Error(String(error)));
    }
  }
};