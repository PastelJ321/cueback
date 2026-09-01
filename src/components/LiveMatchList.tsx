import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import type { SemanticMatch } from '../services/semanticMatching';

type Props = {
  matches: SemanticMatch[];
  selectedQuestionId: string | null;
  onSelect: (questionId: string) => void;
  showNoConfidentMatch: boolean;
  fillAvailableSpace?: boolean;
};

export function LiveMatchList({
  matches,
  selectedQuestionId,
  onSelect,
  showNoConfidentMatch,
  fillAvailableSpace = false,
}: Props) {
  return (
    <View style={[styles.results, fillAvailableSpace && styles.fill]}>
      <Text style={styles.sectionLabel}>POSSIBLE MATCHES</Text>
      {showNoConfidentMatch ? (
        <View style={styles.noMatch}>
          <Text style={styles.noMatchTitle}>No confident match</Text>
          <Text style={styles.noMatchBody}>Choose a candidate before showing an answer.</Text>
        </View>
      ) : null}
      {matches.length === 0 ? (
        <View style={styles.emptyMatches}>
          <Text style={styles.emptyTitle}>Matches will appear here</Text>
          <Text style={styles.emptyBody}>Promptside compares meaning only after a final transcript is captured.</Text>
        </View>
      ) : matches.map((item) => (
        <Pressable
          accessibilityRole="button"
          key={item.question.id}
          onPress={() => onSelect(item.question.id)}
          style={({ pressed }) => [
            styles.matchRow,
            selectedQuestionId === item.question.id && styles.matchRowSelected,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.score}>{Math.round(Math.max(0, Math.min(1, item.score)) * 100)}%</Text>
          <Text numberOfLines={2} style={styles.matchQuestion}>{item.question.question}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  results: { gap: 8 },
  fill: { flex: 1 },
  sectionLabel: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  noMatch: { backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: 14 },
  noMatchTitle: { color: colors.danger, fontSize: 17, fontWeight: '800' },
  noMatchBody: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  emptyMatches: {
    alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border,
    borderRadius: radius.md, borderStyle: 'dashed', borderWidth: 1, flex: 1,
    justifyContent: 'center', minHeight: 150, padding: spacing.lg,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
  matchRow: {
    alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border,
    borderRadius: radius.sm, borderWidth: 1, flexDirection: 'row', gap: 12,
    minHeight: 62, padding: 12,
  },
  matchRowSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  pressed: { opacity: 0.74 },
  score: { color: colors.accent, fontSize: 18, fontVariant: ['tabular-nums'], fontWeight: '800', width: 50 },
  matchQuestion: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 21 },
});
