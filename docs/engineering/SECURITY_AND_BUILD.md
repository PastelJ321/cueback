# Security and native-build review — 2026-09-23

## Credentials and local data

No RevenueCat public SDK key was found in the tracked source or local environment. `EXPO_PUBLIC_` values are bundled into the client and are not a secret store. The app accepts only a `test_` key in a development build; a secret RevenueCat REST key must never be used. `.env` variants are ignored, while `.env.example` documents the variable. Source search found no logging of answer scripts or API keys. Existing speech code logs only platform/locale/on-device capability in development.

Answers and presentations are stored in AsyncStorage. They are not encrypted, cloud-synced, or restored by RevenueCat. Deleting the app can delete them. The `@promptside/app-data/v1` key is read and copied to `@cueback/app-data/v1` only inside the same app sandbox; the old value is retained. An older installation using `com.promptside.app` has a different iOS sandbox from current `com.cueback.app` and needs explicit data export/migration after device inspection.

## Dependency review

Installed: Expo 55.0.31, React Native 0.83.10, `react-native-purchases` and `react-native-purchases-ui` 10.10.1, `expo-dev-client` 55.0.40. The SDK uses `react-native-purchases`; the optional UI package is installed but the app uses a custom paywall. `npm explain fsevents` traces it to optional `jest-haste-map`/Babel-Jest tooling pulled by React Native. `npm explain unrs-resolver` traces it to `eslint-import-resolver-typescript` through `eslint-config-expo`, a development-only tool. These install-script warnings do not by themselves establish runtime vulnerabilities.

The prior npm output reported 13 moderate vulnerabilities, but `npm audit --json` failed because `registry.npmjs.org` was unreachable. `npm audit --offline --json` reported zero advisories from the local cache; that does **not** resolve the 13 reported advisories. The exact affected packages, exploitability, and safe updates remain **UNVERIFIED**. Re-run online `npm audit --json` when network access returns, classify each direct/transitive package, then use Expo-compatible updates only. Do not run `npm audit fix --force`.

## Native build review

Xcode 27.0 is installed. `pod install --no-repo-update` found `RNPurchases` and `RNPaywalls` through autolinking, but failed to resolve the CocoaPods CDN (`cdn.cocoapods.org`). Thus the current native Pods project does not include the newly installed purchases SDK. A direct Xcode project build failed with missing Expo module maps; the workspace command could not open the workspace in this restricted environment. CoreSimulatorService was unavailable and reported an out-of-date CoreSimulator framework. **No iOS native build, simulator run, or iPad run passed.**

After network and Xcode/Simulator access are available: run `cd ios && pod install`, then `cd .. && npx expo run:ios --device` with the current bundle ID and team. Do not claim native purchase operation until that build actually runs and the Test Store outcomes are observed.

## Publication gate

There is no root project license. The owner must review rights to source, icon/splash assets, Wharton-related sample text, and any model redistribution obligations, then approve a license. Do not publish the repository until this is resolved and private presentation material is removed or confirmed safe.
