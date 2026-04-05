import * as SecureStore from 'expo-secure-store';

const STORAGE_KEYS = {
  username: 'user_username',
  avatarUrl: 'user_avatar_url',
  onboardingComplete: 'onboarding_complete',
};

const ADJECTIVES = ['happy', 'lunar', 'hidden', 'cosmic', 'swift', 'bright', 'mystic', 'noble', 'wild', 'calm'];
const ANIMALS = ['koala', 'fox', 'panda', 'wolf', 'eagle', 'dolphin', 'tiger', 'owl', 'bear', 'hawk'];

export function generateRandomUsername(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${adjective}-${animal}-${digits}`;
}

export function getAvatarUrl(username: string): string {
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(username)}`;
}

export async function saveUser(username: string): Promise<void> {
  const avatarUrl = getAvatarUrl(username);
  await SecureStore.setItemAsync(STORAGE_KEYS.username, username);
  await SecureStore.setItemAsync(STORAGE_KEYS.avatarUrl, avatarUrl);
  await SecureStore.setItemAsync(STORAGE_KEYS.onboardingComplete, 'true');
}

export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(STORAGE_KEYS.onboardingComplete);
    return value === 'true';
  } catch (e) {
    console.log('isOnboardingComplete error:', e);
    return false;
  }
}

export async function getUsername(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.username);
  } catch (e) {
    return null;
  }
}

export async function getUserAvatar(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.avatarUrl);
  } catch (e) {
    return null;
  }
}

export async function updateUsername(newUsername: string): Promise<void> {
  const avatarUrl = getAvatarUrl(newUsername);
  await SecureStore.setItemAsync(STORAGE_KEYS.username, newUsername);
  await SecureStore.setItemAsync(STORAGE_KEYS.avatarUrl, avatarUrl);
}