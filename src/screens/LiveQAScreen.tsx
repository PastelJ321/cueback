import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { colors, radius, spacing } from '../constants/theme';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSemanticMatcher } from '../hooks/useSemanticMatcher';
import { useAppData } from '../state/AppDataContext';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveQA'>;

export function LiveQAScreen({ route }: Props) {
  const { data } = useAppData();
  const questions = data.questions.filter((item) => item.presentationId === route.params.presentationId);
  const speech = useSpeechRecognition(questions.map((item) => item.question));
  const matcher = useSemanticMatcher(questions);
  const active = speech.state === 'listening' || speech.state === 'stopping';
  const modelLoading = !matcher.isReady && !matcher.error;

  useEffect(() => {
    if (speech.finalTranscript && matcher.isReady) void matcher.match(speech.finalTranscript);
    // match is intentionally triggered only by a new final transcript or model readiness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.finalTranscript, matcher.isReady]);

  const handleListen = () => {
    if (active) {
      speech.stop();
    } else {
      matcher.reset();
      void speech.start();
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.statusPill, active && styles.listeningPill]}>
          <Text style={[styles.statusText, active && styles.listeningText]}>
            {speech.state === 'requesting' ? 'CHECKING PERMISSION' : active ? 'LISTENING' : `READY · ${questions.length} QUESTIONS`}
          </Text>
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
          <Text style={[styles.body, speech.transcript && styles.transcript]}>
            {speech.transcript ? `“${speech.transcript}”` : 'Tap Listen, then hold the phone where it can clearly hear the questioner.'}
          </Text>
          <AppButton
            disabled={speech.state === 'requesting' || !matcher.isReady}
            label={active ? (speech.state === 'stopping' ? 'Finishing…' : 'Stop') : 'Listen'}
            loading={speech.state === 'requesting'}
            onPress={handleListen}
            style={[
              styles.listenButton,
              speech.finalTranscript ? styles.listenButtonCompact : undefined,
              active ? styles.stopButton : undefined,
            ]}
            variant={active ? 'danger' : 'primary'}
          />
          {speech.error ? <Text accessibilityRole="alert" style={styles.error}>{speech.error}</Text> : null}
          {speech.needsOfflineModel ? (
            <AppButton label="Download English speech pack" onPress={() => void speech.downloadOfflineModel()} variant="secondary" />
          ) : null}
          {speech.modelDownloadMessage ? <Text style={styles.downloadMessage}>{speech.modelDownloadMessage}</Text> : null}
        </View>
        {matcher.isMatching ? (
          <View style={styles.matchingCard}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.matchingText}>Comparing meaning on this device…</Text>
          </View>
        ) : null}
        {matcher.selectedQuestion ? (
          <View style={styles.answerCard}>
            <Text style={styles.answerLabel}>{matcher.wasAutoSelected ? 'ANSWER SCRIPT · AUTO MATCH' : 'ANSWER SCRIPT · SELECTED'}</Text>
            <Text selectable style={styles.answerText}>{matcher.selectedQuestion.answer}</Text>
            <Text style={styles.sourceNote}>Saved answer for: {matcher.selectedQuestion.question}</Text>
          </View>
        ) : null}
        {matcher.matches.length > 0 ? (
          <View style={styles.results}>
            <Text style={styles.sectionLabel}>POSSIBLE MATCHES</Text>
            {!matcher.selectedQuestionId ? (
              <View style={styles.noMatch}>
                <Text style={styles.noMatchTitle}>No confident match</Text>
                <Text style={styles.noMatchBody}>Choose a candidate below before showing an answer.</Text>
              </View>
            ) : null}
            {matcher.matches.map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item.question.id}
                onPress={() => matcher.select(item.question.id)}
                style={({ pressed }) => [
                  styles.matchRow,
                  matcher.selectedQuestionId === item.question.id && styles.matchRowSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.score}>{Math.round(Math.max(0, Math.min(1, item.score)) * 100)}%</Text>
                <Text style={styles.matchQuestion}>{item.question.question}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {matcher.matchError ? <Text accessibilityRole="alert" style={styles.error}>{matcher.matchError}</Text> : null}
        <View style={styles.note}><Text style={styles.noteText}>Answer scripts shown here always come from your Question Bank.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.md },
  statusPill: { alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  statusText: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  listeningPill: { backgroundColor: colors.dangerSoft },
  listeningText: { color: colors.danger },
  modelCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: spacing.md, padding: spacing.md },
  modelCopy: { flex: 1 },
  modelTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  modelBody: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  modelErrorCard: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, gap: 8, marginTop: spacing.md, padding: spacing.md },
  modelErrorTitle: { color: colors.danger, fontSize: 16, fontWeight: '800' },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: spacing.md },
  centerCompact: { flex: 0, paddingBottom: spacing.lg, paddingTop: spacing.lg },
  heading: { color: colors.text, fontSize: 29, fontWeight: '800', lineHeight: 36, textAlign: 'center' },
  body: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 12, textAlign: 'center' },
  transcript: { color: colors.text, fontSize: 20, lineHeight: 29, fontWeight: '600' },
  listenButton: { borderRadius: radius.lg, height: 112, marginTop: spacing.xl, width: 180 },
  listenButtonCompact: { borderRadius: radius.sm, height: 54, marginTop: spacing.md, width: 150 },
  stopButton: { backgroundColor: colors.dangerSoft },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20, marginTop: spacing.md, textAlign: 'center' },
  downloadMessage: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm, textAlign: 'center' },
  matchingCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, flexDirection: 'row', gap: 10, justifyContent: 'center', padding: spacing.md },
  matchingText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  results: { gap: 8, marginBottom: spacing.lg },
  sectionLabel: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  noMatch: { backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: 14 },
  noMatchTitle: { color: colors.danger, fontSize: 17, fontWeight: '800' },
  noMatchBody: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  matchRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 58, padding: 12 },
  matchRowSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  pressed: { opacity: 0.74 },
  score: { color: colors.accent, fontSize: 18, fontVariant: ['tabular-nums'], fontWeight: '800', width: 50 },
  matchQuestion: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 21 },
  answerCard: { backgroundColor: colors.text, borderRadius: radius.md, marginBottom: spacing.lg, padding: spacing.lg },
  answerLabel: { color: '#8ED1BA', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  answerText: { color: '#FFFFFF', fontSize: 27, fontWeight: '700', lineHeight: 38, marginTop: 14 },
  sourceNote: { color: '#B8C4BF', fontSize: 12, lineHeight: 17, marginTop: spacing.lg },
  note: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 'auto', paddingVertical: spacing.md },
  noteText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
