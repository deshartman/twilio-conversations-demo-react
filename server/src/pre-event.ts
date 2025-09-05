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

export interface PreEventResponse {
  body?: string;
  author?: string;
  attributes?: string;
  friendly_name?: string;
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

        if (event.Body && event.Author) {
          // Check if message contains "AskAI" (case insensitive)
          if (event.Body.toLocaleUpperCase().includes('ASKAI')) {
            console.log('=== ASKAI DETECTED - CALLING RESPONSE ENDPOINT ===');
            try {
              // Call response function using Runtime.getFunctions()
              const responsePath = Runtime.getFunctions()['response'].path;
              const responseModule = require(responsePath);
              
              const responseEvent = {
                Body: event.Body,
                Author: event.Author,
                ConversationSid: event.ConversationSid,
                request: { cookies: {}, headers: {} }
              };

              await new Promise<void>((resolve, reject) => {
                responseModule.responseHandler(context, responseEvent, (err: any, result: any) => {
                  if (err) {
                    console.error('Error calling response function:', err);
                    reject(err);
                  } else {
                    console.log('Response function result:', result);
                    resolve();
                  }
                });
              });
            } catch (error) {
              console.error('Failed to call response function:', error);
            }
          }

          // Add Author prefix to the message body
          response.body = `${event.Author}: ${event.Body}`;
          console.log('Message body modified with author prefix:', `${event.Author}: ${event.Body}`);

          // Add custom attributes to track modification
          const existingAttributes = event.Attributes ? JSON.parse(event.Attributes) : {};
          response.attributes = JSON.stringify({
            ...existingAttributes,
            processedAt: new Date().toISOString(),
            preProcessed: true,
            originalBody: event.Body,
            originalAuthor: event.Author,
            askAiCalled: event.Body.includes('AskAI')
          });
        } else {
          console.log('Missing body or author for modification');
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