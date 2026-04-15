import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { usePin } from '../hooks/usePin';

interface Props {
  visible: boolean;
  /** 'setup' — parent creates PIN (2-phase: enter + confirm).
   *  'verify' — parent enters PIN to exit child mode. */
  mode: 'setup' | 'verify';
  onSuccess: () => void;
  /** Only provided in setup mode — lets parent abort */
  onCancel?: () => void;
}

// Row-major numpad: 1-9, then blank / 0 / ⌫
const NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'] as const;

export function PinModal({ visible, mode, onSuccess, onCancel }: Props) {
  const { savePin, verifyPin } = usePin();

  const [pin, setPin] = useState('');
  const [phase, setPhase] = useState<'enter' | 'confirm'>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const reset = useCallback(() => {
    setPin('');
    setPhase('enter');
    setFirstPin('');
    setError('');
  }, []);

  // Reset state whenever the modal is hidden
  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  const handlePress = async (key: string) => {
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
      setError('');
      return;
    }
    if (key === '' || pin.length >= 4) return;

    const next = pin + key;
    setPin(next);
    if (next.length < 4) return;

    // ── 4 digits entered ──────────────────────────────────
    if (mode === 'verify') {
      const ok = await verifyPin(next);
      if (ok) {
        setPin('');
        onSuccess();
      } else {
        shake();
        setError('Wrong PIN. Try again.');
        setPin('');
      }
    } else if (phase === 'enter') {
      setFirstPin(next);
      setPin('');
      setPhase('confirm');
    } else if (next === firstPin) {
      await savePin(next);
      setPin('');
      onSuccess();
    } else {
      shake();
      setError("PINs don't match. Try again.");
      setPin('');
      setPhase('enter');
      setFirstPin('');
    }
  };

  const title =
    mode === 'verify'
      ? 'Enter PIN to exit'
      : phase === 'enter'
      ? 'Create a PIN'
      : 'Confirm your PIN';

  const subtitle =
    mode === 'setup' && phase === 'enter'
      ? "You'll use this to exit child mode"
      : mode === 'setup' && phase === 'confirm'
      ? 'Enter the same PIN again'
      : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={mode === 'setup' ? onCancel : undefined}
    >
      <View style={styles.overlay}>
        {/* Backdrop — tappable only in setup mode */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={mode === 'setup' ? onCancel : undefined}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          {/* 4-dot PIN indicator */}
          <Animated.View
            style={[styles.dots, { transform: [{ translateX: shakeAnim }] }]}
          >
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
            ))}
          </Animated.View>

          {/* Error / spacer row */}
          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <View style={styles.errorSpacer} />
          )}

          {/* Numpad */}
          <View style={styles.numpad}>
            {[0, 1, 2, 3].map((row) => (
              <View key={row} style={styles.numRow}>
                {NUMPAD.slice(row * 3, row * 3 + 3).map((key, col) => {
                  const isEmpty = key === '';
                  return (
                    <TouchableOpacity
                      key={col}
                      style={[styles.numKey, isEmpty && styles.numKeyEmpty]}
                      onPress={isEmpty ? undefined : () => handlePress(key)}
                      activeOpacity={isEmpty ? 1 : 0.55}
                      disabled={isEmpty}
                    >
                      <Text style={key === '⌫' ? styles.deleteText : styles.numText}>
                        {key}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {mode === 'setup' && onCancel ? (
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing['3xl'],
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['4xl'],
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    marginBottom: Spacing['2xl'],
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginVertical: Spacing.xl,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.green500,
    backgroundColor: Colors.transparent,
  },
  dotFilled: {
    backgroundColor: Colors.green600,
    borderColor: Colors.green600,
  },
  error: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.danger,
    height: 20,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  errorSpacer: {
    height: 20,
    marginBottom: Spacing.md,
  },
  numpad: {
    width: '100%',
    gap: Spacing.sm,
  },
  numRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  numKey: {
    flex: 1,
    height: 60,
    borderRadius: Radius.lg,
    backgroundColor: Colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numKeyEmpty: {
    backgroundColor: Colors.transparent,
  },
  numText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
  },
  deleteText: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.xl,
    color: Colors.textSecondary,
  },
  cancelBtn: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  cancelText: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textMuted,
  },
});
