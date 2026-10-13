import { Request, Response, NextFunction } from 'express';

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Super admin can operate across tenants or pass x-institution-id
  if (req.user?.roleCode === 'SUPER_ADMIN') {
    const headerTenant = req.headers['x-institution-id'] as string;
    if (headerTenant) {
      req.tenantId = headerTenant;
    }
    return next();
  }

  const tenantId = req.user?.institutionId || (req.headers['x-institution-id'] as string);

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context (Institution ID) missing.' });
  }

  req.tenantId = tenantId;
  next();
};

export const requireRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User is not authenticated.' });
    }

    if (req.user.roleCode === 'SUPER_ADMIN') {
      return next(); // Super admin has global bypass
    }

    if (!allowedRoles.includes(req.user.roleCode)) {
      return res.status(403).json({
        error: `Forbidden. Role '${req.user.roleCode}' does not have access to this resource.`,
      });
    }

    next();
  };
};
