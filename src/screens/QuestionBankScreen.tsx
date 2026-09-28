import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { colors, radius, spacing } from '../constants/theme';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useAppData } from '../state/AppDataContext';
import { usePurchases } from '../state/PurchasesContext';
import { FREE_QUESTION_LIMIT } from '../state/limits';
import type { PreparedQuestion } from '../types/models';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'QuestionBank'>;

export function QuestionBankScreen({ navigation, route }: Props) {
  const { data, deleteQuestion } = useAppData();
  const { isPro } = usePurchases();
  const { isWide } = useResponsiveLayout();
  const presentation = data.presentations.find((item) => item.id === route.params.presentationId);
  const questions = data.questions.filter((item) => item.presentationId === route.params.presentationId);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(questions[0]?.id ?? null);
  const selectedQuestion = questions.find((item) => item.id === selectedQuestionId) ?? questions[0] ?? null;

  useLayoutEffect(() => {
    navigation.setOptions({ title: presentation?.title ?? 'Question Bank' });
  }, [navigation, presentation?.title]);

  useEffect(() => {
    if (!questions.some((item) => item.id === selectedQuestionId)) {
      setSelectedQuestionId(questions[0]?.id ?? null);
    }
  }, [questions, selectedQuestionId]);

  if (!presentation) {
    return <EmptyState title="Presentation not found" body="It may have been deleted from local storage." />;
  }

  const confirmDelete = (id: string) => {
    Alert.alert('Delete prepared question?', 'The question and its answer script will be removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteQuestion(id).catch(() => Alert.alert('Couldn’t delete', 'Please try again.')) },
    ]);
  };

  const addQuestion = () => {
    if (!isPro && questions.length >= FREE_QUESTION_LIMIT) navigation.navigate('Pro');
    else navigation.navigate('QuestionEditor', { presentationId: presentation.id });
  };
  const addLabel = !isPro && questions.length >= FREE_QUESTION_LIMIT ? 'Get Pro for more' : 'Add question';
  const editQuestion = (question: PreparedQuestion) => navigation.navigate('QuestionEditor', {
    presentationId: presentation.id,
    questionId: question.id,
  });
  const startLiveQA = () => navigation.navigate('LiveQA', { presentationId: presentation.id });

  if (isWide) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <View style={styles.wideContent}>
          <View style={styles.wideHeader}>
            <View>
              <Text style={styles.count}>{questions.length} PREPARED {questions.length === 1 ? 'QUESTION' : 'QUESTIONS'}</Text>
              <Text style={styles.wideHeading}>Review your question bank before going live.</Text>
            </View>
            <View style={styles.wideActions}>
              <AppButton label={addLabel} onPress={addQuestion} style={styles.wideButton} variant="secondary" />
              <AppButton disabled={questions.length === 0} label="Start Live Q&A" onPress={startLiveQA} style={styles.wideButton} />
            </View>
          </View>
          {questions.length === 0 ? (
            <EmptyState title="No prepared questions" body="Add the questions you expect and the exact answer scripts you want to see during Q&A." />
          ) : (
            <View style={styles.splitLayout}>
              <View style={styles.listPane}>
                <FlatList
                  contentContainerStyle={styles.listContent}
                  data={questions}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) => (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setSelectedQuestionId(item.id)}
                      style={({ pressed }) => [
                        styles.listRow,
                        selectedQuestion?.id === item.id && styles.listRowSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
                      <Text numberOfLines={3} style={styles.listQuestion}>{item.question}</Text>
                    </Pressable>
                  )}
                />
              </View>
              <View style={styles.detailPane}>
                {selectedQuestion ? (
                  <>
                    <Text style={styles.detailLabel}>EXPECTED QUESTION</Text>
                    <Text style={styles.detailQuestion}>{selectedQuestion.question}</Text>
                    <View style={styles.divider} />
                    <Text style={styles.detailLabel}>ANSWER SCRIPT</Text>
                    <ScrollView contentContainerStyle={styles.detailAnswerScroll} style={styles.detailAnswerScroller}>
                      <Text selectable style={styles.detailAnswer}>{selectedQuestion.answer}</Text>
                    </ScrollView>
                    <View style={styles.detailActions}>
                      <AppButton label="Delete" onPress={() => confirmDelete(selectedQuestion.id)} style={styles.detailButton} variant="danger" />
                      <AppButton label="Edit question" onPress={() => editQuestion(selectedQuestion)} style={styles.detailButton} />
                    </View>
                  </>
                ) : null}
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

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
              <AppButton label={addLabel} onPress={addQuestion} style={styles.flex} variant="secondary" />
              <AppButton disabled={questions.length === 0} label="Start Live Q&A" onPress={startLiveQA} style={styles.flex} />
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState title="No prepared questions" body="Add the questions you expect and the exact answer scripts you want to see during Q&A." />}
        renderItem={({ item, index }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => editQuestion(item)}
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
  wideContent: { alignSelf: 'center', flex: 1, maxWidth: 1240, padding: spacing.lg, width: '100%' },
  wideHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, marginBottom: spacing.lg },
  wideHeading: { color: colors.text, fontSize: 24, fontWeight: '800', lineHeight: 31, marginTop: 6 },
  wideActions: { flexDirection: 'row', gap: spacing.sm },
  wideButton: { minWidth: 150 },
  splitLayout: { flex: 1, flexDirection: 'row', gap: spacing.md, minHeight: 0 },
  listPane: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 0.4, overflow: 'hidden' },
  listContent: { padding: spacing.sm },
  listRow: { borderColor: 'transparent', borderRadius: radius.sm, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 6, minHeight: 72, padding: 14 },
  listRowSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  listQuestion: { color: colors.text, flex: 1, fontSize: 17, fontWeight: '700', lineHeight: 23 },
  detailPane: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 0.6, minWidth: 0, padding: spacing.lg },
  detailLabel: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.3 },
  detailQuestion: { color: colors.text, fontSize: 26, fontWeight: '800', lineHeight: 35, marginTop: 10 },
  divider: { backgroundColor: colors.border, height: 1, marginVertical: spacing.lg },
  detailAnswerScroll: { flexGrow: 1 },
  detailAnswerScroller: { flex: 1 },
  detailAnswer: { color: colors.text, fontSize: 25, fontWeight: '600', lineHeight: 37, marginTop: 12 },
  detailActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end', marginTop: spacing.lg },
  detailButton: { minWidth: 150 },
});
