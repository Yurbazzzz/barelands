import { saveProfileToServer } from './profile-api.js';
import { getCurrentUser, saveCurrentUser } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.cabinet__tab');
    const tabPanels = document.querySelectorAll('.cabinet__tab-panel');
    const balanceAmount = document.querySelector('.cabinet__balance-amount');
    const balanceTopup = document.querySelector('.cabinet__balance-topup');
    const promoInput = document.querySelector('.cabinet__promo-input');
    const promoActivate = document.querySelector('.cabinet__promo-activate');
    const statsServer = document.querySelector('.cabinet__stats-server');
    const statsData = document.querySelector('.cabinet__stats-data');
    const linkButtons = document.querySelectorAll('.cabinet__link-button');
    const saveNameButton = document.querySelector('.cabinet__save-name-button');
    const nicknameInput = document.querySelector('.cabinet__nickname-input');
    const messageEl = document.querySelector('.cabinet__edit-message');
    const avatarButton = document.querySelector('.cabinet__avatar-button');
    const avatarImg = document.querySelector('.cabinet__avatar-img');
    const avatarFallback = document.querySelector('.cabinet__avatar-fallback');
    const cabinetName = document.querySelector('.cabinet__name');
    const steamIdEl = document.querySelector('.cabinet__steam-id');
    const logoutButton = document.querySelector('.cabinet__logout-button');

    function switchTab(targetTab) {
        tabButtons.forEach(btn => btn.classList.toggle('cabinet__tab--active', btn.dataset.tab === targetTab));
        tabPanels.forEach(panel => panel.classList.toggle('cabinet__tab-panel--active', panel.dataset.tab === targetTab));
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    balanceTopup?.addEventListener('click', () => {
        const amount = prompt('Введите сумму пополнения (в рублях):');
        if (amount && !isNaN(amount) && parseInt(amount) > 0) {
            alert(`Пополнение на ${amount} ₽ будет доступно в ближайшем обновлении`);
        }
    });

    promoActivate?.addEventListener('click', () => {
        const code = promoInput.value.trim();
        if (!code) {
            alert('Введите промокод');
            return;
        }
        alert(`Промокод "${code}" будет обработан в ближайшем обновлении`);
        promoInput.value = '';
    });

    linkButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const provider = btn.classList.contains('cabinet__link-button--telegram') ? 'telegram' :
                          btn.classList.contains('cabinet__link-button--discord') ? 'discord' : 'twitch';
            alert(`Привязка ${provider} будет доступна в ближайшем обновлении`);
        });
    });

    const servers = [
        { id: 1, name: 'Barelands 1' },
        { id: 2, name: 'Barelands 2' },
        { id: 3, name: 'Barelands 3' }
    ];

    servers.forEach(server => {
        const option = document.createElement('option');
        option.value = server.id;
        option.textContent = server.name;
        statsServer?.appendChild(option);
    });

    statsServer?.addEventListener('change', () => {
        if (statsServer.value) {
            statsData.innerHTML = `
                <p>Игровой временной период: 0 ч</p>
                <p>Убийств: 0</p>
                <p>Смертей: 0</p>
            `;
        } else {
            statsData.innerHTML = '<p class="cabinet__stats-placeholder">Статистика будет доступна после выбора сервера</p>';
        }
    });

    function renderUser(user) {
        if (!user) return;
        if (balanceAmount) balanceAmount.textContent = `${user.balance || 0} ₽`;
        if (cabinetName) {
            cabinetName.textContent = user.nickname || user.displayName || user.email?.split('@')[0] || `steam_${user.steamId?.slice(-6) || ''}`;
        }
        if (steamIdEl) steamIdEl.textContent = user.steamId || 'Не задан';
        if (avatarImg && user.avatarUrl) {
            avatarImg.src = user.avatarUrl;
            avatarImg.classList.add('loaded');
            avatarImg.onload = () => avatarImg.classList.add('loaded');
        }
        if (avatarFallback) {
            avatarFallback.textContent = getInitials(user.nickname || user.displayName || user.email || 'ST');
        }
        if (nicknameInput) {
            nicknameInput.value = user.nickname || '';
        }
    }

    function getInitials(text) {
        const parts = text?.replace(/^steam_/i, '').split(/[^A-Za-z0-9]+/).filter(Boolean);
        if (parts.length === 0) return 'ST';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    function showMessage(text, isSuccess = true) {
        if (messageEl) {
            messageEl.textContent = text;
            messageEl.classList.toggle('cabinet__edit-message--success', isSuccess);
            messageEl.classList.toggle('cabinet__edit-message--error', !isSuccess);
        }
    }

    const user = getCurrentUser();
    if (user) {
        renderUser(user);
    }

    saveNameButton?.addEventListener('click', async () => {
        const user = getCurrentUser();
        if (!user?.steamId) {
            showMessage('Пользователь не найден', false);
            return;
        }
        const newNickname = nicknameInput.value.trim().substring(0, 32);
        const updatedUser = { ...user, nickname: newNickname };
        saveCurrentUser(updatedUser);
        renderUser(updatedUser);
        try {
            await saveProfileToServer(updatedUser);
            showMessage('Никнейм сохранён', true);
        } catch (error) {
            showMessage('Не удалось сохранить на сервере', false);
        }
    });

    avatarButton?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const user = getCurrentUser();
                if (!user?.steamId) return;
                const updatedUser = { ...user, avatarUrl: reader.result, customAvatarUrl: true };
                saveCurrentUser(updatedUser);
                if (avatarImg) {
                    avatarImg.src = reader.result;
                    avatarImg.classList.add('loaded');
                }
                saveProfileToServer(updatedUser).catch(() => {});
            };
            reader.readAsDataURL(file);
        };
        input.click();
    });

    logoutButton?.addEventListener('click', async () => {
        const user = getCurrentUser();
        if (user?.steamId) {
            try {
                await saveProfileToServer(user);
            } catch (error) {
                console.warn('Не удалось сохранить профиль перед выходом:', error.message);
            }
        }
        window.location.href = '../index.html';
        window.sessionStorage.clear();
        window.localStorage.removeItem('barelandsUser');
    });
});