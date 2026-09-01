import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '../constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({ label, onPress, variant = 'primary', disabled, loading, icon, style }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base, styles[variant], pressed && styles.pressed, (disabled || loading) && styles.disabled, style,
      ]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : colors.accent} /> : icon}
      <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50, paddingHorizontal: 18, borderRadius: radius.sm, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.accentSoft },
  danger: { backgroundColor: colors.dangerSoft },
  ghost: { backgroundColor: 'transparent', minHeight: 44, paddingHorizontal: 12 },
  label: { fontSize: 16, fontWeight: '700' },
  primaryLabel: { color: '#FFFFFF' },
  secondaryLabel: { color: colors.accent },
  dangerLabel: { color: colors.danger },
  ghostLabel: { color: colors.muted },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.46 },
});
