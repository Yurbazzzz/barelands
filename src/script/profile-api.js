const profileApiUrl = window.BARELANDS_PROFILE_API_URL || '/api/profile';

export async function fetchSavedProfile(steamId) {
  if (!steamId) return {};

  try {
    const url = new URL(profileApiUrl, window.location.origin);
    url.searchParams.set('steamId', steamId);
    const response = await fetch(url.toString());
    if (!response.ok) return {};
    const profile = await response.json();
    return profile || {};
  } catch (error) {
    console.warn('Не удалось загрузить профиль с сервера:', error.message);
    return {};
  }
}

export async function saveProfileToServer(user) {
  if (!user?.steamId) return user;

  try {
    const response = await fetch(profileApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Не удалось сохранить профиль на сервере:', error.message);
    return user;
  }
}

export async function deleteProfileFromServer(steamId) {
  if (!steamId) return;

  try {
    const url = new URL(`${profileApiUrl}/${encodeURIComponent(steamId)}`, window.location.origin);
    await fetch(url.toString(), { method: 'DELETE' });
  } catch (error) {
    console.warn('Не удалось удалить профиль с сервера:', error.message);
  }
}
