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

export interface PostEventResponse {
  success: boolean;
  message?: string;
  [key: string]: any;
}

type PostEventFunction = ServerlessFunctionSignature<{}, ConversationWebhookEvent>;

export const handler: PostEventFunction = async (
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
      const errorResponse: PostEventResponse = {
        success: false,
        message: 'Missing required webhook fields'
      };
      return callback(null, errorResponse);
    }

    console.log('Post-event webhook received:', {
      eventType: event.EventType,
      conversationSid: event.ConversationSid,
      messageSid: event.MessageSid,
      participantSid: event.ParticipantSid,
      clientIdentity: event.ClientIdentity,
      timestamp: new Date().toISOString()
    });

    const response: PostEventResponse = {
      success: true,
      message: 'Event processed successfully'
    };

    switch (event.EventType) {
      case 'onMessageAdded':
        console.log('Message added:', {
          messageSid: event.MessageSid,
          conversationSid: event.ConversationSid,
          author: event.Author,
          body: event.Body?.substring(0, 100), // Log first 100 chars only
          index: event.Index,
          dateCreated: event.DateCreated
        });
        
        // Example: Track message analytics
        if (event.Body) {
          const wordCount = event.Body.split(' ').length;
          const hasMedia = event.Media && event.Media.length > 0;
          
          console.log('Message analytics:', {
            wordCount,
            hasMedia,
            mediaCount: event.Media?.length || 0
          });
        }
        break;

      case 'onConversationAdded':
        console.log('Conversation added:', {
          conversationSid: event.ConversationSid,
          friendlyName: event.ConversationFriendlyName,
          uniqueName: event.ConversationUniqueName,
          messagingServiceSid: event.ConversationMessagingServiceSid,
          dateCreated: event.DateCreated
        });
        break;

      case 'onParticipantAdded':
        console.log('Participant added:', {
          participantSid: event.ParticipantSid,
          conversationSid: event.ConversationSid,
          identity: event.ParticipantIdentity,
          roleSid: event.ParticipantRoleSid,
          dateCreated: event.DateCreated
        });
        break;

      case 'onMessageUpdated':
        console.log('Message updated:', {
          messageSid: event.MessageSid,
          conversationSid: event.ConversationSid,
          author: event.Author,
          body: event.Body?.substring(0, 100),
          dateUpdated: event.DateUpdated
        });
        break;

      case 'onConversationUpdated':
        console.log('Conversation updated:', {
          conversationSid: event.ConversationSid,
          friendlyName: event.ConversationFriendlyName,
          attributes: event.ConversationAttributes,
          dateUpdated: event.DateUpdated
        });
        break;

      case 'onParticipantUpdated':
        console.log('Participant updated:', {
          participantSid: event.ParticipantSid,
          conversationSid: event.ConversationSid,
          identity: event.ParticipantIdentity,
          lastReadMessageIndex: event.ParticipantLastReadMessageIndex,
          lastReadTimestamp: event.ParticipantLastReadTimestamp,
          dateUpdated: event.DateUpdated
        });
        break;

      case 'onMessageRemoved':
        console.log('Message removed:', {
          messageSid: event.MessageSid,
          conversationSid: event.ConversationSid,
          author: event.Author,
          dateCreated: event.DateCreated
        });
        break;

      case 'onConversationRemoved':
        console.log('Conversation removed:', {
          conversationSid: event.ConversationSid,
          friendlyName: event.ConversationFriendlyName,
          dateCreated: event.DateCreated
        });
        break;

      case 'onParticipantRemoved':
        console.log('Participant removed:', {
          participantSid: event.ParticipantSid,
          conversationSid: event.ConversationSid,
          identity: event.ParticipantIdentity,
          dateCreated: event.DateCreated
        });
        break;

      default:
        console.log(`Unhandled event type: ${event.EventType}`, {
          conversationSid: event.ConversationSid,
          chatServiceSid: event.ChatServiceSid
        });
        response.message = `Event type ${event.EventType} logged but not specifically handled`;
    }

    // Example: Send metrics to external service
    // await sendAnalytics({
    //   eventType: event.EventType,
    //   conversationSid: event.ConversationSid,
    //   timestamp: new Date().toISOString()
    // });

    // Example: Store event in database
    // await storeEvent(event);

    callback(null, response);

  } catch (error) {
    console.error('Error in post-event webhook:', error);
    
    // Even if processing fails, we should acknowledge the webhook
    // to prevent Twilio from retrying unnecessarily
    const errorResponse: PostEventResponse = {
      success: false,
      message: 'Error processing event but acknowledged'
    };
    
    callback(null, errorResponse);
  }
};