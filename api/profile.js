const profileStore = require('../server/lib/profile-store');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const steamId = req.query?.steamId;
      if (!steamId) {
        return res.status(400).json({ error: 'steamId is required' });
      }

      const profile = await profileStore.getProfile(steamId);
      return res.status(200).json(profile);
    }

    if (req.method === 'POST') {
      const profile = await profileStore.saveProfile(req.body);
      return res.status(200).json(profile);
    }

    if (req.method === 'DELETE') {
      const steamId = req.query?.steamId;
      if (!steamId) {
        return res.status(400).json({ error: 'steamId is required' });
      }

      await profileStore.deleteProfile(steamId);
      return res.status(200).json({ ok: true });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
  }
};
