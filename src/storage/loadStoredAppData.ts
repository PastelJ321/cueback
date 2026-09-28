import type { AppData } from '../types/models';

export const STORAGE_KEY = '@cueback/app-data/v1';
export const LEGACY_STORAGE_KEY = '@promptside/app-data/v1';

function parseData(raw: string): AppData {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('The saved data format is not supported.');
  const candidate = value as Partial<AppData>;
  if (candidate.version !== 1 || !Array.isArray(candidate.presentations) || !Array.isArray(candidate.questions)) {
    throw new Error('The saved data format is not supported.');
  }
  return candidate as AppData;
}

export async function loadStoredAppData(
  get: (key: string) => Promise<string | null>,
  set: (key: string, value: string) => Promise<void>,
): Promise<AppData | null> {
  const current = await get(STORAGE_KEY);
  if (current) return parseData(current);
  const legacy = await get(LEGACY_STORAGE_KEY);
  if (!legacy) return null;
  const parsed = parseData(legacy);
  await set(STORAGE_KEY, legacy); // Preserve legacy key for recovery.
  return parsed;
}
