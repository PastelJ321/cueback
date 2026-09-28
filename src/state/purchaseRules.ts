import type { CustomerInfo } from 'react-native-purchases';

export function hasProEntitlement(info: CustomerInfo): boolean {
  return Boolean(info.entitlements.active.pro);
}

export function isPurchaseCancelled(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'userCancelled' in error && error.userCancelled === true);
}

export function isTestStoreKey(key: string | undefined): boolean {
  return Boolean(key?.startsWith('test_') && key.length > 5);
}

export function createTestStoreInitializer(configure: (key: string) => void): (key: string) => void {
  let initialized = false;
  return (key: string) => {
    if (!isTestStoreKey(key)) throw new Error('A public Test Store key is required.');
    if (initialized) return;
    configure(key);
    initialized = true;
  };
}
