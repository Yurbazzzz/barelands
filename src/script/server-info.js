const serverCards = document.querySelectorAll('.server-card');
const serverModal = document.getElementById('server-modal');
const serverModalBackdrop = document.getElementById('server-modal-backdrop');
const closeServerModalButton = document.getElementById('close-server-modal');
const modalServerName = document.getElementById('modal-server-name');
const modalServerStatus = document.getElementById('modal-server-status');
const modalServerPlayers = document.getElementById('modal-server-players');

const serverInfo = [
    {
        name: 'Сервер 1',
        status: 'Онлайн',
        players: '120/500',
    },
    {
        name: 'Сервер 2',
        status: 'Оффлайн',
        players: '0/500',
    },
    {
        name: 'Сервер 3',
        status: 'Онлайн',
        players: '350/500',
    },
    {
        name: 'Сервер 4',
        status: 'Онлайн',
        players: '200/500',
    },
];

function openServerModal(index) {
    const info = serverInfo[index];
    if (!info || !serverModal) return;

    modalServerName.textContent = info.name;
    modalServerStatus.textContent = `Статус: ${info.status}`;
    modalServerPlayers.textContent = `Игроков онлайн: ${info.players}`;
    serverModal.removeAttribute('hidden');
}

function closeServerModal() {
    if (serverModal) {
        serverModal.setAttribute('hidden', '');
    }
}

serverCards.forEach((card, index) => {
    card.addEventListener('click', () => {
        openServerModal(index);
    });
});

if (serverModalBackdrop) {
    serverModalBackdrop.addEventListener('click', closeServerModal);
}

if (closeServerModalButton) {
    closeServerModalButton.addEventListener('click', closeServerModal);
}
