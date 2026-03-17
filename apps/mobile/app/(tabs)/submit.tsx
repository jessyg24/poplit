import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { storySubmissionSchema, type StorySubmissionInput } from "@poplit/core/validation";
import { GENRES, MOODS, STORY_LIMITS } from "@poplit/core/constants";
import { supabase } from "@/lib/supabase";

export default function SubmitScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StorySubmissionInput>({
    resolver: zodResolver(storySubmissionSchema),
  });

  function getWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  async function onSubmit(data: StorySubmissionInput) {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      Alert.alert("Error", "You must be logged in to submit.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("stories").insert({
      ...data,
      author_id: userData.user.id,
      status: "draft",
    });

    setLoading(false);

    if (error) {
      Alert.alert("Submission failed", error.message);
      return;
    }

    Alert.alert("Submitted!", "Your story has been saved as a draft.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Submit a Story</Text>
        <Text style={styles.subtitle}>Share your voice with the world</Text>

        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Your story title"
                placeholderTextColor="#666"
                maxLength={STORY_LIMITS.titleMaxLength}
              />
              {errors.title && <Text style={styles.error}>{errors.title.message}</Text>}
            </View>
          )}
        />

        <Controller
          control={control}
          name="hook"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hook</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="A compelling one-liner to draw readers in"
                placeholderTextColor="#666"
                maxLength={STORY_LIMITS.hookMaxLength}
                multiline
              />
              <Text style={styles.charCount}>
                {(value?.length ?? 0)}/{STORY_LIMITS.hookMaxLength}
              </Text>
              {errors.hook && <Text style={styles.error}>{errors.hook.message}</Text>}
            </View>
          )}
        />

        {/* Genre picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Genre</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {GENRES.map((genre) => (
                <TouchableOpacity
                  key={genre}
                  style={[
                    styles.chip,
                    selectedGenre === genre && styles.chipSelected,
                  ]}
                  onPress={() => {
                    setSelectedGenre(genre);
                    setValue("genre", genre, { shouldValidate: true });
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedGenre === genre && styles.chipTextSelected,
                    ]}
                  >
                    {genre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {errors.genre && <Text style={styles.error}>{errors.genre.message}</Text>}
        </View>

        {/* Mood picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mood (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {MOODS.map((mood) => (
                <TouchableOpacity
                  key={mood}
                  style={[
                    styles.chip,
                    selectedMood === mood && styles.chipSelected,
                  ]}
                  onPress={() => {
                    setSelectedMood(mood === selectedMood ? null : mood);
                    setValue("mood", mood === selectedMood ? undefined : mood, {
                      shouldValidate: true,
                    });
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedMood === mood && styles.chipTextSelected,
                    ]}
                  >
                    {mood}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Story content */}
        <Controller
          control={control}
          name="content"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Story Content</Text>
              <TextInput
                style={[styles.input, styles.contentInput]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Write your story here..."
                placeholderTextColor="#666"
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.wordCount}>
                {getWordCount(value ?? "")} / {STORY_LIMITS.minWords}-{STORY_LIMITS.maxWords} words
              </Text>
              {errors.content && <Text style={styles.error}>{errors.content.message}</Text>}
            </View>
          )}
        />

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Submit Story</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0A1A",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#C084FC",
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 2,
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#D1D5DB",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1A1228",
    borderWidth: 1,
    borderColor: "#2D2640",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#F3F4F6",
  },
  contentInput: {
    minHeight: 240,
    lineHeight: 24,
  },
  charCount: {
    color: "#6B7280",
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  wordCount: {
    color: "#6B7280",
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  error: {
    color: "#F87171",
    fontSize: 12,
    marginTop: 4,
  },
  chipScroll: {
    marginHorizontal: -4,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1A1228",
    borderWidth: 1,
    borderColor: "#2D2640",
  },
  chipSelected: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  chipText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#fff",
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: "#7C3AED",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
