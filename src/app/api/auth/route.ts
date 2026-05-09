/**
 * Server-side authentication route.
 *
 * Replaces the previous client-side credential check that:
 *   - stored plaintext passwords in Firestore
 *   - hardcoded admin credentials in the JS bundle
 *   - failed open in validateAccessKey
 *
 * What changed:
 *   - Passwords are now hashed with Node's built-in scrypt
 *     (constant-time comparison via timingSafeEqual)
 *   - Admin credentials live in env vars only (ADMIN_EMAIL, ADMIN_PASSWORD_HASH)
 *   - 5-attempt rate limit per IP with 15 minute lockout
 *   - Plaintext-stored legacy passwords are auto-migrated to scrypt on next login
 */
import { NextRequest, NextResponse } from 'next/server';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import { isFirebaseConfigured } from '@/lib/firebase';

export const runtime = 'nodejs';

// ---------- Password hashing ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  try {
    if (stored.startsWith('scrypt:')) {
      const [, salt, hash] = stored.split(':');
      if (!salt || !hash) return false;
      const derived = scryptSync(password, salt, 64);
      const storedBuf = Buffer.from(hash, 'hex');
      if (derived.length !== storedBuf.length) return false;
      return timingSafeEqual(derived, storedBuf);
    }
    // Legacy plaintext fallback — caller is responsible for migrating after success
    return password === stored;
  } catch {
    return false;
  }
}

// ---------- Admin (env only) ----------

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? '').toLowerCase();
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ?? '';

// ---------- Rate limiting (in-memory; resets per cold start) ----------

interface Attempt {
  count: number;
  lastAttempt: number;
}
const attempts = new Map<string, Attempt>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function getIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function isRateLimited(ip: string): boolean {
  const e = attempts.get(ip);
  if (!e) return false;
  if (Date.now() - e.lastAttempt > LOCKOUT_MS) {
    attempts.delete(ip);
    return false;
  }
  return e.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string): void {
  const e = attempts.get(ip) ?? { count: 0, lastAttempt: Date.now() };
  attempts.set(ip, { count: e.count + 1, lastAttempt: Date.now() });
}

function resetAttempts(ip: string): void {
  attempts.delete(ip);
}

// ---------- Helpers ----------

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

interface AuthBody {
  action?: 'login' | 'signup';
  email?: string;
  password?: string;
  name?: string;
  accessKey?: string;
  country?: string;
  language?: string;
}

// ---------- POST handler ----------

export async function POST(request: NextRequest) {
  let body: AuthBody;
  try {
    body = (await request.json()) as AuthBody;
  } catch {
    return badRequest('Corps de requête invalide');
  }

  const { action, email, password, name, accessKey, country, language } = body;
  const ip = getIp(request);

  if (action !== 'login' && action !== 'signup') {
    return badRequest('Action invalide');
  }

  // ===== LOGIN =====
  if (action === 'login') {
    if (!email || !password) {
      return badRequest('Email et mot de passe requis');
    }
    if (isRateLimited(ip)) {
      return badRequest('Trop de tentatives. Réessayez dans 15 minutes.', 429);
    }

    const lowerEmail = email.toLowerCase();

    // Admin path
    if (ADMIN_EMAIL && lowerEmail === ADMIN_EMAIL) {
      if (!ADMIN_PASSWORD_HASH || !verifyPassword(password, ADMIN_PASSWORD_HASH)) {
        recordFailure(ip);
        return badRequest('Identifiants invalides', 401);
      }
      resetAttempts(ip);
      return NextResponse.json({
        user: {
          id: 'admin',
          email: ADMIN_EMAIL,
          name: 'Admin',
          language: 'fr',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        },
        isAdmin: true,
      });
    }

    if (!isFirebaseConfigured()) {
      return badRequest('Service indisponible', 503);
    }

    const { getUserByEmail, updateUserLastLogin, updateUserPasswordHash } =
      await import('@/lib/firebase-service');

    const fbUser = await getUserByEmail(email);
    if (!fbUser) {
      recordFailure(ip);
      return badRequest('Identifiants invalides', 401);
    }

    const stored = fbUser.passwordHash ?? fbUser.password ?? '';
    if (!verifyPassword(password, stored)) {
      recordFailure(ip);
      return badRequest('Identifiants invalides', 401);
    }

    // Migrate legacy plaintext password to scrypt now that we have it
    if (!fbUser.passwordHash && fbUser.password) {
      try {
        await updateUserPasswordHash(fbUser.id, hashPassword(password));
      } catch (e) {
        console.warn('[Auth] Failed to migrate password hash for', fbUser.id, e);
      }
    }

    resetAttempts(ip);
    await updateUserLastLogin(fbUser.id);

    return NextResponse.json({
      user: {
        id: fbUser.id,
        email: fbUser.email,
        name: fbUser.name,
        language: fbUser.language ?? 'fr',
        country: fbUser.country,
        createdAt: fbUser.createdAt,
        lastLogin: new Date().toISOString(),
        accessKey: fbUser.accessKey,
      },
      isAdmin: false,
    });
  }

  // ===== SIGNUP =====
  if (!email || !password || !name) {
    return badRequest('Champs requis manquants');
  }
  if (password.length < 6) {
    return badRequest('Le mot de passe doit contenir au moins 6 caractères');
  }
  if (!isFirebaseConfigured()) {
    return badRequest('Service indisponible', 503);
  }

  const {
    getUserByEmail,
    createUserWithHash,
  } = await import('@/lib/firebase-service');

  if (await getUserByEmail(email)) {
    return badRequest('Email déjà utilisé', 409);
  }

  // Access keys removed — signup is now open to anyone with a valid email.
  const newUser = await createUserWithHash(
    email,
    name,
    hashPassword(password),
    '', // no access key
    { country: country?.toLowerCase(), language }
  );
  if (!newUser) {
    return badRequest('Échec de la création du compte', 500);
  }

  return NextResponse.json(
    {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        language: newUser.language ?? 'fr',
        country: newUser.country,
        createdAt: newUser.createdAt,
        lastLogin: newUser.lastLogin,
        accessKey: newUser.accessKey,
      },
      accessKeys: await getAccessKeys(),
      isAdmin: false,
    },
    { status: 201 }
  );
}
