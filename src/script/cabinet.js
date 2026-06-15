import { getDefaultAvatarUrl, loadSteamProfile } from './steam-profile.js';
import { saveProfileToServer } from './profile-api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const storageKey = 'barelandsUser';
  const maxAvatarFileSize = 2 * 1024 * 1024;
  const nameNode = document.querySelector('.cabinet__name');
  const steamIdNode = document.querySelector('.cabinet__steam-id');
  const avatarImg = document.querySelector('.cabinet__avatar-img');
  const avatarFallback = document.querySelector('.cabinet__avatar-fallback');
  const avatarButton = document.querySelector('.cabinet__avatar-button');
  const avatarFileInput = document.querySelector('.cabinet__avatar-file-input');
  const editNameButton = document.querySelector('.cabinet__edit-name-button');
  const nicknameEditor = document.querySelector('.cabinet__nickname-editor');
  const nicknameEditorInput = document.querySelector('.cabinet__nickname-editor-input');
  const saveNicknameButton = document.querySelector('.cabinet__save-button');
  const cancelNicknameButton = document.querySelector('.cabinet__cancel-button');
  const editMessage = document.querySelector('.cabinet__edit-message');
  let currentUser;
  let nicknameDraft = '';

  try {
    currentUser = JSON.parse(localStorage.getItem(storageKey) || 'null');
  } catch {
    currentUser = null;
  }

  if (!currentUser) {
    return;
  }

  const saveCurrentUser = async (user) => {
    localStorage.setItem(storageKey, JSON.stringify(user));
    const persistedUser = await saveProfileToServer(user);
    if (persistedUser) {
      localStorage.setItem(storageKey, JSON.stringify(persistedUser));
      currentUser = persistedUser;
    }
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

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });

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
    if (!currentUser.steamId || currentUser.customAvatarUrl) return;

    try {
      const updatedUser = mergeSteamProfile(await loadSteamProfile(currentUser.steamId, currentUser));
      currentUser = updatedUser;
      await saveCurrentUser(updatedUser);
      updateProfileView(updatedUser);
      applyAvatar(updatedUser.avatarUrl || getDefaultAvatarUrl(updatedUser.steamId));
    } catch (error) {
      console.warn('Не удалось обновить профиль Steam:', error);
    }
  };

  const showNicknameEditor = () => {
    nicknameDraft = currentUser.nickname || currentUser.displayName || '';
    nicknameEditorInput.value = nicknameDraft;
    nicknameEditor.hidden = false;
    editNameButton.setAttribute('aria-expanded', 'true');
    nicknameEditorInput.focus();
  };

  const hideNicknameEditor = (clearMessage = false) => {
    nicknameEditor.hidden = true;
    editNameButton.setAttribute('aria-expanded', 'false');
    if (clearMessage) showEditMessage('');
  };

  const saveNickname = async () => {
    const displayName = nicknameEditorInput.value.trim().slice(0, 32) || '';

    if (!displayName) {
      showEditMessage('Введите никнейм профиля.', true);
      return;
    }

    currentUser = {
      ...currentUser,
      displayName,
      nickname: displayName,
      customDisplayName: true
    };

    try {
      await saveCurrentUser(currentUser);
      updateProfileView(currentUser);
      hideNicknameEditor(true);
      showEditMessage('Никнейм сохранён.');
    } catch (error) {
      console.error('Не удалось сохранить никнейм:', error);
      showEditMessage('Не удалось сохранить никнейм в браузере.', true);
    }
  };

  const cancelNickname = () => {
    nicknameEditorInput.value = nicknameDraft;
    hideNicknameEditor(true);
  };

  const saveAvatarFile = async (file) => {
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) {
      showEditMessage('Выберите изображение для аватара.', true);
      return;
    }
    if (file.size > maxAvatarFileSize) {
      showEditMessage('Выберите изображение размером не больше 2 МБ.', true);
      return;
    }

    try {
      const avatarUrl = await readFileAsDataUrl(file);
      currentUser = {
        ...currentUser,
        avatarUrl,
        customAvatarUrl: true
      };
      await saveCurrentUser(currentUser);
      updateProfileView(currentUser);
      applyAvatar(currentUser.avatarUrl || getDefaultAvatarUrl(currentUser.steamId));
      showEditMessage('Аватар сохранён.');
    } catch (error) {
      console.error('Не удалось сохранить аватар:', error);
      showEditMessage('Не удалось сохранить аватар. Попробуйте другой файл.', true);
    }
  };

  if (avatarButton) avatarButton.addEventListener('click', () => avatarFileInput?.click());
  if (avatarFileInput) avatarFileInput.addEventListener('change', (event) => {
    saveAvatarFile(event.target.files?.[0]);
    event.target.value = '';
  });
  if (editNameButton) editNameButton.addEventListener('click', showNicknameEditor);
  if (saveNicknameButton) saveNicknameButton.addEventListener('click', saveNickname);
  if (cancelNicknameButton) cancelNicknameButton.addEventListener('click', cancelNickname);
  if (nicknameEditorInput) {
    nicknameEditorInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') saveNickname();
      if (event.key === 'Escape') cancelNickname();
    });
  }

  updateProfileView(currentUser);
  applyAvatar(currentUser.avatarUrl || getDefaultAvatarUrl(currentUser.steamId));
  await refreshSteamProfile();
});
