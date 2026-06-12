// Авто-подстановка фоновых изображений для карточек магазина (webpack-safe)
document.addEventListener('DOMContentLoaded', () => {
  const normalize = str => str.toLowerCase().replace(/[^a-z0-9а-яё\s]/gi, '').replace(/\s+/g, ' ').trim();
  // Явное соответствие русских названий товаров файлам в src/images
  const map = {
    'автомобильный аккумулятор': require('../images/akum.png'),
    'аккумулятор для грузовика': require('../images/gruz_akum.png'),
    'автомобильный радиатор': require('../images/radiator.png'),
    'свеча зажигания': require('../images/svecha_z.png'),
    'свеча накаливания': require('../images/svecha_n.png'),
    'канистра с бензином': require('../images/canistra.png'),
    'колесо gunter 2': require('../images/coleso_gunter.png'),
    'колесо m3s': require('../images/coleso_v3s.png'),
    'сдвоенное колесо m3s': require('../images/coleso_v3sDouble.png'),
    'колесо ada 4x4': require('../images/coleso_niva.png'),
      'колесо m1025': require('../images/coleso_hummer.png'),
    'колесо olga 24': require('../images/coleso_volga.png'),
    'колесо sarka 120': require('../images/coleso_sarka.png'),
    'гаечный ключ': require('../images/gaechniy_klyuch.png'),
    'паяльная лампа': require('../images/payalnaia_lampa.png'),
    'монтировка': require('../images/montirovka.png'),
    'отвертка': require('../images/otvertka.png'),
    'кувалда': require('../images/kuvalda.png'),
    'лопата': require('../images/lopata.png'),
    'пила': require('../images/pila.png'),
    'плоскогубцы': require('../images/ploskogubti.png'),
    'топорик': require('../images/toporik.png'),
    'точильный камень': require('../images/toch_kamen.png'),
    'пачка гвоздей': require('../images/gvozdi.png'),
    'большая палатка': require('../images/bolshaia_palatka.png'),
    'средняя палатка': require('../images/srednyaia_palatka.png'),
    'навес': require('../images/naves.png'),
    'бочка': require('../images/bochka.png')
  };

  document.querySelectorAll('.shop-item').forEach(item => {
    const titleEl = item.querySelector('.shop-item__title');
    const imgEl = item.querySelector('.shop-item__image');
    if (!titleEl || !imgEl) return;
    const title = normalize(titleEl.textContent || '').replace(/\bдля\b/g, '').replace(/\bколесо\b/g, '').trim();
    const url = map[title];
    if (url) {
      imgEl.style.backgroundImage = `url(${url})`;
      console.log('[shop-images] set', title, url);
    } else {
      console.warn('[shop-images] no image for', title);
    }
  });
});
