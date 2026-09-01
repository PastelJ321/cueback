import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import type { PreparedQuestion } from '../types/models';

type Props = {
  question: PreparedQuestion | null;
  score: number | null;
  wasAutoSelected: boolean;
  isWide?: boolean;
};

export function AnswerScriptPanel({ question, score, wasAutoSelected, isWide = false }: Props) {
  const confidence = score === null ? null : Math.round(Math.max(0, Math.min(1, score)) * 100);

  return (
    <View style={[styles.card, isWide && styles.cardWide]}>
      <View style={styles.header}>
        <Text style={styles.label}>
          {question
            ? `ANSWER SCRIPT · ${wasAutoSelected ? 'AUTO MATCH' : 'SELECTED'}`
            : 'ANSWER SCRIPT'}
        </Text>
        {confidence !== null ? <Text style={styles.confidence}>{confidence}% MATCH</Text> : null}
      </View>
      {question ? (
        <>
          <Text numberOfLines={2} style={styles.bestMatch}>{question.question}</Text>
          <ScrollView
            contentContainerStyle={styles.answerScroll}
            persistentScrollbar={isWide}
            showsVerticalScrollIndicator={isWide}
            style={isWide ? styles.answerScrollerWide : undefined}
          >
            <Text selectable style={[styles.answer, isWide && styles.answerWide]}>{question.answer}</Text>
          </ScrollView>
          <Text style={styles.sourceNote}>Prepared by you · no answer was generated</Text>
        </>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>Your prepared answer will appear here.</Text>
          <Text style={styles.placeholderBody}>Listen to a question, or choose one of the possible matches.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.text, borderRadius: radius.md, minHeight: 260, padding: spacing.lg },
  cardWide: { flex: 1, minHeight: 0, padding: 30 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  label: { color: '#8ED1BA', flex: 1, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  confidence: { color: '#FFFFFF', fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '800' },
  bestMatch: { color: '#B8C4BF', fontSize: 15, fontWeight: '600', lineHeight: 21, marginTop: 12 },
  answerScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.md },
  answerScrollerWide: { flex: 1 },
  answer: { color: '#FFFFFF', fontSize: 27, fontWeight: '700', lineHeight: 38 },
  answerWide: { fontSize: 38, lineHeight: 52 },
  sourceNote: { color: '#9FACA7', fontSize: 12, lineHeight: 17, marginTop: spacing.md },
  placeholder: { flex: 1, justifyContent: 'center', minHeight: 190 },
  placeholderTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', lineHeight: 37 },
  placeholderBody: { color: '#B8C4BF', fontSize: 16, lineHeight: 24, marginTop: 10 },
});
