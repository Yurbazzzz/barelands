import { saveCurrentUser, getCurrentUser, removeCurrentUser } from './storage.js';

export async function fetchSavedProfile(steamId) {
  if (!steamId) return {};
  const user = getCurrentUser();
  return user && user.steamId === steamId ? user : {};
}

export async function saveProfileToServer(user) {
  if (!user?.steamId) return user;
  saveCurrentUser(user);
  return user;
}

export async function deleteProfileFromServer(steamId) {
  if (!steamId) return;
  const user = getCurrentUser();
  if (user && user.steamId === steamId) {
    removeCurrentUser();
  }
}
