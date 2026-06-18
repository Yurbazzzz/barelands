const fs = require('fs');
const path = require('path');

const profilesPath = path.join(__dirname, '..', 'profiles.json');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
};

function sendJson(statusCode, data) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(data)
  };
}

function normalizeStoredProfile(profile) {
  if (!profile || typeof profile !== 'object') return null;

  const steamId = String(profile.steamId || '').trim();
  if (!steamId || !/^\d+$/.test(steamId)) return null;

  return {
    steamId,
    email: typeof profile.email === 'string' ? profile.email : '',
    displayName: typeof profile.displayName === 'string' ? profile.displayName : `steam_${steamId.slice(-6)}`,
    nickname: typeof profile.nickname === 'string' ? profile.nickname : '',
    avatarUrl: typeof profile.avatarUrl === 'string' ? profile.avatarUrl : '',
    customDisplayName: Boolean(profile.customDisplayName),
    customAvatarUrl: Boolean(profile.customAvatarUrl),
    balance: typeof profile.balance === 'number' ? profile.balance : 0,
    privilege: typeof profile.privilege === 'string' ? profile.privilege : 'Обычный',
    telegram: typeof profile.telegram === 'string' ? profile.telegram : null,
    discord: typeof profile.discord === 'string' ? profile.discord : null,
    twitch: typeof profile.twitch === 'string' ? profile.twitch : null,
    email_verified_at: profile.email_verified_at || null,
    isOnline: Boolean(profile.isOnline),
    createdAt: typeof profile.createdAt === 'string' ? profile.createdAt : new Date().toISOString(),
    updatedAt: typeof profile.updatedAt === 'string' ? profile.updatedAt : new Date().toISOString()
  };
}

function normalizeProfiles(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeStoredProfile).filter(Boolean);
  }

  if (value && typeof value === 'object') {
    return Object.values(value).map(normalizeStoredProfile).filter(Boolean);
  }

  return [];
}

function readProfiles() {
  try {
    if (!fs.existsSync(profilesPath)) return [];
    return normalizeProfiles(JSON.parse(fs.readFileSync(profilesPath, 'utf8')));
  } catch {
    return [];
  }
}

function writeProfiles(profiles) {
  fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
}

function findProfile(profiles, steamId) {
  return profiles.find((profile) => profile.steamId === steamId) || null;
}

function normalizeProfile(body) {
  const steamId = String(body?.steamId || '').trim();
  if (!steamId || !/^\d+$/.test(steamId)) {
    const error = new Error('steamId is required');
    error.statusCode = 400;
    throw error;
  }

  return {
    steamId,
    email: typeof body.email === 'string' ? body.email : '',
    displayName: typeof body.displayName === 'string' ? body.displayName : `steam_${steamId.slice(-6)}`,
    nickname: typeof body.nickname === 'string' ? body.nickname : '',
    avatarUrl: typeof body.avatarUrl === 'string' ? body.avatarUrl : '',
    customDisplayName: Boolean(body.customDisplayName),
    customAvatarUrl: Boolean(body.customAvatarUrl),
    balance: typeof body.balance === 'number' ? body.balance : 0,
    privilege: typeof body.privilege === 'string' ? body.privilege : 'Обычный',
    telegram: typeof body.telegram === 'string' ? body.telegram : null,
    discord: typeof body.discord === 'string' ? body.discord : null,
    twitch: typeof body.twitch === 'string' ? body.twitch : null,
    email_verified_at: body.email_verified_at || null,
    isOnline: Boolean(body.isOnline),
    updatedAt: new Date().toISOString()
  };
}

module.exports = async function handler(event) {
  const method = event.httpMethod;
  const query = event.queryStringParameters || {};

  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const profiles = readProfiles();

    if (method === 'GET') {
      const steamId = query.steamId;
      if (!steamId) {
        return sendJson(400, { error: 'steamId is required' });
      }
      return sendJson(200, findProfile(profiles, steamId));
    }

    if (method === 'POST') {
      let body = {};
      try {
        body = event.isBase64Encoded
          ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf8'))
          : JSON.parse(event.body || '{}');
      } catch {
        return sendJson(400, { error: 'Invalid JSON body' });
      }

      const profile = normalizeProfile(body);
      const nextProfiles = profiles.filter((item) => item.steamId !== profile.steamId);
      nextProfiles.push(profile);
      writeProfiles(nextProfiles);
      return sendJson(200, profile);
    }

    if (method === 'DELETE') {
      const steamId = query.steamId;
      if (!steamId) {
        return sendJson(400, { error: 'steamId is required' });
      }

      writeProfiles(profiles.filter((profile) => profile.steamId !== steamId));
      return sendJson(200, { ok: true });
    }

    return sendJson(404, { error: 'Not found' });
  } catch (error) {
    console.error('[profile] handler error:', error);
    return sendJson(error.statusCode || 500, { error: error.message || 'Internal server error' });
  }
};
