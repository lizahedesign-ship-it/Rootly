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

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail, signInWithApple, signInWithGoogle, isLoading, error, clearError, isLoggedIn } =
    useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Navigate to parent home once session is established
  useEffect(() => {
    if (isLoggedIn) router.replace('/(parent)/home');
  }, [isLoggedIn]);

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password.trim()) return;
    clearError();
    await signInWithEmail(email.trim().toLowerCase(), password);
  };

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
          {/* ── Logo ── */}
          <View style={styles.logoSection}>
            <Text style={styles.logoEmoji}>🌱</Text>
            <Text style={styles.appName}>Rootly</Text>
            <Text style={styles.tagline}>Build habits that last</Text>
          </View>

          {/* ── Error ── */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ── Email / Password form ── */}
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
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleEmailSignIn}
            />
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, isLoading && styles.btnDisabled]}
              onPress={handleEmailSignIn}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={[styles.btnLabel, styles.btnLabelPrimary]}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Divider ── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Social buttons ── */}
          <View style={styles.social}>
            <TouchableOpacity
              style={[styles.btn, styles.btnApple]}
              onPress={signInWithApple}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnLabel, styles.btnLabelApple]}>Continue with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnGoogle]}
              onPress={signInWithGoogle}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnLabel, styles.btnLabelGoogle]}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => { clearError(); router.push('/(auth)/signup'); }}>
              <Text style={styles.footerLink}>Sign Up</Text>
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

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  logoEmoji: {
    fontSize: 56,
    marginBottom: Spacing.sm,
  },
  appName: {
    fontFamily: 'Nunito_900Black',
    fontSize: Typography.size['3xl'],
    color: Colors.green700,
    letterSpacing: Typography.tracking.tight,
  },
  tagline: {
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

  // Buttons
  btn: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimary: {
    backgroundColor: Colors.green700,
  },
  btnApple: {
    backgroundColor: Colors.black,
  },
  btnGoogle: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.borderMedium,
  },
  btnLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.base,
  },
  btnLabelPrimary: {
    color: Colors.white,
  },
  btnLabelApple: {
    color: Colors.white,
  },
  btnLabelGoogle: {
    color: Colors.textPrimary,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginHorizontal: Spacing.md,
  },

  // Social
  social: {
    gap: Spacing.md,
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
});
