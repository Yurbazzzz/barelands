const profileStore = require('../../server/lib/profile-store');

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
  if (!path || typeof path !== 'string') return null;
  if (!path.startsWith(prefix)) return null;

  const steamId = path.slice(prefix.length);
  return steamId ? decodeURIComponent(steamId) : null;
}

function readBody(event) {
  if (event.isBase64Encoded) {
    return JSON.parse(Buffer.from(event.body, 'base64').toString('utf8'));
  }

  return JSON.parse(event.body || '{}');
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
    if (method === 'GET') {
      const steamId = getSteamId(event.path, query);
      if (!steamId) {
        return sendJson(400, { error: 'steamId is required' });
      }

      const profile = await profileStore.getProfile(steamId);
      return sendJson(200, profile);
    }

    if (method === 'POST') {
      const body = readBody(event);
      const profile = await profileStore.saveProfile(body);
      return sendJson(200, profile);
    }

    if (method === 'DELETE') {
      const steamId = getSteamId(event.path, query);
      if (!steamId) {
        return sendJson(400, { error: 'steamId is required' });
      }

      await profileStore.deleteProfile(steamId);
      return sendJson(200, { ok: true });
    }

    return sendJson(404, { error: 'Not found' });
  } catch (error) {
    console.error('[profile] handler error:', error);
    return sendJson(error.statusCode || 500, { error: error.message || 'Internal server error' });
  }
};
