const fs = require('fs');
const path = require('path');

const profilesPath = path.join(__dirname, '..', 'profiles.json');

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

function normalizeProfile(body, existing = {}) {
  const steamId = String(body.steamId || '').trim();
  if (!/^\d+$/.test(steamId)) {
    return { error: 'steamId is required', statusCode: 400 };
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

module.exports = async function handler(req, res) {
  const method = req.method;

  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const profiles = readProfiles();

    if (method === 'GET') {
      const steamId = req.query.steamId;
      if (!steamId) {
        return res.status(400).json({ error: 'steamId is required' });
      }
      return res.status(200).json(findProfile(profiles, steamId));
    }

    if (method === 'POST') {
      const body = req.body;
      const existing = findProfile(profiles, String(body.steamId || ''));
      const profile = normalizeProfile(body, existing);
      if (profile.error) {
        return res.status(profile.statusCode).json({ error: profile.error });
      }
      const nextProfiles = profiles.filter((item) => item.steamId !== profile.steamId);
      nextProfiles.push(profile);
      writeProfiles(nextProfiles);
      return res.status(200).json(profile);
    }

    if (method === 'DELETE') {
      const steamId = req.query.steamId;
      if (!steamId) {
        return res.status(400).json({ error: 'steamId is required' });
      }
      writeProfiles(profiles.filter((profile) => profile.steamId !== steamId));
      return res.status(200).json({ ok: true });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
