import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface CacheEntry<T = any> {
  value: T;
  etag: string;
  expiresAt: number;
  tags: string[];
}

class CacheService {
  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;

  constructor() {
    // Periodic cleanup of expired cache keys every 60 seconds
    setInterval(() => this.pruneExpired(), 60000);
  }

  public get<T>(key: string): { value: T; etag: string } | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return { value: entry.value, etag: entry.etag };
  }

  public set<T>(key: string, value: T, ttlSeconds = 60, tags: string[] = []): string {
    const serialized = JSON.stringify(value);
    const etag = `W/"${crypto.createHash('md5').update(serialized).digest('hex').slice(0, 16)}"`;
    this.cache.set(key, {
      value,
      etag,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tags,
    });
    return etag;
  }

  public invalidateTags(tags: string[]): number {
    let deletedCount = 0;
    const tagSet = new Set(tags);

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some((t) => tagSet.has(t))) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  public invalidateKey(key: string): void {
    this.cache.delete(key);
  }

  public flush(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  public stats() {
    return {
      entriesCount: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 ? `${((this.hits / (this.hits + this.misses)) * 100).toFixed(1)}%` : '0%',
    };
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export const cacheService = new CacheService();

/**
 * Express middleware to automatically cache GET endpoints per tenant with ETag and 304 support
 */
export const cacheMiddleware = (ttlSeconds = 60, tags: string[] | ((req: Request) => string[]) = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const tenantKey = req.tenantId || req.user?.institutionId || 'global';
    const userRole = req.user?.roleCode || 'ANON';
    const cacheKey = `cache:${tenantKey}:${userRole}:${req.originalUrl}`;

    const cached = cacheService.get(cacheKey);

    if (cached) {
      // Check client If-None-Match header for HTTP 304 Not Modified
      if (req.headers['if-none-match'] === cached.etag) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('ETag', cached.etag);
        return res.status(304).end();
      }

      res.setHeader('X-Cache', 'HIT');
      res.setHeader('ETag', cached.etag);
      res.setHeader('Cache-Control', `private, max-age=${ttlSeconds}`);
      return res.json(cached.value);
    }

    res.setHeader('X-Cache', 'MISS');

    // Intercept res.json to capture response and store into cache
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resolvedTags = typeof tags === 'function' ? tags(req) : tags;
        const etag = cacheService.set(cacheKey, body, ttlSeconds, resolvedTags);
        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', `private, max-age=${ttlSeconds}`);
      }
      return originalJson(body);
    };

    next();
  };
};
