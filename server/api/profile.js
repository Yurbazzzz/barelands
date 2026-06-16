const fs = require('fs');
const path = require('path');

const profilesPath = path.join(__dirname, '..', 'profiles.json');

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

function normalizeProfile(body) {
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
    if (method === 'GET') {
      const steamId = req.query.steamId;
      if (!steamId) {
        return res.status(400).json({ error: 'steamId is required' });
      }
      const profiles = readProfiles();
      return res.status(200).json(profiles[steamId] || null);
    }

    if (method === 'POST') {
      const body = req.body;
      const profile = normalizeProfile(body);
      if (profile.error) {
        return res.status(profile.statusCode).json({ error: profile.error });
      }
      const profiles = readProfiles();
      profiles[profile.steamId] = profile;
      writeProfiles(profiles);
      return res.status(200).json(profile);
    }

    if (method === 'DELETE') {
      const steamId = req.query.steamId;
      if (!steamId) {
        return res.status(400).json({ error: 'steamId is required' });
      }
      const profiles = readProfiles();
      delete profiles[steamId];
      writeProfiles(profiles);
      return res.status(200).json({ ok: true });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};