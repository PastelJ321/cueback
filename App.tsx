import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from './src/constants/theme';
import { LiveQAScreen } from './src/screens/LiveQAScreen';
import { PresentationsScreen } from './src/screens/PresentationsScreen';
import { ProScreen } from './src/screens/ProScreen';
import { QuestionBankScreen } from './src/screens/QuestionBankScreen';
import { QuestionEditorScreen } from './src/screens/QuestionEditorScreen';
import { AppDataProvider, useAppData } from './src/state/AppDataContext';
import { SemanticModelProvider } from './src/state/SemanticModelContext';
import { PurchasesProvider } from './src/state/PurchasesContext';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { isLoading, loadError } = useAppData();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingText}>Loading your presentations…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Couldn’t open local data</Text>
        <Text style={styles.errorBody}>{loadError}</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          component={PresentationsScreen}
          name="Presentations"
          options={{ title: 'Presentations' }}
        />
        <Stack.Screen
          component={QuestionBankScreen}
          name="QuestionBank"
          options={{ title: 'Question Bank' }}
        />
        <Stack.Screen
          component={QuestionEditorScreen}
          name="QuestionEditor"
          options={({ route }) => ({
            title: route.params.questionId ? 'Edit Question' : 'New Question',
          })}
        />
        <Stack.Screen
          component={LiveQAScreen}
          name="LiveQA"
          options={{ title: 'Live Q&A', headerBackTitle: 'Questions' }}
        />
        <Stack.Screen component={ProScreen} name="Pro" options={{ title: 'Cueback Pro', presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PurchasesProvider>
        <SemanticModelProvider>
          <AppDataProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </AppDataProvider>
        </SemanticModelProvider>
      </PurchasesProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 14,
    color: colors.muted,
    fontSize: 16,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorBody: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
  },
});
