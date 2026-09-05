# Cueback

Cueback is an Expo + React Native + TypeScript app for live presentations, interviews, and Q&A. It recognizes an English question, shows an on-device Korean translation, finds the semantically closest question prepared by the user, and displays the exact answer script the user wrote beforehand.

It never generates an answer. There is no app server, login, cloud database, API key, paid API, OpenAI API, Google Cloud API, Supabase, Firebase, RevenueCat, advertising, or web app.

## Primary targets

1. Android physical devices
2. A physical iPad in landscape
3. iPhone/iOS

The iPad landscape Live Q&A screen keeps status, transcript, confidence, possible matches, best match, and the answer script visible in a stable two-column layout. The Answer Script is the largest visual element. Question Bank also uses a split layout on sufficiently wide screens. Compact widths keep the existing single-column phone flow.

## Existing functionality retained

- Presentation create, rename, select, and delete
- Expected Question and Answer Script create, edit, and delete
- AsyncStorage persistence entirely on the device
- Four-question sample presentation
- Multilingual MiniLM cosine-similarity matching, Top 3 candidates, confidence guard, and embedding cache
- Up to three speech-recognition alternatives reranked by semantic similarity
- English-to-Korean on-device translation on Android and iOS/iPadOS
- Android config and responsive compact UI

## Project structure

```text
App.tsx                         Navigation and root providers
index.ts                       Expo entry and ExecuTorch initialization
src/
  components/                  Buttons, inputs, Answer/translation panels, match list
  constants/                   Theme and semantic thresholds
  data/                        Development sample presentation
  hooks/                       Speech, semantic matching, responsive layout
  screens/                     Presentations, Question Bank, Editor, Live Q&A
  services/                    Cosine similarity, Top 3, embedding cache checks
  state/                       Local data and semantic model providers
  storage/                     AsyncStorage serialization
  types/                       Data and navigation types
plugins/                       Persistent Expo native build adjustments
modules/cueback-translation Local Apple Translation / Android ML Kit bridge
app.json                       iOS/Android permissions and native build config
```

## Requirements

- macOS
- Node.js 20.19 or newer in the Node 20 line
- Full Xcode 26.2 or newer, not only Command Line Tools
- CocoaPods 1.15.2 or newer, installed through the normal Xcode/Expo toolchain
- A physical iPad running iPadOS 17 or newer (18+ for Korean translation)
- A USB cable or Xcode-compatible wireless device connection
- Android Studio/JDK 17 and Android SDK for Android builds

Expo SDK 55 itself supports iOS 15.1+, but Cueback sets its deployment target to **iOS 17.0** because `react-native-executorch@0.9.3` requires iOS 17 for the on-device MiniLM runtime.

Expo Go cannot run Cueback because Speech, ExecuTorch, and translation contain custom native code. Use a local Expo Development Build.

## Install

```bash
cd /Users/pastelj/Desktop/mac_project/revenuecat
npm install
npm run check
```

No environment variables or API keys are required.

## Prepare Xcode and a physical iPad

1. Install and launch the full Xcode application once. Accept its license and additional component installation.
2. If macOS is still pointing at Command Line Tools, select Xcode:

   ```bash
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   xcodebuild -version
   ```

3. In Xcode, open **Settings → Accounts**, add your Apple Account, and confirm that a Personal Team is available.
4. Connect the iPad to the Mac, unlock it, tap **Trust This Computer**, and let it appear under **Window → Devices and Simulators**.
5. On the iPad, enable **Settings → Privacy & Security → Developer Mode**. Restart and confirm when prompted.

A free Personal Team is sufficient for local device testing. Free provisioning may require the app to be rebuilt periodically.

## Build and run on the iPad

With the unlocked iPad connected:

```bash
npm run ios
```

This runs:

```bash
npx expo run:ios --device
```

Choose the connected iPad when prompted. Expo prebuilds the ignored `ios/` directory, installs Pods, creates a signed debug Development Build, installs it on the iPad, and starts Metro.

If automatic signing cannot choose the Personal Team:

1. Generate/install the native project once with the command above, then open:

   ```bash
   open ios/Cueback.xcworkspace
   ```

2. Select the **Cueback** project and **Cueback** target.
3. Open **Signing & Capabilities**.
4. Enable **Automatically manage signing**.
5. Select your **Personal Team**.
6. If `com.cueback.app` conflicts with another registered identifier, change `ios.bundleIdentifier` in `app.json` to a unique reverse-domain value, regenerate the native project, and try again.

For later TypeScript-only changes, keep the installed Development Build and run:

```bash
npm start
```

Re-run `npm run ios` after changing native dependencies, permissions, or config plugins.

The Development Build intentionally connects to Metro on the Mac while developing. This is not an app backend and does not contain user data. A release build embeds the JavaScript bundle and does not need Metro.

## Build and run on Android

Install Android Studio, its Android SDK, and JDK 17, enable USB debugging on the phone, then run:

```bash
npm run android
```

Keep the phone unlocked and accept its USB debugging authorization prompt. Re-run this native build after modifying anything under `modules/`, native permissions, or Expo config.

## First physical-device test

