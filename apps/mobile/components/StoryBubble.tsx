import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Flame } from "lucide-react-native";

interface StoryBubbleProps {
  title: string;
  hook: string;
  genre: string;
  genreColor: string;
  author: string;
  popCount: number;
  onPress: () => void;
}

export function StoryBubble({
  title,
  hook,
  genre,
  genreColor,
  author,
  popCount,
  onPress,
}: StoryBubbleProps) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <View style={styles.container}>
        {/* Genre color accent */}
        <View style={[styles.genreAccent, { backgroundColor: genreColor }]} />

        <View style={styles.content}>
          {/* Genre tag */}
          <View style={[styles.genreTag, { backgroundColor: genreColor + "20" }]}>
            <Text style={[styles.genreText, { color: genreColor }]}>{genre}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          {/* Hook */}
          <Text style={styles.hook} numberOfLines={3}>
            {hook}
          </Text>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.author}>by {author}</Text>
            <View style={styles.popCount}>
              <Flame size={14} color="#F59E0B" />
              <Text style={styles.popCountText}>{popCount}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#1A1228",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2D2640",
  },
  genreAccent: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  genreTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  genreText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#F3F4F6",
    marginBottom: 6,
  },
  hook: {
    fontSize: 14,
    color: "#9CA3AF",
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  author: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  popCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  popCountText: {
    fontSize: 13,
    color: "#F59E0B",
    fontWeight: "700",
  },
});
