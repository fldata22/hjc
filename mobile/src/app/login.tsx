import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { extractApiMessage } from '@/lib/api';

// HJC sand palette (shared tokens will be centralised when screens are ported).
const C = {
  bg: '#F5F1EA',
  surface: '#FFFFFF',
  ink: '#1F1B16',
  ink2: '#5C554B',
  ink3: '#9A9087',
  line: '#E4DDD1',
  accent: '#B45309',
};

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = email.trim() !== '' && password !== '' && !busy;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      // Auth gate in _layout redirects to the app on success.
    } catch (e) {
      setError(extractApiMessage(e, 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.kicker}>HJC</Text>
            <Text style={styles.title}>Mission Control</Text>
            <Text style={styles.sub}>Crusade director command system</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="director@hjc.test"
              placeholderTextColor={C.ink3}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              inputMode="email"
            />

            <Text style={[styles.label, { marginTop: 18 }]}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={C.ink3}
              secureTextEntry
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={!canSubmit}
            >
              {busy ? (
                <ActivityIndicator color={C.surface} />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  header: { marginBottom: 36 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 2, color: C.accent },
  title: { fontSize: 30, fontWeight: '700', color: C.ink, marginTop: 4 },
  sub: { fontSize: 13, color: C.ink3, marginTop: 4 },
  form: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: C.line,
  },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.ink3, marginBottom: 6 },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 8,
    fontSize: 16,
    color: C.ink,
  },
  error: { color: '#B91C1C', fontSize: 13, marginTop: 16 },
  button: {
    backgroundColor: C.ink,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: C.surface, fontSize: 15, fontWeight: '600' },
});
