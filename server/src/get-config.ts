import '@twilio-labs/serverless-runtime-types';
import { Context, ServerlessCallback, ServerlessFunctionSignature } from '@twilio-labs/serverless-runtime-types/types';

export interface ServerlessEnvironment {
  SMS_PROXY_NUMBER: string;
  WHATSAPP_PROXY_NUMBER: string;
  [key: string]: string | undefined;
}

export interface ConfigResponse {
  smsProxyNumber: string;
  whatsappProxyNumber: string;
}

type GetConfigFunction = ServerlessFunctionSignature<ServerlessEnvironment>;

export const handler: GetConfigFunction = async (
  context: Context<ServerlessEnvironment>,
  event: {},
  callback: ServerlessCallback
) => {
  try {
    // Validate that both proxy numbers are configured
    if (!context.SMS_PROXY_NUMBER) {
      console.error('SMS_PROXY_NUMBER not configured in environment');
      return callback(null, {
        success: false,
        error: 'SMS proxy number not configured'
      });
    }

    if (!context.WHATSAPP_PROXY_NUMBER) {
      console.error('WHATSAPP_PROXY_NUMBER not configured in environment');
      return callback(null, {
        success: false,
        error: 'WhatsApp proxy number not configured'
      });
    }

    const response: ConfigResponse = {
      smsProxyNumber: context.SMS_PROXY_NUMBER,
      whatsappProxyNumber: context.WHATSAPP_PROXY_NUMBER
    };

    console.log('Config requested, returning proxy numbers - SMS:', context.SMS_PROXY_NUMBER, 'WhatsApp:', context.WHATSAPP_PROXY_NUMBER);
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
