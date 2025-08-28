import { Context, ServerlessCallback, ServerlessFunctionSignature } from '@twilio-labs/serverless-runtime-types/types';

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

export interface WebhookModifications {
  body?: string;
  author?: string;
  attributes?: string;
  friendly_name?: string;
}

export interface PreEventResponse {
  modifications?: WebhookModifications;
  [key: string]: any;
}

type PreEventFunction = ServerlessFunctionSignature<{}, ConversationWebhookEvent>;

export const handler: PreEventFunction = async (
  context: Context<{}>,
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
        if (event.Body) {
          console.log('Processing message add event');
          
          // Example: Filter profanity or modify message content
          if (event.Body.toLowerCase().includes('badword')) {
            response.modifications = {
              body: event.Body.replace(/badword/gi, '***'),
            };
            console.log('Message content modified for profanity');
          }
          
          // Example: Add custom attributes
          const existingAttributes = event.Attributes ? JSON.parse(event.Attributes) : {};
          response.modifications = {
            ...response.modifications,
            attributes: JSON.stringify({
              ...existingAttributes,
              processedAt: new Date().toISOString(),
              preProcessed: true
            })
          };
        }
        break;

      case 'onConversationAdd':
        console.log('Processing conversation add event');
        if (event.ConversationFriendlyName) {
          response.modifications = {
            friendly_name: `[Moderated] ${event.ConversationFriendlyName}`
          };
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

    callback(null, response);

  } catch (error) {
    console.error('Error in pre-event webhook:', error);
    
    // Return error to reject the action
    return callback(error);
  }
};