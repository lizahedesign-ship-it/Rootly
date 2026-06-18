import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  CategoryConfig,
} from '../theme';
import type { TaskCategory } from '../theme';
import { useChildStore } from '../store/childStore';
import { useCreateTask } from '../hooks/useCreateTask';

// ─── Emoji data ────────────────────────────────────────────────────────────────

interface EmojiItem {
  emoji: string;
  keywords: string[];
}

const EMOJI_LIST: EmojiItem[] = [
  { emoji: '📚', keywords: ['book', 'read', 'study', 'learning', 'school'] },
  { emoji: '📖', keywords: ['read', 'book', 'story', 'library'] },
  { emoji: '✏️', keywords: ['write', 'draw', 'pencil', 'school', 'homework'] },
  { emoji: '📝', keywords: ['write', 'note', 'list', 'journal', 'homework'] },
  { emoji: '🎨', keywords: ['art', 'draw', 'paint', 'creative', 'color'] },
  { emoji: '🎵', keywords: ['music', 'song', 'sing', 'practice'] },
  { emoji: '🎶', keywords: ['music', 'notes', 'song', 'practice', 'sing'] },
  { emoji: '🎸', keywords: ['guitar', 'music', 'instrument', 'practice'] },
  { emoji: '🎹', keywords: ['piano', 'music', 'instrument', 'keyboard', 'practice'] },
  { emoji: '🎭', keywords: ['drama', 'act', 'theatre', 'creative', 'play'] },
  { emoji: '🏃', keywords: ['run', 'exercise', 'sport', 'physical', 'walk', 'jog'] },
  { emoji: '🚴', keywords: ['bike', 'cycle', 'exercise', 'sport', 'ride'] },
  { emoji: '⚽', keywords: ['soccer', 'football', 'sport', 'ball', 'play', 'kick'] },
  { emoji: '🏊', keywords: ['swim', 'pool', 'water', 'sport', 'swimming'] },
  { emoji: '🤸', keywords: ['gymnastics', 'exercise', 'stretch', 'sport', 'flip'] },
  { emoji: '🧘', keywords: ['yoga', 'meditation', 'calm', 'relax', 'breathe', 'mindful'] },
  { emoji: '💪', keywords: ['strong', 'exercise', 'muscle', 'power', 'sport', 'workout'] },
  { emoji: '👟', keywords: ['shoes', 'walk', 'run', 'exercise', 'sport', 'active'] },
  { emoji: '🦷', keywords: ['teeth', 'brush', 'hygiene', 'clean', 'morning'] },
  { emoji: '🛁', keywords: ['bath', 'shower', 'clean', 'hygiene', 'wash'] },
  { emoji: '💤', keywords: ['sleep', 'rest', 'bed', 'nap', 'night'] },
  { emoji: '🌙', keywords: ['sleep', 'night', 'bed', 'rest', 'bedtime'] },
  { emoji: '☀️', keywords: ['morning', 'sunshine', 'wake', 'day', 'bright'] },
  { emoji: '❤️', keywords: ['love', 'heart', 'kindness', 'care', 'family'] },
  { emoji: '🤝', keywords: ['help', 'together', 'share', 'teamwork', 'friend', 'kind'] },
  { emoji: '🙏', keywords: ['grateful', 'thankful', 'pray', 'please', 'mindful'] },
  { emoji: '🌱', keywords: ['grow', 'plant', 'garden', 'nature', 'earth', 'sprout'] },
  { emoji: '🌿', keywords: ['plant', 'nature', 'green', 'garden', 'grow'] },
  { emoji: '🌸', keywords: ['flower', 'spring', 'bloom', 'pretty', 'blossom'] },
  { emoji: '🌻', keywords: ['sunflower', 'flower', 'happy', 'sunny', 'nature'] },
  { emoji: '🌈', keywords: ['rainbow', 'color', 'happy', 'bright', 'colorful'] },
  { emoji: '🦋', keywords: ['butterfly', 'grow', 'change', 'nature', 'beautiful'] },
  { emoji: '🐾', keywords: ['pet', 'animal', 'dog', 'cat', 'care', 'walk'] },
  { emoji: '🍎', keywords: ['apple', 'fruit', 'healthy', 'eat', 'food'] },
  { emoji: '🥦', keywords: ['vegetable', 'healthy', 'eat', 'food', 'green'] },
  { emoji: '🥕', keywords: ['carrot', 'vegetable', 'healthy', 'eat', 'food'] },
  { emoji: '💧', keywords: ['water', 'drink', 'hydrate', 'healthy', 'thirst'] },
  { emoji: '🧃', keywords: ['drink', 'juice', 'healthy', 'hydrate'] },
  { emoji: '🍳', keywords: ['cook', 'breakfast', 'kitchen', 'food', 'egg', 'chef'] },
  { emoji: '🥗', keywords: ['salad', 'healthy', 'vegetables', 'food', 'eat', 'greens'] },
  { emoji: '🧹', keywords: ['clean', 'sweep', 'tidy', 'chores', 'help', 'house'] },
  { emoji: '🛏️', keywords: ['bed', 'make', 'tidy', 'room', 'sleep', 'chores'] },
  { emoji: '🏠', keywords: ['home', 'house', 'family', 'chores', 'help', 'tidy'] },
  { emoji: '🎯', keywords: ['goal', 'focus', 'target', 'aim', 'practice', 'achieve'] },
  { emoji: '🏆', keywords: ['win', 'achievement', 'trophy', 'goal', 'best', 'champion'] },
  { emoji: '⭐', keywords: ['star', 'achievement', 'great', 'excellent', 'shine'] },
  { emoji: '🌟', keywords: ['star', 'shine', 'great', 'sparkle', 'excellent'] },
  { emoji: '🧠', keywords: ['think', 'learn', 'smart', 'brain', 'study', 'knowledge'] },
  { emoji: '🔬', keywords: ['science', 'explore', 'learn', 'experiment', 'discover'] },
  { emoji: '🧩', keywords: ['puzzle', 'think', 'game', 'problem', 'solve'] },
  { emoji: '🎲', keywords: ['game', 'play', 'fun', 'board', 'family'] },
  { emoji: '🎮', keywords: ['game', 'play', 'video', 'screen', 'limit'] },
  { emoji: '🎁', keywords: ['gift', 'give', 'kindness', 'share', 'generous'] },
  { emoji: '🤔', keywords: ['think', 'mindful', 'focus', 'reflect', 'learn', 'wonder'] },
];

