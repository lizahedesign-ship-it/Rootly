import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { useChildProfile } from '../hooks/useChildProfile';
import type { ChildProfile } from '../store/childStore';

const AGES = Array.from({ length: 17 }, (_, i) => i + 1); // 1–17

const GENDERS: { value: ChildProfile['gender']; label: string }[] = [
  { value: 'boy', label: 'Boy' },
  { value: 'girl', label: 'Girl' },
  { value: 'other', label: 'Other' },
];

export default function CreateProfileScreen() {
  const router = useRouter();
  const { createProfile } = useChildProfile();

  const [name, setName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<ChildProfile['gender'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    name.trim().length > 0 && age !== null && gender !== null && !isLoading;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setIsLoading(true);
    setError(null);
    const result = await createProfile(name.trim(), age!, gender!);
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add child profile</Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="What's your child's name?"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCorrect={false}
            maxLength={30}
          />

          {/* Age */}
          <Text style={[styles.label, styles.sectionGap]}>Age</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ageRow}
          >
            {AGES.map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.ageChip, age === a && styles.ageChipSelected]}
                onPress={() => setAge(a)}
              >
                <Text
                  style={[
                    styles.ageChipText,
                    age === a && styles.ageChipTextSelected,
                  ]}
                >
                  {a}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Gender */}
          <Text style={[styles.label, styles.sectionGap]}>Gender</Text>
          <View style={styles.genderRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[
                  styles.genderBtn,
                  gender === g.value && styles.genderBtnSelected,
                ]}
                onPress={() => setGender(g.value)}
              >
                <Text
                  style={[
                    styles.genderText,
                    gender === g.value && styles.genderTextSelected,
                  ]}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        {/* Submit */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.createBtn, !canSubmit && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!canSubmit}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.createBtnText}>Create Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  backText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.green700,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['4xl'],
  },
  sectionGap: {
    marginTop: Spacing['2xl'],
  },
  label: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
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
  genderText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  genderTextSelected: {
    color: Colors.white,
  },
  error: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.danger,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    paddingTop: Spacing.md,
  },
  createBtn: {
    backgroundColor: Colors.green700,
    borderRadius: Radius.full,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  createBtnDisabled: {
    backgroundColor: Colors.green300,
  },
  createBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: Typography.size.md,
    color: Colors.white,
  },
});
