# Shipaton 2026 Next Gen submission checklist

Status as of 2026-09-23. Checked boxes mean verified in this workspace; unchecked boxes need further evidence. [Official rules](https://revenuecat-shipaton-2026.devpost.com/rules) and [Next Gen page](https://www.shipaton.com/next-gen). Deadline: **September 30, 2026, 11:45 pm PDT**; re-check the official page before submitting.

## Product and billing

- [ ] App launches and runs consistently on a connected iPad — **NOT TESTED** (no iPad connected).
- [x] React Native RevenueCat SDK is installed and wired into the app code.
- [ ] SDK initializes in a native development build — **NOT TESTED** (public Test Store key absent).
- [ ] Current Offering and SDK price load — **MANUAL ACTION REQUIRED** in RevenueCat dashboard.
- [ ] RevenueCat Test Store success purchase, active `pro` entitlement, and automatic unlock — **NOT TESTED**.
- [ ] Cancellation and purchase failure do not grant Pro — **NOT TESTED** on device.
- [ ] Restore, app relaunch, subscription expiry, and preserved scripts — **NOT TESTED** on device.
- [x] Free limits enforced in the local creation logic; automated tests cover concurrent attempts.
- [ ] iPad speech recognition, Stop/final transcript, model download, translation, confidence handling, and long answer scrolling — **NOT TESTED** on device.

## Repository and rights

- [x] English README and build/configuration instructions written.
- [ ] Public repository URL — **MANUAL ACTION REQUIRED** after review and owner approval; no push/publication performed.
- [ ] Open-source license at repository root and visible in GitHub About — **MANUAL ACTION REQUIRED**: owner chooses license after reviewing third-party/model/asset and sample rights.
- [ ] Check repository for private scripts, credentials, and publishable assets before public release.
- [ ] Complete online `npm audit` and triage advisories; current environment could not reach the registry.

## Devpost assets

- [x] English Project Story draft exists.
- [x] Under-2-minute English demo script exists (110-second plan).
- [ ] Authentic device demo recorded, under 2 minutes, public on YouTube or Vimeo — **MANUAL ACTION REQUIRED**.
- [x] `assets/icon.png` measured **1024 × 1024** with `sips`.
- [ ] At least one **actual app screenshot** measuring **1179 × 2556 px**, without a device frame. No screenshot exists in this repository. An iPad landscape screenshot has a different aspect ratio and does not by itself satisfy this stated size; capture an additional real iPhone portrait screenshot at the required resolution or obtain written clarification from the organizer. Do not stretch or fabricate one.
- [ ] Optional real iPad landscape screenshot and demo footage captured after device QA.
- [ ] Active student enrollment and qualifying student/academic email on Devpost — **MANUAL ACTION REQUIRED**. The domain may be checked through JetBrains/swot.
- [ ] If under local age of majority: parent/guardian reviewed rules and completed [consent form](https://forms.gle/Gx2Cr4X8WPk9V1q77) before deadline — **MANUAL ACTION REQUIRED**.
- [ ] Devpost account/registration and final submission — **MANUAL ACTION REQUIRED**.

Next Gen entrants provide a **public, open-source repository and demo video instead of an app-store listing**. A paid developer account, store release, free trial, and promo code are not required for this category. The published Devpost requirements still specify the icon and screenshot above.

## Exact connected-iPad test sequence

1. Back up any important scripts and inspect the installed app's bundle ID. Current local builds use `com.cueback.app`; the older remote branch used `com.promptside.app`, whose iOS sandbox is separate. Keep the current Xcode team and do not uninstall either app until data is verified.
2. In RevenueCat, create/configure the Test Store product, `pro` entitlement, monthly package, and Current Offering. Put its public `test_...` key into `.env.local` as `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`. Do not use a secret API key.
3. Run `npm ci`, `npm run check`, `npm test`, then `npx expo run:ios --device` from the project root. Select the connected iPad. Run `npm start` if Metro is not already running.
4. Verify existing local presentations and scripts remain. Verify Free limit with 1 presentation and 5 questions, including direct editor navigation and fast repeated saves.
5. Open Pro, verify product title and SDK price. Test **Cancel** and **Failure** first, then **Success** in the RevenueCat Test Store modal. Confirm only Success makes Pro active and permits a sixth question and second presentation.
6. Force close/reopen, then restore purchases. Check the dashboard's sandbox customer and `pro` entitlement. Wait for Test Store expiry, return to foreground, and confirm Pro limits resume while existing scripts remain editable.
7. Test Listen/Stop with a known English question, alternate candidates, low-confidence question, model download, offline/system speech behavior, translation, and a long answer in both iPad landscape and iPhone portrait.