// ─── Frequency config ──────────────────────────────────────────────────────────

type Frequency = 'daily' | 'weekdays' | 'weekends' | 'custom';

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'daily',    label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'custom',   label: 'Custom' },
];

const DAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 7 },
];

function humanFrequency(freq: Frequency, customDays: number[]): string {
  switch (freq) {
    case 'daily':    return 'every day';
    case 'weekdays': return 'on weekdays';
    case 'weekends': return 'on weekends';
    case 'custom': {
      const names = DAYS.filter((d) => customDays.includes(d.value)).map((d) => d.label);
      return names.length > 0 ? `on ${names.join(', ')}` : 'on custom days';
    }
  }
}

const CATEGORY_KEYS = Object.keys(CategoryConfig) as TaskCategory[];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TaskCreationScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const childProfiles = useChildStore((s) => s.childProfiles);
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const child = childProfiles.find((c) => c.id === selectedChildId);
  const { createTask, creating, taskCount } = useCreateTask(selectedChildId);

  const scrollRef = useRef<ScrollView>(null);

  // ── Step ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // ── Form fields ───────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<Frequency | null>(null);
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Emoji filtering ───────────────────────────────────────────────────────
  const filteredEmojis =
    searchQuery.trim() === ''
      ? EMOJI_LIST
      : EMOJI_LIST.filter(({ keywords }) =>
          keywords.some((kw) => kw.includes(searchQuery.toLowerCase().trim()))
        );

  // ── Emoji grid cell size (6 columns) ─────────────────────────────────────
  const EMOJI_COLS = 6;
  const emojiCellSize = Math.floor(
    (screenWidth - Spacing.xl * 2 - Spacing.sm * (EMOJI_COLS - 1)) / EMOJI_COLS
  );

  // ── Validation ────────────────────────────────────────────────────────────
  const step1Valid = name.trim().length > 0;
  const step2Valid = selectedEmoji !== '';
  const step3Valid =
    selectedCategory !== null &&
    selectedFrequency !== null &&
    (selectedFrequency !== 'custom' || customDays.length > 0);

  const nextDisabled =
    (step === 1 && !step1Valid) ||
    (step === 2 && !step2Valid) ||
    (step === 3 && !step3Valid) ||
    (step === 4 && creating);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function scrollToTop() {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function handleBack() {
    if (step === 1) {
      router.back();
    } else {
      setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
      scrollToTop();
    }
  }

  function handleNext() {
    if (step < 4) {
      setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
      scrollToTop();
    }
  }

  async function handleStart() {
    if (!selectedChildId || !selectedCategory || !selectedFrequency) return;
    setCreateError(null);
    const { error } = await createTask({
      childId: selectedChildId,
      name: name.trim(),
      icon: selectedEmoji,
      category: selectedCategory,
      frequency: selectedFrequency,
      customDays,
    });
    if (error) {
      setCreateError(error);
      return;
    }
    router.back();
  }

  function toggleCustomDay(day: number) {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  // ── Progress indicator ────────────────────────────────────────────────────
  const renderProgress = () => (
    <View style={styles.progressRow}>
      {([1, 2, 3, 4] as const).map((s) => (
        <View
          key={s}
          style={[
            styles.progressDot,
            step > s && styles.progressDotPast,
            step === s && styles.progressDotCurrent,
          ]}
        />
      ))}
    </View>
  );

  // ── Step 1: Name ──────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Name the habit</Text>
      <Text style={styles.stepSubtitle}>
        Decide together with {child?.name ?? 'your child'} what habit to build
      </Text>

      {taskCount >= 5 && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️  You already have {taskCount} active habits — that's a lot to keep up with!
            Consider if you're ready to add one more.
          </Text>
        </View>
      )}

      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Read for 10 minutes"
        placeholderTextColor={Colors.textMuted}
        returnKeyType="next"
        onSubmitEditing={() => step1Valid && handleNext()}
        maxLength={60}
        autoFocus
      />
      <Text style={styles.charHint}>{name.length} / 60</Text>
    </View>
  );

  // ── Step 2: Emoji ─────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Pick an emoji</Text>
      <Text style={styles.stepSubtitle}>
        Let {child?.name ?? 'your child'} choose their icon
      </Text>

      <View style={styles.emojiPreview}>
        {selectedEmoji ? (
          <Text style={styles.emojiPreviewText}>{selectedEmoji}</Text>
        ) : (
          <Text style={styles.emojiPreviewPlaceholder}>?</Text>
        )}
      </View>

      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search emojis…"
        placeholderTextColor={Colors.textMuted}
        clearButtonMode="while-editing"
        autoCorrect={false}
        autoCapitalize="none"
      />

      <View style={styles.emojiGrid}>
        {filteredEmojis.map(({ emoji }) => (
          <TouchableOpacity
            key={emoji}
            style={[
              styles.emojiCell,
              { width: emojiCellSize, height: emojiCellSize },
              selectedEmoji === emoji && styles.emojiCellSelected,
            ]}
            onPress={() => setSelectedEmoji(emoji)}
            activeOpacity={0.7}
          >
            <Text style={styles.emojiCellText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ── Step 3: Category + Frequency ──────────────────────────────────────────
  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Category & Frequency</Text>
      <Text style={styles.stepSubtitle}>
        Organise the habit and set the schedule
      </Text>

      <Text style={styles.sectionLabel}>Category</Text>
      <View style={styles.pillGrid}>
        {CATEGORY_KEYS.map((key) => {
          const cfg = CategoryConfig[key];
          const isSelected = selectedCategory === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.categoryPill,
                { backgroundColor: isSelected ? cfg.color : Colors.bgSecondary },
                isSelected && styles.categoryPillSelected,
              ]}
              onPress={() => setSelectedCategory(key)}
              activeOpacity={0.8}
            >
              <Text style={styles.categoryPillEmoji}>{cfg.emoji}</Text>
              <Text
                style={[
                  styles.categoryPillLabel,
                  isSelected && styles.categoryPillLabelSelected,
                ]}
              >
                {cfg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>How often?</Text>
      <View style={styles.freqRow}>
        {FREQUENCY_OPTIONS.map(({ value, label }) => {
          const isSelected = selectedFrequency === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.freqPill, isSelected && styles.freqPillSelected]}
              onPress={() => {
                setSelectedFrequency(value);
                if (value !== 'custom') setCustomDays([]);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.freqPillText,
                  isSelected && styles.freqPillTextSelected,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedFrequency === 'custom' && (
        <View style={styles.customDaysSection}>
          <Text style={styles.customDaysLabel}>Pick the days</Text>
          <View style={styles.dayRow}>
            {DAYS.map(({ label, value }) => {
              const isSelected = customDays.includes(value);
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.dayPill, isSelected && styles.dayPillSelected]}
                  onPress={() => toggleCustomDay(value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dayPillText,
                      isSelected && styles.dayPillTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );

  // ── Step 4: Commitment card ───────────────────────────────────────────────
  const renderStep4 = () => {
    const freqText = selectedFrequency
      ? humanFrequency(selectedFrequency, customDays)
      : '';
    const catConfig = selectedCategory ? CategoryConfig[selectedCategory] : null;

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Ready to start?</Text>
        <Text style={styles.stepSubtitle}>
          {child?.name ?? 'Your child'} taps "Start!" to make it official
        </Text>

        <View style={styles.commitCard}>
          <Text style={styles.commitEmoji}>{selectedEmoji}</Text>
          <Text style={styles.commitName}>{name.trim()}</Text>

          {catConfig && (
            <View style={styles.commitMetaRow}>
              <View style={[styles.commitTag, { backgroundColor: catConfig.color }]}>
                <Text style={styles.commitTagText}>
                  {catConfig.emoji}  {catConfig.label}
                </Text>
              </View>
              <Text style={styles.commitFreqText}>{freqText}</Text>
            </View>
          )}

          <View style={styles.commitDivider} />

          <Text style={styles.commitPledge}>
            I will do this {freqText}! 🌱
          </Text>
        </View>

        {createError !== null && (
          <Text style={styles.errorText}>{createError}</Text>
        )}
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={20} color={Colors.green700} />
          </TouchableOpacity>

          {renderProgress()}

          {/* Spacer to balance back button */}
          <View style={styles.backBtn} />
        </View>

        {/* ── Scrollable step content ── */}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </ScrollView>

        {/* ── Bottom action button ── */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.nextBtn, nextDisabled && styles.nextBtnDisabled]}
            onPress={step === 4 ? handleStart : handleNext}
            disabled={nextDisabled}
            activeOpacity={0.85}
          >
            {creating ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={[styles.nextBtnText, nextDisabled && styles.nextBtnTextDisabled]}>
                {step === 4 ? 'Start! 🚀' : 'Next →'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  flex: {
    flex: 1,
  },

  // ── Top bar ────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    minWidth: 60,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgTertiary,
  },
  progressDotPast: {
    backgroundColor: Colors.green300,
  },
  progressDotCurrent: {
    width: 24,
    backgroundColor: Colors.green700,
  },

  // ── Scroll ─────────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['3xl'],
  },

  // ── Step content ───────────────────────────────────────────────────────────
  stepContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  stepTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  stepSubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    lineHeight: Typography.size.base * 1.5,
    marginBottom: Spacing['2xl'],
  },

  // ── Warning banner ─────────────────────────────────────────────────────────
  warningBanner: {
    backgroundColor: Colors.warningBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.warning,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  warningText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size.sm,
    color: '#854F0B',
    lineHeight: Typography.size.sm * 1.5,
  },

  // ── Step 1: Name input ─────────────────────────────────────────────────────
  nameInput: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    lineHeight: Typography.size.xl * 1.4,
  },
  charHint: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },

  // ── Step 2: Emoji picker ───────────────────────────────────────────────────
  emojiPreview: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: Radius.xl,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 2,
    borderColor: Colors.green200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emojiPreviewText: {
    fontSize: 52,
  },
  emojiPreviewPlaceholder: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size['2xl'],
    color: Colors.textMuted,
  },
  searchInput: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  emojiCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.bgSecondary,
  },
  emojiCellSelected: {
    backgroundColor: Colors.green100,
    borderWidth: 2,
    borderColor: Colors.green500,
  },
  emojiCellText: {
    fontSize: 26,
  },

  // ── Step 3: Category ──────────────────────────────────────────────────────
  sectionLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  sectionLabelSpaced: {
    marginTop: Spacing['2xl'],
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    gap: Spacing.xs,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  categoryPillSelected: {
    borderColor: Colors.green500,
  },
  categoryPillEmoji: {
    fontSize: Typography.size.base,
  },
  categoryPillLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  categoryPillLabelSelected: {
    color: Colors.textPrimary,
  },

  // ── Step 3: Frequency ─────────────────────────────────────────────────────
  freqRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  freqPill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  freqPillSelected: {
    backgroundColor: Colors.green700,
    borderColor: Colors.green700,
  },
  freqPillText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  freqPillTextSelected: {
    color: Colors.white,
  },

  // ── Step 3: Custom days ───────────────────────────────────────────────────
  customDaysSection: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.lg,
  },
  customDaysLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  dayRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  dayPill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  dayPillSelected: {
    backgroundColor: Colors.green500,
    borderColor: Colors.green500,
  },
  dayPillText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.xs,
    color: Colors.textPrimary,
  },
  dayPillTextSelected: {
    color: Colors.white,
  },

  // ── Step 4: Commitment card ────────────────────────────────────────────────
  commitCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: Colors.green200,
    padding: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.md,
  },
  commitEmoji: {
    fontSize: 72,
  },
  commitName: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  commitMetaRow: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  commitTag: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
  },
  commitTagText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  commitFreqText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  commitDivider: {
    width: '60%',
    height: 1,
    backgroundColor: Colors.border,
  },
  commitPledge: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.md,
    color: Colors.green600,
    textAlign: 'center',
  },

  // ── Error ──────────────────────────────────────────────────────────────────
  errorText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.danger,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },

  // ── Bottom bar ─────────────────────────────────────────────────────────────
  bottomBar: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  nextBtn: {
    backgroundColor: Colors.green700,
    borderRadius: Radius.full,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    backgroundColor: Colors.green200,
  },
  nextBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size.md,
    color: Colors.white,
  },
  nextBtnTextDisabled: {
    color: Colors.green600,
  },
});
