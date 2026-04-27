import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const COLORS = [
  '#52B788', '#74C69D', '#EF9F27', '#D85A30',
  '#40916C', '#B7E4C7', '#FFF8E7', '#FAC775',
];
const PARTICLE_COUNT = 16;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

interface Particle {
  tx: Animated.Value;
  ty: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
  dx: number;
  dy: number;
}

interface Props {
  origin: { x: number; y: number };
  onDone: () => void;
}

export function ConfettiOverlay({ origin, onDone }: Props) {
  // Lazy-init particles once — random values stable for lifetime of component
  const particlesRef = useRef<Particle[] | null>(null);
  if (particlesRef.current === null) {
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * 2 * Math.PI + rand(-0.3, 0.3);
      const distance = rand(60, 130);
      return {
        tx: new Animated.Value(0),
        ty: new Animated.Value(0),
        opacity: new Animated.Value(1),
        scale: new Animated.Value(1),
        color: COLORS[i % COLORS.length],
        size: rand(7, 13),
        dx: Math.cos(angle) * distance,
        // slight upward bias so particles arc nicely
        dy: Math.sin(angle) * distance - rand(20, 50),
      };
    });
  }
  const particles = particlesRef.current;

  useEffect(() => {
    const animations = particles.map((p) =>
      Animated.parallel([
        Animated.timing(p.tx, { toValue: p.dx, duration: 1200, useNativeDriver: true }),
        Animated.timing(p.ty, { toValue: p.dy, duration: 1200, useNativeDriver: true }),
        Animated.timing(p.opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
        Animated.timing(p.scale, { toValue: 0.2, duration: 1200, useNativeDriver: true }),
      ])
    );
    Animated.parallel(animations).start(({ finished }) => {
      if (finished) onDone();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: origin.x - p.size / 2,
            top: origin.y - p.size / 2,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: p.color,
            opacity: p.opacity,
            transform: [
              { translateX: p.tx },
              { translateY: p.ty },
              { scale: p.scale },
            ],
          }}
        />
      ))}
    </View>
  );
}
