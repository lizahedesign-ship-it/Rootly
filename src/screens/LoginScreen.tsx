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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail, isLoading, error, clearError, isLoggedIn } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Navigate to parent home once session is established
  useEffect(() => {
    if (isLoggedIn) router.replace('/(parent)/home');
  }, [isLoggedIn]);

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password.trim()) return;
    clearError();
    await signInWithEmail(email.trim().toLowerCase(), password);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Please enter your email address first.');
      return;
    }
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    Alert.alert('Check your email for a password reset link.');
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
            <Text style={styles.appName}>Rootzy</Text>
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
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputInner}
                placeholder="Password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleEmailSignIn}
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
            <TouchableOpacity
              style={styles.forgotPasswordBtn}
              onPress={handleForgotPassword}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
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
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size['3xl'],
    color: Colors.green700,
    letterSpacing: Typography.tracking.tight,
  },
  tagline: {
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
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.sm,
  },
  forgotPasswordText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },

  // Buttons
  btn: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimary: {
    backgroundColor: Colors.green700,
  },
  btnLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.base,
  },
  btnLabelPrimary: {
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
});
