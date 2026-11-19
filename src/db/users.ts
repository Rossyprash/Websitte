import { count, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';

const OWNER_ADMIN_EMAIL = 'dixmaron@gmail.com';

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const isOwner = email.toLowerCase() === OWNER_ADMIN_EMAIL;
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      const updated = await db
        .update(users)
        .set({
          email,
          displayName: existing[0].displayName || displayName || email.split('@')[0],
          role: isOwner ? 'admin' : existing[0].role,
        })
        .where(eq(users.uid, uid))
        .returning();
      return updated[0];
    }

    const adminCountResult = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.role, 'admin'));
    const hasAdmin = Number(adminCountResult[0]?.value ?? 0) > 0;
    const isInitialAdmin = !hasAdmin || isOwner;

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        role: isInitialAdmin ? 'admin' : 'member',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(isOwner ? { role: 'admin' } : {}),
        },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database user lookup failed:', error);
    throw new Error('Failed to fetch user profile.', { cause: error });
  }
}
