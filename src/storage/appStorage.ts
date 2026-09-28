import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppData } from '../types/models';
import { loadStoredAppData, STORAGE_KEY } from './loadStoredAppData';

export const EMPTY_APP_DATA: AppData = {
  version: 1,
  presentations: [],
  questions: [],
};

export async function loadAppData(): Promise<AppData> {
  return await loadStoredAppData(
    (key) => AsyncStorage.getItem(key),
    (key, value) => AsyncStorage.setItem(key, value),
  ) ?? EMPTY_APP_DATA;
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
