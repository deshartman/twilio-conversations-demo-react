import '@twilio-labs/serverless-runtime-types';
import { Context, ServerlessCallback, ServerlessFunctionSignature } from '@twilio-labs/serverless-runtime-types/types';

export interface ServerlessEnvironment {
  TWILIO_PROXY_NUMBER: string;
  [key: string]: string | undefined;
}

export interface ConfigResponse {
  proxyNumber: string;
}

type GetConfigFunction = ServerlessFunctionSignature<ServerlessEnvironment>;

export const handler: GetConfigFunction = async (
  context: Context<ServerlessEnvironment>,
  event: {},
  callback: ServerlessCallback
) => {
  try {
    // Validate that proxy number is configured
    if (!context.TWILIO_PROXY_NUMBER) {
      console.error('TWILIO_PROXY_NUMBER not configured in environment');
      return callback(null, {
        success: false,
        error: 'Proxy number not configured'
      });
    }

    const response: ConfigResponse = {
      proxyNumber: context.TWILIO_PROXY_NUMBER
    };

    console.log('Config requested, returning proxy number:', context.TWILIO_PROXY_NUMBER);
    callback(null, response);

  } catch (error: unknown) {
    console.error('Error in get-config:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    callback(null, {
      success: false,
      error: errorMessage
    });
  }
};
