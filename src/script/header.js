import { loadSteamProfile } from './steam-profile.js';
import { fetchSavedProfile, saveProfileToServer } from './profile-api.js';

document.addEventListener('DOMContentLoaded', () => {
  const burger = document.querySelector('.header__burger');
  const header = document.querySelector('.header');
  const nav = document.querySelector('.header__nav');
  const closeButton = document.querySelector('.header__nav-close');
  const loginBtn = document.querySelector('.login-btn');
  const cabinetLogoutBtn = document.querySelector('.cabinet__logout-button');

  const currentPath = window.location.pathname;
  const isCabinetPage = currentPath.endsWith('/cabinet.html') || currentPath.endsWith('\\cabinet.html');
  const cabinetUrl = currentPath.includes('/pages/') ? 'cabinet.html' : './pages/cabinet.html';
  const homeUrl = currentPath.includes('/pages/') ? '../index.html' : './index.html';

  const storageKey = 'barelandsUser';
  const usersKey = 'barelandsUsers';
  let authModalInitialized = false;
  const isSteamCallbackPage = currentPath.endsWith('/steam-auth.html') || currentPath.endsWith('\\steam-auth.html');

  function getBaseUrlPath() {
    if (currentPath === '/' || currentPath === '') return '/';
    if (currentPath.endsWith('/')) return currentPath;
    return currentPath.replace(/\/[^/]*$/, '/');
  }

  function getSteamCallbackPath() {
    const baseUrlPath = getBaseUrlPath();
    return baseUrlPath.endsWith('/pages/') ? `${baseUrlPath}steam-auth.html` : `${baseUrlPath}pages/steam-auth.html`;
  }

  function getSteamCallbackUrl() {
    return `${window.location.origin}${getSteamCallbackPath()}`;
  }

  function getSteamRealm() {
    return `${window.location.origin}${getBaseUrlPath()}`;
  }

  function isLoggedIn() {
    return Boolean(localStorage.getItem(storageKey));
  }

  function getCurrentUser() {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function saveCurrentUser(user) {
    localStorage.setItem(storageKey, JSON.stringify(user));
  }

  function removeCurrentUser() {
    localStorage.removeItem(storageKey);
  }

  function getRegisteredUsers() {
    const raw = localStorage.getItem(usersKey);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  function saveRegisteredUsers(users) {
    localStorage.setItem(usersKey, JSON.stringify(users));
  }

  function redirectToCabinet() {
    window.location.href = cabinetUrl;
  }

  function redirectToHome() {
    window.location.href = homeUrl;
  }

  function getProfileDisplayName(user) {
    if (!user) return 'Игрок';
    if (user.nickname) return user.nickname;
    if (user.email) return user.email.split('@')[0];
    if (user.steamId) return `steam_${user.steamId.slice(-6)}`;
    return 'Игрок';
  }

  function getProfileInitials(user) {
    const displayName = getProfileDisplayName(user);
    const parts = displayName.replace(/^steam_/i, '').split(/[^A-Za-z0-9]+/).filter(Boolean);
    if (parts.length === 0) return 'ST';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function createAuthModal() {
    if (document.querySelector('.auth-modal')) return;

    const modalHtml = `
<div class="auth-modal" role="dialog" aria-modal="true" aria-hidden="true">
  <div class="auth-modal__overlay"></div>
  <div class="auth-modal__content">
    <div class="auth-modal__header">
      <h2 class="auth-modal__title">Вход через Steam</h2>
      <button class="auth-modal__close" type="button" aria-label="Закрыть">×</button>
    </div>
    <div class="auth-modal__body">
      <p class="auth-modal__description">Для доступа к кабинету авторизуйтесь через Steam. После успешного входа вы будете перенаправлены в личный кабинет.</p>
      <button class="auth-modal__steam-button" type="button">Войти через Steam</button>
      <p class="auth-modal__note">Steam-авторизация работает только в браузере с поддержкой Steam OpenID.</p>
    </div>
    <p class="auth-modal__message" aria-live="polite"></p>
  </div>
</div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  function setModalState(isOpen) {
    const modal = document.querySelector('.auth-modal');
    if (!modal) return;

    modal.setAttribute('aria-hidden', String(!isOpen));
    document.body.classList.toggle('auth-modal-open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  function showAuthMessage(text, isError = true) {
    const message = document.querySelector('.auth-modal__message');
    if (!message) return;
    message.textContent = text;
    message.classList.toggle('auth-modal__message--error', isError);
    message.classList.toggle('auth-modal__message--success', !isError);
  }

  function performSteamAuth() {
    if (!['http:', 'https:'].includes(window.location.protocol)) {
      showAuthMessage('Steam-авторизация работает только на http://localhost или https-сайте.');
      return;
    }

    const isHttpLocalhost = window.location.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    if (window.location.protocol === 'http:' && !isHttpLocalhost) {
      showAuthMessage('Steam требует HTTPS для домена. Откройте сайт по HTTPS и попробуйте снова.');
      return;
    }

    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': getSteamCallbackUrl(),
      'openid.realm': getSteamRealm(),
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    });

    window.location.assign(`https://steamcommunity.com/openid/login?${params.toString()}`);
  }

  function setupAuthModalEvents() {
    if (authModalInitialized) return;

    const modal = document.querySelector('.auth-modal');
    if (!modal) return;

    const overlay = modal.querySelector('.auth-modal__overlay');
    const close = modal.querySelector('.auth-modal__close');
    const steamButton = modal.querySelector('.auth-modal__steam-button');

    overlay.addEventListener('click', () => setModalState(false));
    close.addEventListener('click', () => setModalState(false));
    steamButton.addEventListener('click', performSteamAuth);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
        setModalState(false);
      }
    });

    authModalInitialized = true;
  }

  async function handleSteamCallbackPage() {
    if (!isSteamCallbackPage) return;

    const statusElement = document.querySelector('.steam-auth__status');
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('openid.mode');

    if (!mode) {
      if (statusElement) statusElement.textContent = 'Steam не вернул параметры авторизации. Закройте вкладку и войдите через Steam повторно.';
      return;
    }

    if (mode === 'cancel') {
      if (statusElement) statusElement.textContent = 'Авторизация Steam отменена. Попробуйте снова.';
      return;
    }

    if (mode !== 'id_res') {
      if (statusElement) statusElement.textContent = 'Ошибка Steam авторизации. Попробуйте снова.';
      return;
    }

    const opEndpoint = params.get('openid.op_endpoint');
    if (opEndpoint && !opEndpoint.startsWith('https://steamcommunity.com/openid')) {
      if (statusElement) statusElement.textContent = 'Steam вернул недоверенный ответ авторизации. Попробуйте снова.';
      return;
    }

    const claimedId = params.get('openid.claimed_id') || params.get('openid.identity') || '';
    const steamIdMatch = claimedId.match(/openid(?:\.id|\/id)\/(\d+)$/);

    if (!steamIdMatch) {
      if (statusElement) statusElement.textContent = 'Ошибка Steam авторизации. Steam ID не получен.';
      return;
    }

    const steamId = steamIdMatch[1];
    const savedProfile = await fetchSavedProfile(steamId);
    const basicUser = {
      ...savedProfile,
      steamId,
      email: savedProfile.email || `steam_${steamId}@barelands.local`,
      displayName: savedProfile.displayName || `steam_${steamId}`,
      avatarUrl: savedProfile.avatarUrl || `https://steamcommunity.com/profiles/${steamId}/avatar/`,
      customAvatarUrl: savedProfile.customAvatarUrl || false
    };

    try {
      if (statusElement) statusElement.textContent = 'Получаем данные профиля Steam...';
      const enrichedUser = await loadSteamProfile(steamId, basicUser);
      const persistedUser = await saveProfileToServer(enrichedUser);
      saveCurrentUser(persistedUser);
    } catch (error) {
      console.error('Не удалось сохранить Steam профиль:', error);
      if (statusElement) statusElement.textContent = 'Не удалось сохранить профиль в браузере. Проверьте разрешения localStorage и попробуйте снова.';
      return;
    }

    if (statusElement) statusElement.textContent = 'Авторизация через Steam успешна. Перенаправление...';
    setTimeout(() => redirectToCabinet(), 1200);
  }

  function initAuthState() {
    if (isCabinetPage && !isLoggedIn()) {
      redirectToHome();
      return;
    }

    if (isSteamCallbackPage) {
      handleSteamCallbackPage();
    }

    if (isCabinetPage) {
      const currentUser = getCurrentUser();
      const nameNode = document.querySelector('.cabinet__name');
      const steamIdNode = document.querySelector('.cabinet__steam-id');
      const avatarNode = document.querySelector('.cabinet__avatar-button');
      const displayName = getProfileDisplayName(currentUser);

      if (nameNode) {
        nameNode.textContent = displayName;
      }
      if (steamIdNode && currentUser && currentUser.steamId) {
        steamIdNode.textContent = currentUser.steamId;
      }
      if (avatarNode) {
        avatarNode.textContent = getProfileInitials(currentUser);
      }
    }

    if (cabinetLogoutBtn) {
cabinetLogoutBtn.addEventListener('click', async () => {
         await saveProfileToServer(getCurrentUser());
         removeCurrentUser();
         redirectToHome();
         });
    }

    createAuthModal();
    setupAuthModalEvents();
  }

  function setupLoginButton() {
    if (!loginBtn) return;
    loginBtn.addEventListener('click', () => {
      if (isLoggedIn()) {
        redirectToCabinet();
        return;
      }
      createAuthModal();
      setupAuthModalEvents();
      setModalState(true);
    });
  }

  function closeNav() {
    header.classList.remove('header--nav-open');
    burger.setAttribute('aria-expanded', 'false');
  }

  function openNav() {
    header.classList.add('header--nav-open');
    burger.setAttribute('aria-expanded', 'true');
  }

  if (!burger || !header || !nav) return;

  burger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (header.classList.contains('header--nav-open')) closeNav(); else openNav();
  });

  nav.addEventListener('click', (e) => {
    if (e.target.matches('.header__nav-link')) closeNav();
  });

  if (closeButton) {
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      closeNav();
    });
  }

  document.addEventListener('click', (e) => {
    if (!header.contains(e.target)) closeNav();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNav();
  });

  initAuthState();
  setupLoginButton();
});
