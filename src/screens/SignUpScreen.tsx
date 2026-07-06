import { useState, useEffect } from 'react';
import {
  Alert,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { useAuthStore } from '../store/authStore';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUpWithEmail, clearError, isLoggedIn } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email verification pending state
  const [verificationSent, setVerificationSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  // Navigate to parent home if signup didn't require verification
  useEffect(() => {
    if (isLoggedIn) router.replace('/(parent)/home');
  }, [isLoggedIn]);

  const handleSignUp = async () => {
    setLocalError(null);
    setEmailTaken(false);
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

    if (result.errorMessage) {
      Alert.alert('Sign up failed', result.errorMessage);
      return;
    }
    if (result.emailExists) {
      setEmailTaken(true);
      return;
    }
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
              <Feather name="arrow-left" size={20} color={Colors.green700} />
            </TouchableOpacity>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Start building better habits together</Text>
          </View>

          {/* ── Error ── */}
          {localError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{localError}</Text>
            </View>
          ) : null}

          {/* ── Form ── */}
          <View style={styles.form}>
            <View>
              <TextInput
                style={[styles.input, emailTaken && styles.inputError]}
                placeholder="Email"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={(v) => { setEmail(v); setEmailTaken(false); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
              />
              {emailTaken ? (
                <View style={styles.fieldErrorRow}>
                  <Text style={styles.fieldErrorText}>Already registered. </Text>
                  <TouchableOpacity onPress={() => { clearError(); router.replace('/(auth)/login'); }}>
                    <Text style={styles.fieldErrorLink}>Sign in instead</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputInner}
                placeholder="Password (min. 6 characters)"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                activeOpacity={0.7}
              >
                <Feather
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputInner}
                placeholder="Confirm password"
                placeholderTextColor={Colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirmPassword((v) => !v)}
                activeOpacity={0.7}
              >
                <Feather
                  name={showConfirmPassword ? 'eye' : 'eye-off'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.btn}
              onPress={handleSignUp}
              activeOpacity={0.85}
            >
              <Text style={styles.btnLabel}>Create Account</Text>
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
  title: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    letterSpacing: Typography.tracking.tight,
  },
  subtitle: {
    fontFamily: 'Outfit_500Medium',
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
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.danger,
    textAlign: 'center',
  },


  // Form
  form: {
    gap: Spacing.md,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  fieldErrorText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.danger,
  },
  fieldErrorLink: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.danger,
    textDecorationLine: 'underline',
  },
  input: {
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 0,
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    textAlignVertical: 'center',
  },
  // Password field with eye toggle
  inputRow: {
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  inputInner: {
    flex: 1,
    height: 52,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 0,
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    textAlignVertical: 'center',
  },
  eyeBtn: {
    width: 44,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: 'Outfit_500Medium',
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
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  footerLink: {
    fontFamily: 'Outfit_500Medium',
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
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  verifySub: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: Typography.size.base * Typography.lineHeight.normal,
    marginBottom: Spacing.lg,
  },
  verifyEmail: {
    fontFamily: 'Outfit_500Medium',
    color: Colors.textPrimary,
  },
  verifyHint: {
    fontFamily: 'Outfit_500Medium',
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
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.base,
    color: Colors.white,
  },
});
