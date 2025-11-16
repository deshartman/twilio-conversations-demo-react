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

/**
 * Generates a Slack-compatible channel name from a conversation friendly name
 * @param friendlyName - The Twilio Conversation friendly name
 * @param conversationSid - The Twilio Conversation SID (used as fallback)
 * @returns Sanitized channel name (lowercase, alphanumeric + hyphens/underscores, max 80 chars)
 */
function generateChannelName(friendlyName: string | undefined, conversationSid: string): string {
  // Use friendly name if available, otherwise use SID
  const baseName = friendlyName || `conversation-${conversationSid}`;

  // Sanitize for Slack requirements:
  // - Max 80 characters
  // - Lowercase only
  // - Alphanumeric, hyphens, underscores only
  // - No consecutive hyphens
  // - No leading/trailing hyphens

  let channelName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')  // Replace non-alphanumeric with hyphen
    .replace(/-+/g, '-')            // Remove consecutive hyphens
    .replace(/^-|-$/g, '')          // Remove leading/trailing hyphens
    .substring(0, 80);              // Max 80 chars

  // Ensure we have at least some valid name
  if (!channelName || channelName.length === 0) {
    channelName = `conv-${conversationSid.substring(2, 10).toLowerCase()}`;
  }

  return channelName;
}

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

    // console.log('Post-event webhook received:', {
    //   eventType: event.EventType,
    //   conversationSid: event.ConversationSid,
    //   messageSid: event.MessageSid,
    //   participantSid: event.ParticipantSid,
    //   clientIdentity: event.ClientIdentity,
    //   timestamp: new Date().toISOString()
    // });

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

        // Forward message to Slack if conversation has Slack participants
        if (event.ConversationSid && event.Author) {
          try {
            // Parse message attributes to check if this came from Slack
            const messageAttrs = event.Attributes ? JSON.parse(event.Attributes) : {};

            // Don't forward if message originated from Slack (prevent loop)
            if (messageAttrs.source !== 'slack') {
              const client = context.getTwilioClient();
              const serviceSid = event.ChatServiceSid;

              // Get conversation to check for Slack participants
              const conversation = await client.conversations.v1
                .services(serviceSid)
                .conversations(event.ConversationSid)
                .fetch();

              const conversationAttrs = conversation.attributes ? JSON.parse(conversation.attributes) : {};
              const slackParticipants = conversationAttrs.slackParticipants || {};

              // Auto-create Slack channel if Slack is enabled but channel doesn't exist yet
              if (conversationAttrs.slackEnabled && !conversationAttrs.slackChannel && Object.keys(slackParticipants).length > 0) {
                console.log('Auto-creating Slack channel for conversation:', event.ConversationSid);

                const slackBotToken = (context as any).SLACK_OAUTH_BOT_TOKEN;

                if (slackBotToken) {
                  try {
                    // Generate channel name from conversation friendly name
                    const channelName = generateChannelName(conversation.friendlyName, event.ConversationSid);
                    console.log(`Creating Slack channel: #${channelName}`);

                    // Create channel via Slack API
                    const createResponse = await fetch('https://slack.com/api/conversations.create', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${slackBotToken}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        name: channelName,
                        is_private: false
                      })
                    });

                    const createData = await createResponse.json();

                    if (!createData.ok) {
                      console.error('Failed to create Slack channel:', createData.error);
                      // If channel name is taken, try with conversation SID suffix
                      if (createData.error === 'name_taken') {
                        console.log('Channel name taken, retrying with SID suffix');
                        const retryName = `${channelName}-${event.ConversationSid.substring(2, 8).toLowerCase()}`;
                        const retryResponse = await fetch('https://slack.com/api/conversations.create', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${slackBotToken}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            name: retryName,
                            is_private: false
                          })
                        });
                        const retryData = await retryResponse.json();
                        if (retryData.ok) {
                          Object.assign(createData, retryData);
                        }
                      }
                    }

                    if (createData.ok && createData.channel) {
                      // Store channel mapping in conversation attributes
                      conversationAttrs.slackChannel = {
                        channelId: createData.channel.id,
                        channelName: createData.channel.name,
                        createdAt: new Date().toISOString()
                      };

                      // Invite all Slack participants to the channel
                      console.log(`Inviting ${Object.keys(slackParticipants).length} Slack users to channel`);
                      for (const slackUserId of Object.keys(slackParticipants)) {
                        try {
                          const inviteResponse = await fetch('https://slack.com/api/conversations.invite', {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${slackBotToken}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              channel: createData.channel.id,
                              users: slackUserId
                            })
                          });

                          const inviteData = await inviteResponse.json();
                          if (!inviteData.ok) {
                            console.error(`Failed to invite user ${slackUserId}:`, inviteData.error);
                          } else {
                            console.log(`✅ Invited user ${slackUserId} to channel`);
                          }
                        } catch (inviteError) {
                          console.error(`Error inviting user ${slackUserId}:`, inviteError);
                        }
                      }

                      // Update conversation with channel info
                      await conversation.update({
                        attributes: JSON.stringify(conversationAttrs)
                      });

                      console.log(`✅ Created and configured Slack channel: #${createData.channel.name} (${createData.channel.id})`);
                    }
                  } catch (channelCreationError) {
                    console.error('Error creating Slack channel:', channelCreationError);
                    // Continue with message forwarding even if channel creation fails
                  }
                }
              }

              // If conversation has Slack channel, forward the message
              if (conversationAttrs.slackChannel) {
                const slackBotToken = (context as any).SLACK_OAUTH_BOT_TOKEN;

                if (slackBotToken) {
                  console.log('Forwarding message to Slack channel:', conversationAttrs.slackChannel.channelId);

                  try {
                    const channelId = conversationAttrs.slackChannel.channelId;

                    // Build message blocks for rich formatting
                    const messageBlocks: any[] = [];

                    // Add text message
                    if (event.Body) {
                      messageBlocks.push({
                        type: 'section',
                        text: {
                          type: 'mrkdwn',
                          text: `*${event.Author}:* ${event.Body}`
                        }
                      });
                    }

                    // TEMP LOGGING - Remove after debugging
                    const slackPayload = {
                      channel: channelId,
                      blocks: messageBlocks.length > 0 ? messageBlocks : undefined,
                      text: event.Body || '(no text)',
                      unfurl_links: false,
                      unfurl_media: false
                    };
                    console.log('=== SENDING MESSAGE TO SLACK CHANNEL ===');
                    console.log('Channel ID:', channelId);
                    console.log('Channel Name:', conversationAttrs.slackChannel.channelName);
                    console.log('Payload:', JSON.stringify(slackPayload, null, 2));
                    console.log('========================================');

                    // Send message to Slack channel (all participants will see it)
                    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${slackBotToken}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(slackPayload)
                    });

                    const slackData = await slackResponse.json();

                    // TEMP LOGGING - Remove after debugging
                    console.log('=== SLACK API RESPONSE ===');
                    console.log('HTTP Status:', slackResponse.status);
                    console.log('Response Data:', JSON.stringify(slackData, null, 2));
                    console.log('==========================');

                    if (!slackData.ok) {
                      console.error('❌ Failed to send message to Slack:', slackData.error);
                      if (slackData.error === 'not_in_channel' || slackData.error === 'channel_not_found') {
                        console.error('⚠️  Bot is not in the channel or channel does not exist');
                      } else if (slackData.error === 'missing_scope') {
                        console.error('⚠️  Missing required Slack OAuth scope: chat:write');
                      }
                    } else {
                      console.log('✅ Message forwarded to Slack channel:', conversationAttrs.slackChannel.channelName);
                      console.log('   Message TS:', slackData.ts);
                      console.log('   Channel:', slackData.channel);
                    }

                    // Handle media attachments
                    if (event.Media && event.Media.length > 0 && event.MessageSid) {
                      for (const media of event.Media) {
                        try {
                          // Note: You would need to implement media forwarding here
                          // This requires downloading from Twilio and uploading to Slack
                          console.log('Media attachment detected:', media.Filename);

                          // Send a message about the media file
                          await fetch('https://slack.com/api/chat.postMessage', {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${slackBotToken}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              channel: channelId,
                              text: `📎 Media file: ${media.Filename || 'attachment'} (${media.ContentType})`
                            })
                          });
                        } catch (mediaError) {
                          console.error('Error forwarding media to Slack:', mediaError);
                        }
                      }
                    }
                  } catch (slackError) {
                    console.error('Error forwarding to Slack channel:', slackError);
                  }
                } else {
                  console.log('Slack bot token not configured, skipping Slack forwarding');
                }
              }
            }
          } catch (slackForwardError) {
            console.error('Error in Slack message forwarding:', slackForwardError);
            // Don't fail the webhook if Slack forwarding fails
          }
        }

        // Example: Track message analytics
        if (event.Body) {
          const wordCount = event.Body.split(' ').length;
          const hasMedia = event.Media && event.Media.length > 0;

          console.log('Message analytics:', {
            wordCount,
            hasMedia,
            mediaCount: event.Media?.length || 0
          });

          // Check if message contains "AskAI" (case insensitive)
          if (event.Body.toLocaleUpperCase().includes('ASKAI') && event.Author && event.ConversationSid) {
            console.log('=== ASKAI DETECTED IN POST-EVENT - CALLING EXTERNAL API ===');
            try {
              // Get or create session ID from conversation attributes
              const client = context.getTwilioClient();
              const serviceSid = event.ChatServiceSid;

              const conversation = await client.conversations.v1
                .services(serviceSid)
                .conversations(event.ConversationSid)
                .fetch();

              const attributes = conversation.attributes ? JSON.parse(conversation.attributes) : {};
              let sessionId = attributes.aiSessionId;

              // Call external AI API
              const apiUrl = (context as any).RESPONSE_SERVER_URL;
              if (!apiUrl) {
                throw new Error('RESPONSE_SERVER_URL environment variable not set');
              }

              const requestBody: any = {
                message: event.Body
              };

              if (sessionId) {
                requestBody.sessionId = sessionId;
              }

              console.log('Calling external API:', apiUrl, requestBody);

              const apiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
              });

              if (!apiResponse.ok) {
                throw new Error(`API call failed with status: ${apiResponse.status}`);
              }

              const apiData = await apiResponse.json();
              console.log('API response:', apiData);

              // Store session ID if this is a new session
              if (apiData.sessionId && !sessionId) {
                attributes.aiSessionId = apiData.sessionId;
                await client.conversations.v1
                  .services(serviceSid)
                  .conversations(event.ConversationSid)
                  .update({
                    attributes: JSON.stringify(attributes)
                  });
                console.log('Stored new session ID:', apiData.sessionId);
              }

              // Send AI response to conversation
              if (apiData.response) {
                await client.conversations.v1
                  .services(serviceSid)
                  .conversations(event.ConversationSid)
                  .messages
                  .create({
                    author: 'AI-Assistant',
                    body: apiData.response
                  });
                console.log('AI response sent to conversation');
              }
            } catch (error) {
              console.error('Failed to call external API:', error);
            }
          }
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
        // console.log('Participant updated:', {
        //   participantSid: event.ParticipantSid,
        //   conversationSid: event.ConversationSid,
        //   identity: event.ParticipantIdentity,
        //   lastReadMessageIndex: event.ParticipantLastReadMessageIndex,
        //   lastReadTimestamp: event.ParticipantLastReadTimestamp,
        //   dateUpdated: event.DateUpdated
        // });
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

  } catch (error: unknown) {
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