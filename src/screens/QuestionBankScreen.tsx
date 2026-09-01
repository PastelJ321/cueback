import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLayoutEffect } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { colors, radius, spacing } from '../constants/theme';
import { useAppData } from '../state/AppDataContext';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'QuestionBank'>;

export function QuestionBankScreen({ navigation, route }: Props) {
  const { data, deleteQuestion } = useAppData();
  const presentation = data.presentations.find((item) => item.id === route.params.presentationId);
  const questions = data.questions.filter((item) => item.presentationId === route.params.presentationId);

  useLayoutEffect(() => {
    navigation.setOptions({ title: presentation?.title ?? 'Question Bank' });
  }, [navigation, presentation?.title]);

  if (!presentation) {
    return <EmptyState title="Presentation not found" body="It may have been deleted from local storage." />;
  }

  const confirmDelete = (id: string) => {
    Alert.alert('Delete prepared question?', 'The question and its answer script will be removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteQuestion(id).catch(() => Alert.alert('Couldn’t delete', 'Please try again.')) },
    ]);
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.content}
        data={questions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.count}>{questions.length} PREPARED {questions.length === 1 ? 'QUESTION' : 'QUESTIONS'}</Text>
            <View style={styles.buttonRow}>
              <AppButton label="Add question" onPress={() => navigation.navigate('QuestionEditor', { presentationId: presentation.id })} style={styles.flex} variant="secondary" />
              <AppButton disabled={questions.length === 0} label="Start Live Q&A" onPress={() => navigation.navigate('LiveQA', { presentationId: presentation.id })} style={styles.flex} />
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState title="No prepared questions" body="Add the questions you expect and the exact answer scripts you want to see during Q&A." />}
        renderItem={({ item, index }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('QuestionEditor', { presentationId: presentation.id, questionId: item.id })}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.cardBody}>
              <Text style={styles.question}>{item.question}</Text>
              <Text numberOfLines={2} style={styles.answer}>{item.answer}</Text>
              <View style={styles.cardActions}>
                <Text style={styles.edit}>Tap to edit</Text>
                <AppButton label="Delete" onPress={() => confirmDelete(item.id)} variant="ghost" />
              </View>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.md, paddingBottom: spacing.xl },
  header: { gap: spacing.md, marginBottom: spacing.lg },
  count: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  card: { flexDirection: 'row', gap: 12, padding: spacing.md, marginBottom: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  pressed: { opacity: 0.76 },
  number: { color: colors.accent, fontSize: 13, fontWeight: '800', paddingTop: 3 },
  cardBody: { flex: 1 },
  question: { color: colors.text, fontSize: 17, fontWeight: '700', lineHeight: 24 },
  answer: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  cardActions: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  edit: { color: colors.accent, fontSize: 13, fontWeight: '700' },
});
