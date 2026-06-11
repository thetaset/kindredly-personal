import type Redis from 'ioredis';
import {Response} from 'express';
import {getRedisClient, createRedisPubSubClient} from '@/base/redis_client';

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

class SSEManager {
  private static instance: SSEManager;
  private redis: Redis;
  private pubClient: Redis;
  private subClient: Redis;
  private localConnections = new Map<string, Response>();
  private serverId: string;
  private channelName = 'sse_broadcasts';
  private systemsInitialized = false;

  private constructor() {
    this.serverId = `server_${process.env.HOSTNAME || 'unknown'}_${Date.now()}`;

    // Use shared Redis clients from factory
    this.redis = getRedisClient();
    if (process.env.NODE_ENV === 'test') {
      this.pubClient = this.redis;
      this.subClient = this.redis;
    } else {
      this.pubClient = createRedisPubSubClient();
      this.subClient = createRedisPubSubClient();
    }

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
    this.systemsInitialized = true;
  }

  private setupRedisSubscription(): void {
    this.subClient.subscribe(this.channelName);

    this.subClient.on('message', (channel: string, message: string) => {
      if (channel === this.channelName) {
        try {
          const sseMessage: SSEMessage = JSON.parse(message);
          this.handleIncomingBroadcast(sseMessage);
        } catch (error) {
          console.error('Error parsing SSE message from Redis:', error);
        }
      }
    });

    this.subClient.on('error', (error) => {
      console.error('Redis subscription error:', error);
    });
  }

  private handleIncomingBroadcast(message: SSEMessage): void {
    console.log('Received SSE broadcast:', message);
    if (message.targetClientId) {
      // Specific client targeting
      const connection = this.localConnections.get(message.targetClientId);
      if (connection) {
        this.sendSSEMessage(connection, message.event, message.data);
      }
    } else if (message.targetUserId) {
      // User-specific broadcast
      this.localConnections.forEach((res, clientId) => {
        console.log('Checking clientId:', clientId, 'for userId:', message.targetUserId);
        if (clientId.startsWith(`${message.targetUserId}-`)) {
          console.log(`Sending event '${message.event}' to user ${message.targetUserId} on client ${clientId}`);
          this.sendSSEMessage(res, message.event, message.data);
        }
      });
    } else {
      // Broadcast to all local connections
      this.localConnections.forEach((res) => {
        this.sendSSEMessage(res, message.event, message.data);
      });
    }
  }

  /**
   * Register a new SSE connection
   */
  async addConnection(clientId: string, userId: string, res: Response): Promise<void> {
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
   * Remove SSE connection
   */
  async removeConnection(clientId: string): Promise<void> {
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

    await this.pubClient.publish(this.channelName, JSON.stringify(message));

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

    await this.pubClient.publish(this.channelName, JSON.stringify(message));

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

    await this.pubClient.publish(this.channelName, JSON.stringify(message));
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
   * Send SSE message to response object
   */
  sendSSEMessage(res: Response, event: string, data: any, shouldFlush: boolean = true): void {
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

    // Close pub/sub Redis connections (shared client is managed by factory)
    await this.pubClient.quit();
    await this.subClient.quit();

    console.info(`SSEManager shutdown complete for ${this.serverId}`);
  }
}

export default SSEManager;
