---
taskId: AAM
status: draft
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
---

# RBAC Advanced Features [aam]

Implement advanced RBAC features including authentication health checks, session management, performance optimizations, and debugging tools for production deployments.

**Part of RBAC Series**: [aai] → [aaj] → [aak] → [aal] → **[aam]**

**Prerequisites**:

- [aai] RBAC Database Schema & Core Infrastructure
- [aaj] RBAC useGrants Hook & Client Components
- [aak] RBAC Page & Route Protection
- [aal] RBAC Menu Integration

## Requirements Analysis

Advanced features for production-ready RBAC:

- **Auth Health Checks**: Verify authentication service connectivity
- **Session Management**: Enhanced session control and cache invalidation
- **Performance Monitoring**: RBAC operation timing and optimization
- **Debug Mode**: Development and troubleshooting tools
- **Cache Management**: Advanced permission caching strategies

## Authentication Health Checks

### Auth Ping Endpoint

```ts
// src/app/api/auth/ping/route.ts
export async function GET(request: Request) {
  try {
    const { user, grants, roles } = await authenticateRequest(request);

    return Response.json({
      status: "authenticated",
      user: {
        id: user.id,
        email: user.email,
        app_id: user.app_id,
      },
      permissions: {
        grants: grants.length,
        roles: roles.length,
        cached: await isCacheValid(user.id),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        status: "unauthenticated",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 401 }
    );
  }
}
```

### Client-Side Health Monitor

```tsx
const useAuthHealthCheck = () => {
  const [health, setHealth] = useState<"unknown" | "healthy" | "unhealthy">(
    "unknown"
  );
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/ping");
      const data = await response.json();

      setHealth(response.ok ? "healthy" : "unhealthy");
      setLastCheck(new Date());

      return data;
    } catch (error) {
      setHealth("unhealthy");
      setLastCheck(new Date());
      throw error;
    }
  }, []);

  useEffect(() => {
    // Check health on mount
    checkHealth();

    // Set up periodic health checks
    const interval = setInterval(checkHealth, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [checkHealth]);

  return { health, lastCheck, checkHealth };
};
```

## Enhanced Session Management

### Session Cache Control

```ts
// src/42go/rbac/lib/sessionManager.ts
export class RBACSessionManager {
  private cacheTimeout: number;
  private maxCacheAge: number;

  constructor(
    options: {
      cacheTimeout?: number;
      maxCacheAge?: number;
    } = {}
  ) {
    this.cacheTimeout = options.cacheTimeout ?? 15 * 60 * 1000; // 15 minutes
    this.maxCacheAge = options.maxCacheAge ?? 60 * 60 * 1000; // 1 hour
  }

  async getPermissions(
    userId: string,
    options?: {
      maxCacheAge?: number;
      forceRefresh?: boolean;
    }
  ): Promise<UserPermissions> {
    const cacheKey = `rbac:${userId}`;
    const maxAge = options?.maxCacheAge ?? this.maxCacheAge;

    if (!options?.forceRefresh) {
      const cached = await this.getCachedPermissions(cacheKey, maxAge);
      if (cached) {
        return cached;
      }
    }

    const permissions = await this.fetchFreshPermissions(userId);
    await this.cachePermissions(cacheKey, permissions, this.cacheTimeout);

    return permissions;
  }

  async invalidateCache(userId: string): Promise<void> {
    const cacheKey = `rbac:${userId}`;
    await this.deleteCachedPermissions(cacheKey);
  }

  async invalidateAppCache(appId: string): Promise<void> {
    // Invalidate all permissions for an app
    const pattern = `rbac:*:${appId}`;
    await this.deleteCachedPermissions(pattern);
  }

  private async getCachedPermissions(
    cacheKey: string,
    maxAge: number
  ): Promise<UserPermissions | null> {
    try {
      const cached = await redis.get(cacheKey);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const age = Date.now() - data.timestamp;

      if (age > maxAge) {
        await redis.del(cacheKey);
        return null;
      }

      return data.permissions;
    } catch (error) {
      console.error("Cache read error:", error);
      return null;
    }
  }

  private async cachePermissions(
    cacheKey: string,
    permissions: UserPermissions,
    ttl: number
  ): Promise<void> {
    try {
      const data = {
        permissions,
        timestamp: Date.now(),
      };

      await redis.setex(cacheKey, Math.ceil(ttl / 1000), JSON.stringify(data));
    } catch (error) {
      console.error("Cache write error:", error);
      // Non-fatal: continue without caching
    }
  }
}
```

