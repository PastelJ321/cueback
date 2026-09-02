import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnswerScriptPanel } from '../components/AnswerScriptPanel';
import { AppButton } from '../components/AppButton';
import { AudioLevelMeter } from '../components/AudioLevelMeter';
import { LiveMatchList } from '../components/LiveMatchList';
import { QuestionTranslationPanel } from '../components/QuestionTranslationPanel';
import { colors, radius, spacing } from '../constants/theme';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useOnDeviceTranslation } from '../hooks/useOnDeviceTranslation';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSemanticMatcher } from '../hooks/useSemanticMatcher';
import { useAppData } from '../state/AppDataContext';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveQA'>;

export function LiveQAScreen({ route }: Props) {
  const { data } = useAppData();
  const { isTabletLandscape } = useResponsiveLayout();
  const questions = data.questions.filter((item) => item.presentationId === route.params.presentationId);
  const speech = useSpeechRecognition();
  const matcher = useSemanticMatcher(questions);
  const translation = useOnDeviceTranslation();
  const active = speech.state === 'listening' || speech.state === 'stopping';
  const modelLoading = !matcher.isReady && !matcher.error;
  const selectedScore = matcher.matches.find((item) => item.question.id === matcher.selectedQuestionId)?.score ?? null;
  const noConfidentMatch = matcher.matches.length > 0 && !matcher.selectedQuestionId;
  const speechCapability = speech.englishLocaleSupported === false
    ? `${Platform.OS === 'ios' ? 'APPLE SPEECH' : 'SYSTEM SPEECH'} · EN-US UNAVAILABLE`
    : speech.onDeviceRecognitionSupported
      ? `${Platform.OS === 'ios' ? 'APPLE SPEECH' : 'SYSTEM SPEECH'} · ON-DEVICE`
      : `${Platform.OS === 'ios' ? 'APPLE SPEECH' : 'SYSTEM SPEECH'} · NETWORK MAY BE USED`;

  useEffect(() => {
    if (speech.state === 'idle' && speech.finalTranscript && matcher.isReady) {
      const candidates = speech.finalTranscriptCandidates.length > 0
        ? speech.finalTranscriptCandidates
        : [speech.finalTranscript];
      void matcher.match(candidates);
    }
    // Match after the user stops (or the recognizer ends), not on an early iOS final-like segment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.finalTranscript, speech.finalTranscriptCandidates, speech.state, matcher.isReady]);

  useEffect(() => {
    if (speech.state !== 'idle' || !matcher.hasCompletedMatch) return;
    const sourceText = matcher.matchedTranscript || speech.finalTranscript;
    if (sourceText) void translation.translate(sourceText);
    // Wait for semantic reranking so an alternate speech candidate is translated only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matcher.hasCompletedMatch, matcher.matchedTranscript, speech.finalTranscript, speech.state]);

  const handleListen = () => {
    if (active) {
      speech.stop();
    } else {
      matcher.reset();
      translation.reset();
      void speech.start();
    }
  };

  const listenLabel = active ? (speech.state === 'stopping' ? 'Finishing…' : 'Stop') : 'Listen';

  if (isTabletLandscape) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <View style={styles.wideContent}>
          <View style={styles.toolbar}>
            <View style={[styles.statusPill, active && styles.listeningPill]}>
              <Text style={[styles.statusText, active && styles.listeningText]}>
                {speech.state === 'requesting' ? 'CHECKING PERMISSION' : active ? 'LISTENING' : 'READY'}
              </Text>
            </View>
            <View style={styles.capabilityPill}>
              <Text style={styles.capabilityText}>{speechCapability}</Text>
            </View>
            <View style={styles.modelToolbarStatus}>
              {modelLoading ? <ActivityIndicator color={colors.accent} size="small" /> : null}
              <Text style={styles.modelToolbarText}>
                {matcher.error
                  ? 'SEMANTIC MODEL UNAVAILABLE'
                  : modelLoading
                    ? `MINILM ${Math.round(matcher.downloadProgress * 100)}%`
                    : `MINILM READY · ${questions.length} QUESTIONS`}
              </Text>
            </View>
            {matcher.error && !matcher.isReady ? (
              <AppButton label="Retry model" onPress={matcher.retry} style={styles.toolbarButton} variant="secondary" />
            ) : null}
            <AppButton
              disabled={speech.state === 'requesting' || !matcher.isReady}
              label={listenLabel}
              loading={speech.state === 'requesting'}
              onPress={handleListen}
              style={styles.toolbarListen}
              variant={active ? 'danger' : 'primary'}
            />
          </View>

          {speech.error ? <Text accessibilityRole="alert" style={styles.wideError}>{speech.error}</Text> : null}
          {matcher.matchError ? <Text accessibilityRole="alert" style={styles.wideError}>{matcher.matchError}</Text> : null}
          {matcher.error && !matcher.isReady ? <Text style={styles.wideError}>{matcher.error}</Text> : null}

          <View style={styles.wideMain}>
            <View style={styles.wideLeftColumn}>
              <View style={styles.transcriptCard}>
                <Text style={styles.sectionLabel}>DETECTED QUESTION</Text>
                <AudioLevelMeter active={speech.state === 'listening'} compact level={speech.audioLevel} />
                <Text style={[styles.wideTranscript, !speech.transcript && styles.placeholderTranscript]}>
                  {speech.transcript
                    ? `“${speech.transcript}”`
                    : active
                      ? 'Listening for an English question…'
                      : 'Tap Listen when the question begins.'}
                </Text>
                <Text style={styles.transcriptState}>
                  {active
                    ? 'Listening stays active until you tap Stop'
                    : speech.finalTranscript
                      ? 'Final transcript captured'
                      : 'Speech input: English (en-US) · Korean translation appears after Stop'}
                </Text>
                {matcher.matchedTranscript && matcher.matchedTranscript !== speech.finalTranscript ? (
                  <Text style={styles.alternateTranscript}>
                    Alternate recognition candidate used for matching: “{matcher.matchedTranscript}”
                  </Text>
                ) : null}
              </View>
              <QuestionTranslationPanel
                error={translation.error}
                isTranslating={translation.isTranslating}
                text={translation.translatedText}
              />
              {matcher.isMatching ? (
                <View style={styles.matchingCard}>
                  <ActivityIndicator color={colors.accent} />
                  <Text style={styles.matchingText}>Comparing meaning on this device…</Text>
                </View>
              ) : null}
              <LiveMatchList
                fillAvailableSpace
                matches={matcher.matches}
                onSelect={matcher.select}
                selectedQuestionId={matcher.selectedQuestionId}
                showNoConfidentMatch={noConfidentMatch}
              />
            </View>
            <AnswerScriptPanel
              isWide
              question={matcher.selectedQuestion}
              score={selectedScore}
              wasAutoSelected={matcher.wasAutoSelected}
            />
          </View>
          <Text style={styles.wideFooter}>All matching runs locally. Every answer shown was written by you.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mobileStatusRow}>
          <View style={[styles.statusPill, active && styles.listeningPill]}>
            <Text style={[styles.statusText, active && styles.listeningText]}>
              {speech.state === 'requesting' ? 'CHECKING PERMISSION' : active ? 'LISTENING' : `READY · ${questions.length} QUESTIONS`}
            </Text>
          </View>
          <Text style={styles.mobileCapability}>{speechCapability}</Text>
        </View>
        {modelLoading ? (
          <View style={styles.modelCard}>
            <ActivityIndicator color={colors.accent} />
            <View style={styles.modelCopy}>
              <Text style={styles.modelTitle}>Preparing on-device matching</Text>
              <Text style={styles.modelBody}>
                {matcher.downloadProgress > 0 && matcher.downloadProgress < 1
                  ? `Downloading MiniLM once… ${Math.round(matcher.downloadProgress * 100)}%`
                  : 'Loading the local MiniLM model…'}
              </Text>
            </View>
          </View>
        ) : null}
        {matcher.error && !matcher.isReady ? (
          <View style={styles.modelErrorCard}>
            <Text style={styles.modelErrorTitle}>Semantic model unavailable</Text>
            <Text style={styles.modelBody}>{matcher.error}</Text>
            <AppButton label="Retry model loading" onPress={matcher.retry} variant="secondary" />
          </View>
        ) : null}
        <View style={[styles.center, speech.finalTranscript ? styles.centerCompact : undefined]}>
          <Text style={styles.heading}>{active ? 'Listening…' : speech.finalTranscript ? 'Question captured' : 'Ready for the next question?'}</Text>
          <AudioLevelMeter active={speech.state === 'listening'} level={speech.audioLevel} />
          <Text style={[styles.body, speech.transcript && styles.transcript]}>
            {speech.transcript ? `“${speech.transcript}”` : 'Tap Listen, then keep the device where it can clearly hear the questioner.'}
          </Text>
          <AppButton
            disabled={speech.state === 'requesting' || !matcher.isReady}
            label={listenLabel}
            loading={speech.state === 'requesting'}
            onPress={handleListen}
            style={[styles.listenButton, speech.finalTranscript && styles.listenButtonCompact]}
            variant={active ? 'danger' : 'primary'}
          />
          {speech.error ? <Text accessibilityRole="alert" style={styles.error}>{speech.error}</Text> : null}
          {speech.needsOfflineModel ? (
            <AppButton label="Download English speech pack" onPress={() => void speech.downloadOfflineModel()} variant="secondary" />
          ) : null}
          {speech.modelDownloadMessage ? <Text style={styles.downloadMessage}>{speech.modelDownloadMessage}</Text> : null}
          <Text style={styles.languageNote}>Speech input: English (en-US) · Korean translation runs on this device after Stop</Text>
        </View>
        {matcher.matchedTranscript && matcher.matchedTranscript !== speech.finalTranscript ? (
          <View style={styles.alternateCard}>
            <Text style={styles.alternateLabel}>ALTERNATE RECOGNITION CANDIDATE USED FOR MATCHING</Text>
            <Text style={styles.alternateBody}>“{matcher.matchedTranscript}”</Text>
          </View>
        ) : null}
        <QuestionTranslationPanel
          error={translation.error}
          isTranslating={translation.isTranslating}
          text={translation.translatedText}
        />
        {matcher.isMatching ? (
          <View style={styles.matchingCard}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.matchingText}>Comparing meaning on this device…</Text>
          </View>
        ) : null}
        <AnswerScriptPanel
          question={matcher.selectedQuestion}
          score={selectedScore}
          wasAutoSelected={matcher.wasAutoSelected}
        />
        <LiveMatchList
          matches={matcher.matches}
          onSelect={matcher.select}
          selectedQuestionId={matcher.selectedQuestionId}
          showNoConfidentMatch={noConfidentMatch}
        />
        {matcher.matchError ? <Text accessibilityRole="alert" style={styles.error}>{matcher.matchError}</Text> : null}
        <View style={styles.note}><Text style={styles.noteText}>All matching runs locally. Every answer shown was written by you.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, gap: spacing.md, padding: spacing.md },
  mobileStatusRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  statusPill: { alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  statusText: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  listeningPill: { backgroundColor: colors.dangerSoft },
  listeningText: { color: colors.danger },
  mobileCapability: { color: colors.muted, flex: 1, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textAlign: 'right' },
  modelCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: 12, padding: spacing.md },
  modelCopy: { flex: 1 },
  modelTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  modelBody: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  modelErrorCard: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, gap: 8, padding: spacing.md },
  modelErrorTitle: { color: colors.danger, fontSize: 16, fontWeight: '800' },
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center', minHeight: 330, paddingHorizontal: spacing.md },
  centerCompact: { flex: 0, minHeight: 0, paddingBottom: spacing.md, paddingTop: spacing.md },
  heading: { color: colors.text, fontSize: 29, fontWeight: '800', lineHeight: 36, textAlign: 'center' },
  body: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 12, textAlign: 'center' },
  transcript: { color: colors.text, fontSize: 20, lineHeight: 29, fontWeight: '600' },
  listenButton: { borderRadius: radius.lg, height: 112, marginTop: spacing.xl, width: 180 },
  listenButtonCompact: { borderRadius: radius.sm, height: 54, marginTop: spacing.md, width: 150 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  downloadMessage: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm, textAlign: 'center' },
  languageNote: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  alternateCard: { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, gap: 5, padding: spacing.md },
  alternateLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  alternateBody: { color: colors.text, fontSize: 14, fontWeight: '600', lineHeight: 21 },
  matchingCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, flexDirection: 'row', gap: 10, justifyContent: 'center', padding: spacing.md },
  matchingText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  note: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: spacing.md, paddingVertical: spacing.md },
  noteText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  wideContent: { alignSelf: 'center', flex: 1, maxWidth: 1360, padding: spacing.lg, width: '100%' },
  toolbar: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 52 },
  capabilityPill: { backgroundColor: colors.surfaceMuted, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  capabilityText: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  modelToolbarStatus: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  modelToolbarText: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  toolbarButton: { minHeight: 46, paddingHorizontal: 14 },
  toolbarListen: { minHeight: 50, width: 150 },
  wideError: { color: colors.danger, fontSize: 13, fontWeight: '600', marginTop: 6, textAlign: 'right' },
  wideMain: { flex: 1, flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, minHeight: 0 },
  wideLeftColumn: { flex: 0.62, gap: spacing.md, minWidth: 0 },
  transcriptCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: 12, minHeight: 210, padding: spacing.lg },
  sectionLabel: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  wideTranscript: { color: colors.text, fontSize: 25, fontWeight: '700', lineHeight: 34 },
  placeholderTranscript: { color: colors.muted, fontWeight: '600' },
  transcriptState: { color: colors.muted, fontSize: 12, marginTop: 'auto', paddingTop: 12 },
  alternateTranscript: { color: colors.accent, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  wideFooter: { color: colors.muted, fontSize: 11, paddingTop: 8, textAlign: 'right' },
});
