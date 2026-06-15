import { getDefaultAvatarUrl, loadSteamProfile } from './steam-profile.js';
import { saveProfileToServer, fetchSavedProfile } from './profile-api.js';

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
  const logoutButton = document.querySelector('.cabinet__logout-button');

  let currentUser = getUserFromStorage();

  if (!currentUser || !currentUser.steamId) {
    window.location.href = '../index.html';
    return;
  }

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
    if (steamIdNode) steamIdNode.textContent = user.steamId || 'Не задан';
    if (avatarFallback) avatarFallback.textContent = initials;
  };

  const showMessage = (message, isError = false) => {
    if (!editMessage) return;
    editMessage.textContent = message;
    editMessage.classList.toggle('cabinet__edit-message--error', isError);
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

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });

  const saveToServer = async (user) => {
    try {
      const persistedUser = await saveProfileToServer(user);
      if (persistedUser) {
        saveUserToStorage(persistedUser);
        currentUser = persistedUser;
      }
    } catch (error) {
      console.warn('Не удалось сохранить профиль на сервере:', error.message);
    }
  };

  const saveUserToStorage = (user) => {
    localStorage.setItem(storageKey, JSON.stringify(user));
  };

  const getUserFromStorage = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || 'null');
    } catch {
      return null;
    }
  };

  const showNicknameEditor = () => {
    nicknameEditorInput.value = currentUser.nickname || currentUser.displayName || '';
    nicknameEditor.hidden = false;
    editNameButton.setAttribute('aria-expanded', 'true');
    nicknameEditorInput.focus();
  };

  const hideNicknameEditor = (clearMessage = false) => {
    nicknameEditor.hidden = true;
    editNameButton.setAttribute('aria-expanded', 'false');
    if (clearMessage) showMessage('');
  };

  const saveNickname = async () => {
    const displayName = nicknameEditorInput.value.trim().slice(0, 32);

    if (!displayName) {
      showMessage('Введите никнейм профиля.', true);
      return;
    }

    currentUser = {
      ...currentUser,
      displayName,
      nickname: displayName,
      customDisplayName: true
    };

    saveUserToStorage(currentUser);
    await saveToServer(currentUser);
    updateProfileView(currentUser);
    hideNicknameEditor(true);
    showMessage('Никнейм сохранён.');
  };

  const saveAvatar = async (file) => {
    if (!file) return;

    if (file.type && !file.type.startsWith('image/')) {
      showMessage('Выберите изображение для аватара.', true);
      return;
    }

    if (file.size > maxAvatarFileSize) {
      showMessage('Выберите изображение размером не больше 2 МБ.', true);
      return;
    }

    try {
      const avatarUrl = await readFileAsDataUrl(file);
      currentUser = {
        ...currentUser,
        avatarUrl,
        customAvatarUrl: true
      };
      saveUserToStorage(currentUser);
      await saveToServer(currentUser);
      applyAvatar(avatarUrl);
      showMessage('Аватар сохранён.');
    } catch (error) {
      console.error('Не удалось сохранить аватар:', error);
      showMessage('Не удалось сохранить аватар. Попробуйте другой файл.', true);
    }
  };

  const handleLogout = async () => {
    await saveToServer(currentUser);
    localStorage.removeItem(storageKey);
    window.location.href = '../index.html';
  };

  const refreshSteamProfile = async () => {
    if (!currentUser.steamId || currentUser.customAvatarUrl) return;

    try {
      const savedProfile = await fetchSavedProfile(currentUser.steamId);
      const mergedUser = {
        ...currentUser,
        ...savedProfile,
        steamId: currentUser.steamId
      };

      if (savedProfile.avatarUrl && savedProfile.customAvatarUrl) {
        currentUser = mergedUser;
        updateProfileView(currentUser);
        applyAvatar(currentUser.avatarUrl || getDefaultAvatarUrl(currentUser.steamId));
        return;
      }

      const updatedUser = await loadSteamProfile(currentUser.steamId, mergedUser);
      currentUser = {
        ...updatedUser,
        steamId: currentUser.steamId
      };
      saveUserToStorage(currentUser);
      await saveToServer(currentUser);
      updateProfileView(currentUser);
      applyAvatar(currentUser.avatarUrl || getDefaultAvatarUrl(currentUser.steamId));
    } catch (error) {
      console.warn('Не удалось обновить профиль Steam:', error);
    }
  };

  avatarButton?.addEventListener('click', () => avatarFileInput?.click());
  avatarFileInput?.addEventListener('change', (event) => {
    saveAvatar(event.target.files?.[0]);
    event.target.value = '';
  });
  editNameButton?.addEventListener('click', showNicknameEditor);
  saveNicknameButton?.addEventListener('click', saveNickname);
  cancelNicknameButton?.addEventListener('click', () => hideNicknameEditor(true));
  logoutButton?.addEventListener('click', handleLogout);

  nicknameEditorInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') saveNickname();
    if (event.key === 'Escape') hideNicknameEditor(true);
  });

  updateProfileView(currentUser);
  applyAvatar(currentUser.avatarUrl || getDefaultAvatarUrl(currentUser.steamId));
  await refreshSteamProfile();
});