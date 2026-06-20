const { createClient } = require('@libsql/client');

const allowedPrivileges = new Set(['Обычный', 'Модератор', 'Администратор']);
const maxDisplayNameLength = 64;
const maxNicknameLength = 64;
const maxEmailLength = 254;
const maxSocialLength = 64;
const maxAvatarUrlLength = 5 * 1024 * 1024;

function getDatabaseUrl() {
  return process.env.TURSO_DATABASE_URL || process.env.BARELANDS_TURSO_DATABASE_URL || '';
}

function getAuthToken() {
  return process.env.TURSO_AUTH_TOKEN || process.env.BARELANDS_TURSO_AUTH_TOKEN || '';
}

let client = null;
let schemaReady = false;

function createConfigError() {
  const error = new Error('Turso profile storage is not configured');
  error.statusCode = 503;
  return error;
}

function getClient() {
  const databaseUrl = getDatabaseUrl();
  const authToken = getAuthToken();

  if (!databaseUrl || !authToken) {
    throw createConfigError();
  }

  if (!client) {
    client = createClient({
      url: databaseUrl,
      authToken,
      intMode: 'string'
    });
  }

  return client;
}

function toBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function toNumber(value, fallback = 0) {
  const number = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
}

function isDataUrl(value) {
  return /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(value);
}

function validateHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateAvatarUrl(value) {
  if (!value) return true;
  if (value.length > maxAvatarUrlLength) return false;
  return isDataUrl(value) || validateHttpUrl(value);
}

function normalizeOptionalString(value, maxLength) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > maxLength ? null : trimmed;
}

function normalizeStoredProfile(profile, fallbackSteamId = '') {
  if (!profile || typeof profile !== 'object') return null;

  const steamId = String(profile.steamId || fallbackSteamId || '').trim();
  if (!/^\d+$/.test(steamId)) return null;

  const now = new Date().toISOString();

  return {
    steamId,
    email: typeof profile.email === 'string' ? profile.email : '',
    displayName: typeof profile.displayName === 'string' && profile.displayName.trim() ? profile.displayName.trim() : `steam_${steamId.slice(-6)}`,
    nickname: typeof profile.nickname === 'string' ? profile.nickname : '',
    avatarUrl: typeof profile.avatarUrl === 'string' ? profile.avatarUrl : '',
    customDisplayName: Boolean(profile.customDisplayName),
    customAvatarUrl: Boolean(profile.customAvatarUrl),
    balance: toNumber(profile.balance, 0),
    privilege: typeof profile.privilege === 'string' && profile.privilege.trim() ? profile.privilege : 'Обычный',
    telegram: typeof profile.telegram === 'string' ? profile.telegram : null,
    discord: typeof profile.discord === 'string' ? profile.discord : null,
    twitch: typeof profile.twitch === 'string' ? profile.twitch : null,
    email_verified_at: typeof profile.email_verified_at === 'string' ? profile.email_verified_at : null,
    isOnline: Boolean(profile.isOnline),
    createdAt: typeof profile.createdAt === 'string' && profile.createdAt.trim() ? profile.createdAt : now,
    updatedAt: typeof profile.updatedAt === 'string' && profile.updatedAt.trim() ? profile.updatedAt : now
  };
}

function rowToProfile(row) {
  return normalizeStoredProfile({
    steamId: row?.steamId,
    email: row?.email,
    displayName: row?.displayName,
    nickname: row?.nickname,
    avatarUrl: row?.avatarUrl,
    customDisplayName: toBoolean(row?.customDisplayName),
    customAvatarUrl: toBoolean(row?.customAvatarUrl),
    balance: toNumber(row?.balance, 0),
    privilege: row?.privilege,
    telegram: typeof row?.telegram === 'string' ? row.telegram : null,
    discord: typeof row?.discord === 'string' ? row.discord : null,
    twitch: typeof row?.twitch === 'string' ? row.twitch : null,
    email_verified_at: typeof row?.email_verified_at === 'string' ? row.email_verified_at : null,
    isOnline: toBoolean(row?.isOnline),
    createdAt: row?.createdAt,
    updatedAt: row?.updatedAt
  });
}

