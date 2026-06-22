import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, CategoryConfig } from '../theme';
import type { TaskCategory } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = TaskCategory | 'all';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface EmojiItem {
  emoji: string;
  category: TaskCategory;
  keywords: string[];
}

const EMOJI_DATA: EmojiItem[] = [
  // ── Learning (17) ─────────────────────────────────────────────────────────
  { emoji: '📚', category: 'learning',  keywords: ['book', 'read', 'study', 'library'] },
  { emoji: '📖', category: 'learning',  keywords: ['read', 'book', 'story', 'open'] },
  { emoji: '✏️', category: 'learning',  keywords: ['write', 'pencil', 'draw', 'homework', 'school'] },
  { emoji: '📝', category: 'learning',  keywords: ['write', 'note', 'list', 'journal', 'homework'] },
  { emoji: '🎓', category: 'learning',  keywords: ['school', 'study', 'graduate', 'education'] },
  { emoji: '💻', category: 'learning',  keywords: ['computer', 'laptop', 'coding', 'tech'] },
  { emoji: '🔬', category: 'learning',  keywords: ['science', 'microscope', 'experiment', 'lab'] },
  { emoji: '🧪', category: 'learning',  keywords: ['experiment', 'lab', 'chemistry', 'science'] },
  { emoji: '🔭', category: 'learning',  keywords: ['astronomy', 'space', 'telescope', 'explore'] },
  { emoji: '🧮', category: 'learning',  keywords: ['math', 'abacus', 'count', 'calculate'] },
  { emoji: '📐', category: 'learning',  keywords: ['math', 'geometry', 'ruler', 'measure'] },
  { emoji: '🧩', category: 'learning',  keywords: ['puzzle', 'think', 'problem', 'solve'] },
  { emoji: '🌍', category: 'learning',  keywords: ['geography', 'world', 'globe', 'earth', 'map'] },
  { emoji: '🗣️', category: 'learning',  keywords: ['speak', 'language', 'talk', 'present', 'communication'] },
  { emoji: '📊', category: 'learning',  keywords: ['chart', 'data', 'math', 'graph', 'statistics'] },
  { emoji: '🤔', category: 'learning',  keywords: ['think', 'wonder', 'reflect', 'learn', 'mindful'] },
  { emoji: '🖊️', category: 'learning',  keywords: ['write', 'pen', 'journal', 'notes'] },

  // ── Physical (17) ─────────────────────────────────────────────────────────
  { emoji: '🏃', category: 'physical',  keywords: ['run', 'exercise', 'sport', 'walk', 'jog', 'fitness'] },
  { emoji: '🚴', category: 'physical',  keywords: ['bike', 'cycle', 'ride', 'exercise', 'sport'] },
  { emoji: '💪', category: 'physical',  keywords: ['strong', 'exercise', 'muscle', 'workout', 'fitness'] },
  { emoji: '⚽', category: 'physical',  keywords: ['soccer', 'football', 'sport', 'ball', 'kick'] },
  { emoji: '🏊', category: 'physical',  keywords: ['swim', 'pool', 'water', 'sport', 'swimming'] },
  { emoji: '🤸', category: 'physical',  keywords: ['gymnastics', 'stretch', 'flip', 'sport', 'exercise'] },
  { emoji: '🧘', category: 'physical',  keywords: ['yoga', 'calm', 'breathe', 'stretch', 'relax', 'mindful'] },
  { emoji: '🛁', category: 'physical',  keywords: ['bath', 'clean', 'hygiene', 'wash'] },
  { emoji: '🚿', category: 'physical',  keywords: ['shower', 'clean', 'hygiene', 'wash'] },
  { emoji: '⛹️', category: 'physical',  keywords: ['basketball', 'sport', 'ball', 'play'] },
  { emoji: '🎾', category: 'physical',  keywords: ['tennis', 'sport', 'ball', 'racket'] },
  { emoji: '🏓', category: 'physical',  keywords: ['ping pong', 'table tennis', 'sport', 'ball'] },
  { emoji: '🧗', category: 'physical',  keywords: ['climb', 'rock climbing', 'sport', 'exercise'] },
  { emoji: '🏋️', category: 'physical',  keywords: ['weights', 'lift', 'gym', 'exercise', 'strong'] },
  { emoji: '🏅', category: 'physical',  keywords: ['medal', 'fitness', 'goal', 'sport', 'achievement'] },
  { emoji: '⚾', category: 'physical',  keywords: ['baseball', 'sport', 'ball', 'pitch'] },
  { emoji: '🥊', category: 'physical',  keywords: ['boxing', 'sport', 'punch', 'exercise'] },

  // ── Family (17) ───────────────────────────────────────────────────────────
  { emoji: '🏠', category: 'family',    keywords: ['home', 'house', 'family', 'chores'] },
  { emoji: '🍳', category: 'family',    keywords: ['cook', 'breakfast', 'kitchen', 'food', 'egg'] },
  { emoji: '🧹', category: 'family',    keywords: ['clean', 'sweep', 'tidy', 'chores', 'help'] },
  { emoji: '🛏️', category: 'family',    keywords: ['bed', 'make', 'tidy', 'room', 'chores', 'sleep'] },
  { emoji: '🧺', category: 'family',    keywords: ['laundry', 'wash', 'clothes', 'chores'] },
  { emoji: '🍽️', category: 'family',    keywords: ['dishes', 'wash', 'clean', 'kitchen', 'chores'] },
  { emoji: '🤝', category: 'family',    keywords: ['help', 'together', 'teamwork', 'chores', 'family'] },
  { emoji: '❤️', category: 'family',    keywords: ['love', 'family', 'care', 'heart', 'together'] },
  { emoji: '🐾', category: 'family',    keywords: ['pet', 'dog', 'cat', 'animal', 'care', 'walk'] },
  { emoji: '🌻', category: 'family',    keywords: ['garden', 'flower', 'nature', 'plant', 'outside'] },
  { emoji: '🛒', category: 'family',    keywords: ['shopping', 'grocery', 'errands', 'store', 'help'] },
  { emoji: '📦', category: 'family',    keywords: ['organize', 'pack', 'tidy', 'box', 'clean'] },
  { emoji: '🗑️', category: 'family',    keywords: ['trash', 'garbage', 'clean', 'tidy', 'chores'] },
  { emoji: '🎂', category: 'family',    keywords: ['birthday', 'celebrate', 'family', 'cake', 'party'] },
  { emoji: '🧴', category: 'family',    keywords: ['clean', 'soap', 'hygiene', 'wash', 'chores'] },
  { emoji: '🦷', category: 'family',    keywords: ['teeth', 'brush', 'hygiene', 'clean', 'morning'] },
  { emoji: '🧦', category: 'family',    keywords: ['socks', 'clothes', 'tidy', 'laundry', 'put away'] },

  // ── Interests (18) ────────────────────────────────────────────────────────
  { emoji: '🎨', category: 'interests', keywords: ['art', 'draw', 'paint', 'creative', 'color'] },
  { emoji: '🖌️', category: 'interests', keywords: ['paint', 'brush', 'art', 'creative'] },
  { emoji: '✂️', category: 'interests', keywords: ['craft', 'cut', 'create', 'scissors', 'make'] },
  { emoji: '🎵', category: 'interests', keywords: ['music', 'song', 'sing', 'practice', 'listen'] },
  { emoji: '🎸', category: 'interests', keywords: ['guitar', 'music', 'instrument', 'band', 'practice'] },
  { emoji: '🎹', category: 'interests', keywords: ['piano', 'keyboard', 'music', 'instrument', 'practice'] },
  { emoji: '🥁', category: 'interests', keywords: ['drums', 'music', 'instrument', 'beat', 'practice'] },
  { emoji: '🎻', category: 'interests', keywords: ['violin', 'music', 'instrument', 'strings', 'practice'] },
  { emoji: '🎺', category: 'interests', keywords: ['trumpet', 'music', 'instrument', 'brass', 'practice'] },
  { emoji: '📷', category: 'interests', keywords: ['photo', 'camera', 'picture', 'capture', 'creative'] },
  { emoji: '🎭', category: 'interests', keywords: ['drama', 'theater', 'act', 'perform', 'play'] },
  { emoji: '🎮', category: 'interests', keywords: ['game', 'video game', 'play', 'controller', 'fun'] },
  { emoji: '♟️', category: 'interests', keywords: ['chess', 'game', 'strategy', 'think', 'board'] },
  { emoji: '🎲', category: 'interests', keywords: ['board game', 'dice', 'game', 'play', 'fun'] },
  { emoji: '🧵', category: 'interests', keywords: ['sew', 'stitch', 'craft', 'thread', 'make'] },
  { emoji: '🧶', category: 'interests', keywords: ['knit', 'wool', 'craft', 'yarn', 'make'] },
  { emoji: '🎬', category: 'interests', keywords: ['film', 'movie', 'video', 'create', 'record'] },
  { emoji: '🪁', category: 'interests', keywords: ['archery', 'aim', 'target', 'outdoor', 'sport'] },

  // ── Character (16) ────────────────────────────────────────────────────────
  { emoji: '💛', category: 'character', keywords: ['kindness', 'care', 'warm', 'love', 'generous'] },
  { emoji: '🙏', category: 'character', keywords: ['grateful', 'thankful', 'pray', 'respect', 'gratitude'] },
  { emoji: '💌', category: 'character', keywords: ['thank you', 'letter', 'kind', 'note', 'message'] },
  { emoji: '😊', category: 'character', keywords: ['happy', 'positive', 'smile', 'joy', 'cheerful'] },
  { emoji: '🌟', category: 'character', keywords: ['excellent', 'shine', 'star', 'great', 'best'] },
  { emoji: '🎁', category: 'character', keywords: ['give', 'generous', 'kind', 'gift', 'share'] },
  { emoji: '💬', category: 'character', keywords: ['talk', 'communicate', 'share', 'express', 'speak'] },
  { emoji: '🫂', category: 'character', keywords: ['hug', 'comfort', 'care', 'warm', 'support'] },
  { emoji: '😌', category: 'character', keywords: ['calm', 'peace', 'relax', 'breathe', 'patient'] },
  { emoji: '🦁', category: 'character', keywords: ['brave', 'courage', 'strong', 'bold', 'lion'] },
  { emoji: '🌸', category: 'character', keywords: ['gentle', 'kind', 'beautiful', 'soft', 'bloom'] },
  { emoji: '🪞', category: 'character', keywords: ['reflect', 'self', 'honest', 'truth', 'look'] },
  { emoji: '⭐', category: 'character', keywords: ['star', 'role model', 'great', 'shine', 'excellent'] },
  { emoji: '🤗', category: 'character', keywords: ['warm', 'welcoming', 'friendly', 'care', 'kind'] },
  { emoji: '🧡', category: 'character', keywords: ['care', 'warmth', 'love', 'kind', 'empathy'] },
  { emoji: '💫', category: 'character', keywords: ['sparkle', 'positive', 'shine', 'energy', 'bright'] },

  // ── Personal Growth (15) ──────────────────────────────────────────────────
  { emoji: '🌱', category: 'growth',    keywords: ['grow', 'sprout', 'new', 'start', 'habit'] },
  { emoji: '💤', category: 'growth',    keywords: ['sleep', 'rest', 'night', 'bed', 'nap'] },
  { emoji: '🌙', category: 'growth',    keywords: ['bedtime', 'night', 'routine', 'sleep', 'moon'] },
  { emoji: '☀️', category: 'growth',    keywords: ['morning', 'routine', 'wake', 'day', 'sunshine'] },
  { emoji: '⏰', category: 'growth',    keywords: ['time', 'alarm', 'punctual', 'schedule', 'routine'] },
  { emoji: '📅', category: 'growth',    keywords: ['plan', 'schedule', 'calendar', 'organize', 'habit'] },
  { emoji: '🏆', category: 'growth',    keywords: ['achievement', 'goal', 'win', 'trophy', 'best'] },
  { emoji: '💧', category: 'growth',    keywords: ['water', 'hydrate', 'drink', 'healthy', 'thirst'] },
  { emoji: '🍎', category: 'growth',    keywords: ['apple', 'fruit', 'healthy', 'eat', 'nutrition'] },
  { emoji: '🥦', category: 'growth',    keywords: ['vegetable', 'healthy', 'eat', 'nutrition', 'green'] },
  { emoji: '🦋', category: 'growth',    keywords: ['change', 'transform', 'grow', 'beautiful', 'butterfly'] },
  { emoji: '📔', category: 'growth',    keywords: ['journal', 'write', 'reflect', 'diary', 'notes'] },
  { emoji: '💡', category: 'growth',    keywords: ['idea', 'insight', 'think', 'creative', 'discover'] },
  { emoji: '🌅', category: 'growth',    keywords: ['new day', 'beginning', 'morning', 'sunrise', 'fresh'] },
  { emoji: '🌿', category: 'growth',    keywords: ['nature', 'outdoors', 'green', 'fresh', 'calm'] },
];

