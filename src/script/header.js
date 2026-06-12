document.addEventListener('DOMContentLoaded', () => {
  const burger = document.querySelector('.header__burger');
  const header = document.querySelector('.header');
  const nav = document.querySelector('.header__nav');
  const closeButton = document.querySelector('.header__nav-close');

  if (!burger || !header || !nav) return;

  function closeNav() {
    header.classList.remove('header--nav-open');
    burger.setAttribute('aria-expanded', 'false');
  }

  function openNav() {
    header.classList.add('header--nav-open');
    burger.setAttribute('aria-expanded', 'true');
  }

  burger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (header.classList.contains('header--nav-open')) closeNav(); else openNav();
  });

  // close when clicking a nav link
  nav.addEventListener('click', (e) => {
    if (e.target.matches('.header__nav-link')) closeNav();
  });

  if (closeButton) {
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      closeNav();
    });
  }

  // close on outside click
  document.addEventListener('click', (e) => {
    if (!header.contains(e.target)) closeNav();
  });

  // close on escape
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });
});
