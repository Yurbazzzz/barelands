const { getStore } = require('@netlify/blobs');

const storeName = 'barelands-profiles';

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

function getSteamId(path, query) {
  const fromQuery = query?.steamId;
  if (fromQuery) return decodeURIComponent(fromQuery);

  const prefix = '/.netlify/functions/profile/';
  if (!path.startsWith(prefix)) return null;

  const steamId = path.slice(prefix.length);
  return steamId ? decodeURIComponent(steamId) : null;
}

function normalizeProfile(body) {
  const steamId = String(body?.steamId || '').trim();
  if (!/^\d+$/.test(steamId)) {
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

exports.handler = async (event) => {
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
    const store = getStore(storeName, { consistency: 'strong' });

    if (method === 'GET') {
      const steamId = getSteamId(event.path, query);
      if (!steamId) {
        return sendJson(400, { error: 'steamId is required' });
      }

      const profile = await store.getJSON(steamId);
      return sendJson(200, profile || null);
    }

    if (method === 'POST') {
      const body = event.isBase64Encoded
        ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf8'))
        : JSON.parse(event.body || '{}');

      const profile = normalizeProfile(body);
      await store.setJSON(profile.steamId, profile);
      return sendJson(200, profile);
    }

    if (method === 'DELETE') {
      const steamId = getSteamId(event.path, query);
      if (!steamId) {
        return sendJson(400, { error: 'steamId is required' });
      }

      await store.delete(steamId);
      return sendJson(200, { ok: true });
    }

    return sendJson(404, { error: 'Not found' });
  } catch (error) {
    return sendJson(error.statusCode || 500, { error: error.message || 'Internal server error' });
  }
};
