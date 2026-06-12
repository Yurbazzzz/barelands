document.addEventListener('DOMContentLoaded', () => {
  const storageKey = 'barelandsUser';
  const currentUser = JSON.parse(localStorage.getItem(storageKey) || 'null');
  const nameNode = document.querySelector('.cabinet__name');
  const steamIdNode = document.querySelector('.cabinet__steam-id');
  const avatarImg = document.querySelector('.cabinet__avatar-img');
  const avatarFallback = document.querySelector('.cabinet__avatar-fallback');

  if (!currentUser) {
    return;
  }

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

  const updateProfileView = (user) => {
    const displayName = normalizeDisplayName(user);
    const initials = makeInitials(displayName);

    if (nameNode) nameNode.textContent = displayName;
    if (steamIdNode && user.steamId) steamIdNode.textContent = user.steamId;
    if (avatarFallback) avatarFallback.textContent = initials;
  };

  const applyAvatar = (url) => {
    if (!url || !avatarImg) return;
    avatarImg.src = url;
    avatarImg.addEventListener('load', () => {
      avatarImg.classList.add('loaded');
      if (avatarFallback) avatarFallback.style.opacity = '0';
    });
    avatarImg.addEventListener('error', () => {
      if (avatarImg.parentNode) avatarImg.parentNode.removeChild(avatarImg);
    });
  };

  const init = () => {
    updateProfileView(currentUser);

    const avatarUrl = currentUser.avatarUrl || (currentUser.steamId ? `https://steamcommunity.com/profiles/${currentUser.steamId}/avatar/` : null);
    if (avatarUrl) applyAvatar(avatarUrl);
  };

  init();
});