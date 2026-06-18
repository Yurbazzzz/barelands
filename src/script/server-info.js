document.addEventListener('DOMContentLoaded', () => {
  const serverCards = document.querySelectorAll('.server-card');
  const serverModal = document.getElementById('server-modal');
  const serverModalBackdrop = document.getElementById('server-modal-backdrop');
  const closeServerModalButton = document.getElementById('close-server-modal');

const serverInfo = [
       {
           name: 'Сервер 1',
           status: 'Онлайн',
           players: '120/500',
           imageClass: 'server-modal__image--server1',
           isDev: false
       },
       {
           name: 'Сервер 2',
           status: 'Оффлайн',
           players: '0/500',
           imageClass: 'server-modal__image--server3',
           isDev: true
       },
       {
           name: 'Сервер 3',
           status: 'Онлайн',
           players: '350/500',
           imageClass: 'server-modal__image--server2',
           isDev: false
       },
       {
           name: 'Сервер 4',
           status: 'Онлайн',
           players: '200/500',
           imageClass: 'server-modal__image--server4',
           isDev: true
       },
   ];

function openServerModal(index) {
     const info = serverInfo[index];
     if (!info || !serverModal) return;

     const modalServerName = document.getElementById('modal-server-name');
     const modalServerStatus = document.getElementById('modal-server-status');
     const modalServerPlayers = document.getElementById('modal-server-players');
     const modalServerImage = document.querySelector('.server-modal__image');
     const modalDevLabel = document.getElementById('modal-server-dev-label');

     modalServerName.textContent = info.name;
     modalServerStatus.textContent = `Статус: ${info.status}`;
     modalServerPlayers.textContent = `Игроков онлайн: ${info.players}`;
     
     if (modalServerImage) {
         modalServerImage.className = 'server-modal__image ' + info.imageClass;
     }
     
     if (modalDevLabel) {
         modalDevLabel.hidden = !info.isDev;
     }
     
     serverModal.removeAttribute('hidden');
  }

  function closeServerModal() {
      if (serverModal) {
          serverModal.setAttribute('hidden', '');
      }
  }

  if (serverCards.length) {
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
  }
});
