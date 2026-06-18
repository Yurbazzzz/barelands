const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const port = process.env.PORT || 3001;
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = fs.existsSync(distDir) ? distDir : path.join(rootDir, 'src');
const profilesPath = process.env.RENDER_TMPDIR
  ? path.join(process.env.RENDER_TMPDIR, 'profiles.json')
  : path.join(__dirname, 'profiles.json');
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

function normalizeStoredProfile(profile) {
  if (!profile || typeof profile !== 'object') return null;

  const steamId = String(profile.steamId || '').trim();
  if (!/^\d+$/.test(steamId)) return null;

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

function ensureProfilesFile() {
  fs.mkdirSync(path.dirname(profilesPath), { recursive: true });
  if (!fs.existsSync(profilesPath)) {
    fs.writeFileSync(profilesPath, '[]');
  }
}

function readProfiles() {
  ensureProfilesFile();

  try {
    return normalizeProfiles(JSON.parse(fs.readFileSync(profilesPath, 'utf8')));
  } catch {
    return [];
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

function normalizeProfile(body, existing = {}) {
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
    createdAt: typeof existing.createdAt === 'string' ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function findProfile(profiles, steamId) {
  return profiles.find((profile) => profile.steamId === steamId) || null;
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
      const profiles = readProfiles();

      if (req.method === 'GET') {
        const steamId = requestUrl.searchParams.get('steamId') || getSteamIdFromPath(requestUrl.pathname);
        if (!steamId) {
          sendJson(res, 400, { error: 'steamId is required' });
          return;
        }

        sendJson(res, 200, findProfile(profiles, steamId));
        return;
      }

      if (req.method === 'POST' && requestUrl.pathname === profileApiPrefix) {
        const body = await readBody(req);
        const existing = findProfile(profiles, String(body.steamId || ''));
        const profile = normalizeProfile(body, existing);
        const nextProfiles = profiles.filter((item) => item.steamId !== profile.steamId);
        nextProfiles.push(profile);
        writeProfiles(nextProfiles);
        sendJson(res, 200, profile);
        return;
      }

      if (req.method === 'DELETE') {
        const steamId = requestUrl.searchParams.get('steamId') || getSteamIdFromPath(requestUrl.pathname);
        if (!steamId) {
          sendJson(res, 400, { error: 'steamId is required' });
          return;
        }

        writeProfiles(profiles.filter((profile) => profile.steamId !== steamId));
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
