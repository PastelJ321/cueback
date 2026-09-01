import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../constants/theme';

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: spacing.lg },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: 'center' },
});
