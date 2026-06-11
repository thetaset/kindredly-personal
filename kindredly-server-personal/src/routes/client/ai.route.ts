/**
 * AI Chat Routes
 *
 * Handles AI chat operations with SSE-based real-time responses
 */

import {Routes} from '@/interfaces/routes.interface';
import {Router} from 'express';
import {ApiReq} from '@/types/api-types';
import {authenticateJWT, errorHelper} from '../../utils/auth_utils';
import {RequestContext} from '@/base/request_context';
import SSEManager from '@/services/sse.manager';
import {AIUsageService} from '@/services/ai_usage.service';
import {ClientOptions, OpenAI} from 'openai';
import {config} from '@/config';

// Initialize OpenAI client
const clientOptions: ClientOptions = {
  apiKey: config.aiConfig.secretKey,
  timeout: 180000, // 3 minutes
  maxRetries: 2,
};
const openai = new OpenAI(clientOptions);

// Temporary in-memory session store (until database implementation)
interface SessionData {
  id: string;
  userId: string;
  name: string;
  sessionType: string;
  messages: Array<{
    userMessage: string;
    aiResponse: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const sessionStore = new Map<string, SessionData>();

class AIRoute implements Routes {
  public router = Router();
  private sseManager: SSEManager;
  private aiUsageService = AIUsageService.instance;

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.sseManager = SSEManager.getInstance();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    /**
     * Send a message to AI
     * Returns 202 immediately, response comes via SSE
     */
    this.router.post(
      '/api/ai/sendMessage',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/ai/sendMessage'>, res) => {
        const ctx = RequestContext.instance(req);
        const userId = ctx.currentUserId;
        const {sessionId, messages, model} = req.body as any;

        console.log(
          `AI message request from user ${userId}, session: ${sessionId || 'new'}, messages: ${messages?.length || 0}`,
        );

        // Return immediately - processing happens in background
        res.status(202).json({
          success: true,
          message: 'Processing started',
          result: {
            sessionId: sessionId || `session_${Date.now()}_${userId}`, // Generate ID if needed
          },
        });

        // Process AI request asynchronously - just pass messages to OpenAI
        this.processAIRequest(ctx, userId, sessionId, messages, model).catch((error) => {
          console.error('Error in async AI processing:', error);
        });
      }),
    );

