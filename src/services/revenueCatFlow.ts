import type { CustomerInfo, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';

import { hasProEntitlement, isPurchaseCancelled } from '../state/purchaseRules';

type BillingAdapter = {
  purchasePackage: (item: PurchasesPackage) => Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases: () => Promise<CustomerInfo>;
};

export type BillingOutcome =
  | { kind: 'granted' | 'inactive'; customerInfo: CustomerInfo }
  | { kind: 'cancelled' | 'busy' }
  | { kind: 'failed'; error: unknown };

export function selectCurrentPackage(offerings: PurchasesOfferings): PurchasesPackage {
  const offering = offerings.current;
  if (!offering) throw new Error('No Current Offering is configured in RevenueCat.');
  if (offering.availablePackages.length === 0) {
    throw new Error('The Current Offering has no available packages. Check the Test Store product and package configuration.');
  }
  // Only select the monthly package when it is actually in the available list.
  return offering.availablePackages.find((item) => item.identifier === offering.monthly?.identifier)
    ?? offering.availablePackages[0];
}

export class RevenueCatFlow {
  private busy = false;
  private readonly adapter: BillingAdapter;

  constructor(adapter: BillingAdapter) {
    this.adapter = adapter;
  }

  get isBusy(): boolean {
    return this.busy;
  }

  private async run(action: () => Promise<CustomerInfo>): Promise<BillingOutcome> {
    if (this.busy) return { kind: 'busy' };
    this.busy = true;
    try {
      const customerInfo = await action();
      return { kind: hasProEntitlement(customerInfo) ? 'granted' : 'inactive', customerInfo };
    } catch (error) {
      if (isPurchaseCancelled(error)) return { kind: 'cancelled' };
      return { kind: 'failed', error };
    } finally {
      this.busy = false;
    }
  }

  purchase(item: PurchasesPackage): Promise<BillingOutcome> {
    return this.run(async () => (await this.adapter.purchasePackage(item)).customerInfo);
  }

  restore(): Promise<BillingOutcome> {
    return this.run(() => this.adapter.restorePurchases());
  }
}
