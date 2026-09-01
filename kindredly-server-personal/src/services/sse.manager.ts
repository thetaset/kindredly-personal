import {Response} from 'express';
import {KeyValueStore} from '@/base/kv_store';
import {EventBus} from '@/base/event_bus';
import {getKeyValueStore, getEventBus} from '@/base/runtime.factory';
import {config} from '@/config';

interface SSEConnection {
  clientId: string;
  userId: string;
  serverId: string;
  connectedAt: Date;
}

interface SSEMessage {
  event: string;
  data: any;
  targetUserId?: string; // undefined means broadcast to all
  targetClientId?: string; // specific client targeting
}

// Max bytes a connection may hold un-drained in its socket write buffer before
// we disconnect it. SSE payloads are small; a buffer this deep means the
// client is stalled (backgrounded tab, dead NAT path), and without a cap every
// broadcast + heartbeat accumulates in this process's heap indefinitely.
export const SSE_MAX_BUFFERED_BYTES = 1024 * 1024;

class SSEManager {
  private static instance: SSEManager;
  private redis: KeyValueStore;
  /**
   * Cross-process fan-out. Was two dedicated ioredis pub/sub connections held
   * here; the bus owns that pairing now, and in `lite` it is in-process
   * delivery with no Redis at all.
   */
  private bus: EventBus;
  private localConnections = new Map<string, Response>();
  private serverId: string;
  private channelName = 'sse_broadcasts';
  private systemsInitialized = false;

  private constructor() {
    this.serverId = `server_${process.env.HOSTNAME || 'unknown'}_${Date.now()}`;

    this.redis = getKeyValueStore();
    this.bus = getEventBus();

    // Subscribe to SSE broadcast channel (skip in test to avoid flaky external dependency)
    if (process.env.NODE_ENV !== 'test') {
      this.setupRedisSubscription();
    }

    console.info(`SSEManager initialized with serverId: ${this.serverId}`);
  }

  public static getInstance(): SSEManager {
    if (!SSEManager.instance) {
      SSEManager.instance = new SSEManager();
      console.info('SSEManager singleton instance created');
    }
    return SSEManager.instance;
  }

  /**
   * Initialize heartbeat and cleanup systems (can be called multiple times safely)
   */
  public initializePeriodicSystems(): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // Use a flag to prevent multiple initialization
    if (this.systemsInitialized) {
      console.info('SSEManager systems already initialized');
      return;
    }

