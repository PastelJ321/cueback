import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppData } from '../types/models';

const STORAGE_KEY = '@promptside/app-data/v1';

export const EMPTY_APP_DATA: AppData = {
  version: 1,
  presentations: [],
  questions: [],
};

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AppData>;
  return candidate.version === 1 && Array.isArray(candidate.presentations) && Array.isArray(candidate.questions);
}

export async function loadAppData(): Promise<AppData> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY_APP_DATA;
  const parsed: unknown = JSON.parse(raw);
  if (!isAppData(parsed)) throw new Error('The saved data format is not supported.');
  return parsed;
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
