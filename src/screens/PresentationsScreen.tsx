import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { LabeledInput } from '../components/LabeledInput';
import { colors, radius, spacing } from '../constants/theme';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useAppData } from '../state/AppDataContext';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Presentations'>;

export function PresentationsScreen({ navigation }: Props) {
  const { isWide } = useResponsiveLayout();
  const { data, createPresentation, renamePresentation, deletePresentation, addSamplePresentation } = useAppData();
  const [modal, setModal] = useState<{ id?: string; title: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const saveTitle = async () => {
    if (!modal?.title.trim()) return;
    setBusy(true);
    try {
      if (modal.id) await renamePresentation(modal.id, modal.title);
      else await createPresentation(modal.title);
      setModal(null);
    } catch (error) {
      Alert.alert('Couldn’t save', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (id: string, title: string) => {
    Alert.alert('Delete presentation?', `“${title}” and all of its prepared questions will be removed from this device.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deletePresentation(id).catch(() => Alert.alert('Couldn’t delete', 'Please try again.')) },
    ]);
  };

  const addSample = async () => {
    setBusy(true);
    try {
      const sample = await addSamplePresentation();
      navigation.navigate('QuestionBank', { presentationId: sample.id });
    } catch {
      Alert.alert('Couldn’t add sample', 'Local storage is unavailable.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <FlatList
        columnWrapperStyle={isWide ? styles.column : undefined}
        contentContainerStyle={[styles.content, isWide && styles.contentWide]}
        data={data.presentations}
        key={isWide ? 'wide' : 'compact'}
        keyExtractor={(item) => item.id}
        numColumns={isWide ? 2 : 1}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>CUEBACK</Text>
            <Text style={styles.title}>Your prepared answers, ready when the question lands.</Text>
            <AppButton label="New presentation" onPress={() => setModal({ title: '' })} />
          </View>
        }
        ListEmptyComponent={<EmptyState title="No presentations yet" body="Create one, or load the Wharton rehearsal bank to test the complete Q&A flow." />}
        renderItem={({ item }) => {
          const questionCount = data.questions.filter((q) => q.presentationId === item.id).length;
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('QuestionBank', { presentationId: item.id })}
              style={({ pressed }) => [styles.card, isWide && styles.cardWide, pressed && styles.cardPressed]}
            >
              <View style={styles.cardCopy}>
                <Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.meta}>{questionCount} prepared {questionCount === 1 ? 'question' : 'questions'}</Text>
              </View>
              <View style={styles.actions}>
                <AppButton label="Rename" onPress={() => setModal({ id: item.id, title: item.title })} variant="ghost" />
                <AppButton label="Delete" onPress={() => confirmDelete(item.id, item.title)} variant="ghost" />
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={<AppButton disabled={busy} label="Load / refresh Wharton rehearsal" onPress={() => void addSample()} style={styles.sampleButton} variant="secondary" />}
      />

      <Modal animationType="fade" onRequestClose={() => setModal(null)} transparent visible={modal !== null}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
          <Pressable onPress={() => setModal(null)} style={StyleSheet.absoluteFill} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modal?.id ? 'Rename presentation' : 'New presentation'}</Text>
            <LabeledInput
              autoFocus
              label="Presentation name"
              maxLength={100}
              onChangeText={(title) => setModal((current) => current ? { ...current, title } : current)}
              onSubmitEditing={() => void saveTitle()}
              placeholder="e.g. Wharton Investment Competition"
              returnKeyType="done"
              value={modal?.title ?? ''}
            />
            <View style={styles.modalActions}>
              <AppButton label="Cancel" onPress={() => setModal(null)} style={styles.flex} variant="secondary" />
              <AppButton disabled={!modal?.title.trim()} label="Save" loading={busy} onPress={() => void saveTitle()} style={styles.flex} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  contentWide: { alignSelf: 'center', maxWidth: 1120, padding: spacing.lg, width: '100%' },
  column: { gap: spacing.md },
  header: { gap: spacing.md, marginBottom: spacing.lg },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: colors.text, fontSize: 27, fontWeight: '800', lineHeight: 35 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, marginBottom: 12, padding: spacing.md },
  cardWide: { flex: 1, minHeight: 145 },
  cardPressed: { opacity: 0.76 },
  cardCopy: { gap: 6 },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700', lineHeight: 24 },
  meta: { color: colors.muted, fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  sampleButton: { marginTop: spacing.md },
  overlay: { flex: 1, backgroundColor: 'rgba(12, 24, 19, 0.42)', justifyContent: 'center', padding: spacing.md },
  modalCard: { backgroundColor: colors.background, borderRadius: radius.md, gap: spacing.md, padding: spacing.lg },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  modalActions: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
