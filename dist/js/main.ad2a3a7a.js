/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/script/cabinet.js"
/*!*******************************!*\
  !*** ./src/script/cabinet.js ***!
  \*******************************/
() {

document.addEventListener('DOMContentLoaded', function () {
  var storageKey = 'barelandsUser';
  var currentUser = JSON.parse(localStorage.getItem(storageKey) || 'null');
  var nameNode = document.querySelector('.cabinet__name');
  var steamIdNode = document.querySelector('.cabinet__steam-id');
  var avatarImg = document.querySelector('.cabinet__avatar-img');
  var avatarFallback = document.querySelector('.cabinet__avatar-fallback');
  if (!currentUser) {
    return;
  }
  var normalizeDisplayName = function normalizeDisplayName(user) {
    if (!user) return 'Игрок';
    if (user.displayName) return user.displayName;
    if (user.nickname) return user.nickname;
    if (user.email) return user.email.split('@')[0];
    if (user.steamId) return "steam_".concat(user.steamId.slice(-6));
    return 'Игрок';
  };
  var makeInitials = function makeInitials(displayName) {
    var parts = displayName.replace(/^steam_/i, '').split(/[^A-Za-z0-9]+/).filter(Boolean);
    if (parts.length === 0) return 'ST';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };
  var updateProfileView = function updateProfileView(user) {
    var displayName = normalizeDisplayName(user);
    var initials = makeInitials(displayName);
    if (nameNode) nameNode.textContent = displayName;
    if (steamIdNode && user.steamId) steamIdNode.textContent = user.steamId;
    if (avatarFallback) avatarFallback.textContent = initials;
  };
  var applyAvatar = function applyAvatar(url) {
    if (!url || !avatarImg) return;
    avatarImg.src = url;
    avatarImg.addEventListener('load', function () {
      avatarImg.classList.add('loaded');
      if (avatarFallback) avatarFallback.style.opacity = '0';
    });
    avatarImg.addEventListener('error', function () {
      if (avatarImg.parentNode) avatarImg.parentNode.removeChild(avatarImg);
    });
  };
  var init = function init() {
    updateProfileView(currentUser);
    var avatarUrl = currentUser.avatarUrl || (currentUser.steamId ? "https://steamcommunity.com/profiles/".concat(currentUser.steamId, "/avatar/") : null);
    if (avatarUrl) applyAvatar(avatarUrl);
  };
  init();
});

/***/ },

/***/ "./src/script/header.js"
/*!******************************!*\
  !*** ./src/script/header.js ***!
  \******************************/
