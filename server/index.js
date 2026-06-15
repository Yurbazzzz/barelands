const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const port = process.env.PORT || 3001;
const profilesPath = path.join(__dirname, 'profiles.json');

function readProfiles() {
  try {
    if (!fs.existsSync(profilesPath)) return {};
    return JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
  } catch {
    return {};
  }
}

function writeProfiles(profiles) {
  fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error('Request body is too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function normalizeProfile(body) {
  const steamId = String(body.steamId || '').trim();
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
    updatedAt: new Date().toISOString()
  };
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === 'GET' && requestUrl.pathname.startsWith('/api/profile/')) {
      const steamId = decodeURIComponent(requestUrl.pathname.replace('/api/profile/', ''));
      const profiles = readProfiles();
      sendJson(res, 200, profiles[steamId] || null);
      return;
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/profile') {
      const body = await readBody(req);
      const profile = normalizeProfile(body);
      const profiles = readProfiles();
      profiles[profile.steamId] = profile;
      writeProfiles(profiles);
      sendJson(res, 200, profile);
      return;
    }

    if (req.method === 'DELETE' && requestUrl.pathname.startsWith('/api/profile/')) {
      const steamId = decodeURIComponent(requestUrl.pathname.replace('/api/profile/', ''));
      const profiles = readProfiles();
      delete profiles[steamId];
      writeProfiles(profiles);
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message || 'Internal server error' });
  }
});

server.listen(port, () => {
  console.log(`Barelands profile API listening on http://localhost:${port}`);
});
