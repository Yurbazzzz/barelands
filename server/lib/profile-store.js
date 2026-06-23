const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.BARELANDS_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.BARELANDS_SUPABASE_KEY || '';

function createConfigError() {
  const error = new Error('Supabase profile storage is not configured');
  error.statusCode = 503;
  return error;
}

function getClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw createConfigError();
  }
  return createClient(supabaseUrl, supabaseKey);
}

const allowedPrivileges = new Set(['Обычный', 'Модератор', 'Администратор']);
const maxDisplayNameLength = 64;
const maxNicknameLength = 64;
const maxEmailLength = 254;
const maxSocialLength = 64;
const maxAvatarUrlLength = 5 * 1024 * 1024;

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

function supabaseToProfile(row) {
  return normalizeStoredProfile({
    steamId: row?.steam_id,
    email: row?.email,
    displayName: row?.display_name,
    nickname: row?.nickname,
    avatarUrl: row?.avatar_url,
    customDisplayName: toBoolean(row?.custom_display_name),
    customAvatarUrl: toBoolean(row?.custom_avatar_url),
    balance: toNumber(row?.balance, 0),
    privilege: row?.privilege,
    telegram: typeof row?.telegram === 'string' ? row.telegram : null,
    discord: typeof row?.discord === 'string' ? row.discord : null,
    twitch: typeof row?.twitch === 'string' ? row.twitch : null,
    email_verified_at: typeof row?.email_verified_at === 'string' ? row.email_verified_at : null,
    isOnline: toBoolean(row?.is_online),
    createdAt: row?.created_at,
    updatedAt: row?.updated_at
  });
}

function profileToSupabase(profile) {
  return {
    steam_id: profile.steamId,
    email: profile.email,
    display_name: profile.displayName,
    nickname: profile.nickname,
    avatar_url: profile.avatarUrl,
    custom_display_name: profile.customDisplayName ? 1 : 0,
    custom_avatar_url: profile.customAvatarUrl ? 1 : 0,
    balance: profile.balance,
    privilege: profile.privilege,
    telegram: profile.telegram,
    discord: profile.discord,
    twitch: profile.twitch,
    email_verified_at: profile.email_verified_at,
    is_online: profile.isOnline ? 1 : 0,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt
  };
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
  const supabase = getClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('steam_id', String(steamId))
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return supabaseToProfile(data || null);
}

async function saveProfileToDb(input) {
  const existing = await getProfileFromDb(String(input.steamId));
  const profile = normalizeProfileInput(input, existing);

  const supabase = getClient();
  const { error } = await supabase
    .from('profiles')
    .upsert(profileToSupabase(profile));

  if (error) throw error;

  return profile;
}

async function deleteProfileFromDb(steamId) {
  const supabase = getClient();
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('steam_id', String(steamId));

  if (error) throw error;
}

module.exports = {
  getProfile: getProfileFromDb,
  saveProfile: saveProfileToDb,
  deleteProfile: deleteProfileFromDb,
  normalizeProfile: normalizeStoredProfile
};