import {
  createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { createTestStoreInitializer, hasProEntitlement, isPurchaseCancelled, isTestStoreKey } from './purchaseRules';

type PurchaseStatus = 'unconfigured' | 'loading' | 'ready' | 'busy' | 'error';
type PurchasesValue = {
  isPro: boolean;
  status: PurchaseStatus;
  product: PurchasesPackage | null;
  error: string | null;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
};

const PurchasesContext = createContext<PurchasesValue | null>(null);
const testKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY?.trim();
let configured = false;
const initialize = createTestStoreInitializer((key) => Purchases.configure({ apiKey: key }));

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'RevenueCat could not complete this request. Please retry.';
}

export function PurchasesProvider({ children }: PropsWithChildren) {
  const [isPro, setIsPro] = useState(false);
  const [status, setStatus] = useState<PurchaseStatus>('loading');
  const [product, setProduct] = useState<PurchasesPackage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const operationBusy = useRef(false);
  const refreshBusy = useRef(false);
  const operationGeneration = useRef(0);

  const applyInfo = useCallback((info: CustomerInfo) => setIsPro(hasProEntitlement(info)), []);
  const refresh = useCallback(async () => {
    if (!configured || operationBusy.current || refreshBusy.current) return;
    refreshBusy.current = true;
    const generation = operationGeneration.current;
    try {
      // Invalidate cached status so an expired Test Store subscription cannot stay Pro.
      await Purchases.invalidateCustomerInfoCache();
      const info = await Purchases.getCustomerInfo();
      if (generation !== operationGeneration.current) return;
      applyInfo(info);
      const offering = (await Purchases.getOfferings()).current;
      if (generation !== operationGeneration.current) return;
      if (!offering?.availablePackages.length) {
        setProduct(null);
        throw new Error('No Current Offering with packages. Configure the Test Store product, entitlement, package, and Current Offering in RevenueCat.');
      }
      setProduct(offering.monthly ?? offering.availablePackages[0]);
      setError(null);
      setStatus('ready');
    } catch (caught) {
      if (generation === operationGeneration.current) {
        setError(errorMessage(caught));
        setStatus('error');
      }
    } finally {
      refreshBusy.current = false;
    }
  }, [applyInfo]);

  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      setError('Purchases require an iOS or Android development build.');
      setStatus('unconfigured');
      return;
    }
    if (!__DEV__) {
      setError('Test Store purchases are available only in development builds.');
      setStatus('unconfigured');
      return;
    }
    if (!isTestStoreKey(testKey)) {
      setError('Set EXPO_PUBLIC_REVENUECAT_TEST_API_KEY to the public Test Store key from RevenueCat Apps & providers.');
      setStatus('unconfigured');
      return;
    }
    if (!configured) {
      initialize(testKey!); // No appUserID: SDK keeps its anonymous identity across launches.
      configured = true;
    }
    Purchases.addCustomerInfoUpdateListener(applyInfo);
    void refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    const refreshTimer = setInterval(() => void refresh(), 60_000);
    return () => {
      clearInterval(refreshTimer);
      subscription.remove();
      Purchases.removeCustomerInfoUpdateListener(applyInfo);
    };
  }, [applyInfo, refresh]);

  const purchase = useCallback(async () => {
    if (!configured || !product) return false;
    operationBusy.current = true;
    operationGeneration.current += 1;
    setStatus('busy');
    setError(null);
    try {
      const result = await Purchases.purchasePackage(product);
      const granted = hasProEntitlement(result.customerInfo);
      applyInfo(result.customerInfo);
      if (!granted) setError('Purchase completed, but the pro entitlement is inactive. Check the RevenueCat product entitlement mapping.');
      setStatus('ready');
      return granted;
    } catch (caught) {
      if (!isPurchaseCancelled(caught)) setError(errorMessage(caught));
      setStatus('ready');
      return false;
    } finally {
      operationBusy.current = false;
    }
  }, [applyInfo, product]);

  const restore = useCallback(async () => {
    if (!configured) return false;
    operationBusy.current = true;
    operationGeneration.current += 1;
    setStatus('busy');
    setError(null);
    try {
      const info = await Purchases.restorePurchases();
      applyInfo(info);
      const granted = hasProEntitlement(info);
      if (!granted) setError('No active Cueback Pro purchase was found. Your locally saved presentations are separate from purchase restoration.');
      setStatus('ready');
      return granted;
    } catch (caught) {
      setError(errorMessage(caught));
      setStatus('ready');
      return false;
    } finally {
      operationBusy.current = false;
    }
  }, [applyInfo]);

  return (
    <PurchasesContext.Provider value={{ isPro, status, product, error, purchase, restore, refresh }}>
      {children}
    </PurchasesContext.Provider>
  );
}

export function usePurchases(): PurchasesValue {
  const value = useContext(PurchasesContext);
  if (!value) throw new Error('usePurchases must be used inside PurchasesProvider.');
  return value;
}
