const profileApiUrl = window.BARELANDS_PROFILE_API_URL || '/api/profile';

function toBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function toNumber(value, fallback = 0) {
  const number = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeProfile(profile, fallbackSteamId = '') {
  if (!profile || typeof profile !== 'object') return null;

  const steamId = String(profile.steamId || fallbackSteamId || '').trim();
  if (!steamId || !/^\d+$/.test(steamId)) return null;

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

function getProfileUrl(steamId) {
  const url = new URL(profileApiUrl, window.location.origin);
  url.searchParams.set('steamId', steamId);
  return url.toString();
}

export async function fetchSavedProfile(steamId) {
  if (!steamId) return {};

  try {
    const response = await fetch(getProfileUrl(String(steamId)));
    if (!response.ok) return {};

    const profile = await response.json();
    return normalizeProfile(profile) || {};
  } catch (error) {
    console.warn('Не удалось загрузить профиль:', error.message);
    return {};
  }
}

export async function saveProfileToServer(user) {
  if (!user?.steamId) return user;

  const normalizedUser = normalizeProfile(user) || user;
  const response = await fetch(getProfileUrl(normalizedUser.steamId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalizedUser)
  });

  if (!response.ok) {
    let message = `Server responded with status ${response.status}`;
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      message = `Server responded with status ${response.status}`;
    }

    throw new Error(message);
  }

  const data = await response.json();
  return normalizeProfile(data) || normalizedUser;
}

export async function deleteProfileFromServer(steamId) {
  if (!steamId) return;

  try {
    const response = await fetch(getProfileUrl(String(steamId)), { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }
  } catch (error) {
    console.warn('Не удалось удалить профиль:', error.message);
  }
}
