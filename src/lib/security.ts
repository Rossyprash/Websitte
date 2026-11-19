import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(windowMs: number, maxRequests: number, keyPrefix: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const rawIp = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${hashString(rawIp)}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests from this connection. Please pause briefly and try again.',
      });
    }

    bucket.count += 1;
    next();
  };
}

export function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function generateManagementToken(): string {
  return `unh_${crypto.randomBytes(18).toString('hex')}`;
}

export function sanitizeTextInput(input: string, maxLength = 25000): string {
  if (!input) return '';
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .slice(0, maxLength);
}

export function createSlug(title: string): string {
  const ascii = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 54);
  const suffix = crypto.randomBytes(3).toString('hex');
  return ascii ? `${ascii}-${suffix}` : `story-${suffix}`;
}

export function estimateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

export function buildExcerpt(text: string, maxLen = 190): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen).trim()}…`;
}

const CHALLENGE_SECRET = process.env.CHALLENGE_SECRET || 'unheard_human_gate_2026';

export function createHumanChallenge() {
  const a = crypto.randomInt(2, 12);
  const b = crypto.randomInt(2, 12);
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const payload = `${a + b}:${expiresAt}`;
  const sig = crypto.createHmac('sha256', CHALLENGE_SECRET).update(payload).digest('hex');
  return {
    question: `What is ${a} + ${b}?`,
    token: Buffer.from(`${payload}:${sig}`).toString('base64url'),
  };
}

export function verifyHumanChallenge(token: string, answer: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [expectedSum, expiresAtStr, sig] = decoded.split(':');
    if (!expectedSum || !expiresAtStr || !sig) return false;
    if (Date.now() > Number(expiresAtStr)) return false;
    const expectedSig = crypto
      .createHmac('sha256', CHALLENGE_SECRET)
      .update(`${expectedSum}:${expiresAtStr}`)
      .digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return false;
    }
    return String(answer).trim() === expectedSum;
  } catch {
    return false;
  }
}
