import { getDefaultAvatarUrl, loadSteamProfile } from './steam-profile.js';

document.addEventListener('DOMContentLoaded', async () => {
  const storageKey = 'barelandsUser';
  const nameNode = document.querySelector('.cabinet__name');
  const steamIdNode = document.querySelector('.cabinet__steam-id');
  const avatarImg = document.querySelector('.cabinet__avatar-img');
  const avatarFallback = document.querySelector('.cabinet__avatar-fallback');
  const nicknameInput = document.querySelector('.cabinet__nickname-input');
  const avatarInput = document.querySelector('.cabinet__avatar-input');
  const saveButton = document.querySelector('.cabinet__save-button');
  const resetButton = document.querySelector('.cabinet__reset-button');
  const editMessage = document.querySelector('.cabinet__edit-message');
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
    avatarImg.classList.remove('loaded');
    if (avatarFallback) avatarFallback.style.opacity = '1';
    avatarImg.src = url;
    avatarImg.onload = () => {
      avatarImg.classList.add('loaded');
      if (avatarFallback) avatarFallback.style.opacity = '0';
    };
    avatarImg.onerror = () => {
      avatarImg.classList.remove('loaded');
      if (avatarFallback) avatarFallback.style.opacity = '1';
    };
  };

  const showEditMessage = (message, isError = false) => {
    if (!editMessage) return;
    editMessage.textContent = message;
    editMessage.classList.toggle('cabinet__edit-message--error', isError);
  };

  const isValidAvatarUrl = (value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const syncEditForm = () => {
    if (nicknameInput) nicknameInput.value = currentUser.nickname || currentUser.displayName || '';
    if (avatarInput) avatarInput.value = currentUser.avatarUrl || '';
  };

  const mergeSteamProfile = (updatedUser) => {
    const nextUser = {
      ...currentUser,
      ...updatedUser
    };

    if (currentUser.customDisplayName) {
      nextUser.displayName = currentUser.displayName;
      nextUser.nickname = currentUser.nickname;
    }

    if (currentUser.customAvatarUrl) {
      nextUser.avatarUrl = currentUser.avatarUrl;
    }

    return nextUser;
  };

  const refreshSteamProfile = async () => {
    if (!currentUser.steamId || (currentUser.customDisplayName && currentUser.customAvatarUrl)) return;

    try {
      const updatedUser = mergeSteamProfile(await loadSteamProfile(currentUser.steamId, currentUser));
      currentUser = updatedUser;
      saveCurrentUser(updatedUser);
      updateProfileView(updatedUser);
      applyAvatar(updatedUser.avatarUrl || getDefaultAvatarUrl(updatedUser.steamId));
      syncEditForm();
    } catch (error) {
      console.warn('Не удалось обновить профиль Steam:', error);
    }
  };

  const saveProfile = () => {
    const displayName = nicknameInput?.value.trim().slice(0, 32) || '';
    const avatarUrl = avatarInput?.value.trim() || '';

    if (!displayName) {
      showEditMessage('Введите никнейм профиля.', true);
      return;
    }

    if (!isValidAvatarUrl(avatarUrl)) {
      showEditMessage('Введите корректную ссылку на аватар, начинающуюся с http:// или https://.', true);
      return;
    }

    currentUser = {
      ...currentUser,
      displayName,
      nickname: displayName,
      avatarUrl: avatarUrl || getDefaultAvatarUrl(currentUser.steamId),
      customDisplayName: true,
      customAvatarUrl: Boolean(avatarUrl)
    };

    try {
      saveCurrentUser(currentUser);
      updateProfileView(currentUser);
      applyAvatar(currentUser.avatarUrl || getDefaultAvatarUrl(currentUser.steamId));
      syncEditForm();
      showEditMessage('Профиль сохранён.');
    } catch (error) {
      console.error('Не удалось сохранить профиль:', error);
      showEditMessage('Не удалось сохранить профиль в браузере.', true);
    }
  };

  const resetSteamProfile = async () => {
    if (!currentUser.steamId) return;

    const resetUser = { ...currentUser };
    delete resetUser.customDisplayName;
    delete resetUser.customAvatarUrl;
    delete resetUser.displayName;
    delete resetUser.nickname;
    delete resetUser.avatarUrl;

    try {
      const updatedUser = await loadSteamProfile(resetUser.steamId, resetUser);
      currentUser = updatedUser;
      saveCurrentUser(updatedUser);
      updateProfileView(updatedUser);
      applyAvatar(updatedUser.avatarUrl || getDefaultAvatarUrl(updatedUser.steamId));
      syncEditForm();
      showEditMessage('Данные профиля обновлены из Steam.');
    } catch (error) {
      console.error('Не удалось обновить профиль Steam:', error);
      showEditMessage('Не удалось загрузить данные Steam. Попробуйте позже.', true);
    }
  };

  if (saveButton) saveButton.addEventListener('click', saveProfile);
  if (resetButton) resetButton.addEventListener('click', resetSteamProfile);

  updateProfileView(currentUser);
  applyAvatar(currentUser.avatarUrl || getDefaultAvatarUrl(currentUser.steamId));
  syncEditForm();
  await refreshSteamProfile();
});
