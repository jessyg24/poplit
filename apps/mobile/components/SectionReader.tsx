import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ChevronRight } from "lucide-react-native";

interface SectionReaderProps {
  content: string;
  sectionIndex: number;
  totalSections: number;
  minReadTimeMs: number;
  onComplete: () => void;
}

export function SectionReader({
  content,
  sectionIndex,
  totalSections,
  minReadTimeMs,
  onComplete,
}: SectionReaderProps) {
  const [canContinue, setCanContinue] = useState(false);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(Date.now());
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    setCanContinue(false);
    setHasScrolledToEnd(false);
    startTimeRef.current = Date.now();
    buttonOpacity.value = 0;

    timerRef.current = setTimeout(() => {
      // Only enable if scrolled to end (or content is short)
      setCanContinue(true);
      buttonOpacity.value = withTiming(1, { duration: 400 });
    }, minReadTimeMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sectionIndex, minReadTimeMs]);

  function handleScroll(event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isNearEnd = contentOffset.y + layoutMeasurement.height >= contentSize.height - 50;

    if (isNearEnd && !hasScrolledToEnd) {
      setHasScrolledToEnd(true);
    }
  }

  const animatedButtonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const isLastSection = sectionIndex === totalSections - 1;
  const showButton = canContinue;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Section {sectionIndex + 1}</Text>
        <Text style={styles.content}>{content}</Text>

        {/* Spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Continue / Finish button */}
      {showButton && (
        <Animated.View style={[styles.buttonContainer, animatedButtonStyle]}>
          <TouchableOpacity
            style={[styles.continueButton, isLastSection && styles.finishButton]}
            onPress={onComplete}
            activeOpacity={0.85}
          >
            <Text style={styles.continueText}>
              {isLastSection ? "Finish Story" : "Continue"}
            </Text>
            {!isLastSection && <ChevronRight size={18} color="#fff" />}
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C3AED",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  content: {
    fontSize: 17,
    color: "#E5E7EB",
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 24,
    backgroundColor: "transparent",
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#7C3AED",
    borderRadius: 14,
    paddingVertical: 16,
  },
  finishButton: {
    backgroundColor: "#10B981",
  },
  continueText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
