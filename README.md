# Promptside

Promptside is an Android-first Expo/React Native app for live presentations, interviews, and Q&A. It listens to an English question, finds the closest **user-prepared** question on the device, and displays the answer script the user wrote beforehand.

It does **not** generate answers. There is no app server, login, cloud database, API key, paid API, OpenAI API, Google Cloud API, Supabase, Firebase, RevenueCat, advertising, or web app.

## What works

- Create, rename, open, and delete local presentations.
- Add, edit, and delete expected questions and answer scripts.
- Persist all presentation data in AsyncStorage on the device.
- Load a four-question sample presentation.
- Recognize English speech through the native Android/iOS speech framework.
- Display interim transcripts while the questioner is speaking.
- Handle microphone permission, missing speech services, missing Android offline English speech packs, no-speech, and recognition errors.
- Run `all-MiniLM-L6-v2` locally with ExecuTorch and rank the top three prepared questions by cosine similarity.
- Cache question embeddings and invalidate the cache when a question changes.
- Auto-show an answer only for a sufficiently confident match; otherwise require the presenter to pick from the top candidates.

## Project structure

```text
App.tsx                         Navigation and root providers
index.ts                       Expo entry point and ExecuTorch initialization
src/
  components/                  Reusable buttons, inputs, and empty states
  constants/                   Theme and semantic matching thresholds
  data/                        Development sample presentation
  hooks/                       Speech recognition and semantic matcher state
  screens/                     Presentations, Question Bank, Editor, Live Q&A
  services/                    Embedding cache checks, cosine similarity, Top 3
  state/                       Local app data and semantic model providers
  storage/                     AsyncStorage serialization
  types/                       Data and navigation types
  utils/                       Local ID helper
app.json                       Native permissions and config plugins
eas.json                       Optional Android development APK profile
```

## Requirements

- Node.js LTS
- macOS
- An Android phone (Android 13+ is recommended for both offline speech and the supported ExecuTorch path)
- Android Studio, Android SDK/platform tools, and JDK 17 for local Android builds
- USB debugging enabled on the phone

Expo Go cannot run this app because speech recognition and ExecuTorch contain custom native code. Use an Expo Development Build.

## Install

```bash
npm install
npm run check
```

No environment variables or API keys are required.

## Run on a physical Android phone (local build, recommended)

1. Connect the phone by USB, approve the debugging prompt, and verify it appears:

   ```bash
   adb devices
   ```

2. Build and install the native development app. Expo generates the ignored `android/` directory automatically:

   ```bash
   npm run android
   ```

3. For later JavaScript/TypeScript-only sessions, start Metro and open the already-installed Promptside development app:

   ```bash
   npm start
   ```

Re-run `npm run android` after changing native dependencies or `app.json` plugins.

If the phone cannot reach Metro over Wi-Fi, use USB forwarding:

```bash
adb reverse tcp:8081 tcp:8081
npm start
```

## Optional EAS Development Build

The local build above does not require an Expo account. If local Android tooling is not available, the included `eas.json` can create an internal development APK:

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile development
npm start
```

Install the resulting APK on the phone, then open it while Metro is running. EAS is used only to compile the native development client; the app itself still has no backend or cloud data.

## Speech recognition

`expo-speech-recognition` uses the operating system's native recognizer. The app requests `RECORD_AUDIO`, recognizes `en-US`, enables interim results, exposes Listen/Stop states, and captures the final transcript.

On Android 13+ devices that advertise on-device recognition, Promptside requires an installed offline English speech pack and offers a button that opens the system downloader. On devices without on-device recognition, the system recognizer may be unavailable or may use its own network-backed mode; Promptside never calls a speech API directly and has no speech API key. Recognition quality and exact behavior therefore vary by phone vendor and installed recognition service.

## Semantic embedding and matching

- Model: `sentence-transformers/all-MiniLM-L6-v2`, exported for ExecuTorch/XNNPACK by Software Mansion.
- Runtime: `react-native-executorch` with the Expo resource fetcher.
- Model size: approximately 91 MB; the model and tokenizer are downloaded once from the library's published Hugging Face files and cached in the app's document storage.
- Inference: completely on-device after the initial model download.
- Vector size: 384 dimensions.
- Similarity: cosine similarity between the final speech transcript and every prepared question.
- Results: the three highest scores are shown.
- Auto-selection: configured centrally in `src/constants/semantic.ts`. The current threshold is `0.62`, with a minimum `0.05` lead over the second result.

When a question is created or edited while the model is ready, its embedding is calculated and stored with the local question. If the model was not ready, Live Q&A fills in and saves the missing embedding once. A model/version ID and text hash prevent stale cached vectors from being reused.

Try the sample presentation with paraphrases such as:

- “What made you decide that this benchmark was suitable?”
- “What factors about the client determined how much risk you were willing to take?”

## Verification commands

```bash
npm run typecheck
npm run lint
npx expo install --check
npx expo config --type public
npx expo export --platform android
```

## Known limitations

- A real phone is required to validate microphone behavior, the vendor speech recognizer, and native model speed. Expo Go and a plain web browser are not supported.
- React Native ExecuTorch 0.9 officially targets Android 13+ and the New Architecture. Unsupported Android versions or CPU architectures show a model-unavailable state instead of pretending to match semantically.
- The first semantic-model use needs internet access to download roughly 91 MB. Later inference is local. Bundling the model would remove that first-run dependency but make the APK much larger.
- Offline English speech recognition requires the phone vendor's English model. Some Android devices do not ship a compatible on-device recognition service.
- Similarity scores are ranking signals, not calibrated probabilities. The 62% display is cosine similarity formatted as a percentage; collect real rehearsal utterances before treating the threshold as final.
- English (`en-US`) is the only configured recognition/matching language in this MVP.
- AsyncStorage is appropriate for this small text-first MVP but is not encrypted and is not ideal for very large question banks.
- There is no data export, backup, sync, or recovery if the app is uninstalled.

## Recommended next steps

1. Test on the target Android phone and record a small set of real paraphrased questions.
2. Tune the threshold and second-place margin against false positives from that rehearsal set.
3. Decide whether to bundle the MiniLM files for guaranteed offline first launch or keep the smaller APK and one-time download.
4. Add local import/export backup before expanding the data model.
