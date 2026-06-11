import {Routes} from '@interfaces/routes.interface';
import {Router, Request, Response} from 'express';
import {ApiReq} from '@/types/api-types';

import {authenticateJWT, errorHelper, getTargetUserId, removeNullFields} from '../utils/auth_utils';

import SyncService from '@/services/sync.service';
import {SessionService} from '@/services/session.service';
import SSEManager from '@/services/sse.manager';
import {RequestContext} from '@/base/request_context';

class SyncRoute implements Routes {
  public router = Router();

  private syncService = new SyncService();
  private sseManager = SSEManager.getInstance(); // Redis-based SSE manager

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();

    // Start periodic cleanup for expired connections
    this.sseManager.initializePeriodicSystems();
  }

  // SCH-OK
  private initializeRoutes() {
    this.router.post(
      '/sync/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/sync/update'>, res) => {
        const date = req.body.lastUpdate ? new Date(req.body.lastUpdate) : null;
        const results = await this.syncService.runSync(RequestContext.instance(req), getTargetUserId(req), date);
        const result = {
          success: true,
          results: results,
        };
        res.json(removeNullFields(result));
      }),
    );

    // Server-Sent Events endpoint for real-time sync updates
    this.router.get(
      '/sync/events',
      this.authenticateSSE,
      errorHelper(async (req, res) => {
        const ctx = RequestContext.instance(req);
        const userId = ctx.getCurrentUserId();
        const clientId = userId + '-' + ctx.getClientId();

        try {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          });

          res.flushHeaders();

          // Generate unique client ID
          // const clientId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Register connection with SSE manager
          await this.sseManager.addConnection(clientId, userId, res);

          // Send welcome message
          res.write(`data: ${JSON.stringify({message: 'Welcome to the SSE stream!'})}\n\n`);

          try {
            res.flush?.();
          } catch (e) {
            console.warn(`Could not flush response buffer for ${clientId}:`, e.message);
          }

          // Send initial connection confirmation
          this.sseManager.sendSSEMessage(res, 'connected', {
            message: 'SSE connection established',
            timestamp: new Date().toISOString(),
            userId: userId,
            clientId: clientId,
          });

          console.info(`SSE client connected: ${clientId} for user ${userId}`);

          // Handle client disconnect and errors
          req.on('close', async () => {
            try {
              await this.sseManager.removeConnection(clientId);
              console.info(`SSE client disconnected: ${clientId}`);
            } catch (e) {
              console.error(`Error during SSE cleanup for ${clientId}:`, e);
            }
          });

          req.on('error', async (err) => {
            try {
              await this.sseManager.removeConnection(clientId);
              // Only log actual errors, not normal disconnects
              if (!['ECONNRESET', 'EPIPE'].includes(err.code) && !err.message.includes('aborted')) {
                console.error(`SSE client error for ${clientId}:`, err);
              }
            } catch (e) {
              console.error(`Error during SSE error cleanup for ${clientId}:`, e);
            }
          });

          // Update connection timestamp for Redis-based heartbeat system
          await this.sseManager.updateConnectionHeartbeat(clientId);
        } catch (error) {
          console.error(`Fatal SSE error for ${clientId}:`, error);

          // Attempt cleanup even if everything else failed
          try {
            await this.sseManager.removeConnection(clientId);
          } catch (cleanupError) {
            console.error(`Failed to cleanup SSE connection ${clientId}:`, cleanupError);
          }

          // Try to send error response if possible
          try {
            if (!res.headersSent) {
              res.status(500).json({error: 'SSE connection failed'});
            }
          } catch (responseError) {
            console.error(`Failed to send error response for ${clientId}:`, responseError);
          }
        }
      }),
    );
  }

  /**
   * Custom authentication middleware for SSE that supports both header and query parameter auth
   */
  private authenticateSSE = async (req: Request, res: Response, next: Function) => {
    // First try standard JWT authentication from headers
    if (req.headers.authorization) {
      return authenticateJWT(req, res, next);
    }

    // Preferred: one-time short-lived ticket (see /auth/sseTicket) so
    // long-lived JWTs stay out of URLs and logs.
    const ticket = req.query.ticket as string;
    if (ticket) {
      try {
        const authInfo = await SessionService.instance.consumeSseTicket(ticket);
        if (!authInfo) {
          res.status(401).json({error: 'Invalid or expired ticket'});
          return;
        }
        // Same revocation rules as the JWT path — the ticket carries sessionId.
        const sessionCheck = await SessionService.instance.verifyAuthInfoSession(authInfo, {
          context: '/sync/events(ticket)',
        });
        if (!sessionCheck.ok) {
          res.status(401).json({error: 'Session revoked'});
          return;
        }
        (req as any).authInfo = authInfo;
        const ctx = RequestContext.instance(req);
        await ctx.verifyUserExists();
        (req as any).ctx = ctx;
        return next();
      } catch (e) {
        console.error('SSE ticket auth failed', e);
        res.status(401).json({error: 'Authentication failed'});
        return;
      }
    }

    // Legacy: token as query parameter (older clients). Keep working during
    // the transition to tickets.
    const token = req.query.token as string;
    if (token) {
      // Set the authorization header so the standard JWT middleware can process it
      req.headers.authorization = `Bearer ${token}`;
      return authenticateJWT(req, res, next);
    }

    // No authentication provided
    res.status(401).json({error: 'Authentication required'});
  };

  /**
   * Broadcast a message to all connected SSE clients for a specific user
   */
  public async broadcastToUser(userId: string, event: string, data: any): Promise<void> {
    await this.sseManager.broadcastToUser(userId, event, data);
  }

  /**
   * Broadcast a message to all connected SSE clients
   */
  public async broadcastToAll(event: string, data: any): Promise<void> {
    await this.sseManager.broadcastToAll(event, data);
  }

  /**
   * Get the count of active SSE connections across all servers
   */
  public async getActiveConnectionCount(): Promise<number> {
    return await this.sseManager.getTotalConnectionCount();
  }

  /**
   * Get active connections for a specific user across all servers
   */
  public async getUserConnectionCount(userId: string): Promise<number> {
    return await this.sseManager.getUserConnectionCount(userId);
  }

  /**
   * Get local connection count (this server only)
   */
  public getLocalConnectionCount(): number {
    return this.sseManager.getLocalConnectionCount();
  }

  /**
   * Get connection distribution across servers
   */
  public async getConnectionsByServer(): Promise<Record<string, number>> {
    return await this.sseManager.getConnectionsByServer();
  }

  /**
   * Graceful shutdown of SSE connections
   */
  public async shutdown(): Promise<void> {
    await this.sseManager.shutdown();
  }
}

export default SyncRoute;
