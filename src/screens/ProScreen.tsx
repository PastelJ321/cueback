import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { colors, radius, spacing } from '../constants/theme';
import { usePurchases } from '../state/PurchasesContext';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Pro'>;

export function ProScreen({ navigation }: Props) {
  const { isPro, status, product, error, purchase, restore, refresh } = usePurchases();
  const busy = status === 'busy' || status === 'loading';

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>CUEBACK PRO</Text>
          <Text style={styles.title}>More room for every presentation.</Text>
          <Text style={styles.body}>Keep your own answers ready across an unlimited number of presentations and expected questions.</Text>
          <View style={styles.comparison}>
            <Text style={styles.row}>Free  ·  1 presentation  ·  5 questions per presentation</Text>
            <Text style={styles.row}>Pro  ·  Unlimited presentations and questions</Text>
            <Text style={styles.row}>Both  ·  Speech recognition, semantic matching, and your prepared answers</Text>
          </View>
          <Text style={styles.testNotice}>Test purchase — no real money will be charged.</Text>
          {isPro ? <Text style={styles.active}>Cueback Pro is active.</Text> : null}
          {product ? (
            <Text style={styles.product}>{product.product.title} · {product.product.priceString}</Text>
          ) : <Text style={styles.body}>Product unavailable until a Current Offering and package are configured.</Text>}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <AppButton
            disabled={!product || status !== 'ready' || isPro}
            label={isPro ? 'Pro active' : product ? `Test purchase · ${product.product.priceString}` : 'Product unavailable'}
            loading={status === 'busy'}
            onPress={() => void purchase()}
          />
          <AppButton disabled={busy || status === 'unconfigured'} label="Restore Purchases" onPress={() => void restore()} variant="secondary" />
          {status === 'error' ? <AppButton label="Retry connection" onPress={() => void refresh()} variant="secondary" /> : null}
          <AppButton label="Close" onPress={() => navigation.goBack()} variant="ghost" />
          <Text style={styles.note}>Restoring a purchase restores Pro access. It does not restore presentations or answer scripts saved only on another device.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.md },
  card: { alignSelf: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, maxWidth: 650, padding: spacing.lg, width: '100%' },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 31, fontWeight: '800', lineHeight: 38 },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  comparison: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, gap: 10, padding: spacing.md },
  row: { color: colors.text, fontSize: 15, fontWeight: '600', lineHeight: 22 },
  testNotice: { color: colors.warning, fontSize: 14, fontWeight: '800' },
  active: { color: colors.accent, fontSize: 17, fontWeight: '800' },
  product: { color: colors.text, fontSize: 17, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
