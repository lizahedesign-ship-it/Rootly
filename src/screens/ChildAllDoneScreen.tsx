import { useState, useEffect, useRef } from 'react';
import {
  View, Text, Animated, StyleSheet, TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { useChildStore } from '../store/childStore';
import { PinModal } from '../components/PinModal';
import { ConfettiOverlay } from '../components/ConfettiOverlay';
import { useMilestoneCheck } from '../hooks/useMilestoneCheck';

// ── Milestone burst particles ──────────────────────────────────────────────

const BURST_COLORS = [
  '#FFD700', '#FFFFFF', '#52B788', '#95D5B2',
  '#EF9F27', '#FAC775', '#D8F3DC', '#74C69D',
  '#FFF8E7', '#B7E4C7', '#FFD700', '#FFFFFF',
];

interface BurstParticle {
  tx: Animated.Value;
  ty: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
  dx: number;
  dy: number;
}

function makeBurstParticles(count: number): BurstParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.5;
    const dist  = 90 + Math.random() * 170;
    return {
      tx:      new Animated.Value(0),
      ty:      new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale:   new Animated.Value(1),
      color:   BURST_COLORS[i % BURST_COLORS.length],
      size:    9 + Math.random() * 11,
      dx:      Math.cos(angle) * dist,
      dy:      Math.sin(angle) * dist - 30 - Math.random() * 60,
    };
  });
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function ChildAllDoneScreen() {
  const router          = useRouter();
  const { width, height } = useWindowDimensions();
  const childProfiles   = useChildStore((s) => s.childProfiles);
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const setIsChildMode  = useChildStore((s) => s.setIsChildMode);

  const child     = childProfiles.find((c) => c.id === selectedChildId);
  const childName = child?.name ?? 'there';

  const { isMilestone, checking } = useMilestoneCheck(selectedChildId);

  // PIN modal
  const [showPin, setShowPin] = useState(false);

  // Confetti (standard version only — milestone version uses burst particles)
  const [showConfetti, setShowConfetti] = useState(false);

  // Shared animated values for the central star
  const starScale   = useRef(new Animated.Value(0)).current;
  const starOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Milestone burst — created once, stable for component lifetime
  const burstRef = useRef<BurstParticle[] | null>(null);
  if (burstRef.current === null) burstRef.current = makeBurstParticles(32);
  const burst = burstRef.current;

  // ── Start animation once DB check resolves ──
  useEffect(() => {
    if (checking) return;

    if (isMilestone) {
      // Milestone: star pops in, then particles burst outward (larger, longer)
      Animated.parallel([
        Animated.spring(starScale, {
          toValue:   1,
          damping:   7,
          stiffness: 150,
          useNativeDriver: true,
        }),
        Animated.timing(starOpacity, {
          toValue:  1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.parallel(
          burst.map((p) =>
            Animated.parallel([
              Animated.timing(p.tx,      { toValue: p.dx, duration: 1800, useNativeDriver: true }),
              Animated.timing(p.ty,      { toValue: p.dy, duration: 1800, useNativeDriver: true }),
              Animated.timing(p.opacity, { toValue: 0,    duration: 1800, useNativeDriver: true }),
              Animated.timing(p.scale,   { toValue: 0.1,  duration: 1800, useNativeDriver: true }),
            ])
          )
        ).start();
      });
      Animated.timing(textOpacity, {
        toValue:  1,
        duration: 500,
        delay:    350,
        useNativeDriver: true,
      }).start();
    } else {
      // Standard: bounce + confetti
      Animated.sequence([
        Animated.parallel([
          Animated.spring(starScale, {
            toValue:   1.18,
            damping:   10,
            stiffness: 180,
            useNativeDriver: true,
          }),
          Animated.timing(starOpacity, {
            toValue:  1,
            duration: 280,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(starScale, {
          toValue:   1,
          damping:   12,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
      Animated.timing(textOpacity, {
        toValue:  1,
        duration: 400,
        delay:    320,
        useNativeDriver: true,
      }).start();
      setShowConfetti(true);
    }
  }, [checking, isMilestone]);

  // ── Navigation ──
  function handleBackToTasks() {
    router.back();
  }

  function handleExitSuccess() {
    setShowPin(false);
    setIsChildMode(false);
    router.replace('/(parent)/home');
  }

  // ── Dynamic styling ──
  const isMilestoneReady = !checking && isMilestone;
  // Standard: medium green (celebratory). Milestone: deep green (dramatic).
  const bg       = isMilestoneReady ? Colors.green800 : Colors.green500;
  const starSize = isMilestoneReady ? 96 : 72;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* ── Center content ── */}
      <View style={styles.center}>
        {/* Star + burst origin point */}
        <View style={styles.starWrap}>
          {/* Milestone burst particles (rendered behind star) */}
          {isMilestoneReady &&
            burst.map((p, i) => (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={{
                  position:        'absolute',
                  left:            -p.size / 2,
                  top:             -p.size / 2,
                  width:           p.size,
                  height:          p.size,
                  borderRadius:    p.size / 2,
                  backgroundColor: p.color,
                  opacity:         p.opacity,
                  transform: [
                    { translateX: p.tx },
                    { translateY: p.ty },
                    { scale:      p.scale },
                  ],
                }}
              />
            ))}

          {/* Star emoji */}
          <Animated.Text
            style={[
              styles.star,
              {
                fontSize:  starSize,
                opacity:   starOpacity,
                transform: [{ scale: starScale }],
              },
            ]}
          >
            ⭐
          </Animated.Text>
        </View>

        {/* "Great job today, [name]!" — no numbers shown to child */}
        <Animated.Text style={[styles.headline, { opacity: textOpacity }]}>
          Great job today, {childName}!
        </Animated.Text>
      </View>

      {/* Confetti burst (standard version only) */}
      {showConfetti && (
        <ConfettiOverlay
          origin={{ x: width / 2, y: height / 3 }}
          onDone={() => setShowConfetti(false)}
        />
      )}

      {/* ── "Back to tasks" — subtle button for child ── */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={handleBackToTasks}
        activeOpacity={0.7}
      >
        <Text style={styles.backText}>Back to my tasks</Text>
      </TouchableOpacity>

      {/* ── "Parent exit · PIN" — very subtle, fixed at bottom ── */}
      <TouchableOpacity
        style={styles.exitBtn}
        onPress={() => setShowPin(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.exitText}>Parent exit · PIN</Text>
      </TouchableOpacity>

      <PinModal
        visible={showPin}
        mode="verify"
        onSuccess={handleExitSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderWidth: 3,
    borderColor: Colors.childModeBorder,
  },

  // Center section
  center: {
    flex: 1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
  },
  starWrap: {
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   Spacing['3xl'],
    overflow:       'visible',
  },
  star: {
    // fontSize, opacity, transform applied inline
  },
  headline: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize:   Typography.size['3xl'],
    color:      Colors.white,
    textAlign:  'center',
    lineHeight: Typography.size['3xl'] * 1.15,
  },

  // "Back to tasks" — subtle rounded button, visible enough for child
  backBtn: {
    marginHorizontal: Spacing.xl,
    marginBottom:     Spacing.md,
    paddingVertical:  Spacing.md,
    borderRadius:     Radius.full,
    borderWidth:      1.5,
    borderColor:      'rgba(255,255,255,0.4)',
    alignItems:       'center',
    backgroundColor:  'rgba(255,255,255,0.12)',
  },
  backText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize:   Typography.size.base,
    color:      Colors.white,
  },

  // "Parent exit · PIN" — text-only, low opacity (very subtle)
  exitBtn: {
    marginHorizontal: Spacing.xl,
    marginBottom:     Spacing.xl,
    paddingVertical:  Spacing.sm,
    alignItems:       'center',
  },
  exitText: {
    fontFamily: 'Nunito_500Medium',
    fontSize:   Typography.size.sm,
    color:      'rgba(255,255,255,0.45)',
  },
});
