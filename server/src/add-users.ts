import '@twilio-labs/serverless-runtime-types';
import { Context, ServerlessCallback, ServerlessFunctionSignature } from '@twilio-labs/serverless-runtime-types/types';
import Twilio from 'twilio';

export interface AddUserEvent {
  conversationSid: string;
  userIdentity: string;
  friendlyName: string;
  request: {
    cookies: {};
    headers: {};
  };
}

type AddUserFunction = ServerlessFunctionSignature<{}, AddUserEvent>;

export const handler: AddUserFunction = async (
  context: Context<{}>,
  event: AddUserEvent,
  callback: ServerlessCallback
) => {
  const response = new (Response as any)();
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  try {
    // Handle preflight OPTIONS request
    if (!event.conversationSid && !event.userIdentity) {
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

    // Validate conversation SID format
    if (!event.conversationSid.startsWith('CH')) {
      response.setStatusCode(400);
      response.setBody(JSON.stringify({
        success: false,
        error: 'Invalid conversationSid format. Must start with CH'
      }));
      return callback(null, response);
    }

    if (!event.userIdentity) {
      response.setStatusCode(400);
      response.setBody(JSON.stringify({
        success: false,
        error: 'Missing required parameter: userIdentity'
      }));
      return callback(null, response);
    }

    if (!event.friendlyName) {
      response.setStatusCode(400);
      response.setBody(JSON.stringify({
        success: false,
        error: 'Missing required parameter: friendlyName'
      }));
      return callback(null, response);
    }

    const userIdentity = event.userIdentity.trim();

    // Initialize Twilio client with server-side credentials
    const client = Twilio(
      (context as any).ACCOUNT_SID,
      (context as any).AUTH_TOKEN
    );

    try {
      // First, try to get or create the user
      let user;
      try {
        user = await client.conversations.v1.services((context as any).CONVERSATION_SERVICE_SID).users(userIdentity).fetch();
        console.log('User already exists:', userIdentity);
      } catch (userError: any) {
        if (userError.code === 20404) {
          // User doesn't exist, create it
          console.log('Creating user:', userIdentity);
          user = await client.conversations.v1.services((context as any).CONVERSATION_SERVICE_SID).users.create({
            identity: userIdentity,
            friendlyName: event.friendlyName,
            attributes: JSON.stringify({
              type: userIdentity.startsWith('ASKAI-') ? 'ai-agent' : 'chat-user',
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
      const participant = await client.conversations.v1
        .services((context as any).CONVERSATION_SERVICE_SID)
        .conversations(event.conversationSid)
        .participants.create({
          identity: userIdentity
        });

      console.log('User participant added successfully:', {
        participantSid: participant.sid,
        identity: participant.identity
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
      
      let errorMessage = 'Failed to add user';
      let statusCode = 500;

      if (participantError.code === 20404) {
        errorMessage = 'Conversation not found';
        statusCode = 404;
      } else if (participantError.message?.includes('already exists')) {
        errorMessage = 'User is already a participant in this conversation';
        statusCode = 409;
      } else if (participantError.message?.includes('not found')) {
        errorMessage = 'Conversation not found';
        statusCode = 404;
      } else if (participantError.message?.includes('invalid')) {
        errorMessage = 'Invalid conversation or user data';
        statusCode = 400;
      }

      response.setStatusCode(statusCode);
      response.setBody(JSON.stringify({
        success: false,
        error: errorMessage,
        details: participantError.message
      }));
    }

    callback(null, response);

  } catch (error: unknown) {
    console.error('Unexpected error adding user:', error);
    
    response.setStatusCode(500);
    response.setBody(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }));

    callback(null, response);
  }
};