() {

document.addEventListener('DOMContentLoaded', function () {
  var burger = document.querySelector('.header__burger');
  var header = document.querySelector('.header');
  var nav = document.querySelector('.header__nav');
  var closeButton = document.querySelector('.header__nav-close');
  var loginBtn = document.querySelector('.login-btn');
  var cabinetLogoutBtn = document.querySelector('.cabinet__logout-button');
  var currentPath = window.location.pathname;
  var isCabinetPage = currentPath.endsWith('/cabinet.html') || currentPath.endsWith('\\cabinet.html');
  var cabinetUrl = currentPath.includes('/pages/') ? 'cabinet.html' : './pages/cabinet.html';
  var homeUrl = currentPath.includes('/pages/') ? '../index.html' : './index.html';
  var storageKey = 'barelandsUser';
  var usersKey = 'barelandsUsers';
  var authModalInitialized = false;
  var steamCallbackPage = '/pages/steam-auth.html';
  var steamRealm = "".concat(window.location.origin, "/");
  var isSteamCallbackPage = currentPath.endsWith('/steam-auth.html') || currentPath.endsWith('\\steam-auth.html');
  function isLoggedIn() {
    return Boolean(localStorage.getItem(storageKey));
  }
  function getCurrentUser() {
    var raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_unused) {
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
    var raw = localStorage.getItem(usersKey);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch (_unused2) {
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
    if (user.steamId) return "steam_".concat(user.steamId.slice(-6));
    return 'Игрок';
  }
  function getProfileInitials(user) {
    var displayName = getProfileDisplayName(user);
    var parts = displayName.replace(/^steam_/i, '').split(/[^A-Za-z0-9]+/).filter(Boolean);
    if (parts.length === 0) return 'ST';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  function createAuthModal() {
    if (document.querySelector('.auth-modal')) return;
    var modalHtml = "\n<div class=\"auth-modal\" role=\"dialog\" aria-modal=\"true\" aria-hidden=\"true\">\n  <div class=\"auth-modal__overlay\"></div>\n  <div class=\"auth-modal__content\">\n    <div class=\"auth-modal__header\">\n      <h2 class=\"auth-modal__title\">\u0412\u0445\u043E\u0434 \u0447\u0435\u0440\u0435\u0437 Steam</h2>\n      <button class=\"auth-modal__close\" type=\"button\" aria-label=\"\u0417\u0430\u043A\u0440\u044B\u0442\u044C\">\xD7</button>\n    </div>\n    <div class=\"auth-modal__body\">\n      <p class=\"auth-modal__description\">\u0414\u043B\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0443 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0443\u0439\u0442\u0435\u0441\u044C \u0447\u0435\u0440\u0435\u0437 Steam. \u041F\u043E\u0441\u043B\u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u043E\u0433\u043E \u0432\u0445\u043E\u0434\u0430 \u0432\u044B \u0431\u0443\u0434\u0435\u0442\u0435 \u043F\u0435\u0440\u0435\u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u044B \u0432 \u043B\u0438\u0447\u043D\u044B\u0439 \u043A\u0430\u0431\u0438\u043D\u0435\u0442.</p>\n      <button class=\"auth-modal__steam-button\" type=\"button\">\u0412\u043E\u0439\u0442\u0438 \u0447\u0435\u0440\u0435\u0437 Steam</button>\n      <p class=\"auth-modal__note\">Steam-\u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435 \u0441 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u043E\u0439 Steam OpenID.</p>\n    </div>\n    <p class=\"auth-modal__message\" aria-live=\"polite\"></p>\n  </div>\n</div>";
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
  function setModalState(isOpen) {
    var modal = document.querySelector('.auth-modal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', String(!isOpen));
    document.body.classList.toggle('auth-modal-open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }
  function showAuthMessage(text) {
    var isError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    var message = document.querySelector('.auth-modal__message');
    if (!message) return;
    message.textContent = text;
    message.classList.toggle('auth-modal__message--error', isError);
    message.classList.toggle('auth-modal__message--success', !isError);
  }
  function performSteamAuth() {
    var params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': "".concat(window.location.origin).concat(steamCallbackPage),
      'openid.realm': steamRealm,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    });
    window.location.href = "https://steamcommunity.com/openid/login?".concat(params.toString());
  }
  function setupAuthModalEvents() {
    if (authModalInitialized) return;
    var modal = document.querySelector('.auth-modal');
    if (!modal) return;
    var overlay = modal.querySelector('.auth-modal__overlay');
    var close = modal.querySelector('.auth-modal__close');
    var steamButton = modal.querySelector('.auth-modal__steam-button');
    overlay.addEventListener('click', function () {
      return setModalState(false);
    });
    close.addEventListener('click', function () {
      return setModalState(false);
    });
    steamButton.addEventListener('click', performSteamAuth);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
        setModalState(false);
      }
    });
    authModalInitialized = true;
  }
  function handleSteamCallbackPage() {
    if (!isSteamCallbackPage) return;
    var statusElement = document.querySelector('.steam-auth__status');
    var params = new URLSearchParams(window.location.search);
    var mode = params.get('openid.mode');
    if (mode === 'cancel') {
      if (statusElement) statusElement.textContent = 'Авторизация Steam отменена. Попробуйте снова.';
      return;
    }
    var claimedId = params.get('openid.claimed_id') || params.get('openid.identity') || '';
    var steamIdMatch = claimedId.match(/openid(?:\.id|\/id)\/(\d+)$/);
    if (!steamIdMatch) {
      if (statusElement) statusElement.textContent = 'Ошибка Steam авторизации. Параметры не получены.';
      return;
    }
    var steamId = steamIdMatch[1];
    saveCurrentUser({
      steamId: steamId,
      email: "steam_".concat(steamId, "@barelands.local"),
      displayName: "steam_".concat(steamId),
      avatarUrl: "https://steamcommunity.com/profiles/".concat(steamId, "/avatar/")
    });
    if (statusElement) statusElement.textContent = 'Авторизация через Steam успешна. Перенаправление...';
    setTimeout(function () {
      return redirectToCabinet();
    }, 1200);
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
      var currentUser = getCurrentUser();
      var nameNode = document.querySelector('.cabinet__name');
      var steamIdNode = document.querySelector('.cabinet__steam-id');
      var avatarNode = document.querySelector('.cabinet__avatar');
      var displayName = getProfileDisplayName(currentUser);
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
      cabinetLogoutBtn.addEventListener('click', function () {
        removeCurrentUser();
        redirectToHome();
      });
    }
    createAuthModal();
    setupAuthModalEvents();
  }
  function setupLoginButton() {
    if (!loginBtn) return;
    loginBtn.addEventListener('click', function () {
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
  burger.addEventListener('click', function (e) {
    e.stopPropagation();
    if (header.classList.contains('header--nav-open')) closeNav();else openNav();
  });
  nav.addEventListener('click', function (e) {
    if (e.target.matches('.header__nav-link')) closeNav();
  });
  if (closeButton) {
    closeButton.addEventListener('click', function (e) {
      e.stopPropagation();
      closeNav();
    });
  }
  document.addEventListener('click', function (e) {
    if (!header.contains(e.target)) closeNav();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });
  initAuthState();
  setupLoginButton();
});

/***/ },

/***/ "./src/script/server-info.js"
/*!***********************************!*\
  !*** ./src/script/server-info.js ***!
  \***********************************/
() {

var serverCards = document.querySelectorAll('.server-card');
var serverModal = document.getElementById('server-modal');
var serverModalBackdrop = document.getElementById('server-modal-backdrop');
var closeServerModalButton = document.getElementById('close-server-modal');
var modalServerName = document.getElementById('modal-server-name');
var modalServerStatus = document.getElementById('modal-server-status');
var modalServerPlayers = document.getElementById('modal-server-players');
var serverInfo = [{
  name: 'Сервер 1',
  status: 'Онлайн',
  players: '120/500'
}, {
  name: 'Сервер 2',
  status: 'Оффлайн',
  players: '0/500'
}, {
  name: 'Сервер 3',
  status: 'Онлайн',
  players: '350/500'
}, {
  name: 'Сервер 4',
  status: 'Онлайн',
  players: '200/500'
}];
function openServerModal(index) {
  var info = serverInfo[index];
  if (!info || !serverModal) return;
  modalServerName.textContent = info.name;
  modalServerStatus.textContent = "\u0421\u0442\u0430\u0442\u0443\u0441: ".concat(info.status);
  modalServerPlayers.textContent = "\u0418\u0433\u0440\u043E\u043A\u043E\u0432 \u043E\u043D\u043B\u0430\u0439\u043D: ".concat(info.players);
  serverModal.removeAttribute('hidden');
}
function closeServerModal() {
  if (serverModal) {
    serverModal.setAttribute('hidden', '');
  }
}
serverCards.forEach(function (card, index) {
  card.addEventListener('click', function () {
    openServerModal(index);
  });
});
if (serverModalBackdrop) {
  serverModalBackdrop.addEventListener('click', closeServerModal);
}
if (closeServerModalButton) {
  closeServerModalButton.addEventListener('click', closeServerModal);
}

/***/ },

/***/ "./src/script/shop-images.js"
/*!***********************************!*\
  !*** ./src/script/shop-images.js ***!
  \***********************************/
(__unused_webpack_module, __unused_webpack_exports, __webpack_require__) {

// Авто-подстановка фоновых изображений для карточек магазина (webpack-safe)
document.addEventListener('DOMContentLoaded', function () {
  var normalize = function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9а-яё\s]/gi, '').replace(/\s+/g, ' ').trim();
  };
  // Явное соответствие русских названий товаров файлам в src/images
  var map = {
    'автомобильный аккумулятор': __webpack_require__(/*! ../images/akum.png */ "./src/images/akum.png"),
    'аккумулятор для грузовика': __webpack_require__(/*! ../images/gruz_akum.png */ "./src/images/gruz_akum.png"),
    'автомобильный радиатор': __webpack_require__(/*! ../images/radiator.png */ "./src/images/radiator.png"),
    'свеча зажигания': __webpack_require__(/*! ../images/svecha_z.png */ "./src/images/svecha_z.png"),
    'свеча накаливания': __webpack_require__(/*! ../images/svecha_n.png */ "./src/images/svecha_n.png"),
    'канистра с бензином': __webpack_require__(/*! ../images/canistra.png */ "./src/images/canistra.png"),
    'колесо gunter 2': __webpack_require__(/*! ../images/coleso_gunter.png */ "./src/images/coleso_gunter.png"),
    'колесо m3s': __webpack_require__(/*! ../images/coleso_v3s.png */ "./src/images/coleso_v3s.png"),
    'сдвоенное колесо m3s': __webpack_require__(/*! ../images/coleso_v3sDouble.png */ "./src/images/coleso_v3sDouble.png"),
    'колесо ada 4x4': __webpack_require__(/*! ../images/coleso_niva.png */ "./src/images/coleso_niva.png"),
    'колесо m1025': __webpack_require__(/*! ../images/coleso_hummer.png */ "./src/images/coleso_hummer.png"),
    'колесо olga 24': __webpack_require__(/*! ../images/coleso_volga.png */ "./src/images/coleso_volga.png"),
    'колесо sarka 120': __webpack_require__(/*! ../images/coleso_sarka.png */ "./src/images/coleso_sarka.png"),
    'гаечный ключ': __webpack_require__(/*! ../images/gaechniy_klyuch.png */ "./src/images/gaechniy_klyuch.png"),
    'паяльная лампа': __webpack_require__(/*! ../images/payalnaia_lampa.png */ "./src/images/payalnaia_lampa.png"),
    'монтировка': __webpack_require__(/*! ../images/montirovka.png */ "./src/images/montirovka.png"),
    'отвертка': __webpack_require__(/*! ../images/otvertka.png */ "./src/images/otvertka.png"),
    'кувалда': __webpack_require__(/*! ../images/kuvalda.png */ "./src/images/kuvalda.png"),
    'лопата': __webpack_require__(/*! ../images/lopata.png */ "./src/images/lopata.png"),
    'пила': __webpack_require__(/*! ../images/pila.png */ "./src/images/pila.png"),
    'плоскогубцы': __webpack_require__(/*! ../images/ploskogubti.png */ "./src/images/ploskogubti.png"),
    'топорик': __webpack_require__(/*! ../images/toporik.png */ "./src/images/toporik.png"),
    'точильный камень': __webpack_require__(/*! ../images/toch_kamen.png */ "./src/images/toch_kamen.png"),
    'пачка гвоздей': __webpack_require__(/*! ../images/gvozdi.png */ "./src/images/gvozdi.png"),
    'большая палатка': __webpack_require__(/*! ../images/bolshaia_palatka.png */ "./src/images/bolshaia_palatka.png"),
    'средняя палатка': __webpack_require__(/*! ../images/srednyaia_palatka.png */ "./src/images/srednyaia_palatka.png"),
    'навес': __webpack_require__(/*! ../images/naves.png */ "./src/images/naves.png"),
    'бочка': __webpack_require__(/*! ../images/bochka.png */ "./src/images/bochka.png")
  };
  document.querySelectorAll('.shop-item').forEach(function (item) {
    var titleEl = item.querySelector('.shop-item__title');
    var imgEl = item.querySelector('.shop-item__image');
    if (!titleEl || !imgEl) return;
    var title = normalize(titleEl.textContent || '').replace(/\bдля\b/g, '').replace(/\bколесо\b/g, '').trim();
    var url = map[title];
    if (url) {
      imgEl.style.backgroundImage = "url(".concat(url, ")");
      console.log('[shop-images] set', title, url);
    } else {
      console.warn('[shop-images] no image for', title);
    }
  });
});

