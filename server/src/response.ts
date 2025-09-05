import '@twilio-labs/serverless-runtime-types';
import { Context, ServerlessCallback, ServerlessFunctionSignature } from '@twilio-labs/serverless-runtime-types/types';

export interface ServerlessEnvironment {
  CONVERSATION_SERVICE_SID: string;
  [key: string]: string | undefined;
}

export interface MessageEvent {
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

type ResponseFunction = ServerlessFunctionSignature<ServerlessEnvironment, MessageEvent>;

export const responseHandler: ResponseFunction = async function (
    context: Context<ServerlessEnvironment>,
    event: MessageEvent,
    callback: ServerlessCallback
) {
    console.log('=== RESPONSE HANDLER CALLED ===');
    console.log('Event received in response handler:', JSON.stringify(event, null, 2));
    
    try {
        // Initialize Twilio client
        const client = context.getTwilioClient();

        // Validate ConversationSid
        if (!event.ConversationSid) {
            throw new Error('ConversationSid is required');
        }

        // Send AI response message to the conversation
        const aiMessage = await client.conversations.v1
            .services(context.CONVERSATION_SERVICE_SID)
            .conversations(event.ConversationSid)
            .messages.create({
                author: 'AI-Assistant',
                body: `Hi ${event.Author}! I received your message: "${event.Body}". How can I help you today?`
            });

        console.log('AI message sent successfully:', {
            messageSid: aiMessage.sid,
            author: aiMessage.author,
            body: aiMessage.body
        });

        const response = {
            success: true,
            aiMessage: {
                sid: aiMessage.sid,
                author: aiMessage.author,
                body: aiMessage.body
            }
        };
        
        console.log('Response handler executing successfully');
        callback(null, response);
    } catch (error) {
        console.error('Error in response handler:', error);
        const errorResponse = {
            success: false,
            error: 'Internal server error'
        };
        callback(null, errorResponse);
    }
};