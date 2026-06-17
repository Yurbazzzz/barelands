import { usersStorageKey, userStorageKey } from './storage.js';

function migrateKeyToSessionStorage(key) {
  try {
    const localValue = window.localStorage.getItem(key);
    if (localValue && !window.sessionStorage.getItem(key)) {
      window.sessionStorage.setItem(key, localValue);
    }
  } catch {
  }
}

try {
  migrateKeyToSessionStorage(userStorageKey);
  migrateKeyToSessionStorage(usersStorageKey);
  window.localStorage.clear();
} catch {
}

window.dispatchEvent(new Event('barelands-storage-ready'));
