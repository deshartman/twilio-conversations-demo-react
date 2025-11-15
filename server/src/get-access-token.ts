// If you do not want to pay for other people using your Twilio service for their benefit,
// generate a username and password pair different from what is presented below.

//The 1st value [user00] acts as your Username for the Demo app Login. The 2nd value within double qoutes will act as your Password for the login.
//This method is not advised to be used in production. This is ONLY for testing. In production, please utilize your own server side application to handle your users.
import '@twilio-labs/serverless-runtime-types';
import { Context, ServerlessCallback, ServerlessFunctionSignature } from '@twilio-labs/serverless-runtime-types/types';
import AccessToken from 'twilio/lib/jwt/AccessToken';
const { ChatGrant } = AccessToken;

export interface ServerlessEnvironment {
  CONVERSATION_SERVICE_SID: string;
  ACCOUNT_SID?: string;
  AUTH_TOKEN?: string;
  TWILIO_API_KEY_SID?: string;
  TWILIO_API_KEY_SECRET?: string;
  PUSH_CREDENTIAL_SID?: string;
  [key: string]: string | undefined;
}

export interface GetAccessTokenEvent {
  identity: string;
  password: string;
  friendlyName?: string;
  request: {
    cookies: {};
    headers: {};
  };
}

const users: Record<string, string> = {
    user00: "00resu",
    user01: "10resu"
};

type GetAccessTokenFunction = ServerlessFunctionSignature<ServerlessEnvironment, GetAccessTokenEvent>;

export const handler: GetAccessTokenFunction = async function (
    context: Context<ServerlessEnvironment>,
    event: GetAccessTokenEvent,
    callback: ServerlessCallback
) {
    const response = new (Response as any)();
    response.appendHeader('Access-Control-Allow-Origin', '*');

    if (!event.identity || !event.password) {
        response.setStatusCode(401);
        response.setBody("No credentials");
        callback(null, response);
        return;
    }

    if (users[event.identity] !== event.password) {
        response.setStatusCode(401);
        response.setBody("Wrong credentials");
        callback(null, response);
        return;
    }

    // Create or update User object with friendly name if provided
    if (event.friendlyName) {
        try {
            const client = context.getTwilioClient();
            const serviceSid = context.CONVERSATION_SERVICE_SID;
            const userIdentity = event.identity.trim();
            const friendlyName = event.friendlyName.trim();

            try {
                // Try to fetch existing user
                await client.conversations.v1.services(serviceSid).users(userIdentity).fetch();
                console.log('User exists, updating friendlyName:', userIdentity);

                // Update the user with the new friendly name
                await client.conversations.v1.services(serviceSid).users(userIdentity).update({
                    friendlyName: friendlyName
                });
                console.log('User updated successfully:', userIdentity);
            } catch (userError: any) {
                if (userError.code === 20404) {
                    // User doesn't exist, create it
                    console.log('Creating user:', userIdentity);
                    await client.conversations.v1.services(serviceSid).users.create({
                        identity: userIdentity,
                        friendlyName: friendlyName,
                        attributes: JSON.stringify({
                            type: 'chat-user',
                            createdBy: 'conversations-demo',
                            createdAt: new Date().toISOString()
                        })
                    });
                    console.log('User created successfully:', userIdentity);
                } else {
                    console.error('Error managing user:', userError);
                }
            }
        } catch (error) {
            console.error('Error creating/updating user:', error);
            // Continue with token generation even if user creation fails
        }
    }

    const token = new AccessToken(
        context.ACCOUNT_SID!,
        context.TWILIO_API_KEY_SID!,
        context.TWILIO_API_KEY_SECRET!,
        {
            identity: event.identity,
            ttl: 3600
        }
    );

    const grant = new ChatGrant({ serviceSid: context.CONVERSATION_SERVICE_SID });
    if (context.PUSH_CREDENTIAL_SID) {
        // Optional: without it, no push notifications will be sent
        grant.pushCredentialSid = context.PUSH_CREDENTIAL_SID;
    }
    token.addGrant(grant);
    const jwtToken = token.toJwt();
    response.setStatusCode(200);
    response.setBody(jwtToken);

    console.log(`Called the server version: ${jwtToken}`)

    callback(null, response);
};