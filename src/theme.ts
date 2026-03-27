// reference/theme.ts
// Single source of truth for all visual constants.
// AI must reference this file when writing any component.
// Never hardcode colors, spacing, or font sizes in component files.

export const Colors = {
  // Primary greens — main brand palette
  green900: '#081C15',
  green800: '#1B4332',
  green700: '#2D6A4F',
  green600: '#40916C',
  green500: '#52B788',
  green400: '#74C69D',
  green300: '#95D5B2',
  green200: '#B7E4C7',
  green100: '#D8F3DC',
  green50:  '#EAF3DE',

  // Backgrounds
  bgPrimary:   '#F5FBF6',   // main app background (very light green-white)
  bgSecondary: '#EAF3DE',   // card / surface background
  bgTertiary:  '#D8F3DC',   // subtle accent background

  // Semantic
  success:  '#2D6A4F',
  warning:  '#EF9F27',
  warningBg:'#FFF8E7',
  danger:   '#D85A30',
  dangerBg: '#FAECE7',

  // Text
  textPrimary:   '#1A2E1F',  // near-black with green tint
  textSecondary: '#40916C',  // medium green
  textMuted:     '#74C69D',  // light green, for hints
  textOnDark:    '#FFFFFF',

  // Borders
  border:        'rgba(45, 106, 79, 0.12)',
  borderMedium:  'rgba(45, 106, 79, 0.22)',
  borderStrong:  'rgba(45, 106, 79, 0.40)',

  // Special
  childModeBorder: '#52B788',  // teal-green, marks child UI frame
  parentModeBorder:'#2D6A4F',  // dark green, marks parent UI frame
  black: '#000000',
  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

// Habit stage colors
export const StageColors = {
  sprouting: {
    bg:    '#F1EFE8',
    text:  '#5F5E5A',
    emoji: '🌱',
    label: 'Sprouting',
  },
  growing: {
    bg:    '#FFF8E7',   // yellow tint = needs attention
    text:  '#854F0B',
    emoji: '🌿',
    label: 'Growing',
  },
  rooted: {
    bg:    '#EAF3DE',
    text:  '#1B4332',
    emoji: '🌳',
    label: 'Rooted',
  },
  blooming: {
    bg:    '#B7E4C7',
    text:  '#081C15',
    emoji: '🌸',
    label: 'Blooming',
  },
  graduated: {
    bg:    '#F1EFE8',
    text:  '#888780',
    emoji: '🎓',
    label: 'Graduated',
  },
} as const;

export type HabitStage = keyof typeof StageColors;

// Task categories
export const CategoryConfig = {
  learning:  { emoji: '🧠', label: 'Learning',       color: '#B5D4F4' },
  physical:  { emoji: '🏃', label: 'Physical',       color: '#B7E4C7' },
  family:    { emoji: '🏠', label: 'Family',         color: '#F5C4B3' },
  interests: { emoji: '🎨', label: 'Interests',      color: '#F4C0D1' },
  character: { emoji: '💛', label: 'Character',      color: '#FAC775' },
  growth:    { emoji: '🌱', label: 'Personal Growth', color: '#C0DD97' },
} as const;

export type TaskCategory = keyof typeof CategoryConfig;

export const Typography = {
  // Font family — must be loaded via expo-font before use
  fontFamily: 'Nunito',

  // Font sizes
  size: {
    xs:   11,
    sm:   13,
    base: 15,
    md:   17,
    lg:   20,
    xl:   24,
    '2xl':28,
    '3xl':34,
    '4xl':42,
  },

  // Font weights (Nunito available: 500, 600, 700, 800, 900)
  weight: {
    medium:    '500' as const,
    semibold:  '600' as const,
    bold:      '700' as const,
    extrabold: '800' as const,
    black:     '900' as const,
  },

  // Line heights
  lineHeight: {
    tight:  1.15,
    normal: 1.5,
    relaxed:1.7,
  },

  // Letter spacing
  tracking: {
    tight:  -0.8,
    normal:  0,
    wide:    0.5,
    wider:   1.0,
  },
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
} as const;

export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 9999,   // pills and circles
} as const;

export const Shadow = {
  // Use sparingly — prefer flat design
  sm: {
    shadowColor: Colors.green700,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.green700,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  checkmark: {
    // Used on completed task circles
    shadowColor: Colors.green700,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

export const Animation = {
  // Durations in ms
  duration: {
    fast:    150,
    normal:  300,
    slow:    500,
    confetti:1200,
    longPress: 650,   // long-press to uncheck duration
  },

  // Spring configs for React Native Animated / Reanimated
  spring: {
    bouncy: {
      damping: 10,
      stiffness: 180,
    },
    snappy: {
      damping: 15,
      stiffness: 220,
    },
  },
} as const;

// Layout constants
export const Layout = {
  // iOS safe areas (approximate — use react-native-safe-area-context for real values)
  statusBarHeight: 44,
  bottomTabHeight: 83,

  // Child mode specific
  childTaskRowHeight: 56,     // minimum touch target for 5-year-old fingers
  childCircleSize: 44,        // checkmark circle diameter

  // Parent mode
  habitCardMinHeight: 64,
  phoneWidth: 375,            // design reference width
} as const;
