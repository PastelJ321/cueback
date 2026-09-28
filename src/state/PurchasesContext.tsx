import {
  createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { RevenueCatFlow, selectCurrentPackage } from '../services/revenueCatFlow';
import { createTestStoreInitializer, hasProEntitlement, isTestStoreKey } from './purchaseRules';

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
  const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message
    : 'RevenueCat could not complete this request. Please retry.';
  return testKey ? message.replaceAll(testKey, '[redacted]') : message;
}

function configureSdk(): void {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') throw new Error('Purchases require an iOS or Android development build.');
  if (!__DEV__) throw new Error('Test Store purchases are available only in development builds.');
  if (!isTestStoreKey(testKey)) throw new Error('Set EXPO_PUBLIC_REVENUECAT_TEST_API_KEY to the public Test Store key from RevenueCat Apps & providers.');
  if (configured) return;
  // SDK 10.10.1 accepts LOG_LEVEL directly. Cueback never logs scripts or the key.
  void Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG).catch(() => undefined);
  initialize(testKey!); // No appUserID: the SDK persists its anonymous identity across launches.
  configured = true;
}

export function PurchasesProvider({ children }: PropsWithChildren) {
  const [isPro, setIsPro] = useState(false);
  const [status, setStatus] = useState<PurchaseStatus>('loading');
  const [product, setProduct] = useState<PurchasesPackage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const refreshBusy = useRef(false);
  const operationGeneration = useRef(0);
  const flowRef = useRef<RevenueCatFlow | null>(null);
  if (!flowRef.current) {
    flowRef.current = new RevenueCatFlow({
      purchasePackage: (item) => Purchases.purchasePackage(item),
      restorePurchases: () => Purchases.restorePurchases(),
    });
  }
  const flow = flowRef.current;

  const applyInfo = useCallback((info: CustomerInfo) => setIsPro(hasProEntitlement(info)), []);
  const refresh = useCallback(async () => {
    if (flow.isBusy || refreshBusy.current) return;
    try {
      configureSdk();
      setSdkReady(true);
    } catch (caught) {
      setIsPro(false);
      setProduct(null);
      setError(errorMessage(caught));
      setStatus(isTestStoreKey(testKey) ? 'error' : 'unconfigured');
      return;
    }
    refreshBusy.current = true;
    const generation = operationGeneration.current;
    try {
      // Force a fresh CustomerInfo check so Test Store expiration can remove Pro.
      await Purchases.invalidateCustomerInfoCache();
      const info = await Purchases.getCustomerInfo();
      if (generation !== operationGeneration.current) return;
      applyInfo(info);
      const offerings = await Purchases.getOfferings();
      if (generation !== operationGeneration.current) return;
      setProduct(selectCurrentPackage(offerings));
      setError(null);
      setStatus('ready');
    } catch (caught) {
      if (generation === operationGeneration.current) {
        setProduct(null);
        setError(errorMessage(caught));
        setStatus('error');
      }
    } finally {
      refreshBusy.current = false;
    }
  }, [applyInfo, flow]);

  useEffect(() => {
    try {
      configureSdk();
      setSdkReady(true);
    } catch (caught) {
      setIsPro(false);
      setError(errorMessage(caught));
      setStatus(isTestStoreKey(testKey) ? 'error' : 'unconfigured');
    }
  }, []);

  useEffect(() => {
    if (!sdkReady) return;
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
  }, [applyInfo, refresh, sdkReady]);

  const purchase = useCallback(async () => {
    if (!configured || !product || flow.isBusy) return false;
    operationGeneration.current += 1;
    setStatus('busy');
    setError(null);
    const outcome = await flow.purchase(product);
    if ('customerInfo' in outcome) applyInfo(outcome.customerInfo);
    if (outcome.kind === 'inactive') setError('Purchase completed, but the pro entitlement is inactive. Check the RevenueCat product entitlement mapping.');
    if (outcome.kind === 'failed') setError(errorMessage(outcome.error));
    setStatus('ready');
    return outcome.kind === 'granted';
  }, [applyInfo, flow, product]);

  const restore = useCallback(async () => {
    if (!configured || flow.isBusy) return false;
    operationGeneration.current += 1;
    setStatus('busy');
    setError(null);
    const outcome = await flow.restore();
    if ('customerInfo' in outcome) applyInfo(outcome.customerInfo);
    if (outcome.kind === 'inactive') setError('No active Cueback Pro purchase was found. Your locally saved presentations are separate from purchase restoration.');
    if (outcome.kind === 'failed') setError(errorMessage(outcome.error));
    setStatus('ready');
    return outcome.kind === 'granted';
  }, [applyInfo, flow]);

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
