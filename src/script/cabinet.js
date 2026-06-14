import { getDefaultAvatarUrl, loadSteamProfile } from './steam-profile.js';

document.addEventListener('DOMContentLoaded', async () => {
  const storageKey = 'barelandsUser';
  const nameNode = document.querySelector('.cabinet__name');
  const steamIdNode = document.querySelector('.cabinet__steam-id');
  const avatarImg = document.querySelector('.cabinet__avatar-img');
  const avatarFallback = document.querySelector('.cabinet__avatar-fallback');
  let currentUser;

  try {
    currentUser = JSON.parse(localStorage.getItem(storageKey) || 'null');
  } catch {
    currentUser = null;
  }

  if (!currentUser) {
    return;
  }

  const saveCurrentUser = (user) => {
    localStorage.setItem(storageKey, JSON.stringify(user));
  };

  const normalizeDisplayName = (user) => {
    if (!user) return 'Игрок';
    if (user.displayName) return user.displayName;
    if (user.nickname) return user.nickname;
    if (user.email) return user.email.split('@')[0];
    if (user.steamId) return `steam_${user.steamId.slice(-6)}`;
    return 'Игрок';
  };

  const makeInitials = (displayName) => {
    const parts = displayName.replace(/^steam_/i, '').split(/[^A-Za-z0-9]+/).filter(Boolean);
    if (parts.length === 0) return 'ST';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const updateProfileView = (user) => {
    const displayName = normalizeDisplayName(user);
    const initials = makeInitials(displayName);

    if (nameNode) nameNode.textContent = displayName;
    if (steamIdNode && user.steamId) steamIdNode.textContent = user.steamId;
    if (avatarFallback) avatarFallback.textContent = initials;
  };

  const applyAvatar = (url) => {
    if (!url || !avatarImg) return;
    avatarImg.src = url;
    avatarImg.onload = () => {
      avatarImg.classList.add('loaded');
      if (avatarFallback) avatarFallback.style.opacity = '0';
    };
    avatarImg.onerror = () => {
      if (avatarImg.parentNode) avatarImg.parentNode.removeChild(avatarImg);
    };
  };

  const refreshSteamProfile = async () => {
    if (!currentUser.steamId) return;

    try {
      const updatedUser = await loadSteamProfile(currentUser.steamId, currentUser);
      currentUser = updatedUser;
      saveCurrentUser(updatedUser);
      updateProfileView(updatedUser);
      applyAvatar(updatedUser.avatarUrl || getDefaultAvatarUrl(updatedUser.steamId));
    } catch (error) {
      console.warn('Не удалось обновить профиль Steam:', error);
    }
  };

  updateProfileView(currentUser);
  applyAvatar(currentUser.avatarUrl || getDefaultAvatarUrl(currentUser.steamId));
  await refreshSteamProfile();
});
