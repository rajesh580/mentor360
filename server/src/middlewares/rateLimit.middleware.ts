import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// 1. General API Rate Limiter (Protects against generic scraping / DDoS)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per 15-minute window
  standardHeaders: true, // Return standard `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  validate: false, // Disable strict IPv6/proxy validation check in containerized environments
  message: {
    error: 'Too many requests from this IP address. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  keyGenerator: (req: Request) => {
    // If authenticated, key by user ID + IP; otherwise IP
    return req.user?.id ? `usr_${req.user.id}` : (req.ip || 'global');
  },
});

// 2. Strict Auth Rate Limiter (Prevents brute-force credential attacks)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Max 15 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  skipSuccessfulRequests: true, // Don't count successful sign-ins against the limit
  message: {
    error: 'Too many failed login attempts from this IP. Please wait 15 minutes before trying again.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
});

// 3. Heavy Import / Export Rate Limiter (Protects CPU/Memory during large Excel parses)
export const importExportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Max 30 bulk upload/export operations per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    error: 'Too many file import or export operations in a short period. Please slow down.',
    code: 'IMPORT_EXPORT_RATE_LIMIT_EXCEEDED',
  },
});
