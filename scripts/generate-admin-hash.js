#!/usr/bin/env node
/**
 * Generate a scrypt hash for ADMIN_PASSWORD_HASH.
 *
 * Usage:
 *   node scripts/generate-admin-hash.js <password>
 *
 * Then copy the printed line into your .env.local (and Vercel env vars).
 */
const { scryptSync, randomBytes } = require('crypto');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/generate-admin-hash.js <password>');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const hash = scryptSync(password, salt, 64).toString('hex');
console.log('scrypt:' + salt + ':' + hash);