1. Open Cueback in iPad landscape.
2. Allow both **Microphone** and **Speech Recognition** permissions.
3. Tap **Load sample presentation**.
4. Open it and tap **Start Live Q&A**.
5. Wait for `MINILM READY`. The multilingual embedding model downloads once and is cached locally.
6. Tap **Listen** and say: “What made you decide that this benchmark was suitable?”
7. Confirm the interim transcript updates while speaking.
8. The first translation can show the operating system's English/Korean language-pack download prompt. Accept it once.
9. Confirm a final transcript, Korean translation, Top 3 matches, match confidence, and the prepared benchmark Answer Script appear.
10. Also try: “What factors about the client determined how much risk you were willing to take?”
11. If confidence is too low, verify that the app shows **No confident match** instead of automatically showing an answer.

## Apple speech recognition

`expo-speech-recognition@3.1.3` wraps Apple's `Speech` framework (`SFSpeechRecognizer`) on iOS.

- Locale: `en-US`
- Interim/partial results: enabled
- Recognition alternatives: up to three; semantic matching chooses the best alternative
- Continuous iOS capture: enabled until the user taps Stop
- Live microphone input meter: enabled using native volume-change events
- Final transcript: accumulated across iOS recognition segments and finalized when recognition ends
- Start/Stop: explicit controls
- Permissions: `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription` are generated by the config plugin
- Unavailable, denied, no-speech, busy, audio-capture, and network errors are shown in the UI

At runtime Cueback checks:

1. `isRecognitionAvailable()` for the system recognizer,
2. `getSupportedLocales()` for English locale availability,
3. `supportsOnDeviceRecognition()` for Apple's current-device on-device capability.

When on-device recognition is reported as available, the recognition request sets `requiresOnDeviceRecognition: true`. Otherwise it uses the Apple system service and clearly displays **APPLE SPEECH · NETWORK MAY BE USED**. In development, the capability decision is also logged as `[Cueback Speech] ...`.

The prepared questions are deliberately not passed to the speech recognizer as phrase hints. This prevents recognition from being biased toward an existing question before semantic matching. The library's capability method is device-level; the actual `en-US` request remains the final runtime validation. If Apple rejects that on-device locale/request combination, Cueback surfaces the native error and does not use a mock transcript.

## English-to-Korean translation

- iOS/iPadOS 18+: Apple's `Translation` framework and system-managed on-device language packs
- Android API 23+: Google ML Kit Translation `17.0.3`, running on-device after its English/Korean model download
- Input: the recognition alternative selected by semantic reranking
- Output: Korean question text only; it never changes or generates the user's Answer Script
- Credentials: no API key, login, paid API, Google Cloud project, or app server

Both platforms may require internet once to download language assets. Later translations use the downloaded on-device models. iOS/iPadOS 17 can still run the rest of the app but shows a clear translation-unavailable error.

## Semantic embedding and matching

- Runtime: `react-native-executorch@0.9.3`
- Model: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, quantized ExecuTorch/XNNPACK export
- iOS support: native iOS framework with an iOS 17.0 Pod deployment target
- Android support: native Android framework on supported CPU architectures
- Target: physical arm64 devices; physical-device testing is required
- Inference: entirely on-device after the initial model download
- Embedding size: 384 dimensions
- Ranking: cosine similarity, Top 3
- Speech reranking: embeds up to three recognition alternatives and keeps each prepared question's best semantic score
- Auto-selection: score at least `0.62` and at least `0.05` ahead of second place

Question embeddings are cached locally with a model/version ID and question-text hash. Editing a question invalidates its old vector. The app displays only the Answer Script associated with the selected prepared question.

## Verification commands

```bash
npm run typecheck
npm run lint
npx expo install --check
npx expo-doctor
npx expo config --type public
npx expo prebuild --platform ios --no-install
npx expo export --platform ios
```

## Known limitations

- The iOS Development Build, including the local Swift translation module, was compiled, signed, installed, and launched on the connected physical iPad. Microphone recognition quality, translation language-pack consent, and semantic accuracy still need the manual spoken tests above.
- Android autolinking is verified, but this Mac currently has no Java runtime/Android Studio, so the new Android translation bridge has not yet been natively compiled here.
- `react-native-executorch` raises the app minimum to iOS/iPadOS 17.0.
- Apple Translation requires iOS/iPadOS 18+. Android Translation requires API 23+.
- The first MiniLM and translation-language-pack loads require internet access. Later embedding, similarity, and translation inference are local.
- Apple's on-device Speech availability varies by device, OS version, locale, and downloaded system assets. When unavailable, Apple's system recognizer may use its own network service; Cueback does not call or configure a third-party speech API.
- Similarity percentages are cosine scores formatted as percentages, not calibrated probabilities.
- English (`en-US`) is the only configured speech-input language. Korean is display translation, not a second speech-input mode.
- AsyncStorage is not encrypted and is intended for a small text-first question bank.
- There is no export, backup, cloud sync, or recovery after uninstall.

## Recommended next steps

1. Complete the spoken iPad test above and install Android Studio/JDK 17 for an Android physical build.
2. Record real rehearsal paraphrases and tune the threshold/margin against false positives.
3. Compare Apple/Android system recognition with an optional local Whisper Tiny/Base test on the target hardware before changing the production recognizer.
4. Measure multilingual MiniLM memory and latency on the exact target devices.
5. Decide whether to bundle model assets for a fully offline first launch or retain the smaller app binary and one-time downloads.
