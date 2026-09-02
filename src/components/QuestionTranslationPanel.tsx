import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';

type Props = {
  text: string;
  isTranslating: boolean;
  error: string | null;
};

export function QuestionTranslationPanel({ text, isTranslating, error }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>한국어 번역 · 온디바이스</Text>
        {isTranslating ? <ActivityIndicator color={colors.accent} size="small" /> : null}
      </View>
      {text ? <Text selectable style={styles.translation}>{text}</Text> : null}
      {!text && !error ? (
        <Text style={styles.placeholder}>
          {isTranslating ? '번역하고 있습니다…' : '질문이 끝나면 한국어 번역이 표시됩니다.'}
        </Text>
      ) : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accentSoft,
    borderColor: '#B8D9CC',
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  translation: { color: colors.text, fontSize: 19, fontWeight: '700', lineHeight: 28 },
  placeholder: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
});
