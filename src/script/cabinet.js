import { getDefaultAvatarUrl, loadSteamProfile } from './steam-profile.js';
import { saveProfileToServer, fetchSavedProfile } from './profile-api.js';

document.addEventListener('DOMContentLoaded', () => {
  const nameNode = document.querySelector('.cabinet__name');
  const nicknameInput = document.querySelector('.cabinet__nickname-input');
  if (!nameNode || !nicknameInput) return;

  const storageKey = 'barelandsUser';
  const maxAvatarFileSize = 2 * 1024 * 1024;
  const maxAvatarCanvasSize = 768;
  const steamIdNode = document.querySelector('.cabinet__steam-id');
  const avatarImg = document.querySelector('.cabinet__avatar-img');
  const avatarFallback = document.querySelector('.cabinet__avatar-fallback');
  const avatarButton = document.querySelector('.cabinet__avatar-button');
  const avatarFileInput = document.querySelector('.cabinet__avatar-file-input');
  const saveNameButton = document.querySelector('.cabinet__save-name-button');
  const syncSteamButton = document.querySelector('.cabinet__steam-sync-button');
  const onlineStatus = document.querySelector('.cabinet__online-status');
  const privilegeValue = document.querySelector('.cabinet__privilege-value');
  const editMessage = document.querySelector('.cabinet__edit-message');
  const logoutButton = document.querySelector('.cabinet__logout-button');
  const balanceAmount = document.querySelector('.cabinet__balance-amount');

  const createDefaultUser = () => ({
    steamId: '0',
    displayName: 'Игрок',
    nickname: '',
    avatarUrl: '',
    customDisplayName: true,
    customAvatarUrl: false,
    balance: 0,
    privilege: 'Обычный',
    isOnline: false
  });

  let currentUser = getUserFromStorage() || createDefaultUser();

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

  const updateOnlineStatus = (isOnline) => {
    if (!onlineStatus) return;
    onlineStatus.classList.toggle('cabinet__online-status--online', Boolean(isOnline));
    onlineStatus.classList.toggle('cabinet__online-status--offline', !Boolean(isOnline));
    onlineStatus.setAttribute('aria-label', isOnline ? 'В сети' : 'Не в сети');
  };

  const updateProfileView = (user) => {
    const displayName = normalizeDisplayName(user);
    const initials = makeInitials(displayName);

    if (nameNode) nameNode.textContent = displayName;
    if (nicknameInput) nicknameInput.value = displayName;
    if (steamIdNode) steamIdNode.textContent = user.steamId || 'Не задан';
    if (avatarFallback) avatarFallback.textContent = initials;
    if (privilegeValue) privilegeValue.textContent = user.privilege || 'Обычный';
    if (balanceAmount) balanceAmount.textContent = `${user.balance || 0} ₽`;
    updateOnlineStatus(user.isOnline);
  };

  const showMessage = (message, type = '') => {
    if (!editMessage) return;
    editMessage.textContent = message || '';
    editMessage.classList.toggle('cabinet__edit-message--error', type === 'error');
    editMessage.classList.toggle('cabinet__edit-message--success', type === 'success');
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
      showMessage('Не удалось загрузить фото профиля. Попробуйте другой файл.', 'error');
    };
  };

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });

  const loadImage = (file) => new Promise((resolve, reject) => {
    if ('createImageBitmap' in window) {
      createImageBitmap(file).then(resolve).catch(() => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Не удалось обработать изображение'));
        image.src = URL.createObjectURL(file);
      });
      return;
    }

    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Не удалось обработать изображение'));
    image.src = URL.createObjectURL(file);
  });

  const resizeAvatarFile = async (file) => {
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
      if (file.size > maxAvatarFileSize) {
        throw new Error('Файл слишком большой');
      }
      return readFileAsDataUrl(file);
    }

    if (file.size <= 1024 * 1024) {
      return readFileAsDataUrl(file);
    }

    const image = await loadImage(file);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const scale = Math.min(1, maxAvatarCanvasSize / Math.max(sourceWidth, sourceHeight));
    const width = Math.round(sourceWidth * scale);
    const height = Math.round(sourceHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.86);
  };

  const isImageFile = (file) => Boolean(
    file
    && (
      file.type.startsWith('image/')
      || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name || '')
    )
  );

  const saveUserToStorage = (user) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(user));
    } catch (error) {
      console.warn('Не удалось сохранить профиль в браузере:', error);
      showMessage('Не удалось сохранить изменения в браузере. Выберите файл меньше.', 'error');
    }
  };

  const getUserFromStorage = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || 'null');
    } catch {
      return null;
    }
  };

  const saveToServer = async (user) => {
    if (!user?.steamId || user.steamId === '0') return user;

    try {
      const persistedUser = await saveProfileToServer(user);
      if (persistedUser) {
        saveUserToStorage(persistedUser);
        currentUser = persistedUser;
      }
      return persistedUser || user;
    } catch (error) {
      console.warn('Не удалось сохранить профиль на сервере:', error.message);
      return user;
    }
  };

  const saveName = async () => {
    if (!nameNode) return;

    const displayName = nicknameInput.value.replace(/\s+/g, ' ').trim().slice(0, 32);

    if (!displayName) {
      nicknameInput.value = currentUser.displayName || 'Игрок';
      nameNode.textContent = nicknameInput.value;
      showMessage('Введите никнейм профиля.', 'error');
      return;
    }

    nameNode.textContent = displayName;

    currentUser = {
      ...currentUser,
      displayName,
      nickname: displayName,
      customDisplayName: true
    };

    saveUserToStorage(currentUser);
    await saveToServer(currentUser);
    updateProfileView(currentUser);
    showMessage('Имя профиля сохранено.', 'success');
  };

  const saveAvatar = async (file) => {
    if (!file) return;

    if (!isImageFile(file)) {
      showMessage('Выберите изображение для фото профиля.', 'error');
      return;
    }

    if (file.size > maxAvatarFileSize * 4) {
      showMessage('Выберите изображение размером не больше 8 МБ.', 'error');
      return;
    }

    try {
      showMessage('Сохранение фото профиля...');
      const avatarUrl = await resizeAvatarFile(file);
      currentUser = {
        ...currentUser,
        avatarUrl,
        customAvatarUrl: true
      };

      saveUserToStorage(currentUser);
      await saveToServer(currentUser);
      applyAvatar(avatarUrl);
      showMessage('Фото профиля сохранено.', 'success');
    } catch (error) {
      console.error('Не удалось сохранить аватар:', error);
      showMessage('Не удалось сохранить фото профиля. Попробуйте другой файл.', 'error');
    }
  };

  const handleLogout = async () => {
    await saveToServer(currentUser);
    localStorage.removeItem(storageKey);
    window.location.href = '../index.html';
  };

  const syncFromSteam = async () => {
    if (!currentUser.steamId || currentUser.steamId === '0') {
      showMessage('Steam ID не найден. Войдите через Steam.', 'error');
      return;
    }

    try {
      showMessage('Обновление данных Steam...');
      const steamUser = {
        ...currentUser,
        customDisplayName: false,
        customAvatarUrl: false
      };
      const updatedUser = await loadSteamProfile(currentUser.steamId, steamUser);

      currentUser = {
        ...updatedUser,
        steamId: currentUser.steamId,
        customDisplayName: false,
        customAvatarUrl: false,
        lastSteamSyncAt: new Date().toISOString()
      };

      saveUserToStorage(currentUser);
      await saveToServer(currentUser);
      updateProfileView(currentUser);
      applyAvatar(currentUser.avatarUrl || getDefaultAvatarUrl(currentUser.steamId));
      nicknameInput.value = normalizeDisplayName(currentUser);
      showMessage('Данные Steam обновлены.', 'success');
    } catch (error) {
      console.error('Не удалось обновить данные Steam:', error);
      showMessage('Не удалось обновить данные Steam. Проверьте доступность профиля Steam.', 'error');
    }
  };

  const refreshSteamProfile = () => {
    if (!currentUser.steamId || currentUser.steamId === '0') return;
    if (currentUser.customAvatarUrl && currentUser.customDisplayName) return;

    fetchSavedProfile(currentUser.steamId).then((savedProfile) => {
      if (savedProfile && savedProfile.customAvatarUrl && savedProfile.avatarUrl) {
        currentUser = {
          ...currentUser,
          ...savedProfile,
          steamId: currentUser.steamId,
          customDisplayName: currentUser.customDisplayName,
          customAvatarUrl: currentUser.customAvatarUrl
        };
        if (currentUser.customDisplayName) {
          currentUser.displayName = currentUser.displayName || normalizeDisplayName(savedProfile);
          currentUser.nickname = currentUser.displayName;
        }
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
  saveNameButton?.addEventListener('click', saveName);
  syncSteamButton?.addEventListener('click', syncFromSteam);
  logoutButton?.addEventListener('click', handleLogout);

  nicknameInput.addEventListener('input', () => {
    nameNode.textContent = nicknameInput.value.trim() || currentUser.displayName || 'Игрок';
  });

  nicknameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveName();
      nicknameInput.blur();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      updateProfileView(currentUser);
      nicknameInput.blur();
    }
  });

  updateProfileView(currentUser);
  applyAvatar(currentUser.avatarUrl || (currentUser.steamId ? getDefaultAvatarUrl(currentUser.steamId) : null));
  refreshSteamProfile();
});
