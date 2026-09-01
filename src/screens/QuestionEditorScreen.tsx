import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { LabeledInput } from '../components/LabeledInput';
import { colors, spacing } from '../constants/theme';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useAppData } from '../state/AppDataContext';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'QuestionEditor'>;

export function QuestionEditorScreen({ navigation, route }: Props) {
  const { isWide } = useResponsiveLayout();
  const { data, createQuestion, updateQuestion } = useAppData();
  const existing = route.params.questionId
    ? data.questions.find((item) => item.id === route.params.questionId)
    : undefined;
  const [question, setQuestion] = useState(existing?.question ?? '');
  const [answer, setAnswer] = useState(existing?.answer ?? '');
  const [saving, setSaving] = useState(false);

  const isValid = question.trim().length > 0 && answer.trim().length > 0;
  const save = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      if (existing) await updateQuestion(existing.id, { question, answer });
      else await createQuestion(route.params.presentationId, { question, answer });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Couldn’t save question', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.content, isWide && styles.contentWide]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>Only this answer script can appear in Live Q&A. The app never generates an answer.</Text>
          <View style={[styles.fields, isWide && styles.fieldsWide]}>
            <View style={styles.questionColumn}>
              <LabeledInput
                autoCapitalize="sentences"
                label="Expected Question"
                maxLength={300}
                multiline
                onChangeText={setQuestion}
                placeholder="Why did you choose this benchmark?"
                style={[styles.questionInput, isWide && styles.wideInput]}
                value={question}
              />
            </View>
            <View style={styles.answerColumn}>
              <LabeledInput
                autoCapitalize="sentences"
                helper="Write the exact wording you want to read during the presentation."
                label="Answer Script"
                maxLength={3000}
                multiline
                onChangeText={setAnswer}
                placeholder="We chose this benchmark because…"
                style={isWide && styles.wideInput}
                value={answer}
              />
            </View>
          </View>
          <AppButton
            disabled={!isValid}
            label={existing ? 'Save changes' : 'Add prepared question'}
            loading={saving}
            onPress={() => void save()}
            style={isWide ? styles.saveWide : undefined}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { gap: spacing.lg, padding: spacing.md, paddingBottom: spacing.xl },
  contentWide: { alignSelf: 'center', maxWidth: 1180, padding: spacing.lg, width: '100%' },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  fields: { gap: spacing.lg },
  fieldsWide: { flexDirection: 'row' },
  questionColumn: { flex: 0.4 },
  answerColumn: { flex: 0.6 },
  questionInput: { minHeight: 112 },
  wideInput: { minHeight: 310 },
  saveWide: { alignSelf: 'flex-end', minWidth: 240 },
});
