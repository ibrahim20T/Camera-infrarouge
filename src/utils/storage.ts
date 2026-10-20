import { DEFAULT_SETTINGS, type FilterSettings } from './filterEngine.ts';
import type { CameraFacingMode } from '../types.ts';

const STORAGE_KEY = 'ir_filter_preferences_v1';

export interface UserPreferences {
  settings: FilterSettings;
  facingMode: CameraFacingMode;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  settings: DEFAULT_SETTINGS,
  facingMode: 'environment',
};

export function loadUserPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings || {}),
      },
      facingMode: parsed.facingMode === 'user' ? 'user' : 'environment',
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveUserPreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Unable to save preferences to localStorage', e);
  }
}
