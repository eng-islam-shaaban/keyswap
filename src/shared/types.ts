export type LayoutSetting = 'auto' | 'mac' | 'pc';

export interface Settings {
  enabled: boolean;
  notificationsEnabled: boolean;
  showButton: boolean;
  layout: LayoutSetting;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  notificationsEnabled: true,
  showButton: true,
  layout: 'auto',
};

export interface ConvertMessage {
  type: 'CONVERT_TEXT';
}
