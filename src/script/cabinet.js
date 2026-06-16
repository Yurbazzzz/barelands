import { getDefaultAvatarUrl, loadSteamProfile } from './steam-profile.js';
import { saveProfileToServer, fetchSavedProfile } from './profile-api.js';

document.addEventListener('DOMContentLoaded', () => {
  const nameNode = document.querySelector('.cabinet__name');
  if (!nameNode) return;

  const storageKey = 'barelandsUser';
  const maxAvatarFileSize = 2 * 1024 * 1024;
  const steamIdNode = document.querySelector('.cabinet__steam-id');
  const avatarImg = document.querySelector('.cabinet__avatar-img');
  const avatarFallback = document.querySelector('.cabinet__avatar-fallback');
  const avatarButton = document.querySelector('.cabinet__avatar-button');
  const onlineStatus = document.querySelector('.cabinet__online-status');
  const privilegeValue = document.querySelector('.cabinet__privilege-value');
  const avatarFileInput = document.querySelector('.cabinet__avatar-file-input');
  const editNameButton = document.querySelector('.cabinet__edit-name-button');
  const nicknameEditor = document.querySelector('.cabinet__nickname-editor');
  const nicknameEditorInput = document.querySelector('.cabinet__nickname-editor-input');
  const saveNicknameButton = document.querySelector('.cabinet__save-button');
  const cancelNicknameButton = document.querySelector('.cabinet__cancel-button');
  const editMessage = document.querySelector('.cabinet__edit-message');
  const logoutButton = document.querySelector('.cabinet__logout-button');
  const balanceAmount = document.querySelector('.cabinet__balance-amount');

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
    if (privilegeValue) privilegeValue.textContent = user.privilege || 'Обычный';
    if (balanceAmount) balanceAmount.textContent = `${user.balance || 0} ₽`;
    updateOnlineStatus(user.isOnline);
  };

  const updateOnlineStatus = (isOnline) => {
    if (!onlineStatus) return;
    onlineStatus.classList.toggle('cabinet__online-status--online', isOnline);
    onlineStatus.classList.toggle('cabinet__online-status--offline', !isOnline);
    onlineStatus.setAttribute('aria-label', isOnline ? 'В сети' : 'Не в сети');
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

  const saveToServer = (user) => saveProfileToServer(user).then((persistedUser) => {
    if (persistedUser) {
      saveUserToStorage(persistedUser);
      currentUser = persistedUser;
    }
  }).catch((error) => {
    console.warn('Не удалось сохранить профиль на сервере:', error.message);
  });

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
    if (!nicknameEditorInput) return;
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

  const saveNickname = () => {
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
    saveToServer(currentUser);
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
      await saveProfileToServer(currentUser);
      applyAvatar(avatarUrl);
      showMessage('Аватар сохранён.');
    } catch (error) {
      console.error('Не удалось сохранить аватар:', error);
      showMessage('Не удалось сохранить аватар. Попробуйте другой файл.', true);
    }
  };

  const handleLogout = () => {
    saveToServer(currentUser).then(() => {
      localStorage.removeItem(storageKey);
      window.location.href = '../index.html';
    });
  };

  const refreshSteamProfile = () => {
    if (!currentUser.steamId) return;
    if (currentUser.customAvatarUrl && currentUser.avatarUrl) return;

    fetchSavedProfile(currentUser.steamId).then((savedProfile) => {
      if (savedProfile && savedProfile.avatarUrl && savedProfile.customAvatarUrl) {
        currentUser = {
          ...currentUser,
          ...savedProfile,
          steamId: currentUser.steamId
        };
        updateProfileView(currentUser);
        applyAvatar(currentUser.avatarUrl);
        return;
      }

      return loadSteamProfile(currentUser.steamId, currentUser);
    }).then((updatedUser) => {
      if (!updatedUser) return;
      currentUser = {
        ...updatedUser,
        steamId: currentUser.steamId
      };
      saveUserToStorage(currentUser);
      saveToServer(currentUser);
      updateProfileView(currentUser);
      applyAvatar(currentUser.avatarUrl || getDefaultAvatarUrl(currentUser.steamId));
    }).catch((error) => {
      console.warn('Не удалось обновить профиль Steam:', error);
    });
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
  applyAvatar(currentUser.avatarUrl || (currentUser.steamId ? getDefaultAvatarUrl(currentUser.steamId) : null));
  refreshSteamProfile();
});