# Promptside

Promptside is an iPadOS-first Expo + React Native + TypeScript app for live presentations, interviews, and Q&A. It recognizes an English question, finds the semantically closest question prepared by the user, and displays the exact answer script the user wrote beforehand.

It never generates an answer. There is no app server, login, cloud database, API key, paid API, OpenAI API, Google Cloud API, Supabase, Firebase, RevenueCat, advertising, or web app.

## Primary targets

1. A physical iPad in landscape
2. iPhone/iOS
3. Android later, using the retained cross-platform code

The iPad landscape Live Q&A screen keeps status, transcript, confidence, possible matches, best match, and the answer script visible in a stable two-column layout. The Answer Script is the largest visual element. Question Bank also uses a split layout on sufficiently wide screens. Compact widths keep the existing single-column phone flow.

## Existing functionality retained

- Presentation create, rename, select, and delete
- Expected Question and Answer Script create, edit, and delete
- AsyncStorage persistence entirely on the device
- Four-question sample presentation
- MiniLM cosine-similarity matching, Top 3 candidates, confidence guard, and embedding cache
- Android config and responsive compact UI

## Project structure

```text
App.tsx                         Navigation and root providers
index.ts                       Expo entry and ExecuTorch initialization
src/
  components/                  Buttons, inputs, Answer panel, match list
  constants/                   Theme and semantic thresholds
  data/                        Development sample presentation
  hooks/                       Speech, semantic matching, responsive layout
  screens/                     Presentations, Question Bank, Editor, Live Q&A
  services/                    Cosine similarity, Top 3, embedding cache checks
  state/                       Local data and semantic model providers
  storage/                     AsyncStorage serialization
  types/                       Data and navigation types
plugins/                       Persistent Expo native build adjustments
app.json                       iOS/Android permissions and native build config
```

## Requirements

- macOS
- Node.js 20.19 or newer in the Node 20 line
- Full Xcode 26.2 or newer, not only Command Line Tools
- CocoaPods 1.15.2 or newer, installed through the normal Xcode/Expo toolchain
- A physical iPad running iPadOS 17 or newer
- A USB cable or Xcode-compatible wireless device connection

Expo SDK 55 itself supports iOS 15.1+, but Promptside sets its deployment target to **iOS 17.0** because `react-native-executorch@0.9.3` requires iOS 17 for the on-device MiniLM runtime.

Expo Go cannot run Promptside because Apple Speech integration and ExecuTorch contain custom native code. Use a local Expo Development Build.

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
   open ios/Promptside.xcworkspace
   ```

2. Select the **Promptside** project and **Promptside** target.
3. Open **Signing & Capabilities**.
4. Enable **Automatically manage signing**.
5. Select your **Personal Team**.
6. If `com.promptside.app` conflicts with another registered identifier, change `ios.bundleIdentifier` in `app.json` to a unique reverse-domain value, regenerate the native project, and try again.

For later TypeScript-only changes, keep the installed Development Build and run:

```bash
npm start
```

Re-run `npm run ios` after changing native dependencies, permissions, or config plugins.

## First physical-device test

1. Open Promptside in iPad landscape.
2. Allow both **Microphone** and **Speech Recognition** permissions.
3. Tap **Load sample presentation**.
4. Open it and tap **Start Live Q&A**.
5. Wait for `MINILM READY`. The first run downloads approximately 91 MB once.
6. Tap **Listen** and say: “What made you decide that this benchmark was suitable?”
7. Confirm the interim transcript updates while speaking.
8. Confirm a final transcript, Top 3 matches, match confidence, and the prepared benchmark Answer Script appear.
9. Also try: “What factors about the client determined how much risk you were willing to take?”
10. If confidence is too low, verify that the app shows **No confident match** instead of automatically showing an answer.

## Apple speech recognition

`expo-speech-recognition@3.1.3` wraps Apple's `Speech` framework (`SFSpeechRecognizer`) on iOS.

- Locale: `en-US`
- Interim/partial results: enabled
- Final transcript: captured from the native final-result event
- Start/Stop: explicit controls
- Permissions: `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription` are generated by the config plugin
- Unavailable, denied, no-speech, busy, audio-capture, and network errors are shown in the UI

At runtime Promptside checks:

1. `isRecognitionAvailable()` for the system recognizer,
2. `getSupportedLocales()` for English locale availability,
3. `supportsOnDeviceRecognition()` for Apple's current-device on-device capability.

When on-device recognition is reported as available, the recognition request sets `requiresOnDeviceRecognition: true`. Otherwise it uses the Apple system service and clearly displays **APPLE SPEECH · NETWORK MAY BE USED**. In development, the capability decision is also logged as `[Promptside Speech] ...`.

The library's capability method is device-level; the actual `en-US` request remains the final runtime validation. If Apple rejects that on-device locale/request combination, Promptside surfaces the native error and does not use a mock transcript.

## Semantic embedding and matching on iOS

- Runtime: `react-native-executorch@0.9.3`
- Model: `sentence-transformers/all-MiniLM-L6-v2`, ExecuTorch/XNNPACK export
- iOS support: native iOS framework with an iOS 17.0 Pod deployment target
- Target: real arm64 iPhone/iPad; physical-device testing is required
- Model size: approximately 91 MB, downloaded once and cached in app document storage
- Inference: entirely on-device after the initial model download
- Embedding size: 384 dimensions
- Ranking: cosine similarity, Top 3
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

- This repository was configured and statically verified in an environment without the full Xcode application, CocoaPods, or a connected iPad. Expo Doctor passed 19/20 checks; the only failed check was the missing CocoaPods 1.15.2+ tool. Native compilation, signing, microphone input, Apple Speech behavior, and MiniLM performance still require the physical-device procedure above.
- `react-native-executorch` raises the app minimum to iOS/iPadOS 17.0.
- The first MiniLM load requires internet access. Later embedding inference and similarity matching are local.
- Apple's on-device Speech availability varies by device, OS version, locale, and downloaded system assets. When unavailable, Apple's system recognizer may use its own network service; Promptside does not call or configure a third-party speech API.
- Similarity percentages are cosine scores formatted as percentages, not calibrated probabilities.
- English (`en-US`) is the only configured speech/matching language in this MVP.
- AsyncStorage is not encrypted and is intended for a small text-first question bank.
- There is no export, backup, cloud sync, or recovery after uninstall.

## Recommended next steps

1. Complete the first physical-iPad test above.
2. Record real rehearsal paraphrases and tune the threshold/margin against false positives.
3. Measure first-load MiniLM memory and latency on the exact target iPad model.
4. Decide whether to bundle MiniLM for a fully offline first launch or retain the smaller app binary and one-time download.
