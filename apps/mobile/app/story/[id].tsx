import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut, SlideInRight } from "react-native-reanimated";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { MIN_READ_TIME_MS, STORY_LIMITS, SECTION_WEIGHTS } from "@poplit/core/constants";
import { SectionReader } from "@/components/SectionReader";

interface Story {
  id: string;
  title: string;
  hook: string | null;
  genre: string[];
  content: string | null;
  sections: string[];
  users: { pen_name: string } | null;
}

export default function StoryReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState(0);
  const [sectionStartTime, setSectionStartTime] = useState(Date.now());
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());

  const fetchStory = useCallback(async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("stories")
      .select("id, title, hook, genre, content, users!author_id(pen_name)")
      .eq("id", id)
      .single();

    if (error || !data) {
      Alert.alert("Error", "Could not load story.");
      router.back();
      return;
    }

    // Split content into sections
    const contentText = ((data as any).content ?? "") as string;
    const sectionCount = STORY_LIMITS.sections;
    const paragraphs = contentText.split(/\n\n+/);
    const perSection = Math.ceil(paragraphs.length / sectionCount);
    const sections: string[] = [];

    for (let i = 0; i < sectionCount; i++) {
      const start = i * perSection;
      const end = Math.min(start + perSection, paragraphs.length);
      sections.push(paragraphs.slice(start, end).join("\n\n"));
    }

    setStory({ ...(data as any), sections } as Story);
  }, [id, router]);

  useEffect(() => {
    fetchStory().finally(() => setLoading(false));
  }, [fetchStory]);

  useEffect(() => {
    setSectionStartTime(Date.now());
  }, [currentSection]);

  async function recordPop(section: number) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user || !story) return;

    const readTimeMs = Date.now() - sectionStartTime;
    if (readTimeMs < MIN_READ_TIME_MS) return;

    const weight = SECTION_WEIGHTS[(section + 1) as keyof typeof SECTION_WEIGHTS] ?? 1.0;

    await (supabase.from("pops") as any).insert({
      story_id: story.id,
      reader_id: userData.user.id,
      section_opened: section + 1,
      weighted_value: weight,
      read_duration_ms: readTimeMs,
    });
  }

  async function handleSectionComplete() {
    if (!story) return;

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await recordPop(currentSection);

    setCompletedSections((prev) => new Set(prev).add(currentSection));

    if (currentSection < story.sections.length - 1) {
      setCurrentSection((prev) => prev + 1);
    } else {
      // Story complete
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Story Complete!", "You've finished reading this story.", [
        { text: "Back to Feed", onPress: () => router.back() },
      ]);
    }
  }

  if (loading || !story) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C084FC" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color="#9CA3AF" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.storyTitle} numberOfLines={1}>
            {story.title}
          </Text>
          <Text style={styles.authorName}>{story.users?.pen_name ?? "unknown"}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress dots */}
      <View style={styles.progressRow}>
        {story.sections.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i === currentSection && styles.progressDotActive,
              completedSections.has(i) && styles.progressDotComplete,
            ]}
          />
        ))}
      </View>

      {/* Section reader */}
      <Animated.View
        key={currentSection}
        entering={SlideInRight.duration(300)}
        style={styles.readerContainer}
      >
        <SectionReader
          content={story.sections[currentSection] ?? ""}
          sectionIndex={currentSection}
          totalSections={story.sections.length}
          minReadTimeMs={MIN_READ_TIME_MS}
          onComplete={handleSectionComplete}
        />
      </Animated.View>

      {/* Section indicator */}
      <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.sectionIndicator}>
        <Text style={styles.sectionText}>
          Section {currentSection + 1} of {story.sections.length}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0A1A",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F0A1A",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  storyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F3F4F6",
  },
  authorName: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 2,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2D2640",
  },
  progressDotActive: {
    backgroundColor: "#7C3AED",
    width: 24,
    borderRadius: 4,
  },
  progressDotComplete: {
    backgroundColor: "#10B981",
  },
  readerContainer: {
    flex: 1,
  },
  sectionIndicator: {
    alignItems: "center",
    paddingVertical: 12,
    paddingBottom: 32,
  },
  sectionText: {
    color: "#6B7280",
    fontSize: 13,
  },
});