/***/ },

/***/ "./src/script/shop.js"
/*!****************************!*\
  !*** ./src/script/shop.js ***!
  \****************************/
() {

document.addEventListener('DOMContentLoaded', function () {
  var items = document.querySelectorAll('.shop-item');
  var modal = document.getElementById('shop-modal');
  var backdrop = document.getElementById('shop-modal-backdrop');
  var modalTitle = document.getElementById('shop-modal-title');
  var modalDesc = document.getElementById('shop-modal-description');
  var modalImage = document.getElementById('shop-modal-image');
  var modalServerSelect = document.getElementById('shop-modal-server');
  var modalClose = document.getElementById('shop-modal-close');
  var modalConfirm = document.getElementById('shop-modal-confirm');
  function openModal(itemEl) {
    var _itemEl$querySelector, _itemEl$querySelector2;
    var title = ((_itemEl$querySelector = itemEl.querySelector('.shop-item__title')) === null || _itemEl$querySelector === void 0 ? void 0 : _itemEl$querySelector.textContent) || '';
    var desc = ((_itemEl$querySelector2 = itemEl.querySelector('.shop-item__description')) === null || _itemEl$querySelector2 === void 0 ? void 0 : _itemEl$querySelector2.textContent) || '';
    modalTitle.textContent = title;
    modalDesc.textContent = desc;
    var imageEl = itemEl.querySelector('.shop-item__image');
    if (imageEl) {
      var bg = getComputedStyle(imageEl).backgroundImage;
      modalImage.style.backgroundImage = bg && bg !== 'none' ? bg : '';
    }

    // Populate servers (fallback list)
    if (!modalServerSelect.dataset.populated) {
      var servers = [{
        id: 'ru-1',
        name: 'RU-1'
      }, {
        id: 'eu-1',
        name: 'EU-1'
      }, {
        id: 'us-1',
        name: 'US-1'
      }];
      modalServerSelect.innerHTML = '';
      servers.forEach(function (s) {
        var opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        modalServerSelect.appendChild(opt);
      });
      modalServerSelect.dataset.populated = '1';
    }

    // quantity removed — no default to set

    backdrop.classList.add('visible');
    modal.classList.add('visible');
    modalConfirm.focus();
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    backdrop.classList.remove('visible');
    modal.classList.remove('visible');
    document.body.style.overflow = '';
  }
  items.forEach(function (item) {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.classList.add('shop-item--clickable');
    item.addEventListener('click', function () {
      return openModal(item);
    });
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(item);
      }
    });
  });
  backdrop.addEventListener('click', closeModal);
  modalClose.addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });
  modalConfirm.addEventListener('click', function () {
    var server = modalServerSelect.value;
    console.log('Выбран сервер:', server, 'для товара', modalTitle.textContent);
    // Здесь можно добавить логику: добавить в корзину, открыть форму заказа и т.д.
    closeModal();
  });
});

