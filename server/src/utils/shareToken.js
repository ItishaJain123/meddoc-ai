const crypto = require('crypto');

/**
 * Stateless expiring share tokens: base64url(userId|expiresAtMs).hmac
 * Signed with the app encryption key — no DB table, nothing to revoke-list;
 * links simply stop working after expiry.
 */

function getSecret() {
  const key = process.env.MEDDOC_ENCRYPTION_KEY;
  if (!key) throw new Error('MEDDOC_ENCRYPTION_KEY is required for share links');
  return key;
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

function createShareToken(userId, ttlMs = 72 * 60 * 60 * 1000) {
  const expiresAt = Date.now() + ttlMs;
  const payload = Buffer.from(`${userId}|${expiresAt}`).toString('base64url');
  return { token: `${payload}.${sign(payload)}`, expiresAt };
}

function verifyShareToken(token) {
  const [payload, signature] = String(token).split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const [userId, expiresAt] = Buffer.from(payload, 'base64url').toString().split('|');
  if (!userId || !expiresAt || Date.now() > Number(expiresAt)) return null;

  return { userId, expiresAt: Number(expiresAt) };
}

module.exports = { createShareToken, verifyShareToken };
