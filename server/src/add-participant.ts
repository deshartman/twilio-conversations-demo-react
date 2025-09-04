import '@twilio-labs/serverless-runtime-types';
import { Context, ServerlessCallback, ServerlessFunctionSignature } from '@twilio-labs/serverless-runtime-types/types';
import Twilio from 'twilio';

export interface AddParticipantEvent {
  conversationSid: string;
  participantData: {
    'messagingBinding.address'?: string;
    'messagingBinding.proxyAddress'?: string;
    identity?: string;
    roleSid?: string;
    attributes?: string;
    [key: string]: any;
  };
  request: {
    cookies: {};
    headers: {};
  };
}

type AddParticipantFunction = ServerlessFunctionSignature<{}, AddParticipantEvent>;

export const handler: AddParticipantFunction = async (
  context: Context<{}>,
  event: AddParticipantEvent,
  callback: ServerlessCallback
) => {
  const response = new (Response as any)();
  
  try {
    // Validate required parameters
    if (!event.conversationSid) {
      response.setStatusCode(400);
      response.setBody('Missing required parameter: conversationSid');
      return callback(null, response);
    }

    if (!event.participantData) {
      response.setStatusCode(400);
      response.setBody('Missing required parameter: participantData');
      return callback(null, response);
    }

    // Validate conversation SID format
    if (!event.conversationSid.startsWith('CH')) {
      response.setStatusCode(400);
      response.setBody('Invalid conversationSid format. Must start with CH');
      return callback(null, response);
    }

    // Validate participant data has either messaging binding or identity
    const hasMessagingBinding = event.participantData['messagingBinding.address'] && 
                               event.participantData['messagingBinding.proxyAddress'];
    const hasIdentity = event.participantData.identity;

    if (!hasMessagingBinding && !hasIdentity) {
      response.setStatusCode(400);
      response.setBody('Participant data must include either messagingBinding (address + proxyAddress) or identity');
      return callback(null, response);
    }

    console.log('Adding participant to conversation:', {
      conversationSid: event.conversationSid,
      participantType: hasIdentity ? 'chat' : 'messaging',
      identity: event.participantData.identity,
      address: event.participantData['messagingBinding.address']
    });

    // Initialize Twilio client
    const client = Twilio(
      (context as any).ACCOUNT_SID,
      (context as any).AUTH_TOKEN
    );

    // Add participant to conversation
    const participant = await client.conversations.v1
      .conversations(event.conversationSid)
      .participants.create(event.participantData);

    console.log('Participant added successfully:', {
      participantSid: participant.sid,
      identity: participant.identity,
      address: participant.messagingBinding?.address
    });

    // Return success response with participant details
    response.setStatusCode(200);
    response.setBody(JSON.stringify({
      success: true,
      participant: {
        sid: participant.sid,
        identity: participant.identity,
        messagingBinding: participant.messagingBinding,
        roleSid: participant.roleSid,
        attributes: participant.attributes,
        dateCreated: participant.dateCreated,
        dateUpdated: participant.dateUpdated
      }
    }));

    callback(null, response);

  } catch (error: unknown) {
    console.error('Error adding participant:', error);
    
    let errorMessage = 'Unknown error occurred';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific Twilio API errors
      if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        statusCode = 409;
      } else if (error.message.includes('invalid') || error.message.includes('bad request')) {
        statusCode = 400;
      }
    }

    response.setStatusCode(statusCode);
    response.setBody(JSON.stringify({
      success: false,
      error: errorMessage
    }));

    callback(null, response);
  }
};