    console.info('Starting SSEManager periodic systems');
    this.startPeriodicCleanup();
    this.startLocalHeartbeat();
    this.systemsInitialized = true;
  }

  /**
   * Keep idle SSE connections alive by writing a lightweight comment ping to
   * every local connection on an interval shorter than the 60s ALB/nginx idle
   * timeout. A `:`-prefixed comment line is ignored by EventSource, so it keeps
   * the socket non-idle without any client-side handling. This prevents the
   * idle-timeout drops that were triggering client reconnects.
   */
  private startLocalHeartbeat(): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const intervalMs = config.sse.heartbeatIntervalMs;
    const timer = setInterval(() => this.sendLocalHeartbeat(), intervalMs);
    timer.unref?.();
    console.info(`SSE local heartbeat started (${intervalMs}ms)`);
  }

  /**
   * Write a single keep-alive comment ping to every local connection. One bad
   * connection (closed socket) must not break the loop for the others.
   */
  sendLocalHeartbeat(): void {
    this.localConnections.forEach((res, clientId) => {
      // Belt-and-braces reaper: an entry whose socket died without its 'close'
      // listener running (e.g. a disconnect that raced registration) would
      // otherwise sit in the map forever, fed by this very heartbeat.
      if (res.destroyed || res.writableEnded) {
        this.removeConnection(clientId, res).catch(() => {});
        return;
      }
      if (this.evictIfOverBuffered(res, clientId)) {
        return;
      }
      try {
        res.write(': keepalive\n\n');
        res.flush?.();
      } catch (e) {
        // Socket is gone; req.on('close') will remove it. Keep iterating.
        console.warn(`SSE heartbeat write failed for ${clientId}:`, (e as any)?.message || e);
      }
    });
  }

  /**
   * Record a connection attempt for a clientId and return the running count in
   * the current window. Used to throttle clients that reconnect abusively fast
   * (e.g. a buggy client storm) so a single client can't hammer /sync/events.
   */
  async registerConnectAttempt(clientId: string): Promise<number> {
    const key = `sse_conn_rate:${clientId}`;
    // Atomic INCR + EXPIRE in a MULTI so the key ALWAYS has a TTL. A non-atomic
    // incr-then-expire could leave the key with no TTL (if expire fails or the
    // process dies in between), permanently throttling that client. Refreshing
    // the TTL on every attempt also gives a sliding window, which is the desired
    // behaviour for abuse throttling (a sustained storm stays throttled).
    const results = await this.redis.multi().incr(key).expire(key, config.sse.connectWindowSec).exec();
    const count = Number(results?.[0]?.[1] ?? 0);
    return count;
  }

  private setupRedisSubscription(): void {
    // The bus delivers only this channel's messages and logs a throwing handler,
    // so the channel guard and the 'error' listener that used to live here have
    // moved into the two implementations.
    this.bus
      .subscribe(this.channelName, (message: string) => {
        try {
          const sseMessage: SSEMessage = JSON.parse(message);
          this.handleIncomingBroadcast(sseMessage);
        } catch (error) {
          console.error('Error parsing SSE broadcast message:', error);
        }
      })
      .catch((error) => console.error('SSE broadcast subscription failed:', error));
  }

  private handleIncomingBroadcast(message: SSEMessage): void {
    console.log('Received SSE broadcast:', message);
    if (message.targetClientId) {
      // Specific client targeting
      const connection = this.localConnections.get(message.targetClientId);
      if (connection) {
        this.sendSSEMessage(connection, message.event, message.data, true, message.targetClientId);
      }
    } else if (message.targetUserId) {
      // User-specific broadcast
      this.localConnections.forEach((res, clientId) => {
        console.log('Checking clientId:', clientId, 'for userId:', message.targetUserId);
        if (clientId.startsWith(`${message.targetUserId}-`)) {
          console.log(`Sending event '${message.event}' to user ${message.targetUserId} on client ${clientId}`);
          this.sendSSEMessage(res, message.event, message.data, true, clientId);
        }
      });
    } else {
      // Broadcast to all local connections
      this.localConnections.forEach((res, clientId) => {
        this.sendSSEMessage(res, message.event, message.data, true, clientId);
      });
    }
  }

  /**
   * Register a new SSE connection. Private: callers must go through
   * registerConnection, which wires disconnect cleanup BEFORE this method's
   * Redis awaits — calling this directly reintroduces the Response leak that
   * registerConnection exists to close.
   */
  private async addConnection(clientId: string, userId: string, res: Response): Promise<void> {
    // clientId is stable per device install, so a fast reconnect reuses the id
    // while the old socket may still be half-open. Destroy the superseded
    // connection so its eventual 'close' can't linger, and let the
    // owner-guard in removeConnection keep that late cleanup from evicting
    // this new entry.
    const existing = this.localConnections.get(clientId);
    if (existing && existing !== res) {
      try {
        existing.destroy();
      } catch (_e) {
        // Already torn down; nothing to do.
      }
    }

    // Store locally
    this.localConnections.set(clientId, res);

    // Register in Redis with TTL (in case cleanup fails)
    const connection: SSEConnection = {
      clientId,
      userId,
      serverId: this.serverId,
      connectedAt: new Date(),
    };

    await this.redis.setex(
      `sse_connection:${clientId}`,
      3600, // 1 hour TTL
      JSON.stringify(connection),
    );

    // Add to user's connection set
    await this.redis.sadd(`sse_user_connections:${userId}`, clientId);
    await this.redis.expire(`sse_user_connections:${userId}`, 3600);

    console.info(`SSE connection registered: ${clientId} for user ${userId} on ${this.serverId}`);
  }

  /**
   * Register a connection with disconnect cleanup wired BEFORE the async
   * registration work. addConnection awaits three Redis calls; a client that
   * hangs up during that window fires 'close' before a later-attached listener
   * exists, permanently leaking the Response in localConnections (and the 20s
   * heartbeat would keep writing to it forever). Listeners-first plus a
   * post-add re-check closes both sides of the race.
   *
   * Returns false when the client was already gone by the time registration
   * completed — the caller should stop and not write to res.
   */
  async registerConnection(
    clientId: string,
    userId: string,
    req: {on(event: string, listener: (...args: any[]) => void): unknown},
    res: Response,
  ): Promise<boolean> {
    let closed = false;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      this.removeConnection(clientId, res).catch((e) => console.error(`Error during SSE cleanup for ${clientId}:`, e));
    };
    req.on('close', () => {
      cleanup();
      console.debug(`SSE client disconnected: ${clientId}`);
    });
    req.on('error', (err: any) => {
      // Only log actual errors, not normal disconnects
      if (!['ECONNRESET', 'EPIPE'].includes(err?.code) && !String(err?.message || '').includes('aborted')) {
        console.error(`SSE client error for ${clientId}:`, err);
      }
      cleanup();
    });

    await this.addConnection(clientId, userId, res);
    if (closed) {
      // 'close' fired mid-registration, before localConnections held the entry.
      await this.removeConnection(clientId, res);
      return false;
    }
    return true;
  }

  /**
   * Remove SSE connection.
   *
   * `owner` guards against the reconnect race: clientId is stable per device
   * install, so when a client reconnects, the OLD socket's late 'close' would
   * otherwise evict the NEW live connection from the map and Redis, silently
   * dropping pushes until the proxy idle timeout forces another reconnect.
   * When the map holds a different Response than the caller's, the caller's
   * connection was superseded — skip the teardown entirely.
   */
  async removeConnection(clientId: string, owner?: Response): Promise<void> {
    if (owner) {
      const current = this.localConnections.get(clientId);
      if (current && current !== owner) {
        return;
      }
    }

    // Remove locally
    this.localConnections.delete(clientId);

    // Get connection info to find userId
    const connectionData = await this.redis.get(`sse_connection:${clientId}`);
    if (connectionData) {
      const connection: SSEConnection = JSON.parse(connectionData);

      // Remove from Redis
      await this.redis.del(`sse_connection:${clientId}`);
      await this.redis.del(`sse_heartbeat:${clientId}`); // Clean up heartbeat record
      await this.redis.srem(`sse_user_connections:${connection.userId}`, clientId);
    }

    console.info(`SSE connection removed: ${clientId}`);
  }

  /**
   * Broadcast to all connections for a specific user
   */
  async broadcastToUser(userId: string, event: string, data: any): Promise<void> {
    const message: SSEMessage = {
      event,
      data,
      targetUserId: userId,
    };

    await this.bus.publish(this.channelName, JSON.stringify(message));

    // Get connection count for logging
    const connectionCount = await this.getUserConnectionCount(userId);
    if (connectionCount > 0) {
      console.info(`Broadcasted '${event}' event to user ${userId} (${connectionCount} connections across cluster)`);
    }
  }

  /**
   * Broadcast to all connected clients across all servers
   */
  async broadcastToAll(event: string, data: any): Promise<void> {
    const message: SSEMessage = {
      event,
      data,
    };

    await this.bus.publish(this.channelName, JSON.stringify(message));

    const totalConnections = await this.getTotalConnectionCount();
    console.info(`Broadcasted '${event}' event to all clients (${totalConnections} connections across cluster)`);
  }

  /**
   * Send message to specific client
   */
  async broadcastToClient(clientId: string, event: string, data: any): Promise<void> {
    const message: SSEMessage = {
      event,
      data,
      targetClientId: clientId,
    };

    await this.bus.publish(this.channelName, JSON.stringify(message));
  }

  /**
   * Get total active connections across all servers
   */
  async getTotalConnectionCount(): Promise<number> {
    const keys = await this.redis.keys('sse_connection:*');
    return keys.length;
  }

  /**
   * Get active connections for a specific user across all servers
   */
  async getUserConnectionCount(userId: string): Promise<number> {
    const connectionIds = await this.redis.smembers(`sse_user_connections:${userId}`);
    if (connectionIds.length === 0) return 0;

    // Single multi-key EXISTS returns the count of keys that exist (set members
    // are unique), instead of one EXISTS round-trip per connection.
    return await this.redis.exists(...connectionIds.map((clientId) => `sse_connection:${clientId}`));
  }

  async getConnectionDetailsForUser(
    userId: string,
  ): Promise<Array<SSEConnection & {hasHeartbeat: boolean; lastHeartbeat?: string}>> {
    const connectionIds = await this.redis.smembers(`sse_user_connections:${userId}`);
    if (connectionIds.length === 0) return [];

    // Two batched MGETs (connection data + heartbeats) instead of 2 round-trips
    // per connection. Index alignment with connectionIds is preserved.
    const [connData, heartbeatData] = await Promise.all([
      this.redis.mget(connectionIds.map((clientId) => `sse_connection:${clientId}`)),
      this.redis.mget(connectionIds.map((clientId) => `sse_heartbeat:${clientId}`)),
    ]);

    const result: Array<SSEConnection & {hasHeartbeat: boolean; lastHeartbeat?: string}> = [];
    connectionIds.forEach((_clientId, i) => {
      const data = connData[i];
      if (!data) return;

      const heartbeat = heartbeatData[i];
      const connection: SSEConnection = JSON.parse(data);
      result.push({
        ...connection,
        hasHeartbeat: !!heartbeat,
        lastHeartbeat: heartbeat ? new Date(parseInt(heartbeat, 10)).toISOString() : undefined,
      });
    });

    return result;
  }

  /**
   * Get local connection count (this server only)
   */
  getLocalConnectionCount(): number {
    return this.localConnections.size;
  }

  /**
   * Get connections by server
   */
  async getConnectionsByServer(): Promise<Record<string, number>> {
    const keys = await this.redis.keys('sse_connection:*');
    const serverCounts: Record<string, number> = {};
    if (keys.length === 0) return serverCounts;

    // Single MGET instead of one GET per key.
    const values = await this.redis.mget(keys);
    values.forEach((data) => {
      if (!data) return;
      const conn: SSEConnection = JSON.parse(data);
      serverCounts[conn.serverId] = (serverCounts[conn.serverId] || 0) + 1;
    });

    return serverCounts;
  }

  /**
   * Clean up expired connections (run periodically)
   */
  async cleanupExpiredConnections(): Promise<void> {
    const userKeys = await this.redis.keys('sse_user_connections:*');

    for (const userKey of userKeys) {
      const connectionIds = await this.redis.smembers(userKey);
      if (connectionIds.length === 0) continue;

      // Pipeline the existence checks (one round-trip) instead of one EXISTS
      // per connection, then batch the removals.
      const existsPipeline = this.redis.pipeline();
      connectionIds.forEach((clientId) => existsPipeline.exists(`sse_connection:${clientId}`));
      const existsResults = await existsPipeline.exec();

      const staleIds = connectionIds.filter((_clientId, i) => !existsResults?.[i]?.[1]);
      if (staleIds.length > 0) {
        const cleanup = this.redis.pipeline();
        cleanup.srem(userKey, ...staleIds);
        cleanup.del(...staleIds.map((clientId) => `sse_heartbeat:${clientId}`));
        await cleanup.exec();
      }
    }

    // Clean up orphaned heartbeat records (pipeline the checks, batch the del).
    const heartbeatKeys = await this.redis.keys('sse_heartbeat:*');
    if (heartbeatKeys.length > 0) {
      const hbPipeline = this.redis.pipeline();
      heartbeatKeys.forEach((heartbeatKey) => {
        const clientId = heartbeatKey.replace('sse_heartbeat:', '');
        hbPipeline.exists(`sse_connection:${clientId}`);
      });
      const hbResults = await hbPipeline.exec();

      const orphanKeys = heartbeatKeys.filter((_key, i) => !hbResults?.[i]?.[1]);
      if (orphanKeys.length > 0) {
        await this.redis.del(...orphanKeys);
      }
    }
  }

  /**
   * Single eviction rule for over-buffered connections: a connection that
   * stops draining accumulates every write in heap; past the cap, disconnect
   * it (the extension auto-reconnects — retry: 15000 is sent at connect).
   * Shared by the heartbeat and the send path so the two can't diverge.
   */
  private evictIfOverBuffered(res: Response, clientId?: string): boolean {
    if (res.writableLength > SSE_MAX_BUFFERED_BYTES) {
      console.warn(`SSE ${clientId ?? 'connection'} over write-buffer limit (${res.writableLength}B); destroying`);
      res.destroy();
      return true;
    }
    return false;
  }

  /**
   * Send SSE message to response object
   */
  sendSSEMessage(res: Response, event: string, data: any, shouldFlush: boolean = true, clientId?: string): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    // console.log(`📤 Sending SSE event '${event}' to client:`, {
    //   event,
    //   data,
    //   message: message.replace(/\n/g, '\\n'),
    //   dataSize: JSON.stringify(data).length
    // });

    try {
      res.write(message);
      if (shouldFlush) {
        res.flush?.();
      }
      // Backpressure: broadcasts fan out to every local connection, so we never
      // block on one slow client.
      this.evictIfOverBuffered(res, clientId);
      // console.log(`✅ SSE event '${event}' sent successfully`);
    } catch (error) {
      console.error(`❌ Error sending SSE event '${event}':`, error);
      console.error('Response state:', {
        finished: res.finished,
        headersSent: res.headersSent,
        destroyed: res.destroyed,
      });
    }
  }

  /**
   * Setup periodic cleanup and heartbeat management
   */
  startPeriodicCleanup(intervalMs: number = 300000): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // 5 minutes default
    const timer = setInterval(() => {
      this.cleanupExpiredConnections().catch(console.error);
    }, intervalMs);
    timer.unref?.();

    // Start global heartbeat system
    // this.startGlobalHeartbeat();
  }

  /**
   * Start global heartbeat system using Redis pub/sub
   */
  private startGlobalHeartbeat(): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    console.info('Starting global heartbeat system with 10 second intervals');
    const timer = setInterval(async () => {
      try {
        await this.sendGlobalHeartbeat();
      } catch (error) {
        console.error('Error sending global heartbeat:', error);
      }
    }, 10000); // Send heartbeat every 10 seconds for testing
    timer.unref?.();
  }

  /**
   * Manually trigger a heartbeat for testing purposes
   */
  public async triggerTestHeartbeat(): Promise<void> {
    console.info('Manually triggering test heartbeat');
    await this.sendGlobalHeartbeat();
  }

  /**
   * Send a simple test event to all connections
   */
  public async sendTestEvent(): Promise<void> {
    console.info('Sending test event to all connections');
    await this.broadcastToAll('test-event', {
      message: 'This is a test event',
      timestamp: new Date().toISOString(),
      type: 'manual-test',
    });
  }

  /**
   * Send heartbeat to all active connections across all servers
   */
  private async sendGlobalHeartbeat(): Promise<void> {
    const keys = await this.redis.keys('sse_connection:*');
    const timestamp = new Date().toISOString();
    // console.log(`Sending global heartbeat to ${keys.length} connections`);

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const connection: SSEConnection = JSON.parse(data);

        // Check if connection is still valid (not expired)
        const lastHeartbeat = await this.redis.get(`sse_heartbeat:${connection.clientId}`);
        const shouldSendHeartbeat = !lastHeartbeat || Date.now() - parseInt(lastHeartbeat) > 25000; // Send if >25s since last heartbeat

        if (shouldSendHeartbeat) {
          console.log(`Sending heartbeat to client ${connection.clientId} on server ${connection.serverId}`);

          await this.broadcastToClient(connection.clientId, 'heartbeat', {
            timestamp,
            clientId: connection.clientId,
          });

          // Update heartbeat timestamp
          await this.redis.setex(`sse_heartbeat:${connection.clientId}`, 60, Date.now().toString());
        }
      }
    }
  }

  /**
   * Update connection heartbeat timestamp (called when client activity detected)
   */
  async updateConnectionHeartbeat(clientId: string): Promise<void> {
    await this.redis.setex(`sse_heartbeat:${clientId}`, 60, Date.now().toString());
  }

  /**
   * Clear all heartbeat records from Redis
   */
  async clearAllHeartbeats(): Promise<number> {
    const heartbeatKeys = await this.redis.keys('sse_heartbeat:*');
    if (heartbeatKeys.length === 0) {
      console.info('No heartbeat records found to clear');
      return 0;
    }

    await this.redis.del(...heartbeatKeys);
    console.info(`Cleared ${heartbeatKeys.length} heartbeat records`);
    return heartbeatKeys.length;
  }

  /**
   * Clear heartbeats for a specific user
   */
  async clearHeartbeatsForUser(userId: string): Promise<number> {
    const connectionIds = await this.redis.smembers(`sse_user_connections:${userId}`);
    if (connectionIds.length === 0) {
      console.info(`No connections found for user ${userId}`);
      return 0;
    }

    const heartbeatKeys = connectionIds.map((clientId) => `sse_heartbeat:${clientId}`);
    const existingKeys = await Promise.all(
      heartbeatKeys.map(async (key) => {
        const exists = await this.redis.exists(key);
        return exists ? key : null;
      }),
    );

    const validKeys = existingKeys.filter(Boolean) as string[];
    if (validKeys.length === 0) {
      console.info(`No heartbeat records found for user ${userId}`);
      return 0;
    }

    await this.redis.del(...validKeys);
    console.info(`Cleared ${validKeys.length} heartbeat records for user ${userId}`);
    return validKeys.length;
  }

  /**
   * Get comprehensive SSE connection status for admin purposes
   */
  async getSSEConnectionStatus(): Promise<{
    totalConnections: number;
    totalHeartbeats: number;
    connectionsByServer: Record<string, number>;
    userConnections: Array<{userId: string; connectionCount: number}>;
    localConnections: number;
    orphanedHeartbeats: number;
    connectionDetails: Array<SSEConnection & {hasHeartbeat: boolean; lastHeartbeat?: string}>;
  }> {
    // Get all connection keys
    const connectionKeys = await this.redis.keys('sse_connection:*');
    const heartbeatKeys = await this.redis.keys('sse_heartbeat:*');
    const userConnectionKeys = await this.redis.keys('sse_user_connections:*');

    // Get connection details
    const connections = await Promise.all(
      connectionKeys.map(async (key) => {
        const data = await this.redis.get(key);
        const clientId = key.replace('sse_connection:', '');
        const heartbeat = await this.redis.get(`sse_heartbeat:${clientId}`);

        if (data) {
          const connection: SSEConnection = JSON.parse(data);
          return {
            ...connection,
            hasHeartbeat: !!heartbeat,
            lastHeartbeat: heartbeat ? new Date(parseInt(heartbeat)).toISOString() : undefined,
          };
        }
        return null;
      }),
    );

    const validConnections = connections.filter(Boolean) as Array<
      SSEConnection & {hasHeartbeat: boolean; lastHeartbeat?: string}
    >;

    // Group by server
    const connectionsByServer: Record<string, number> = {};
    validConnections.forEach((conn) => {
      connectionsByServer[conn.serverId] = (connectionsByServer[conn.serverId] || 0) + 1;
    });

    // Group by user
    const userConnectionCounts: Record<string, number> = {};
    validConnections.forEach((conn) => {
      userConnectionCounts[conn.userId] = (userConnectionCounts[conn.userId] || 0) + 1;
    });

    const userConnections = Object.entries(userConnectionCounts).map(([userId, connectionCount]) => ({
      userId,
      connectionCount,
    }));

    // Find orphaned heartbeats (heartbeats without connections)
    const heartbeatClientIds = heartbeatKeys.map((key) => key.replace('sse_heartbeat:', ''));
    const connectionClientIds = connectionKeys.map((key) => key.replace('sse_connection:', ''));
    const orphanedHeartbeats = heartbeatClientIds.filter((clientId) => !connectionClientIds.includes(clientId)).length;

    return {
      totalConnections: validConnections.length,
      totalHeartbeats: heartbeatKeys.length,
      connectionsByServer,
      userConnections,
      localConnections: this.localConnections.size,
      orphanedHeartbeats,
      connectionDetails: validConnections,
    };
  }

  /**
   * Clear all SSE-related data from Redis
   */
  async clearAllSSEData(): Promise<{
    connectionsCleared: number;
    heartbeatsCleared: number;
    userConnectionSetsCleared: number;
    localConnectionsCleared: number;
  }> {
    // Get all SSE-related keys
    const connectionKeys = await this.redis.keys('sse_connection:*');
    const heartbeatKeys = await this.redis.keys('sse_heartbeat:*');
    const userConnectionKeys = await this.redis.keys('sse_user_connections:*');

    // Clear all Redis data
    const allKeys = [...connectionKeys, ...heartbeatKeys, ...userConnectionKeys];
    if (allKeys.length > 0) {
      await this.redis.del(...allKeys);
    }

    // Clear local connections
    const localConnectionsCount = this.localConnections.size;
    this.localConnections.forEach((res, clientId) => {
      try {
        res.end();
      } catch (error) {
        console.error(`Error closing local connection ${clientId}:`, error);
      }
    });
    this.localConnections.clear();

    console.info(
      `Cleared all SSE data: ${connectionKeys.length} connections, ${heartbeatKeys.length} heartbeats, ${userConnectionKeys.length} user sets, ${localConnectionsCount} local connections`,
    );

    return {
      connectionsCleared: connectionKeys.length,
      heartbeatsCleared: heartbeatKeys.length,
      userConnectionSetsCleared: userConnectionKeys.length,
      localConnectionsCleared: localConnectionsCount,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    // Close local connections
    this.localConnections.forEach((res, clientId) => {
      try {
        res.end();
      } catch (error) {
        console.error(`Error closing connection ${clientId}:`, error);
      }
    });

    // Cleanup Redis connections for this server
    const keys = await this.redis.keys('sse_connection:*');
    const serverConnections = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const conn: SSEConnection = JSON.parse(data);
        if (conn.serverId === this.serverId) {
          serverConnections.push(key);
        }
      }
    }

    if (serverConnections.length > 0) {
      await this.redis.del(...serverConnections);
    }

    // The bus is deliberately NOT closed here. It used to be two ioredis
    // connections this class created and owned; it is now a process-wide
    // singleton from the runtime factory, and closing it would clear every
    // subscriber's handler - not just this one's. `closeRuntime()` owns its
    // lifecycle. Shutting down SSE means dropping SSE connections, not taking
    // the transport away from whoever else is on it.

    console.info(`SSEManager shutdown complete for ${this.serverId}`);
  }
}

export default SSEManager;
