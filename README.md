# Cueback

Cueback helps a presenter find **their own prepared English answer** while handling live questions. It transcribes an English question, compares it with expected questions using an on-device multilingual MiniLM embedding model, shows up to three likely matches, and displays the selected answer script. It never writes an answer for the user.

## Current status

The React Native / Expo implementation includes presentation and question editing, English speech recognition, cosine-similarity matching, a confidence threshold, manual candidate selection, Korean question translation, an iPad landscape layout, and a RevenueCat Test Store Pro flow. **A real Test Store purchase and iPad run have not yet been verified.** A public Test Store key is configured in the ignored local `.env.local`; dashboard configuration and native purchase behavior still require verification. Do not describe this repository as a production billing integration.

| Tier | Presentations | Questions per presentation | Speech, matching, prepared answers |
| --- | ---: | ---: | --- |
| Free | 1 | 5 | Included |
| Pro | Unlimited | Unlimited | Included |

Existing content stays readable and editable if Pro expires; new items follow the active limit. Entitlement comes from `CustomerInfo.entitlements.active.pro`, never a stored local Pro flag. Purchase restoration does **not** restore locally saved presentations or scripts on another device.

## Stack and data flow

- Expo SDK 55, React Native 0.83, TypeScript, React Navigation, AsyncStorage.
- `expo-speech-recognition` transcribes English (`en-US`). System recognition may use a network depending on the device and operating system.
- `react-native-executorch` loads multilingual MiniLM on device. Initial model download needs network access. Embeddings are cached with a model ID and question-text hash. Cosine similarity ranks three candidates; auto-selection requires a score threshold and margin. Low-confidence input leaves the answer unselected.
- The native Cueback translation module translates the matched English question into Korean where supported.
- `react-native-purchases@10.10.1` queries a RevenueCat Current Offering, purchases its package through the Test Store, and checks the `pro` entitlement. The custom paywall does not require a RevenueCatUI dashboard template.
- Current local data uses `@cueback/app-data/v1`. If absent, Cueback copies valid data from the prior `@promptside/app-data/v1` key in the **same app sandbox**, leaving the old key intact. The current local bundle identifier is `com.cueback.app`; the older remote `main` used `com.promptside.app`. These are separate iOS app sandboxes, so an old Promptside installation cannot be silently upgraded by this build. Confirm which bundle ID is installed and back up its scripts before changing identifiers or uninstalling anything.

## Local setup

Requires Node.js supported by Expo 55, Xcode 26.2 or newer for iOS, CocoaPods, and an iOS or Android development build. Expo Go cannot load these native modules. The iOS deployment target is 17.0.

```sh
npm ci
cp .env.example .env.local
# Put your public RevenueCat Test Store SDK key in .env.local.
npm run check
npm test
npx expo run:ios --device
npm start
```

For a device already using `com.cueback.app`, keep the bundle identifier and existing Xcode team/signing settings. `npm run ios` also runs `expo run:ios --device`. Connect and unlock the iPad, trust the Mac, select it when prompted, and allow the development certificate if iPadOS asks. With Expo SDK 55, select a simulator using `npx expo run:ios --device "<installed simulator name or UDID>"` after installing the Simulator app and runtime; this CLI does not offer `--simulator`. The `ios-simulator` EAS profile builds a simulator development client. Never erase the app before backing up important local scripts.

## RevenueCat Test Store setup

The local ignored `.env.local` already contains `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`; its value is not committed. On another machine, obtain the **public Test Store SDK API key** from [RevenueCat](https://app.revenuecat.com/) **Apps & providers → Test configuration** and set the same variable. This public key is bundled into a development app; never put a secret REST API key there. A production build deliberately disables the Test Store flow. **Never submit a Test Store key build to an app store.**

[MANUAL ACTION REQUIRED] A remote EAS Build does not receive this ignored local `.env.local`. Before using `eas build --platform ios --profile ios-simulator`, configure `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` in the project's EAS **development** environment, verify EAS login and project association, and confirm any build cost. Do not paste the key into `eas.json` or the source tree. A local `expo run:ios` build loads `.env.local` automatically.

[MANUAL ACTION REQUIRED] In **Product catalog**, use existing compatible products if present. Otherwise create a monthly Test Store subscription (suggested ID `cueback_pro_monthly`), create entitlement `pro`, attach the product to that entitlement, add a monthly package to an offering (suggested offering ID `default`), and mark the offering **Current**. The IDs except `pro` are proposals; the app reads the actual Current Offering and displayed package/price. If no package appears, the paywall shows a configuration error instead of inventing a product.

After rebuilding the development client with the key, open Cueback Pro. Confirm the SDK price, tap **Test purchase**, choose the Test Store success outcome, and check that Pro limits lift. Repeat with Cancel and Failure; neither should grant Pro. Restart and verify entitlement, use Restore Purchases, then wait for the shortened Test Store expiration and verify limits return while content remains. The purchase is a simulation; no real money is charged. [RevenueCat Test Store documentation](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store).

## Verification and limitations

`npm run check` runs TypeScript, ESLint, and Expo dependency validation. `npm test` covers serialized local writes, free limits, offering selection, purchase outcomes, and operation locking using mocked SDK responses. These do not prove native SDK operation. Device QA instructions are in [docs/submission/SUBMISSION_CHECKLIST.md](docs/submission/SUBMISSION_CHECKLIST.md).

- Initial model download requires internet. Apple/system speech may also use a network. Avoid claiming fully offline speech.
- Local scripts are not synced or backed up by RevenueCat. App deletion can remove them.
- Live speech latency, Korean translation availability, Test Store checkout, and iPad layout need device verification.
- The project has no top-level open-source license yet. [MANUAL ACTION REQUIRED] The owner must approve a license and review rights to source, assets, sample content, and model dependencies before making the repository public.
- The September 28 online `npm audit` reported 13 moderate advisories, including Expo tooling and transitive navigation/build dependencies. See [security and build notes](docs/engineering/SECURITY_AND_BUILD.md). Do not use `npm audit fix --force` with Expo 55.

## Submission

The [Shipaton 2026 Next Gen rules](https://revenuecat-shipaton-2026.devpost.com/rules) allow a video and public, licensed source repository instead of a paid developer account or store listing. The repository is not being published by these instructions. See the [project story](docs/submission/PROJECT_STORY.md), [demo script](docs/submission/DEMO_SCRIPT.md), and [checklist](docs/submission/SUBMISSION_CHECKLIST.md).
