document.addEventListener('DOMContentLoaded', () => {
    const items = document.querySelectorAll('.shop-item');
    const modal = document.getElementById('shop-modal');
    const backdrop = document.getElementById('shop-modal-backdrop');
    const modalTitle = document.getElementById('shop-modal-title');
    const modalDesc = document.getElementById('shop-modal-description');
    const modalImage = document.getElementById('shop-modal-image');
    const modalServerSelect = document.getElementById('shop-modal-server');
    const modalClose = document.getElementById('shop-modal-close');
    const modalConfirm = document.getElementById('shop-modal-confirm');

    function openModal(itemEl) {
        const title = itemEl.querySelector('.shop-item__title')?.textContent || '';
        const desc = itemEl.querySelector('.shop-item__description')?.textContent || '';
        modalTitle.textContent = title;
        modalDesc.textContent = desc;

        const imageEl = itemEl.querySelector('.shop-item__image');
        if (imageEl) {
            const bg = getComputedStyle(imageEl).backgroundImage;
            modalImage.style.backgroundImage = bg && bg !== 'none' ? bg : '';
        }

        // Populate servers (fallback list)
        if (!modalServerSelect.dataset.populated) {
            const servers = [
                { id: 'ru-1', name: 'RU-1' },
                { id: 'eu-1', name: 'EU-1' },
                { id: 'us-1', name: 'US-1' }
            ];
            modalServerSelect.innerHTML = '';
            servers.forEach(s => {
                const opt = document.createElement('option');
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

    items.forEach(item => {
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'button');
        item.classList.add('shop-item--clickable');
        item.addEventListener('click', () => openModal(item));
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(item); }
        });
    });

    backdrop.addEventListener('click', closeModal);
    modalClose.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    modalConfirm.addEventListener('click', () => {
        const server = modalServerSelect.value;
        console.log('Выбран сервер:', server, 'для товара', modalTitle.textContent);
        // Здесь можно добавить логику: добавить в корзину, открыть форму заказа и т.д.
        closeModal();
    });
});
