import { getSettings, saveSettings } from '../shared/storage';
import type { LayoutSetting } from '../shared/types';

const enabledCheckbox = document.getElementById('enabled') as HTMLInputElement;
const notificationsCheckbox = document.getElementById('notifications') as HTMLInputElement;
const showButtonCheckbox = document.getElementById('show-button') as HTMLInputElement;
const layoutSelect = document.getElementById('layout') as HTMLSelectElement;
const customizeLink = document.getElementById('customize-shortcut') as HTMLAnchorElement;
const modifierKey = document.getElementById('modifier-key') as HTMLElement;

async function init(): Promise<void> {
  const settings = await getSettings();
  enabledCheckbox.checked = settings.enabled;
  notificationsCheckbox.checked = settings.notificationsEnabled;
  showButtonCheckbox.checked = settings.showButton;
  layoutSelect.value = settings.layout;

  // Show platform-appropriate modifier key
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  modifierKey.textContent = isMac ? 'Option' : 'Alt';
}

enabledCheckbox.addEventListener('change', () => {
  saveSettings({ enabled: enabledCheckbox.checked });
});

notificationsCheckbox.addEventListener('change', () => {
  saveSettings({ notificationsEnabled: notificationsCheckbox.checked });
});

showButtonCheckbox.addEventListener('change', () => {
  saveSettings({ showButton: showButtonCheckbox.checked });
});

layoutSelect.addEventListener('change', () => {
  saveSettings({ layout: layoutSelect.value as LayoutSetting });
});

customizeLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

init();