/***/ },

/***/ "./src/styles/style.scss"
/*!*******************************!*\
  !*** ./src/styles/style.scss ***!
  \*******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ },

/***/ "./src/images/akum.png"
/*!*****************************!*\
  !*** ./src/images/akum.png ***!
  \*****************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/akum.589c436c.png";

/***/ },

/***/ "./src/images/bochka.png"
/*!*******************************!*\
  !*** ./src/images/bochka.png ***!
  \*******************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/bochka.2e3e3a67.png";

/***/ },

/***/ "./src/images/bolshaia_palatka.png"
/*!*****************************************!*\
  !*** ./src/images/bolshaia_palatka.png ***!
  \*****************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/bolshaia_palatka.705ca692.png";

/***/ },

/***/ "./src/images/canistra.png"
/*!*********************************!*\
  !*** ./src/images/canistra.png ***!
  \*********************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/canistra.37c71873.png";

/***/ },

/***/ "./src/images/coleso_gunter.png"
/*!**************************************!*\
  !*** ./src/images/coleso_gunter.png ***!
  \**************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/coleso_gunter.c4d8ca64.png";

/***/ },

/***/ "./src/images/coleso_hummer.png"
/*!**************************************!*\
  !*** ./src/images/coleso_hummer.png ***!
  \**************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/coleso_hummer.5156ec03.png";

/***/ },

