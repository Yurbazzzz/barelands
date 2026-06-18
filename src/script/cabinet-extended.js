import { saveProfileToServer } from './profile-api.js';
import { getCurrentUser } from './storage.js';

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

    const user = getCurrentUser();
    if (user && balanceAmount) {
        balanceAmount.textContent = `${user.balance || 0} ₽`;
        saveProfileToServer(user).catch(() => {});
    }
});