    /**
     * Get session by ID
     */
    this.router.post(
      '/ai/getSessionById',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/ai/getSessionById'>, res) => {
        const ctx = RequestContext.instance(req);
        const {id} = req.body;

        // TODO: Implement session retrieval from database
        // For now, return empty session
        const result = {
          success: true,
          result: {
            id,
            name: '',
            sessionType: 'general',
            history: [],
          },
        };

        res.json(result);
      }),
    );

    /**
     * Delete session
     */
    this.router.post(
      '/ai/deleteSession',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/ai/deleteSession'>, res) => {
        const ctx = RequestContext.instance(req);
        const {sessionId} = req.body;

        console.log(`Deleting session: ${sessionId}`);

        // TODO: Implement session deletion from database

        res.json({
          success: true,
          message: 'Session deleted',
        });
      }),
    );

    /**
     * List sessions
     */
    this.router.post(
      '/ai/sessionList',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/ai/sessionList'>, res) => {
        const ctx = RequestContext.instance(req);
        const userId = ctx.currentUserId;

        // TODO: Implement session list from database
        const result = {
          success: true,
          result: [],
        };

        res.json(result);
      }),
    );

    /**
     * Get current session ID
     */
    this.router.post(
      '/ai/getCurrentSessionId',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/ai/getCurrentSessionId'>, res) => {
        const ctx = RequestContext.instance(req);

        // TODO: Implement getting current session from user prefs
        res.json({
          success: true,
          result: null,
        });
      }),
    );

    /**
     * Set current session ID
     */
    this.router.post(
      '/ai/setCurrentSessionId',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/ai/setCurrentSessionId'>, res) => {
        const ctx = RequestContext.instance(req);
        const {id} = req.body;

        // TODO: Implement setting current session in user prefs
        res.json({
          success: true,
          result: id,
        });
      }),
    );

    /**
     * Text request (for suggestions, etc.)
     */
    this.router.post(
      '/ai/textRequest',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/ai/textRequest'>, res) => {
        const ctx = RequestContext.instance(req);
        const {instructions, context, schema} = req.body;

        console.log('AI text request:', instructions.substring(0, 100));

        try {
          const messages = [
            {
              role: 'system' as const,
              content: 'You are a helpful assistant. Return valid JSON matching the requested schema.',
            },
            {
              role: 'user' as const,
              content: `${instructions}\n\nContext: ${JSON.stringify(context)}\n\nReturn JSON matching this schema: ${JSON.stringify(schema)}`,
            },
          ];

          const completion = await openai.chat.completions.create({
            messages,
            model: 'gpt-4o-mini',
            response_format: {type: 'json_object'},
          });

          // Best-effort metering (authoritative: server-side provider usage)
          try {
            await this.aiUsageService.recordUsage(ctx, {
              feature: 'textRequest',
              provider: 'openai',
              model: 'gpt-4o-mini',
              usage: completion.usage as any,
              meta: {route: '/ai/textRequest'},
            });
          } catch (e) {
            console.warn('[AI Usage] Failed to record usage for textRequest:', (e as Error).message);
          }

          const result = JSON.parse(completion.choices[0].message.content || '{}');

          res.json({
            success: true,
            result,
          });
        } catch (error: any) {
          console.error('Error in text request:', error);
          throw error;
        }
      }),
    );

    /**
     * AI usage summary (month-to-date)
     */
    this.router.post(
      '/ai/usage/getSummary',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/ai/usage/getSummary'>, res) => {
        const ctx = RequestContext.instance(req);
        const result = await this.aiUsageService.getMonthlySummary(ctx, req.body as any);
        res.json({
          success: true,
          result,
        });
      }),
    );

    /**
     * Send message with streaming response
     * Uses SSE to stream raw chunks as they arrive from OpenAI
     * Client handles JSON parsing and text extraction
     */
    this.router.post('/ai/sendMessageStream', authenticateJWT, async (req: ApiReq<'/ai/sendMessageStream'>, res) => {
      const ctx = RequestContext.instance(req);
      const userId = ctx.currentUserId;
      const {sessionId, messages, messageId, model, mode} = req.body as any;
      const effectiveSessionId = sessionId || `session_${Date.now()}_${userId}`;
      const effectiveMessageId = messageId || `msg_${Date.now()}`;

      console.log(`[AI Stream] Starting streaming chat for user ${userId}, session: ${effectiveSessionId}`);

      // Set up SSE headers - must be set before any writes
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      // Disable compression for this response (critical for real-time streaming)
      res.setHeader('Content-Encoding', 'identity');
      res.flushHeaders();

      // Helper to send SSE event with immediate flush
      const sendEvent = (event: string, data: any) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        // Flush immediately to prevent buffering
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      };

      // Handle client disconnect
      let isClientConnected = true;
      req.on('close', () => {
        console.log(`[AI Stream] Client disconnected for session ${effectiveSessionId}`);
        isClientConnected = false;
      });

      try {
        // Send start event
        sendEvent('start', {
          sessionId: effectiveSessionId,
          messageId: effectiveMessageId,
          timestamp: new Date().toISOString(),
        });

        const openaiStartTime = Date.now();

        const allowedModels = new Set(['gpt-4o-mini', 'o3-mini']);
        const requestedModel = typeof model === 'string' ? model.trim() : '';
        const chosenModel = requestedModel && allowedModels.has(requestedModel) ? requestedModel : 'gpt-4o-mini';

        const shouldForceJsonObject = mode === 'app-editor';

        // Create streaming completion
        const stream = await openai.chat.completions.create({
          messages: messages as any,
          model: chosenModel,
          stream: true,
          ...(shouldForceJsonObject ? {response_format: {type: 'json_object' as const}} : {}),
        });

        let fullContent = '';
        let finishReason: string | null = null;
        let usage: any = null;
        let chunkCount = 0;

        // Process stream chunks - just forward raw content
        for await (const chunk of stream) {
          if (!isClientConnected) {
            console.log(`[AI Stream] Stopping - client disconnected`);
            break;
          }

          const delta = chunk.choices[0]?.delta;
          const content = delta?.content || '';

          if (content) {
            fullContent += content;
            chunkCount++;
            console.log(
              `[AI Stream] 📤 Sending chunk #${chunkCount}: ${content.length} chars, total: ${fullContent.length}`,
            );

            // Send raw chunk - client will parse
            sendEvent('chunk', {
              content,
              accumulated: fullContent,
            });
          }

          if (chunk.choices[0]?.finish_reason) {
            finishReason = chunk.choices[0].finish_reason;
          }

          if (chunk.usage) {
            usage = chunk.usage;
          }
        }

        const duration = Date.now() - openaiStartTime;
        console.log(`[AI Stream] Completed in ${duration}ms, ${fullContent.length} chars`);

        // Best-effort metering (authoritative: server-side provider usage)
        try {
          await this.aiUsageService.recordUsage(ctx, {
            feature: 'chatStream',
            provider: 'openai',
            model: chosenModel,
            usage: usage as any,
            meta: {
              route: '/ai/sendMessageStream',
              sessionId: effectiveSessionId,
              messageId: effectiveMessageId,
              duration,
            },
          });
        } catch (e) {
          console.warn('[AI Usage] Failed to record usage for chatStream:', (e as Error).message);
        }

        // Send completion event with full raw content
        sendEvent('complete', {
          content: fullContent,
          finishReason,
          usage,
          duration,
        });

        sendEvent('done', {timestamp: new Date().toISOString()});
        res.end();
      } catch (error: any) {
        console.error(`[AI Stream] Error:`, error);

        sendEvent('error', {
          message: error.message || 'Unknown error',
          timestamp: new Date().toISOString(),
        });

        res.end();
      }
    });
  }

  /**
   * Process AI request asynchronously and broadcast response via SSE
   * Server simply passes messages to OpenAI - all prompt/context logic handled client-side
   */
  private async processAIRequest(
    ctx: RequestContext,
    userId: string,
    sessionId: string | null,
    messages: Array<{role: string; content: string}>,
    model?: string,
  ): Promise<void> {
    const effectiveSessionId = sessionId || `session_${Date.now()}_${userId}`;

    try {
      console.log(`Processing AI request for session ${effectiveSessionId}, messages: ${messages?.length || 0}`);

      // Call OpenAI with messages prepared by client
      const allowedModels = new Set(['gpt-4o-mini', 'o3-mini']);
      const requestedModel = typeof model === 'string' ? model.trim() : '';
      const chosenModel = requestedModel && allowedModels.has(requestedModel) ? requestedModel : 'gpt-4o-mini';

      const completion = await openai.chat.completions.create({
        messages: messages as any, // Messages prepared by client
        model: chosenModel,
      });

      // Best-effort metering (authoritative: server-side provider usage)
      try {
        await this.aiUsageService.recordUsage(ctx, {
          feature: 'chat',
          provider: 'openai',
          model: chosenModel,
          usage: completion.usage as any,
          meta: {route: '/api/ai/sendMessage', sessionId: effectiveSessionId},
        });
      } catch (e) {
        console.warn('[AI Usage] Failed to record usage for /api/ai/sendMessage:', (e as Error).message);
      }

      const aiResponse = completion.choices[0].message.content || '';

      console.log(`AI response received (${aiResponse.length} chars)`);

      // Try to parse AI response as JSON (for action-based responses)
      let parsedResponse: any = null;
      let action: any = null;
      let displayMessage = aiResponse;

      try {
        // AI might respond with JSON for actions
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);

          // Check if response contains an action
          if (parsedResponse.action && parsedResponse.action.actionId) {
            action = parsedResponse.action;
            console.log(`📋 [AI Route] Parsed action: ${action.actionId}`, action.params);
          }

          // Use respToUser as display message if available
          if (parsedResponse.respToUser) {
            displayMessage = parsedResponse.respToUser;
          }

          // Also check for respToUserData
          if (parsedResponse.respToUserData) {
            console.log(`📋 [AI Route] Response includes data for user`);
          }
        }
      } catch (e) {
        // Not JSON, treat as plain text
        console.log(`[AI Route] AI response is plain text, not JSON`);
      }

      // Broadcast response via SSE to user's connections
      const sseData: any = {
        sessionId: effectiveSessionId,
        messageId: `msg_${Date.now()}`,
        message: displayMessage,
        timestamp: new Date().toISOString(),
      };

      // Include action if present
      if (action) {
        sseData.action = action;
        console.log(`📤 [AI Route] Broadcasting with action: ${action.actionId}`);
      }

      // Include user data if present
      if (parsedResponse?.respToUserData) {
        sseData.userData = parsedResponse.respToUserData;
      }

      await this.sseManager.broadcastToUser(userId, 'ai-response', sseData);

      console.log(`AI response broadcasted successfully for session ${effectiveSessionId}`);

      // TODO: Save to database
      // - Save message to session history
      // - Update session metadata (name from first message, etc.)
    } catch (error: any) {
      console.error(`Error processing AI request for session ${effectiveSessionId}:`, error);

      // Send error via SSE
      await this.sseManager.broadcastToUser(userId, 'ai-error', {
        sessionId: effectiveSessionId,
        error: error.message || 'An error occurred processing your request',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export default AIRoute;
