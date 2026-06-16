const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const port = process.env.PORT || 3001;
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = fs.existsSync(distDir) ? distDir : path.join(rootDir, 'src');
const profilesPath = path.join(__dirname, 'profiles.json');
const profileApiPrefix = '/api/profile';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function ensureProfilesFile() {
  fs.mkdirSync(path.dirname(profilesPath), { recursive: true });
  if (!fs.existsSync(profilesPath)) {
    fs.writeFileSync(profilesPath, '{}');
  }
}

function readProfiles() {
  ensureProfilesFile();

  try {
    return JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
  } catch {
    return {};
  }
}

function writeProfiles(profiles) {
  ensureProfilesFile();
  const tempPath = `${profilesPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(profiles, null, 2));
  fs.renameSync(tempPath, profilesPath);
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

function getSteamIdFromPath(pathname) {
  return decodeURIComponent(pathname.replace(`${profileApiPrefix}/`, ''));
}

function resolveStaticPath(pathname) {
  let decodedPath = pathname;

  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    decodedPath = pathname;
  }

  if (decodedPath === '/') {
    decodedPath = '/index.html';
  }

  const requestedPath = path.normalize(path.join(publicDir, decodedPath));
  const relativePath = path.relative(publicDir, requestedPath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) {
    return requestedPath;
  }

  if (!path.extname(decodedPath)) {
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return indexPath;
    }
  }

  return null;
}

function sendStaticFile(res, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(filePath).pipe(res);
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
    if (requestUrl.pathname.startsWith(profileApiPrefix)) {
      if (req.method === 'GET') {
        const steamId = requestUrl.searchParams.get('steamId') || getSteamIdFromPath(requestUrl.pathname);
        if (!steamId) {
          sendJson(res, 400, { error: 'steamId is required' });
          return;
        }

        const profiles = readProfiles();
        sendJson(res, 200, profiles[steamId] || null);
        return;
      }

      if (req.method === 'POST' && requestUrl.pathname === profileApiPrefix) {
        const body = await readBody(req);
        const profile = normalizeProfile(body);
        const profiles = readProfiles();
        profiles[profile.steamId] = profile;
        writeProfiles(profiles);
        sendJson(res, 200, profile);
        return;
      }

      if (req.method === 'DELETE') {
        const steamId = requestUrl.searchParams.get('steamId') || getSteamIdFromPath(requestUrl.pathname);
        if (!steamId) {
          sendJson(res, 400, { error: 'steamId is required' });
          return;
        }

        const profiles = readProfiles();
        delete profiles[steamId];
        writeProfiles(profiles);
        sendJson(res, 200, { ok: true });
        return;
      }

      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const filePath = resolveStaticPath(requestUrl.pathname);
    if (filePath) {
      sendStaticFile(res, filePath);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message || 'Internal server error' });
  }
});

server.listen(port, () => {
  console.log(`Barelands server listening on http://localhost:${port}`);
  console.log(`Profiles stored in ${profilesPath}`);
});