// "All" is first, then the 6 categories
const CATEGORY_TABS: { key: ActiveTab; emoji: string; label: string }[] = [
  { key: 'all',       emoji: '✨', label: 'All'       },
  { key: 'learning',  emoji: CategoryConfig.learning.emoji,  label: 'Learning'  },
  { key: 'physical',  emoji: CategoryConfig.physical.emoji,  label: 'Physical'  },
  { key: 'family',    emoji: CategoryConfig.family.emoji,    label: 'Family'    },
  { key: 'interests', emoji: CategoryConfig.interests.emoji, label: 'Interests' },
  { key: 'character', emoji: CategoryConfig.character.emoji, label: 'Character' },
  { key: 'growth',    emoji: CategoryConfig.growth.emoji,    label: 'Growth'    },
];

const COLS        = 6;
const MAX_VISIBLE = COLS * 3; // 18 — 3 rows max per category
const FALLBACK_EMOJI = '⭐';

// ─── Component ─────────────────────────────────────────────────────────────────

interface Props {
  selectedEmoji: string;
  onSelect: (emoji: string) => void;
  defaultCategory?: TaskCategory;
}

export function EmojiPicker({ selectedEmoji, onSelect, defaultCategory = 'learning' }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const [activeCategory, setActiveCategory] = useState<ActiveTab>(defaultCategory);
  const [isExpanded, setIsExpanded]         = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');

  const cellSize = Math.floor(
    (screenWidth - Spacing.xl * 2 - Spacing.sm * (COLS - 1)) / COLS,
  );

  const isSearching = searchQuery.trim().length > 0;

  // All emojis for the active state (before row-capping)
  const allEmojisForTab = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (q.length > 0) {
      return EMOJI_DATA.filter(({ keywords }) => keywords.some((kw) => kw.includes(q)));
    }
    if (activeCategory === 'all') return EMOJI_DATA;
    return EMOJI_DATA.filter((item) => item.category === activeCategory);
  }, [searchQuery, activeCategory]);

  // Show "..." expand button only when browsing a single category and it overflows 3 rows
  const needsExpand     = !isSearching && activeCategory !== 'all' && allEmojisForTab.length > MAX_VISIBLE;
  const showExpandBtn   = needsExpand && !isExpanded;
  const displayEmojis   = showExpandBtn ? allEmojisForTab.slice(0, MAX_VISIBLE - 1) : allEmojisForTab;

  function handleTabChange(tab: ActiveTab) {
    if (tab !== activeCategory) {
      setActiveCategory(tab);
      setIsExpanded(false);
    }
  }

  return (
    <View>
      {/* Search */}
      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search all emojis…"
        placeholderTextColor={Colors.textMuted}
        clearButtonMode="while-editing"
        autoCorrect={false}
        autoCapitalize="none"
      />

      {/* Category tabs — hidden while searching */}
      {!isSearching && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
          style={styles.tabScroll}
        >
          {CATEGORY_TABS.map(({ key, emoji, label }) => {
            const isActive = activeCategory === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => handleTabChange(key)}
                activeOpacity={0.7}
              >
                <Text style={styles.tabEmoji}>{emoji}</Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Emoji grid or no-results fallback */}
      {displayEmojis.length === 0 && !showExpandBtn ? (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>
            No emojis found for "{searchQuery.trim()}"
          </Text>
          <TouchableOpacity
            style={[
              styles.emojiCell,
              { width: cellSize, height: cellSize },
              selectedEmoji === FALLBACK_EMOJI && styles.emojiCellSelected,
            ]}
            onPress={() => onSelect(FALLBACK_EMOJI)}
            activeOpacity={0.7}
          >
            <Text style={styles.emojiCellText}>{FALLBACK_EMOJI}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emojiGrid}>
          {displayEmojis.map(({ emoji }) => (
            <TouchableOpacity
              key={emoji}
              style={[
                styles.emojiCell,
                { width: cellSize, height: cellSize },
                selectedEmoji === emoji && styles.emojiCellSelected,
              ]}
              onPress={() => onSelect(emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.emojiCellText}>{emoji}</Text>
            </TouchableOpacity>
          ))}

          {/* Expand button occupies the last cell slot in row 3 */}
          {showExpandBtn && (
            <TouchableOpacity
              style={[styles.emojiCell, styles.expandCell, { width: cellSize, height: cellSize }]}
              onPress={() => setIsExpanded(true)}
              activeOpacity={0.7}
            >
              <Feather name="more-horizontal" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
    marginBottom: Spacing.md,
  },
  tabScroll: {
    marginBottom: Spacing.lg,
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.borderMedium,
    backgroundColor: Colors.white,
  },
  tabActive: {
    backgroundColor: Colors.green700,
    borderColor: Colors.green700,
  },
  tabEmoji: {
    fontSize: 14,
  },
  tabLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.white,
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
  expandCell: {
    backgroundColor: Colors.bgTertiary,
  },
  noResults: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  noResultsText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
});
