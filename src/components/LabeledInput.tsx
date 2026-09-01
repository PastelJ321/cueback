import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors, radius } from '../constants/theme';

type Props = TextInputProps & { label: string; helper?: string };

export function LabeledInput({ label, helper, multiline, style, ...props }: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline={multiline}
        placeholderTextColor={colors.muted}
        style={[styles.input, multiline && styles.multiline, style]}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700' },
  input: {
    minHeight: 52, paddingHorizontal: 14, backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.border, borderRadius: radius.sm, color: colors.text, fontSize: 16,
  },
  multiline: { minHeight: 176, paddingTop: 14, lineHeight: 24 },
  helper: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
