export const userStorageKey = 'barelandsUser';
export const usersStorageKey = 'barelandsUsers';

function isStorageAvailable(storage) {
  try {
    const testKey = '__barelands_storage_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const canUseSessionStorage = isStorageAvailable(window.sessionStorage);
const canUseLocalStorage = isStorageAvailable(window.localStorage);

function readJson(storage, key) {
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function readStoredJson(key) {
  if (canUseSessionStorage) {
    const sessionValue = readJson(window.sessionStorage, key);
    if (sessionValue) return sessionValue;
  }

  if (canUseLocalStorage) {
    return readJson(window.localStorage, key);
  }

  return null;
}

export function writeStoredJson(key, value) {
  const json = JSON.stringify(value);

  if (canUseSessionStorage) {
    window.sessionStorage.setItem(key, json);
  }

  if (canUseLocalStorage) {
    window.localStorage.setItem(key, json);
  }
}

export function removeStoredKey(key) {
  if (canUseSessionStorage) {
    window.sessionStorage.removeItem(key);
  }

  if (canUseLocalStorage) {
    window.localStorage.removeItem(key);
  }
}

export function getCurrentUser() {
  return readStoredJson(userStorageKey);
}

export function saveCurrentUser(user) {
  writeStoredJson(userStorageKey, user);
}

export function removeCurrentUser() {
  removeStoredKey(userStorageKey);
}

export function getRegisteredUsers() {
  return readStoredJson(usersStorageKey) || {};
}

export function saveRegisteredUsers(users) {
  writeStoredJson(usersStorageKey, users);
}
