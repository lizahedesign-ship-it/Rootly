import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { useAuthStore } from '../store/authStore';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUpWithEmail, isLoading, error, clearError, isLoggedIn } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Email verification pending state
  const [verificationSent, setVerificationSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  // Navigate to parent home if signup didn't require verification
  useEffect(() => {
    if (isLoggedIn) router.replace('/(parent)/home');
  }, [isLoggedIn]);

  const handleSignUp = async () => {
    setLocalError(null);
    clearError();

    if (!email.trim() || !password || !confirmPassword) {
      setLocalError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    const result = await signUpWithEmail(email.trim().toLowerCase(), password);
    if (result.needsVerification) {
      setSubmittedEmail(email.trim().toLowerCase());
      setVerificationSent(true);
    }
    // If no verification needed, isLoggedIn → true → useEffect navigates
  };

  // ── Email verification sent screen ───────────────────────────────────────
  if (verificationSent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.verifyContainer}>
          <Text style={styles.verifyEmoji}>📬</Text>
          <Text style={styles.verifyTitle}>Check your email</Text>
          <Text style={styles.verifySub}>
            We sent a confirmation link to{'\n'}
            <Text style={styles.verifyEmail}>{submittedEmail}</Text>
          </Text>
          <Text style={styles.verifyHint}>
            Tap the link in the email to activate your account, then sign in.
          </Text>
          <TouchableOpacity
            style={styles.backToLogin}
            onPress={() => { clearError(); router.replace('/(auth)/login'); }}
          >
            <Text style={styles.backToLoginText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Sign-up form ──────────────────────────────────────────────────────────
  const displayError = localError ?? error;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => { clearError(); router.back(); }} hitSlop={12}>
              <Text style={styles.backBtn}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Start building better habits together</Text>
          </View>

          {/* ── Error ── */}
          {displayError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          ) : null}

          {/* ── Form ── */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Password (min. 6 characters)"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor={Colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />

            <TouchableOpacity
              style={[styles.btn, isLoading && styles.btnDisabled]}
              onPress={handleSignUp}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.btnLabel}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => { clearError(); router.replace('/(auth)/login'); }}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['4xl'],
    justifyContent: 'center',
  },

  // Header
  header: {
    marginBottom: Spacing['2xl'],
  },
  backBtn: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  title: {
    fontFamily: 'Nunito_900Black',
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    letterSpacing: Typography.tracking.tight,
  },
  subtitle: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  // Error
  errorBox: {
    backgroundColor: Colors.dangerBg,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.danger,
    textAlign: 'center',
  },

  // Form
  form: {
    gap: Spacing.md,
  },
  input: {
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  btn: {
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Colors.green700,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.base,
    color: Colors.white,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing['2xl'],
  },
  footerText: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  footerLink: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.sm,
    color: Colors.green700,
  },

  // Verification sent screen
  verifyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  verifyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  verifyTitle: {
    fontFamily: 'Nunito_900Black',
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  verifySub: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: Typography.size.base * Typography.lineHeight.normal,
    marginBottom: Spacing.lg,
  },
  verifyEmail: {
    fontFamily: 'Nunito_700Bold',
    color: Colors.textPrimary,
  },
  verifyHint: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: Typography.size.sm * Typography.lineHeight.relaxed,
    marginBottom: Spacing['3xl'],
  },
  backToLogin: {
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Colors.green700,
    paddingHorizontal: Spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToLoginText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.base,
    color: Colors.white,
  },
});
