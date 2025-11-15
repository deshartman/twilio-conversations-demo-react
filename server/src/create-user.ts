import '@twilio-labs/serverless-runtime-types';
import { Context, ServerlessCallback, ServerlessFunctionSignature } from '@twilio-labs/serverless-runtime-types/types';

export interface ServerlessEnvironment {
  CONVERSATION_SERVICE_SID: string;
  ACCOUNT_SID?: string;
  AUTH_TOKEN?: string;
  [key: string]: string | undefined;
}

export interface CreateUserEvent {
  userIdentity: string;
  friendlyName: string;
  request: {
    cookies: {};
    headers: {};
  };
}

type CreateUserFunction = ServerlessFunctionSignature<ServerlessEnvironment, CreateUserEvent>;

export const handler: CreateUserFunction = async (
  context: Context<ServerlessEnvironment>,
  event: CreateUserEvent,
  callback: ServerlessCallback
) => {
  const response = new (Response as any)();
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    // Handle preflight OPTIONS request
    if (!event.userIdentity) {
      response.setStatusCode(200);
      return callback(null, response);
    }

    // Validate required parameters
    if (!event.friendlyName) {
      response.setStatusCode(400);
      response.setBody(JSON.stringify({
        success: false,
        error: 'Missing required parameter: friendlyName'
      }));
      return callback(null, response);
    }

    const userIdentity = event.userIdentity.trim();
    const client = context.getTwilioClient();
    const serviceSid = context.CONVERSATION_SERVICE_SID;

    // Try to get or create the user
    let user;
    try {
      user = await client.conversations.v1.services(serviceSid).users(userIdentity).fetch();
      console.log('User already exists, updating friendlyName:', userIdentity);

      // Update the user with the new friendly name
      user = await client.conversations.v1.services(serviceSid).users(userIdentity).update({
        friendlyName: event.friendlyName
      });
      console.log('User updated successfully:', user.identity);
    } catch (userError: any) {
      if (userError.code === 20404) {
        // User doesn't exist, create it
        console.log('Creating user:', userIdentity);
        user = await client.conversations.v1.services(serviceSid).users.create({
          identity: userIdentity,
          friendlyName: event.friendlyName,
          attributes: JSON.stringify({
            type: 'chat-user',
            createdBy: 'conversations-demo',
            createdAt: new Date().toISOString()
          })
        });
        console.log('User created successfully:', user.identity);
      } else {
        throw userError;
      }
    }

    // Return success response
    response.setStatusCode(200);
    response.setBody(JSON.stringify({
      success: true,
      user: {
        sid: user.sid,
        identity: user.identity,
        friendlyName: user.friendlyName
      }
    }));

    callback(null, response);

  } catch (error: unknown) {
    console.error('Error creating/updating user:', error);

    response.setStatusCode(500);
    response.setBody(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }));

    callback(null, response);
  }
};