### Realtime Permission Updates

```ts
// src/42go/rbac/hooks/useRealtimePermissions.ts
export const useRealtimePermissions = (userId: string) => {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`/api/auth/ws?userId=${userId}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "permissions_updated") {
        setPermissions(data.permissions);
        setLastUpdate(new Date(data.timestamp));

        // Invalidate local cache
        rbacSessionManager.invalidateCache(userId);
      }
    };

    ws.onerror = (error) => {
      console.error("Realtime permissions error:", error);
    };

    return () => {
      ws.close();
    };
  }, [userId]);

  return { permissions, lastUpdate };
};
```

## Performance Monitoring

### RBAC Performance Tracker

```ts
// src/42go/rbac/lib/performanceTracker.ts
export class RBACPerformanceTracker {
  private metrics: Map<string, PerformanceMetric[]> = new Map();

  async trackOperation<T>(
    operation: string,
    task: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();

    try {
      const result = await task();
      const duration = performance.now() - start;

      this.recordMetric(operation, {
        duration,
        success: true,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      const duration = performance.now() - start;

      this.recordMetric(operation, {
        duration,
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });

      throw error;
    }
  }

  getMetrics(operation?: string): PerformanceReport {
    if (operation) {
      return this.generateReport(operation, this.metrics.get(operation) || []);
    }

    const allMetrics: Record<string, PerformanceMetric[]> = {};
    for (const [op, metrics] of this.metrics.entries()) {
      allMetrics[op] = metrics;
    }

    return this.generateAggregateReport(allMetrics);
  }

  private recordMetric(operation: string, metric: PerformanceMetric): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const metrics = this.metrics.get(operation)!;
    metrics.push(metric);

    // Keep only last 100 metrics per operation
    if (metrics.length > 100) {
      metrics.shift();
    }
  }
}

interface PerformanceMetric {
  duration: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

interface PerformanceReport {
  operation: string;
  totalCalls: number;
  successRate: number;
  averageDuration: number;
  medianDuration: number;
  p95Duration: number;
  errors: string[];
}
```

### Performance Monitoring Hook

```tsx
const useRBACPerformance = () => {
  const [metrics, setMetrics] = useState<PerformanceReport | null>(null);

  const refreshMetrics = useCallback(() => {
    const report = rbacPerformanceTracker.getMetrics();
    setMetrics(report);
  }, []);

  useEffect(() => {
    refreshMetrics();

    // Refresh metrics every 30 seconds
    const interval = setInterval(refreshMetrics, 30000);

    return () => clearInterval(interval);
  }, [refreshMetrics]);

  return { metrics, refreshMetrics };
};
```

## Debug Mode & Development Tools

### RBAC Debug Panel

```tsx
const RBACDebugPanel: React.FC = () => {
  const { user } = useSession();
  const { health } = useAuthHealthCheck();
  const { metrics } = useRBACPerformance();
  const [debugMode, setDebugMode] = useState(false);

  if (!user || process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setDebugMode(!debugMode)}
        className={`px-3 py-2 rounded text-sm font-medium ${
          health === "healthy"
            ? "bg-green-500 text-white"
            : "bg-red-500 text-white"
        }`}
      >
        RBAC Debug
      </button>

      {debugMode && (
        <div className="absolute bottom-12 right-0 w-96 bg-white border shadow-lg rounded p-4">
          <h3 className="font-semibold mb-2">RBAC Debug Panel</h3>

          <div className="space-y-2 text-sm">
            <div>
              <strong>Auth Status:</strong>
              <span
                className={`ml-2 px-2 py-1 rounded text-xs ${
                  health === "healthy"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {health}
              </span>
            </div>

            <div>
              <strong>User ID:</strong> {user.id}
            </div>

            <div>
              <strong>App ID:</strong> {user.app_id}
            </div>

            {metrics && (
              <div>
                <strong>Performance:</strong>
                <div className="ml-2 text-xs">
                  Avg: {metrics.averageDuration.toFixed(2)}ms Success:{" "}
                  {(metrics.successRate * 100).toFixed(1)}%
                </div>
              </div>
            )}

            <div className="pt-2 border-t">
              <button
                onClick={() => rbacSessionManager.invalidateCache(user.id)}
                className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

### Debug Logging

```ts
// src/42go/rbac/lib/debugLogger.ts
export class RBACDebugLogger {
  private enabled: boolean;

  constructor() {
    this.enabled =
      process.env.NODE_ENV === "development" ||
      process.env.RBAC_DEBUG === "true";
  }

  logPermissionCheck(
    policy: RBACPolicyBase,
    result: boolean,
    context?: any
  ): void {
    if (!this.enabled) return;

    console.group(`🔐 RBAC Permission Check`);
    console.log("Policy:", policy);
    console.log("Result:", result ? "✅ GRANTED" : "❌ DENIED");
    if (context) {
      console.log("Context:", context);
    }
    console.groupEnd();
  }

  logCacheHit(key: string, age: number): void {
    if (!this.enabled) return;

    console.log(`💾 RBAC Cache HIT: ${key} (age: ${age}ms)`);
  }

  logCacheMiss(key: string): void {
    if (!this.enabled) return;

    console.log(`❌ RBAC Cache MISS: ${key}`);
  }

  logPerformance(operation: string, duration: number): void {
    if (!this.enabled) return;

    const emoji = duration > 1000 ? "🐌" : duration > 500 ? "⚡" : "🚀";
    console.log(`${emoji} RBAC ${operation}: ${duration.toFixed(2)}ms`);
  }
}
```

## Cache Management Strategies

### Multi-Level Caching

```ts
// src/42go/rbac/lib/cacheStrategy.ts
export class RBACCacheStrategy {
  private memoryCache = new Map<string, CacheEntry>();
  private redisCache: Redis;

  constructor(redisClient: Redis) {
    this.redisCache = redisClient;
  }

  async get(key: string, maxAge: number): Promise<any | null> {
    // Level 1: Memory cache (fastest)
    const memoryResult = this.getFromMemory(key, maxAge);
    if (memoryResult !== null) {
      return memoryResult;
    }

    // Level 2: Redis cache
    const redisResult = await this.getFromRedis(key, maxAge);
    if (redisResult !== null) {
      // Promote to memory cache
      this.setInMemory(key, redisResult, maxAge);
      return redisResult;
    }

    return null;
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    // Set in both caches
    await Promise.all([
      this.setInMemory(key, value, ttl),
      this.setInRedis(key, value, ttl),
    ]);
  }

  async invalidate(pattern: string): Promise<void> {
    // Invalidate memory cache
    for (const key of this.memoryCache.keys()) {
      if (this.matchesPattern(key, pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Invalidate Redis cache
    const keys = await this.redisCache.keys(pattern);
    if (keys.length > 0) {
      await this.redisCache.del(...keys);
    }
  }

  private getFromMemory(key: string, maxAge: number): any | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > maxAge) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.value;
  }

  private setInMemory(key: string, value: any, ttl: number): void {
    this.memoryCache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });

    // Clean up expired entries
    setTimeout(() => {
      this.memoryCache.delete(key);
    }, ttl);
  }
}

interface CacheEntry {
  value: any;
  timestamp: number;
  ttl: number;
}
```

## Goals

- [ ] Implement auth health check endpoint `/api/auth/ping`
- [ ] Create session manager with advanced cache control
- [ ] Add performance tracking for RBAC operations
- [ ] Build debug panel for development environment
- [ ] Implement multi-level caching strategy
- [ ] Add realtime permission update capability
- [ ] Create RBAC administration dashboard
- [ ] Add comprehensive logging and monitoring
- [ ] Implement cache invalidation strategies
- [ ] Add performance optimization recommendations

## Acceptance Criteria

### Authentication Health Checks

- [ ] `/api/auth/ping` endpoint returns authentication status
- [ ] Health check includes permission summary and cache status
- [ ] Client-side health monitoring with periodic checks
- [ ] Health status displayed in debug panel

### Session Management

- [ ] Advanced cache control with configurable timeouts
- [ ] Manual cache invalidation for users and apps
- [ ] Cache hit/miss tracking and reporting
- [ ] Graceful degradation when cache is unavailable

### Performance Monitoring

- [ ] Operation timing for all RBAC functions
- [ ] Performance metrics collection and reporting
- [ ] Slow operation detection and alerting
- [ ] Performance optimization recommendations

### Debug & Development Tools

- [ ] Debug panel available in development mode
- [ ] Comprehensive logging with configurable levels
- [ ] Cache inspection and management tools
- [ ] Permission testing interface

### Production Features

- [ ] Redis-based distributed caching
- [ ] WebSocket support for realtime updates
- [ ] Monitoring dashboard for administrators
- [ ] Production-ready error handling and logging

## Development Plan

### Phase 1: Health Checks & Monitoring

**1.1 Auth Ping Endpoint** (`src/app/api/auth/ping/route.ts`)

- Authentication status endpoint
- Permission summary response
- Cache validity checking
- Error handling and status codes

**1.2 Health Check Hook** (`src/42go/rbac/hooks/useAuthHealthCheck.ts`)

- Client-side health monitoring
- Periodic health checks
- Health status state management
- Integration with UI components

### Phase 2: Enhanced Session Management

**2.1 Session Manager** (`src/42go/rbac/lib/sessionManager.ts`)

- Advanced cache control
- Configurable timeouts
- Cache invalidation strategies
- Redis integration

**2.2 Realtime Updates** (`src/42go/rbac/hooks/useRealtimePermissions.ts`)

- WebSocket connection management
- Permission update notifications
- Cache invalidation triggers
- Error handling and reconnection

### Phase 3: Performance & Debugging

**3.1 Performance Tracker** (`src/42go/rbac/lib/performanceTracker.ts`)

- Operation timing
- Metrics collection
- Performance reporting
- Optimization recommendations

**3.2 Debug Tools** (`src/42go/rbac/components/RBACDebugPanel.tsx`)

- Development debug panel
- Cache inspection tools
- Permission testing interface
- Performance visualization

### Phase 4: Production Features

**4.1 Multi-Level Caching** (`src/42go/rbac/lib/cacheStrategy.ts`)

- Memory + Redis caching
- Cache promotion strategies
- Distributed cache invalidation
- Performance optimization

**4.2 Administration Dashboard** (`src/app/(app)/admin/rbac/`)

- RBAC monitoring interface
- User permission management
- Performance metrics dashboard
- Cache management tools

## Architecture Decisions

### Multi-Level Caching Strategy

- **Decision**: Implement memory + Redis caching
- **Rationale**: Balance performance with scalability
- **Implementation**: Automatic cache promotion and invalidation

### Debug Mode Only in Development

- **Decision**: Debug panel and verbose logging only in development
- **Rationale**: Prevent performance impact and information leakage in production
- **Implementation**: Environment-based feature flags

### WebSocket for Realtime Updates

- **Decision**: Use WebSocket for permission update notifications
- **Rationale**: Immediate permission changes for critical security updates
- **Implementation**: Optional feature with graceful degradation

## Integration Points

### Environment Configuration

```env
# .env.local
RBAC_DEBUG=true
RBAC_CACHE_TTL=900000
RBAC_MAX_CACHE_AGE=3600000
RBAC_REALTIME_ENABLED=true
REDIS_URL=redis://localhost:6379
```

### Health Check Integration

```tsx
// Integration with existing health monitoring
const AppHealthCheck: React.FC = () => {
  const { health: authHealth } = useAuthHealthCheck();
  const { health: dbHealth } = useDatabaseHealth();

  return (
    <div className="health-status">
      <HealthIndicator label="Auth" status={authHealth} />
      <HealthIndicator label="Database" status={dbHealth} />
    </div>
  );
};
```

## Performance Considerations

### Cache Optimization

- **Memory Cache**: Fastest access for frequently used permissions
- **Redis Cache**: Distributed caching for scalability
- **Cache Warming**: Pre-populate cache for common permission patterns

### Monitoring Overhead

- **Minimal Impact**: Performance tracking adds <1ms overhead
- **Sampling**: Optional sampling for high-traffic applications
- **Async Logging**: Non-blocking debug and performance logging

## Next Steps

After completing all RBAC stories:

1. **Integration Testing**: Full RBAC system testing across all components
2. **Performance Optimization**: Based on real-world usage patterns
3. **Documentation**: Complete RBAC system documentation
4. **Security Audit**: Third-party security review of RBAC implementation
