import { getDefaultAvatarUrl, loadSteamProfile } from './steam-profile.js';
import { saveProfileToServer, fetchSavedProfile } from './profile-api.js';
import { getCurrentUser, removeCurrentUser, saveCurrentUser } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
  const defaultSteamId = '0';
  const maxAvatarFileSize = 2 * 1024 * 1024;
  const maxAvatarCanvasSize = 768;

  const nameNode = document.querySelector('.cabinet__name');
  const nicknameInput = document.querySelector('.cabinet__nickname-input');
  const steamIdNode = document.querySelector('.cabinet__steam-id');
  const avatarImg = document.querySelector('.cabinet__avatar-img');
  const avatarFallback = document.querySelector('.cabinet__avatar-fallback');
  const avatarButton = document.querySelector('.cabinet__avatar-button');
  const avatarFileInput = document.querySelector('.cabinet__avatar-file-input');
  const saveNameButton = document.querySelector('.cabinet__save-name-button');
  const onlineStatus = document.querySelector('.cabinet__online-status');
  const privilegeValue = document.querySelector('.cabinet__privilege-value');
  const editMessage = document.querySelector('.cabinet__edit-message');
  const logoutButton = document.querySelector('.cabinet__logout-button');
  const balanceAmount = document.querySelector('.cabinet__balance-amount');

  const createDefaultUser = (steamId = defaultSteamId) => ({
    steamId,
    email: '',
    displayName: steamId && steamId !== defaultSteamId ? `steam_${steamId.slice(-6)}` : 'Игрок',
    nickname: '',
    avatarUrl: '',
    customDisplayName: false,
    customAvatarUrl: false,
    balance: 0,
    privilege: 'Обычный',
    isOnline: false
  });

  let currentUser = createDefaultUser();

  const normalizeDisplayName = (user) => {
    if (!user) return 'Игрок';
    if (user.displayName) return user.displayName;
    if (user.nickname) return user.nickname;
    if (user.email) return user.email.split('@')[0];
    if (user.steamId && user.steamId !== defaultSteamId) return `steam_${user.steamId.slice(-6)}`;
    return 'Игрок';
  };

  const makeInitials = (displayName) => {
    const parts = displayName.replace(/^steam_/i, '').split(/[^A-Za-z0-9]+/).filter(Boolean);
    if (parts.length === 0) return 'ST';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const normalizeServerProfile = (profile, fallbackSteamId = defaultSteamId) => {
    const steamId = String(profile?.steamId || fallbackSteamId || defaultSteamId);
    const displayName = typeof profile?.displayName === 'string' && profile.displayName.trim()
      ? profile.displayName.trim()
      : (steamId && steamId !== defaultSteamId ? `steam_${steamId.slice(-6)}` : 'Игрок');

    return {
      steamId,
      email: typeof profile?.email === 'string' ? profile.email : '',
      displayName,
      nickname: typeof profile?.nickname === 'string' ? profile.nickname : displayName,
      avatarUrl: typeof profile?.avatarUrl === 'string' ? profile.avatarUrl : '',
      customDisplayName: Boolean(profile?.customDisplayName),
      customAvatarUrl: Boolean(profile?.customAvatarUrl),
      balance: typeof profile?.balance === 'number' ? profile.balance : 0,
      privilege: typeof profile?.privilege === 'string' ? profile.privilege : 'Обычный',
      telegram: typeof profile?.telegram === 'string' ? profile.telegram : null,
      discord: typeof profile?.discord === 'string' ? profile.discord : null,
      twitch: typeof profile?.twitch === 'string' ? profile.twitch : null,
      email_verified_at: profile?.email_verified_at || null,
      isOnline: Boolean(profile?.isOnline),
      createdAt: typeof profile?.createdAt === 'string' ? profile.createdAt : new Date().toISOString(),
      updatedAt: typeof profile?.updatedAt === 'string' ? profile.updatedAt : new Date().toISOString()
    };
  };

  const updateOnlineStatus = (isOnline) => {
    if (!onlineStatus) return;
    onlineStatus.classList.toggle('cabinet__online-status--online', Boolean(isOnline));
    onlineStatus.classList.toggle('cabinet__online-status--offline', !Boolean(isOnline));
    onlineStatus.setAttribute('aria-label', isOnline ? 'В сети' : 'Не в сети');
  };

  const renderProfile = (user) => {
    currentUser = normalizeServerProfile(user, currentUser.steamId || defaultSteamId);
    const displayName = normalizeDisplayName(currentUser);

    if (nameNode) nameNode.textContent = displayName;
    if (nicknameInput) nicknameInput.value = displayName;
    if (steamIdNode) steamIdNode.textContent = currentUser.steamId && currentUser.steamId !== defaultSteamId ? currentUser.steamId : 'Не задан';
    if (avatarFallback) avatarFallback.textContent = makeInitials(displayName);
    if (privilegeValue) privilegeValue.textContent = currentUser.privilege || 'Обычный';
    if (balanceAmount) balanceAmount.textContent = `${currentUser.balance || 0} ₽`;
    updateOnlineStatus(currentUser.isOnline);
  };

  const showMessage = (message, type = '') => {
    if (!editMessage) return;
    editMessage.textContent = message || '';
    editMessage.classList.toggle('cabinet__edit-message--error', type === 'error');
    editMessage.classList.toggle('cabinet__edit-message--success', type === 'success');
  };

  const applyAvatar = (url) => {
    if (!avatarImg) return;

    if (!url) {
      avatarImg.removeAttribute('src');
      avatarImg.classList.remove('loaded');
      if (avatarFallback) avatarFallback.style.opacity = '1';
      return;
    }

    avatarImg.classList.remove('loaded');
    if (avatarFallback) avatarFallback.style.opacity = '1';

    const image = new Image();
    image.onload = () => {
      avatarImg.src = url;
      avatarImg.classList.add('loaded');
      if (avatarFallback) avatarFallback.style.opacity = '0';
    };
    image.onerror = () => {
      avatarImg.removeAttribute('src');
      avatarImg.classList.remove('loaded');
      if (avatarFallback) avatarFallback.style.opacity = '1';
      showMessage('Не удалось загрузить фото профиля. Попробуйте другой файл.', 'error');
    };
    image.src = url;
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

  const persistProfile = async (nextUser, successMessage) => {
    const normalizedUser = normalizeServerProfile(nextUser, currentUser.steamId || defaultSteamId);
    const savedUser = saveProfileToServer(normalizedUser);
    const serverUser = normalizeServerProfile(savedUser || {}, normalizedUser.steamId);

    currentUser = normalizeServerProfile({
      ...serverUser,
      ...normalizedUser,
      displayName: normalizedUser.displayName,
      nickname: normalizedUser.nickname,
      avatarUrl: normalizedUser.avatarUrl,
      customDisplayName: normalizedUser.customDisplayName,
      customAvatarUrl: normalizedUser.customAvatarUrl
    }, normalizedUser.steamId);

    renderProfile(currentUser);
    saveCurrentUser(currentUser);
    showMessage(successMessage, 'success');
  };

  const saveName = async () => {
    if (!nameNode) return;

    if (!currentUser.steamId || currentUser.steamId === defaultSteamId) {
      showMessage('Steam ID не найден. Войдите через Steam.', 'error');
      return;
    }

    const displayName = nicknameInput.value.replace(/\s+/g, ' ').trim().slice(0, 32);

    if (!displayName) {
      renderProfile(currentUser);
      showMessage('Введите никнейм профиля.', 'error');
      return;
    }

    await persistProfile({
      ...currentUser,
      displayName,
      nickname: displayName,
      customDisplayName: true,
      updatedAt: new Date().toISOString()
    }, 'Имя профиля сохранено.');
  };

  const saveAvatar = async (file) => {
    if (!file) return;

    if (!currentUser.steamId || currentUser.steamId === defaultSteamId) {
      showMessage('Steam ID не найден. Войдите через Steam.', 'error');
      return;
    }

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

      await persistProfile({
        ...currentUser,
        avatarUrl,
        customAvatarUrl: true,
        updatedAt: new Date().toISOString()
      }, 'Фото профиля сохранено.');
    } catch (error) {
      console.error('Не удалось сохранить аватар:', error);
      showMessage('Не удалось сохранить фото профиля. Попробуйте другой файл.', 'error');
    }
  };

  const handleLogout = async () => {
    removeCurrentUser();
    window.location.href = '../index.html';
  };

  const loadProfileFromStorage = async () => {
    const sessionUser = getCurrentUser();
    const steamId = String(sessionUser?.steamId || defaultSteamId);
    const cachedUser = normalizeServerProfile(sessionUser || createDefaultUser(steamId), steamId);

    currentUser = cachedUser;
    renderProfile(currentUser);

    if (!steamId || steamId === defaultSteamId) {
      showMessage('Войдите через Steam, чтобы загрузить профиль.', '');
      return;
    }

    if (cachedUser.steamId && cachedUser.steamId !== defaultSteamId) {
      showMessage('Профиль загружен из локального хранилища.', 'success');
    } else {
      const steamProfile = await loadSteamProfile(steamId, {
        ...currentUser,
        customDisplayName: false,
        customAvatarUrl: false
      });
      currentUser = normalizeServerProfile(steamProfile, steamId);
      saveCurrentUser(currentUser);
      renderProfile(currentUser);
    }
  };

  avatarButton?.addEventListener('click', () => avatarFileInput?.click());
  avatarFileInput?.addEventListener('change', (event) => {
    saveAvatar(event.target.files?.[0]);
    event.target.value = '';
  });
  saveNameButton?.addEventListener('click', saveName);
  logoutButton?.addEventListener('click', handleLogout);

  nicknameInput?.addEventListener('input', () => {
    if (!nameNode) return;
    nameNode.textContent = nicknameInput.value.trim() || normalizeDisplayName(currentUser);
  });

  nicknameInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveName();
      nicknameInput.blur();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      renderProfile(currentUser);
      nicknameInput.blur();
    }
  });

  loadProfileFromStorage();
});
