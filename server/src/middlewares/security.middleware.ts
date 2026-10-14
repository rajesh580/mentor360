import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Set Request ID for tracing
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('X-Request-Id', requestId);

  // Measure response time
  const start = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const timeMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    // res.setHeader cannot be called after finish, but logged or set beforehand
  });

  // Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};
