import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { useChildStore } from '../store/childStore';

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  // compact: shrinks pill to fit content; parent row handles padding
  compact?: boolean;
}

export function ChildSelector({ compact = false }: Props) {
  const router             = useRouter();
  const childProfiles      = useChildStore((s) => s.childProfiles);
  const selectedChildId    = useChildStore((s) => s.selectedChildId);
  const setSelectedChildId = useChildStore((s) => s.setSelectedChildId);

  const [open, setOpen]               = useState(false);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [dropdownLeft, setDropdownLeft] = useState(0);

  // collapsable={false} prevents Android from collapsing the view, which
  // would cause measure() to fail silently.
  const pillRef = useRef<View>(null);

  const selectedChild = childProfiles.find((c) => c.id === selectedChildId);

  if (childProfiles.length === 0) return null;

  function handleOpenPill() {
    if (open) {
      setOpen(false);
      return;
    }
    pillRef.current?.measure((_x, _y, _w, h, pageX, pageY) => {
      setDropdownTop(pageY + h + 6);
      setDropdownLeft(pageX);
      setOpen(true);
    });
  }

  // In compact mode the dropdown anchors to the pill's left screen edge (pageX).
  // In default mode it stays right-aligned to the bar's right padding.
  const dropdownPosition = compact
    ? { top: dropdownTop, left: dropdownLeft }
    : { top: dropdownTop, right: Spacing.xl };

  return (
    <>
      {/* ── Header bar ── */}
      <View style={compact ? styles.barCompact : styles.bar}>
        {/* Wrapper holds the ref for measurement */}
        <View
          ref={pillRef}
          collapsable={false}
          style={compact ? styles.wrapperCompact : styles.wrapper}
        >
          <TouchableOpacity
            style={styles.pill}
            onPress={handleOpenPill}
            activeOpacity={0.8}
          >
            <Text style={styles.pillText}>{selectedChild?.name ?? '—'}</Text>
            <Feather
              name={open ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={Colors.green700}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Inline dropdown — transparent modal, no overlay ── */}
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        {/* Fullscreen touch target — tapping outside closes dropdown */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={() => setOpen(false)}
          activeOpacity={1}
        />

        {/* Floating card positioned below the pill */}
        <View style={[styles.dropdown, dropdownPosition]}>
          {childProfiles.map((child, idx) => {
            const isSelected = child.id === selectedChildId;
            const isLast     = idx === childProfiles.length - 1;
            return (
              <TouchableOpacity
                key={child.id}
                style={[styles.item, !isLast && styles.itemDivider]}
                onPress={() => {
                  setSelectedChildId(child.id);
                  setOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                  {child.name}
                </Text>
                {isSelected && (
                  <Feather name="check" size={16} color={Colors.green700} />
                )}
              </TouchableOpacity>
            );
          })}

          {/* ── Add child ── */}
          <TouchableOpacity
            style={[styles.item, styles.itemDivider, styles.addItem]}
            onPress={() => {
              setOpen(false);
              router.push('/(parent)/create-profile');
            }}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={16} color={Colors.green600} />
            <Text style={styles.addItemText}>Add child</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Header bar ──────────────────────────────────────────────────────────────
  // Default: bar owns its padding, pill fills full width
  bar: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.md,
  },
  // Compact: no padding — fills parent row via flex:1
  barCompact: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
  },

  // Default wrapper: flex:1 fills the bar
  wrapper: {
    flex: 1,
  },
  // Compact wrapper: same flex:1 fill
  wrapperCompact: {
    flex: 1,
  },

  pill: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    height:            40,
    paddingHorizontal: Spacing.lg,
    borderRadius:      Radius.lg,
    borderWidth:       1.5,
    borderColor:       Colors.green300,
    backgroundColor:   Colors.bgPrimary,
  },
  pillText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize:   Typography.size.base,
    color:      Colors.green700,
  },

  // ── Dropdown card ────────────────────────────────────────────────────────────
  dropdown: {
    position:        'absolute',
    minWidth:        160,
    backgroundColor: Colors.white,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     'rgba(0,0,0,0.08)',
    // Floating shadow
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.10,
    shadowRadius:    12,
    elevation:       6,
  },
  item: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  addItem: {
    borderBottomWidth: 0,
    gap:               Spacing.sm,
    justifyContent:    'flex-start',
  },
  addItemText: {
    fontFamily: 'Outfit_500Medium',
    fontSize:   Typography.size.base,
    color:      Colors.green600,
  },
  itemText: {
    fontFamily: 'Outfit_500Medium',
    fontSize:   Typography.size.base,
    color:      Colors.textPrimary,
  },
  itemTextSelected: {
    fontFamily: 'Outfit_600SemiBold',
    color:      Colors.green700,
  },
});