/***/ "./src/images/coleso_niva.png"
/*!************************************!*\
  !*** ./src/images/coleso_niva.png ***!
  \************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/coleso_niva.9066e42a.png";

/***/ },

/***/ "./src/images/coleso_sarka.png"
/*!*************************************!*\
  !*** ./src/images/coleso_sarka.png ***!
  \*************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/coleso_sarka.c06d8df1.png";

/***/ },

/***/ "./src/images/coleso_v3s.png"
/*!***********************************!*\
  !*** ./src/images/coleso_v3s.png ***!
  \***********************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/coleso_v3s.14e0892a.png";

/***/ },

/***/ "./src/images/coleso_v3sDouble.png"
/*!*****************************************!*\
  !*** ./src/images/coleso_v3sDouble.png ***!
  \*****************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/coleso_v3sDouble.4675814a.png";

/***/ },

/***/ "./src/images/coleso_volga.png"
/*!*************************************!*\
  !*** ./src/images/coleso_volga.png ***!
  \*************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/coleso_volga.7e1640f7.png";

/***/ },

/***/ "./src/images/gaechniy_klyuch.png"
/*!****************************************!*\
  !*** ./src/images/gaechniy_klyuch.png ***!
  \****************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/gaechniy_klyuch.c08e9607.png";

/***/ },

