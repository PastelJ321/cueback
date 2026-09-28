# Cueback — Project Story (draft)

## Inspiration

While preparing for the Wharton Global High School Investment Competition, I felt confident about portfolio management and company analysis. The harder moment was hearing a judge's question in English and answering immediately in English. I wanted a tool that would help me retrieve the answer I had already thought through, exactly when I needed it.

## What it does

Cueback lets a presenter create a presentation, write expected questions, and prepare their own English answer scripts. During a live Q&A, it transcribes an English question and compares it with the prepared questions using semantic similarity. It shows up to three candidates and automatically selects an answer only when the match is strong enough. The presenter can choose another candidate manually. It also shows a Korean translation of the recognized question where the device supports it. Cueback does not generate or rewrite answers.

The free tier includes one presentation and five questions per presentation. Cueback Pro removes those library limits while retaining the core speech and matching experience for everyone. The Pro flow uses RevenueCat's SDK and Test Store for simulated purchases; no real money is charged. **VERIFY before submission:** complete a native Test Store purchase and confirm the `pro` entitlement on a device.

## How we built it

We used Expo SDK 55, React Native, TypeScript, and local AsyncStorage. English input uses `expo-speech-recognition`. An on-device multilingual MiniLM model through `react-native-executorch` produces embeddings; cosine similarity ranks expected questions. We cache embeddings against each question's text hash to avoid reusing an old vector after edits. A native translation module handles English-to-Korean question translation. RevenueCat's React Native Purchases SDK reads the configured Current Offering, handles a Test Store purchase, and checks `CustomerInfo.entitlements.active.pro` before lifting limits.

## Challenges we ran into

Live speech can return multiple candidate transcripts and may finalize after Stop. We compare candidates while protecting the screen from late matching results. Local writes can race with model-generated embeddings, so we serialize saves and publish the new state only after storage succeeds. A weak semantic match should not put the wrong answer in front of a presenter, so Cueback keeps a “No confident match” state and leaves manual selection available. Native model, speech, and billing behavior still require iPad validation. **VERIFY:** actual device timings and availability.

## Accomplishments that we're proud of

Cueback keeps the presenter in control: every displayed answer was written in advance. Its iPad landscape view gives the answer script a large reading area, while candidates and transcript remain accessible. The free tier preserves the complete Q&A loop. The Pro design expands preparation capacity without taking the live answer away.

## What we learned

A reliable assistive interface should be willing to say it is unsure. Matching confidence, data persistence, and entitlement verification matter more than a purchase button or a flashy transition. We also learned to distinguish purchase restoration from recovery of locally stored presentations.

## What's next

Finish RevenueCat dashboard configuration, run the full Test Store success/cancel/failure/expiration sequence, and validate speech, translation, long scripts, and layout on a connected iPad. Capture an authentic device demo and screenshots. With the owner's permission, review asset rights, choose an open-source license, and publish the repository for Next Gen judging.

**Status note:** This draft describes code currently in the repository. It does not claim a verified native purchase, revenue, users, awards, or measured device performance.
