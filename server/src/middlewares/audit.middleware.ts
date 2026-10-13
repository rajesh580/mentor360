import { Request, Response, NextFunction } from 'express';
import { query } from '../config/db.js';

export const logAudit = (action: string, entityType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Intercept finish to log only on successful changes
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300 && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        try {
          const institutionId = req.tenantId || req.user?.institutionId;
          const userId = req.user?.id;
          const entityId = req.params.id || (req.body && req.body.id) || null;

          await query(
            `INSERT INTO audit_logs (institution_id, user_id, action, entity_type, entity_id, details, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              institutionId,
              userId,
              action,
              entityType,
              entityId,
              JSON.stringify({ path: req.originalUrl, method: req.method }),
              req.ip,
              req.headers['user-agent'] || null,
            ]
          );
        } catch (err) {
          console.error('Failed to write audit log:', err);
        }
      }
    });

    next();
  };
};
