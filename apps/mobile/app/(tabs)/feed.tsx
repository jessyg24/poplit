import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { supabase } from "@/lib/supabase";
import { GENRES } from "@poplit/core/constants";
import { StoryBubble } from "@/components/StoryBubble";

interface StoryItem {
  id: string;
  title: string;
  hook: string;
  genre: string[];
  author_pen_name: string;
  pop_count: number;
  created_at: string;
}

const GENRE_COLORS: Record<string, string> = {
  "Literary Fiction": "#7C3AED",
  "Science Fiction": "#2563EB",
  Fantasy: "#7C3AED",
  Horror: "#DC2626",
  Mystery: "#4338CA",
  Thriller: "#B91C1C",
  Romance: "#EC4899",
  "Historical Fiction": "#92400E",
  Humor: "#F59E0B",
  Drama: "#6D28D9",
  "Magical Realism": "#8B5CF6",
  Dystopian: "#64748B",
  "Slice of Life": "#10B981",
  Experimental: "#F97316",
};

export default function FeedScreen() {
  const router = useRouter();
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStories = useCallback(async () => {
    const { data, error } = await supabase
      .from("stories")
      .select("id, title, hook, genre, author_pen_name, pop_count, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setStories(data as StoryItem[]);
    }
  }, []);

  useEffect(() => {
    fetchStories().finally(() => setLoading(false));
  }, [fetchStories]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStories();
    setRefreshing(false);
  }, [fetchStories]);

  function handleStoryPress(id: string) {
    router.push(`/story/${id}`);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C084FC" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PopLit</Text>
        <Text style={styles.headerSubtitle}>Discover stories</Text>
      </View>

      <FlatList
        data={stories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#C084FC"
            colors={["#C084FC"]}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
            <StoryBubble
              title={item.title}
              hook={item.hook}
              genre={item.genre?.[0] ?? ""}
              genreColor={GENRE_COLORS[item.genre?.[0] ?? ""] ?? "#7C3AED"}
              author={item.author_pen_name}
              popCount={item.pop_count}
              onPress={() => handleStoryPress(item.id)}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No stories yet.</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
          </View>
        }
      />
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#C084FC",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 14,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    color: "#6B7280",
    fontSize: 14,
    marginTop: 4,
  },
});