/***/ "./src/images/gruz_akum.png"
/*!**********************************!*\
  !*** ./src/images/gruz_akum.png ***!
  \**********************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/gruz_akum.58f040cc.png";

/***/ },

/***/ "./src/images/gvozdi.png"
/*!*******************************!*\
  !*** ./src/images/gvozdi.png ***!
  \*******************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/gvozdi.19a9f1ed.png";

/***/ },

/***/ "./src/images/kuvalda.png"
/*!********************************!*\
  !*** ./src/images/kuvalda.png ***!
  \********************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/kuvalda.7ef2a56c.png";

/***/ },

/***/ "./src/images/lopata.png"
/*!*******************************!*\
  !*** ./src/images/lopata.png ***!
  \*******************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/lopata.77b11b26.png";

/***/ },

/***/ "./src/images/montirovka.png"
/*!***********************************!*\
  !*** ./src/images/montirovka.png ***!
  \***********************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/montirovka.93bbeb82.png";

/***/ },

/***/ "./src/images/naves.png"
/*!******************************!*\
  !*** ./src/images/naves.png ***!
  \******************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/naves.72ab2ba8.png";

/***/ },

/***/ "./src/images/otvertka.png"
/*!*********************************!*\
  !*** ./src/images/otvertka.png ***!
  \*********************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/otvertka.7e52f17b.png";

/***/ },

/***/ "./src/images/payalnaia_lampa.png"
/*!****************************************!*\
  !*** ./src/images/payalnaia_lampa.png ***!
  \****************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/payalnaia_lampa.3e0d271a.png";

/***/ },

/***/ "./src/images/pila.png"
/*!*****************************!*\
  !*** ./src/images/pila.png ***!
  \*****************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/pila.65bc199e.png";

/***/ },

/***/ "./src/images/ploskogubti.png"
/*!************************************!*\
  !*** ./src/images/ploskogubti.png ***!
  \************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/ploskogubti.54694962.png";

/***/ },

/***/ "./src/images/radiator.png"
/*!*********************************!*\
  !*** ./src/images/radiator.png ***!
  \*********************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/radiator.9b1b1199.png";

/***/ },

/***/ "./src/images/srednyaia_palatka.png"
/*!******************************************!*\
  !*** ./src/images/srednyaia_palatka.png ***!
  \******************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/srednyaia_palatka.09ca31e5.png";

/***/ },

/***/ "./src/images/svecha_n.png"
/*!*********************************!*\
  !*** ./src/images/svecha_n.png ***!
  \*********************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/svecha_n.b3d0c6c1.png";

/***/ },

/***/ "./src/images/svecha_z.png"
/*!*********************************!*\
  !*** ./src/images/svecha_z.png ***!
  \*********************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/svecha_z.a0042e7d.png";

/***/ },

/***/ "./src/images/toch_kamen.png"
/*!***********************************!*\
  !*** ./src/images/toch_kamen.png ***!
  \***********************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/toch_kamen.d67a884c.png";

/***/ },

/***/ "./src/images/toporik.png"
/*!********************************!*\
  !*** ./src/images/toporik.png ***!
  \********************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "assets/toporik.125e3d11.png";

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript && document.currentScript.tagName.toUpperCase() === 'SCRIPT')
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && (!scriptUrl || !/^http(s?):/.test(scriptUrl))) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/^blob:/, "").replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl + "../";
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _styles_style_scss__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./styles/style.scss */ "./src/styles/style.scss");
/* harmony import */ var _script_server_info_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./script/server-info.js */ "./src/script/server-info.js");
/* harmony import */ var _script_server_info_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_script_server_info_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _script_shop_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./script/shop.js */ "./src/script/shop.js");
/* harmony import */ var _script_shop_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_script_shop_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _script_shop_images_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./script/shop-images.js */ "./src/script/shop-images.js");
/* harmony import */ var _script_shop_images_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_script_shop_images_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _script_header_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./script/header.js */ "./src/script/header.js");
/* harmony import */ var _script_header_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_script_header_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _script_cabinet_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./script/cabinet.js */ "./src/script/cabinet.js");
/* harmony import */ var _script_cabinet_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_script_cabinet_js__WEBPACK_IMPORTED_MODULE_5__);






console.log('Webpack проект загружен!');
document.addEventListener('DOMContentLoaded', function () {
  console.log('DOM полностью загружена');
});
})();

/******/ })()
;