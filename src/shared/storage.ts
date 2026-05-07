import { Settings, DEFAULT_SETTINGS } from './types';

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return result as Settings;
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  await chrome.storage.sync.set(settings);
}
