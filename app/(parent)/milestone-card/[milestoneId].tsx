import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../../src/services/supabase';
import { useAuthStore } from '../../../src/store/authStore';
import { useMilestone, type MilestoneType } from '../../../src/hooks/useMilestone';
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  Shadow,
} from '../../../src/theme';

// ─── Static config ─────────────────────────────────────────────────────────────

const MILESTONE_CONFIG: Record<MilestoneType, { emoji: string; label: string }> = {
  streak_7:   { emoji: '⭐', label: '7-Day Streak' },
  streak_30:  { emoji: '🔥', label: '30-Day Streak' },
  count_100:  { emoji: '💯', label: '100 Completions' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MilestoneCardScreen() {
  const { milestoneId } = useLocalSearchParams<{ milestoneId: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.currentUser?.id);

  const { milestone, loading, error, refresh } = useMilestone(milestoneId ?? null);

  // Local editable state
  const [noteText, setNoteText]           = useState('');
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [pendingPhotoPath, setPendingPhotoPath] = useState<string | null>(null);
  const [pendingPhotoUri, setPendingPhotoUri]   = useState<string | null>(null);

  // Operation states
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);

  // Dirty tracking
  const [noteDirty, setNoteDirty]   = useState(false);
  const [photoDirty, setPhotoDirty] = useState(false);
  const isDirty = noteDirty || photoDirty;

  // ── Seed local state once milestone loads ─────────────────────────────────

  useEffect(() => {
    if (!milestone) return;
    setNoteText(milestone.parent_note ?? '');
  }, [milestone]);

  // ── Generate signed URL when milestone has a stored photo path ────────────

  useEffect(() => {
    if (!milestone?.photo_url) return;
    supabase.storage
      .from('milestone-photos')
      .createSignedUrl(milestone.photo_url, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setSignedPhotoUrl(data.signedUrl);
      });
  }, [milestone?.photo_url]);

  // ── Photo picker ──────────────────────────────────────────────────────────

  async function handlePickPhoto() {
    if (!userId || !milestoneId) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const localUri = result.assets[0].uri;
    setUploading(true);

    try {
      let base64: string;
      try {
        base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: 'base64',
        });
        console.log('[MilestoneCard] FileSystem read OK, base64 length:', base64.length);
      } catch (fsErr) {
        console.error('[MilestoneCard] FileSystem.readAsStringAsync error:', fsErr);
        throw fsErr;
      }
      const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      console.log('[MilestoneCard] byteArray length:', byteArray.length);

      const storagePath = `${userId}/${milestoneId}/photo.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('milestone-photos')
        .upload(storagePath, byteArray, { upsert: true, contentType: 'image/jpeg' });

      console.log('[MilestoneCard] storage upload error:', uploadError);
      if (uploadError) throw uploadError;

      // Show the local URI immediately for instant feedback; also get a signed URL
      setPendingPhotoUri(localUri);
      setPendingPhotoPath(storagePath);
      setPhotoDirty(true);

      // Generate signed URL so display is consistent with saved state
      const { data: urlData } = await supabase.storage
        .from('milestone-photos')
        .createSignedUrl(storagePath, 3600);

      if (urlData?.signedUrl) setSignedPhotoUrl(urlData.signedUrl);
    } catch {
      Alert.alert('Upload failed', "Couldn't save photo. Tap the photo area to retry.");
    } finally {
      setUploading(false);
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!milestoneId || !isDirty) return;
    setSaving(true);

    const updates: Record<string, string | null> = {};
    if (noteDirty)  updates.parent_note = noteText.trim() || null;
    if (photoDirty && pendingPhotoPath) updates.photo_url = pendingPhotoPath;

    try {
      const { error: saveError } = await supabase
        .from('milestone')
        .update(updates)
        .eq('id', milestoneId);

      if (saveError) {
        Alert.alert('Save failed', 'Could not save changes. Please try again.');
      } else {
        setNoteDirty(false);
        setPhotoDirty(false);
        setPendingPhotoPath(null);
        await refresh();
        Alert.alert('Saved!', 'Your changes have been saved.');
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.green600} size="large" />
      </SafeAreaView>
    );
  }

  if (error || !milestone) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? 'Milestone not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const cfg          = MILESTONE_CONFIG[milestone.type];
  const displayPhoto = pendingPhotoUri ?? signedPhotoUrl;
  const hasPhoto     = !!displayPhoto;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Back nav */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.milestoneEmoji}>{cfg.emoji}</Text>
            <Text style={styles.milestoneLabel}>{cfg.label}</Text>
            <View style={styles.taskRow}>
              <Text style={styles.taskIcon}>{milestone.task_icon}</Text>
              <Text style={styles.taskName}>{milestone.task_name}</Text>
            </View>
            <Text style={styles.date}>{formatDate(milestone.triggered_at)}</Text>
          </View>

          {/* ── Photo ──────────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photo</Text>

            {hasPhoto ? (
              <TouchableOpacity
                style={styles.photoContainer}
                onPress={handlePickPhoto}
                activeOpacity={0.85}
                disabled={uploading}
              >
                <Image
                  key={displayPhoto ?? 'empty'}
                  source={{ uri: displayPhoto! }}
                  style={styles.photo}
                  resizeMode="cover"
                  onError={(e) => console.error('[MilestoneCard] Image load error:', e.nativeEvent)}
                />
                {uploading && (
                  <View style={styles.photoOverlay}>
                    <ActivityIndicator color={Colors.white} size="large" />
                  </View>
                )}
                {/* Change photo hint */}
                {!uploading && (
                  <View style={styles.photoHint}>
                    <Feather name="camera" size={14} color={Colors.white} />
                    <Text style={styles.photoHintText}>Tap to change</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.addPhotoBtn}
                onPress={handlePickPhoto}
                activeOpacity={0.7}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color={Colors.green600} />
                ) : (
                  <>
                    <Feather name="image" size={28} color={Colors.green400} />
                    <Text style={styles.addPhotoText}>Add photo from library</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* ── Note ───────────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Note</Text>
            <View style={[styles.noteContainer, Shadow.sm]}>
              <TextInput
                style={styles.noteInput}
                value={noteText}
                onChangeText={(t) => {
                  setNoteText(t);
                  setNoteDirty(t !== (milestone.parent_note ?? ''));
                }}
                placeholder="Write something about this milestone…"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ── Save button ─────────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.saveBtn, (!isDirty || saving) && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={!isDirty || saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Back nav
  backBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.base,
    color: Colors.green700,
  },

  errorText: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textMuted,
  },

  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.xs,
  },
  milestoneEmoji: {
    fontSize: 52,
  },
  milestoneLabel: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  taskIcon: {
    fontSize: 20,
  },
  taskName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.md,
    color: Colors.textSecondary,
  },
  date: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  // ── Sections ────────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing['2xl'],
  },
  sectionTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },

  // ── Photo ────────────────────────────────────────────────────────────────────
  photoContainer: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.40)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  photoHintText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.white,
  },
  addPhotoBtn: {
    height: 160,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.borderMedium,
    backgroundColor: Colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  addPhotoText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
  },

  // ── Note ─────────────────────────────────────────────────────────────────────
  noteContainer: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 120,
  },
  noteInput: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    lineHeight: Typography.size.base * 1.6,
    minHeight: 100,
  },

  // ── Save button ──────────────────────────────────────────────────────────────
  saveBtn: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    backgroundColor: Colors.green700,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.md,
    color: Colors.white,
  },
});
