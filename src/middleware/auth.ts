import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';
import type { InferSelectModel } from 'drizzle-orm';
import { users } from '../db/schema.ts';

export type DbUser = InferSelectModel<typeof users>;

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: DbUser;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in to continue.' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    const dbUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || '',
      decodedToken.name
    );
    if (dbUser.isSuspended) {
      return res.status(403).json({ error: 'This account has been suspended by moderation.' });
    }
    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
};

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    const dbUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || '',
      decodedToken.name
    );
    req.dbUser = dbUser;
  } catch {
    // Ignore optional auth failure on public routes
  }
  next();
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.dbUser || (req.dbUser.role !== 'admin' && req.dbUser.role !== 'moderator')) {
    return res.status(403).json({ error: 'Administrator privileges required.' });
  }
  next();
};