async function ensureSchema() {
  if (schemaReady) return;

  const db = getClient();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS profiles (
      steamId TEXT PRIMARY KEY,
      email TEXT NOT NULL DEFAULT '',
      displayName TEXT NOT NULL DEFAULT '',
      nickname TEXT NOT NULL DEFAULT '',
      avatarUrl TEXT NOT NULL DEFAULT '',
      customDisplayName INTEGER NOT NULL DEFAULT 0,
      customAvatarUrl INTEGER NOT NULL DEFAULT 0,
      balance REAL NOT NULL DEFAULT 0,
      privilege TEXT NOT NULL DEFAULT 'Обычный',
      telegram TEXT,
      discord TEXT,
      twitch TEXT,
      email_verified_at TEXT,
      isOnline INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  schemaReady = true;
}

function normalizeProfileInput(body, existing = null) {
  if (!body || typeof body !== 'object') {
    const error = new Error('Profile body is required');
    error.statusCode = 400;
    throw error;
  }

  const steamId = String(body.steamId || '').trim();
  if (!/^\d+$/.test(steamId)) {
    const error = new Error('steamId is required');
    error.statusCode = 400;
    throw error;
  }

  const email = normalizeOptionalString(body.email, maxEmailLength);
  if (email === null) {
    const error = new Error('Invalid email');
    error.statusCode = 400;
    throw error;
  }

  const displayName = normalizeOptionalString(body.displayName, maxDisplayNameLength);
  if (displayName === null) {
    const error = new Error('Invalid displayName');
    error.statusCode = 400;
    throw error;
  }

  const nickname = normalizeOptionalString(body.nickname, maxNicknameLength);
  if (nickname === null) {
    const error = new Error('Invalid nickname');
    error.statusCode = 400;
    throw error;
  }

  const avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl : '';
  if (!validateAvatarUrl(avatarUrl)) {
    const error = new Error('Invalid avatarUrl');
    error.statusCode = 400;
    throw error;
  }

  const telegram = normalizeOptionalString(body.telegram, maxSocialLength);
  const discord = normalizeOptionalString(body.discord, maxSocialLength);
  const twitch = normalizeOptionalString(body.twitch, maxSocialLength);

  if (telegram === null || discord === null || twitch === null) {
    const error = new Error('Invalid social link');
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();

  return {
    steamId,
    email,
    displayName,
    nickname,
    avatarUrl,
    customDisplayName: Boolean(body.customDisplayName),
    customAvatarUrl: Boolean(body.customAvatarUrl),
    balance: existing ? toNumber(existing.balance, 0) : 0,
    privilege: existing && allowedPrivileges.has(existing.privilege) ? existing.privilege : 'Обычный',
    telegram,
    discord,
    twitch,
    email_verified_at: existing && typeof existing.email_verified_at === 'string' ? existing.email_verified_at : null,
    isOnline: existing ? Boolean(existing.isOnline) : false,
    createdAt: existing && typeof existing.createdAt === 'string' ? existing.createdAt : now,
    updatedAt: now
  };
}

async function getProfileFromDb(steamId) {
  await ensureSchema();
  const db = getClient();
  const result = await db.execute({
    sql: 'SELECT * FROM profiles WHERE steamId = ?',
    args: [steamId]
  });

  return rowToProfile(result.rows?.[0] || null);
}

async function saveProfileToDb(input) {
  await ensureSchema();

  const existing = await getProfileFromDb(String(input.steamId));
  const profile = normalizeProfileInput(input, existing);
  const db = getClient();

  await db.execute({
    sql: `
      INSERT INTO profiles (
        steamId, email, displayName, nickname, avatarUrl, customDisplayName, customAvatarUrl,
        balance, privilege, telegram, discord, twitch, email_verified_at, isOnline, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(steamId) DO UPDATE SET
        email = excluded.email,
        displayName = excluded.displayName,
        nickname = excluded.nickname,
        avatarUrl = excluded.avatarUrl,
        customDisplayName = excluded.customDisplayName,
        customAvatarUrl = excluded.customAvatarUrl,
        balance = excluded.balance,
        privilege = excluded.privilege,
        telegram = excluded.telegram,
        discord = excluded.discord,
        twitch = excluded.twitch,
        email_verified_at = excluded.email_verified_at,
        isOnline = excluded.isOnline,
        createdAt = excluded.createdAt,
        updatedAt = excluded.updatedAt
    `,
    args: [
      profile.steamId,
      profile.email,
      profile.displayName,
      profile.nickname,
      profile.avatarUrl,
      profile.customDisplayName ? 1 : 0,
      profile.customAvatarUrl ? 1 : 0,
      profile.balance,
      profile.privilege,
      profile.telegram,
      profile.discord,
      profile.twitch,
      profile.email_verified_at,
      profile.isOnline ? 1 : 0,
      profile.createdAt,
      profile.updatedAt
    ]
  });

  return profile;
}

async function deleteProfileFromDb(steamId) {
  await ensureSchema();
  const db = getClient();
  await db.execute({
    sql: 'DELETE FROM profiles WHERE steamId = ?',
    args: [steamId]
  });
}

module.exports = {
  getProfile: getProfileFromDb,
  saveProfile: saveProfileToDb,
  deleteProfile: deleteProfileFromDb,
  normalizeProfile: normalizeStoredProfile
};
