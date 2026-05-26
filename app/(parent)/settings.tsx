import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useChildStore, type ChildProfile } from '../../src/store/childStore';
import { supabase } from '../../src/services/supabase';
import { PinModal } from '../../src/components/PinModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIF_NMT_KEY    = 'notif_never_miss_twice';
const NOTIF_WEEKLY_KEY = 'notif_weekly_summary';

const AGES = Array.from({ length: 17 }, (_, i) => i + 1);

const GENDERS: { value: ChildProfile['gender']; label: string }[] = [
  { value: 'boy',   label: 'Boy' },
  { value: 'girl',  label: 'Girl' },
  { value: 'other', label: 'Other' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const signOut            = useAuthStore((s) => s.signOut);
  const childProfiles      = useChildStore((s) => s.childProfiles);
  const setChildProfiles   = useChildStore((s) => s.setChildProfiles);
  const selectedChildId    = useChildStore((s) => s.selectedChildId);
  const setSelectedChildId = useChildStore((s) => s.setSelectedChildId);

  // ── Notification toggles ──────────────────────────────────────────────────
  const [neverMissTwice, setNeverMissTwice] = useState(true);
  const [weeklySummary,  setWeeklySummary]  = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet([NOTIF_NMT_KEY, NOTIF_WEEKLY_KEY]).then(([[, nmt], [, weekly]]) => {
      if (nmt    !== null) setNeverMissTwice(nmt    === 'true');
      if (weekly !== null) setWeeklySummary(weekly  === 'true');
    });
  }, []);

  async function toggleNeverMissTwice(value: boolean) {
    setNeverMissTwice(value);
    await AsyncStorage.setItem(NOTIF_NMT_KEY, String(value));
  }

  async function toggleWeeklySummary(value: boolean) {
    setWeeklySummary(value);
    await AsyncStorage.setItem(NOTIF_WEEKLY_KEY, String(value));
  }

  // ── PIN change (verify current → set new) ────────────────────────────────
  // Two PinModal instances alternate: verify slides out, setup slides in.
  // A 300 ms delay matches the slide animation so they don't overlap.
  const [pinPhase, setPinPhase] = useState<'idle' | 'verify' | 'setup'>('idle');

  function onVerifySuccess() {
    setPinPhase('idle'); // hide verify modal
    setTimeout(() => setPinPhase('setup'), 300); // show setup after slide-out
  }

  function onSetupSuccess() {
    setPinPhase('idle');
    Alert.alert('PIN updated', 'Your new PIN has been saved.');
  }

  // ── Child profile editing ─────────────────────────────────────────────────
  const [editingChild, setEditingChild] = useState<ChildProfile | null>(null);
  const [editName,   setEditName]   = useState('');
  const [editAge,    setEditAge]    = useState<number | null>(null);
  const [editGender, setEditGender] = useState<ChildProfile['gender'] | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError,  setEditError]  = useState<string | null>(null);

  // ── Delete child profile ──────────────────────────────────────────────────
  const [deletingChild, setDeletingChild] = useState<ChildProfile | null>(null);
  const [deletePhase,   setDeletePhase]   = useState<'idle' | 'pin'>('idle');

  function openEdit(child: ChildProfile) {
    setEditingChild(child);
    setEditName(child.name);
    setEditAge(child.age);
    setEditGender(child.gender);
    setEditError(null);
  }

  function closeEdit() {
    setEditingChild(null);
    setEditError(null);
  }

  async function handleSaveProfile() {
    if (!editingChild || !editName.trim() || editAge === null || editGender === null) return;
    setEditSaving(true);
    setEditError(null);

    const { error } = await supabase
      .from('child_profile')
      .update({ name: editName.trim(), age: editAge, gender: editGender })
      .eq('id', editingChild.id);

    setEditSaving(false);

    if (error) {
      setEditError("Couldn't save. Please try again.");
      return;
    }

    setChildProfiles(
      childProfiles.map((p) =>
        p.id === editingChild.id
          ? { ...p, name: editName.trim(), age: editAge!, gender: editGender! }
          : p
      )
    );
    closeEdit();
  }

  const editValid = editName.trim().length > 0 && editAge !== null && editGender !== null;

  function handleDeletePress() {
    if (!editingChild) return;
    const child = editingChild;
    Alert.alert(
      `Delete ${child.name}'s profile`,
      `All data for ${child.name} will be permanently deleted and cannot be recovered. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: () => {
            setDeletingChild(child);
            closeEdit();
            setTimeout(() => setDeletePhase('pin'), 300);
          },
        },
      ]
    );
  }

  async function handleDeleteConfirmed() {
    if (!deletingChild) return;
    setDeletePhase('idle'); // close PIN modal immediately

    const { error } = await supabase
      .from('child_profile')
      .delete()
      .eq('id', deletingChild.id);

    const child = deletingChild;
    setDeletingChild(null);

    if (error) {
      Alert.alert('Error', "Couldn't delete profile. Please try again.");
      return;
    }

    const remaining = childProfiles.filter((p) => p.id !== child.id);
    setChildProfiles(remaining);

    if (selectedChildId === child.id) {
      setSelectedChildId(remaining.length > 0 ? remaining[0].id : null);
    }

    if (remaining.length === 0) {
      router.replace('/(parent)/create-profile');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Notifications ───────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Notifications</Text>
        <View style={styles.card}>

          {/* Milestone — locked on */}
          <View style={[styles.row, styles.rowFirst]}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Milestone notifications</Text>
              <Text style={styles.rowSub}>When your child hits a milestone</Text>
            </View>
            <View style={styles.lockedBadge}>
              <Text style={styles.lockedText}>Always on</Text>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Never Miss Twice */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Never Miss Twice</Text>
              <Text style={styles.rowSub}>Nudge after 2 consecutive missed days</Text>
            </View>
            <Switch
              value={neverMissTwice}
              onValueChange={toggleNeverMissTwice}
              trackColor={{ false: Colors.border, true: Colors.green500 }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.separator} />

          {/* Weekly summary */}
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Weekly summary</Text>
              <Text style={styles.rowSub}>Every Sunday — how habits are trending</Text>
            </View>
            <Switch
              value={weeklySummary}
              onValueChange={toggleWeeklySummary}
              trackColor={{ false: Colors.border, true: Colors.green500 }}
              thumbColor={Colors.white}
            />
          </View>

        </View>

        {/* ── Security ────────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Security</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.row, styles.rowFirst, styles.rowLast]}
            onPress={() => setPinPhase('verify')}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>Change PIN</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Children ────────────────────────────────────────────────────── */}
        {childProfiles.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Children</Text>
            <View style={styles.card}>
              {childProfiles.map((child, index) => (
                <View key={child.id}>
                  {index > 0 && <View style={styles.separator} />}
                  <TouchableOpacity
                    style={[
                      styles.row,
                      index === 0 && styles.rowFirst,
                      index === childProfiles.length - 1 && styles.rowLast,
                    ]}
                    onPress={() => openEdit(child)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rowLeft}>
                      <Text style={styles.rowLabel}>{child.name}</Text>
                      <Text style={styles.rowSub}>Age {child.age}</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Account ─────────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.row, styles.rowFirst, styles.rowLast]}
            onPress={signOut}
            activeOpacity={0.7}
          >
            <Text style={[styles.rowLabel, styles.destructiveLabel]}>Sign out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── PIN modals: verify current → set new ────────────────────────── */}
      <PinModal
        visible={pinPhase === 'verify'}
        mode="verify"
        onSuccess={onVerifySuccess}
        onCancel={() => setPinPhase('idle')}
      />
      <PinModal
        visible={pinPhase === 'setup'}
        mode="setup"
        onSuccess={onSetupSuccess}
        onCancel={() => setPinPhase('idle')}
      />
      <PinModal
        visible={deletePhase === 'pin'}
        mode="verify"
        onSuccess={handleDeleteConfirmed}
        onCancel={() => {
          setDeletePhase('idle');
          setDeletingChild(null);
        }}
      />

      {/* ── Edit child profile sheet ─────────────────────────────────────── */}
      <Modal
        visible={editingChild !== null}
        animationType="slide"
        transparent
        onRequestClose={closeEdit}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeEdit}
          />

          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Edit profile</Text>

            <Text style={styles.editLabel}>Name</Text>
            <TextInput
              style={styles.editInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Child's name"
              placeholderTextColor={Colors.textMuted}
              autoCorrect={false}
              maxLength={30}
            />

            <Text style={[styles.editLabel, styles.editLabelGap]}>Age</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.ageRow}
            >
              {AGES.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.ageChip, editAge === a && styles.ageChipSelected]}
                  onPress={() => setEditAge(a)}
                >
                  <Text
                    style={[
                      styles.ageChipText,
                      editAge === a && styles.ageChipTextSelected,
                    ]}
                  >
                    {a}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.editLabel, styles.editLabelGap]}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  style={[
                    styles.genderBtn,
                    editGender === g.value && styles.genderBtnSelected,
                  ]}
                  onPress={() => setEditGender(g.value)}
                >
                  <Text
                    style={[
                      styles.genderBtnText,
                      editGender === g.value && styles.genderBtnTextSelected,
                    ]}
                  >
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {editError !== null && (
              <Text style={styles.editError}>{editError}</Text>
            )}

            <TouchableOpacity
              style={[
                styles.saveBtn,
                (!editValid || editSaving) && styles.saveBtnDisabled,
              ]}
              onPress={handleSaveProfile}
              disabled={!editValid || editSaving}
              activeOpacity={0.85}
            >
              {editSaving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetCancelBtn} onPress={closeEdit}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeletePress}>
              <Text style={styles.deleteBtnText}>
                Delete {editingChild?.name}'s profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgSecondary,
  },
  flex: { flex: 1 },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgSecondary,
  },
  backBtn: { minWidth: 60 },
  backText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.green700,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  headerSpacer: { minWidth: 60 },

  // ── Scroll ───────────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['4xl'],
    gap: 0,
  },

  // ── Section ──────────────────────────────────────────────────────────────
  sectionHeader: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },

  // ── Row ──────────────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 56,
  },
  rowFirst: {
    // reserved for future top-radius override if needed
  },
  rowLast: {
    // reserved for future bottom-radius override if needed
  },
  rowLeft: {
    flex: 1,
    gap: 2,
    paddingRight: Spacing.md,
  },
  rowLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  rowSub: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.bgSecondary,
    marginLeft: Spacing.lg,
  },
  chevron: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.xl,
    color: Colors.textMuted,
  },

  // ── Locked badge ─────────────────────────────────────────────────────────
  lockedBadge: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  },
  lockedText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },

  // ── Destructive ──────────────────────────────────────────────────────────
  destructiveLabel: {
    color: Colors.danger,
  },

  // ── Edit profile sheet ───────────────────────────────────────────────────
  sheetOverlay: {
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
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  sheetTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  editLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  editLabelGap: {
    marginTop: Spacing.xl,
  },
  editInput: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  ageRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  ageChip: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageChipSelected: {
    backgroundColor: Colors.green600,
    borderColor: Colors.green600,
  },
  ageChipText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  ageChipTextSelected: {
    color: Colors.white,
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  genderBtnSelected: {
    backgroundColor: Colors.green600,
    borderColor: Colors.green600,
  },
  genderBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  genderBtnTextSelected: {
    color: Colors.white,
  },
  editError: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.danger,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  saveBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.green700,
    borderRadius: Radius.full,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: Colors.green200,
  },
  saveBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: Typography.size.md,
    color: Colors.white,
  },
  sheetCancelBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textMuted,
  },

  // ── Delete button ─────────────────────────────────────────────────────────
  deleteBtn: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.danger,
  },
});
