import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';

const BAR_COUNT = 14;
const BAR_HEIGHTS = [8, 13, 19, 27, 18, 31, 23, 34, 21, 29, 17, 24, 14, 9];

type Props = {
  active: boolean;
  level: number;
  compact?: boolean;
};

export function AudioLevelMeter({ active, level, compact = false }: Props) {
  const normalizedLevel = active ? Math.max(0, Math.min(1, (level + 2) / 12)) : 0;
  const activeBars = active ? Math.max(1, Math.ceil(normalizedLevel * BAR_COUNT)) : 0;
  const voiceDetected = active && level > 0;
  const status = !active ? 'MIC OFF' : voiceDetected ? 'VOICE DETECTED' : 'LISTENING FOR VOICE';

  return (
    <View
      accessibilityLabel={`${status}. Microphone input level ${Math.round(normalizedLevel * 100)} percent.`}
      accessibilityLiveRegion="polite"
      style={[styles.container, compact && styles.containerCompact]}
    >
      <View style={[styles.liveDot, active && styles.liveDotActive, voiceDetected && styles.liveDotVoice]} />
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.bars}>
        {BAR_HEIGHTS.map((height, index) => (
          <View
            key={`${height}-${index}`}
            style={[
              styles.bar,
              { height: compact ? Math.max(6, height - 6) : height },
              index < activeBars && styles.barActive,
              voiceDetected && index < activeBars && styles.barVoice,
            ]}
          />
        ))}
      </View>
      <Text style={[styles.status, voiceDetected && styles.statusVoice]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  containerCompact: { minHeight: 42, paddingVertical: 6 },
  liveDot: { backgroundColor: colors.border, borderRadius: 999, height: 9, width: 9 },
  liveDotActive: { backgroundColor: colors.warning },
  liveDotVoice: { backgroundColor: colors.accent },
  bars: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 4, height: 36 },
  bar: { backgroundColor: colors.border, borderRadius: 999, flex: 1, maxWidth: 8, minWidth: 3 },
  barActive: { backgroundColor: '#C6A45C' },
  barVoice: { backgroundColor: colors.accent },
  status: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.7, minWidth: 124, textAlign: 'right' },
  statusVoice: { color: colors.accent },
});
