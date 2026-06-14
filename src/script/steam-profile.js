const steamWebApiKey = window.BARELANDS_STEAM_API_KEY || '';
const requestTimeoutMs = 6000;

function getDefaultDisplayName(user, steamId) {
  if (user?.displayName) return user.displayName;
  if (user?.nickname) return user.nickname;
  if (user?.email) return user.email.split('@')[0];
  if (steamId) return `steam_${steamId.slice(-6)}`;
  return 'Игрок';
}

export function getDefaultAvatarUrl(steamId) {
  return steamId ? `https://steamcommunity.com/profiles/${steamId}/avatar/` : null;
}

function withTimeout(promise, timeout) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Steam profile request timeout')), timeout);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function fetchTextWithTimeout(url, timeout = requestTimeoutMs) {
  return withTimeout(fetch(url, { cache: 'no-store' }), timeout).then((response) => {
    if (!response.ok) {
      throw new Error(`Steam profile request failed with status ${response.status}`);
    }
    return response.text();
  });
}

function getXmlText(xml, tagName) {
  const node = xml.querySelector(tagName);
  return node ? node.textContent.trim() : '';
}

function parseSteamXml(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'application/xml');
  const parserError = xml.querySelector('parsererror');

  if (parserError) {
    throw new Error('Invalid Steam profile XML');
  }

  return {
    nickname: getXmlText(xml, 'steamID') || getXmlText(xml, 'realname'),
    avatarUrl: getXmlText(xml, 'avatarFull') || getXmlText(xml, 'avatarMedium') || getXmlText(xml, 'avatarIcon')
  };
}

function normalizeProfileName(name) {
  const cleaned = name?.replace(/\s+/g, ' ').trim();
  return cleaned || null;
}

function parseJinaMarkdown(markdown) {
  const titleMatch = markdown.match(/^# Steam Community ::\s*(.+)$/m);
  const nicknameMatch = markdown.match(/\)\s*([^\n![]+)\s*!\[/);
  const avatarMatches = [...markdown.matchAll(/!\[[^\]]*]\((https:\/\/avatars\.fastly\.steamstatic\.com\/[^\s)]+)\)/g)];

  return {
    nickname: normalizeProfileName(titleMatch?.[1] || nicknameMatch?.[1]),
    avatarUrl: avatarMatches[0]?.[1] || null
  };
}

async function fetchSteamWebApiProfile(steamId) {
  if (!steamWebApiKey) {
    throw new Error('Steam Web API key is not configured');
  }

  const url = new URL('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/');
  url.searchParams.set('key', steamWebApiKey);
  url.searchParams.set('steamids', steamId);

  const response = await withTimeout(fetch(url.toString(), { cache: 'no-store' }), requestTimeoutMs);
  if (!response.ok) {
    throw new Error(`Steam Web API request failed with status ${response.status}`);
  }

  const data = await response.json();
  const player = data?.response?.players?.[0];

  if (!player) {
    throw new Error('Steam Web API returned no player profile');
  }

  return {
    nickname: player.personaname,
    avatarUrl: player.avatarfull || player.avatarmedium || player.avatar
  };
}

async function fetchSteamXmlProfile(steamId) {
  const xmlText = await fetchTextWithTimeout(`https://steamcommunity.com/profiles/${steamId}/?xml=1`);
  return parseSteamXml(xmlText);
}

async function fetchJinaProfile(steamId) {
  const markdown = await fetchTextWithTimeout(`https://r.jina.ai/http://https://steamcommunity.com/profiles/${steamId}/`, 8000);
  return parseJinaMarkdown(markdown);
}

function mergeProfile(user, steamId, profile) {
  const displayName = profile?.nickname || getDefaultDisplayName(user, steamId);
  const avatarUrl = profile?.avatarUrl || getDefaultAvatarUrl(steamId);

  return {
    ...user,
    steamId,
    displayName,
    nickname: profile?.nickname || user?.nickname,
    avatarUrl
  };
}

export async function loadSteamProfile(steamId, user = {}) {
  if (!steamId) {
    return {
      ...user,
      displayName: getDefaultDisplayName(user),
      avatarUrl: getDefaultAvatarUrl(user?.steamId)
    };
  }

  try {
    return mergeProfile(user, steamId, await fetchSteamWebApiProfile(steamId));
  } catch (error) {
    console.warn('Не удалось загрузить профиль Steam через Web API:', error.message);
  }

  try {
    return mergeProfile(user, steamId, await fetchSteamXmlProfile(steamId));
  } catch (error) {
    console.warn('Не удалось загрузить профиль Steam через XML:', error.message);
  }

  try {
    return mergeProfile(user, steamId, await fetchJinaProfile(steamId));
  } catch (error) {
    console.warn('Не удалось загрузить профиль Steam через Jina:', error.message);
  }

  return mergeProfile(user, steamId, {});
}
