import { requireOptionalNativeModule } from 'expo-modules-core';

type PromptsideTranslationNativeModule = {
  isAvailable(): boolean;
  translateEnglishToKorean(text: string): Promise<string>;
};

const nativeModule = requireOptionalNativeModule<PromptsideTranslationNativeModule>('PromptsideTranslation');

export function isOnDeviceTranslationAvailable(): boolean {
  return nativeModule?.isAvailable() ?? false;
}

export async function translateEnglishToKorean(text: string): Promise<string> {
  if (!nativeModule) {
    throw new Error('Apple on-device translation is unavailable in this build. Rebuild the iOS app.');
  }
  return nativeModule.translateEnglishToKorean(text);
}
