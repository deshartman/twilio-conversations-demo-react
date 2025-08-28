// If you do not want to pay for other people using your Twilio service for their benefit,
// generate a username and password pair different from what is presented below.

//The 1st value [user00] acts as your Username for the Demo app Login. The 2nd value within double qoutes will act as your Password for the login.
//This method is not advised to be used in production. This is ONLY for testing. In production, please utilize your own server side application to handle your users. 
import '@twilio-labs/serverless-runtime-types';
import { Context, ServerlessCallback, ServerlessFunctionSignature } from '@twilio-labs/serverless-runtime-types/types';
import Twilio from 'twilio';
const { Response } = require('@twilio/runtime-handler');

const users: Record<string, string> = {
    user00: "00resu",
    user01: "10resu"
};

export const handler: ServerlessFunctionSignature = function(
    context: Context,
    event: any,
    callback: ServerlessCallback
) {
    const response = new Response();
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

    const AccessToken = Twilio.jwt.AccessToken;
    const token = new AccessToken(
        (context as any).ACCOUNT_SID,
        (context as any).TWILIO_API_KEY_SID,
        (context as any).TWILIO_API_KEY_SECRET,
        {
            identity: event.identity,
            ttl: 3600
        }
    );

    const grant = new AccessToken.ChatGrant({ serviceSid: (context as any).SERVICE_SID });
    if ((context as any).PUSH_CREDENTIAL_SID) {
        // Optional: without it, no push notifications will be sent
        grant.pushCredentialSid = (context as any).PUSH_CREDENTIAL_SID;
    }
    token.addGrant(grant);
    response.setStatusCode(200);
    response.setBody(token.toJwt());

    callback(null, response);
};