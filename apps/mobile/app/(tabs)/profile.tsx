import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Settings, Edit2, LogOut, Trophy, BookOpen, PenLine, Star } from "lucide-react-native";
import { supabase } from "@/lib/supabase";

interface Profile {
  pen_name: string;
  real_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  stories_count: number;
  pops_given: number;
  badges: string[];
  followers_count: number;
  following_count: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .single();

    if (data) setProfile(data as unknown as Profile);
  }, []);

  useEffect(() => {
    fetchProfile().finally(() => setLoading(false));
  }, [fetchProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, [fetchProfile]);

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C084FC" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C084FC" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => Alert.alert("Settings", "Coming soon")}>
            <Settings size={22} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Avatar placeholder */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.pen_name?.charAt(0)?.toUpperCase() ?? "?"}
          </Text>
        </View>

        <Text style={styles.penName}>{profile?.pen_name ?? "Unknown"}</Text>
        {profile?.real_name && (
          <Text style={styles.realName}>{profile.real_name}</Text>
        )}
        {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        <TouchableOpacity style={styles.editButton}>
          <Edit2 size={14} color="#C084FC" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.stories_count ?? 0}</Text>
          <Text style={styles.statLabel}>Stories</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.pops_given ?? 0}</Text>
          <Text style={styles.statLabel}>Pops</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.followers_count ?? 0}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.following_count ?? 0}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
      </View>

      {/* Badges section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Trophy size={18} color="#F59E0B" />
          <Text style={styles.sectionTitle}>Badges</Text>
        </View>
        {profile?.badges && profile.badges.length > 0 ? (
          <View style={styles.badgeGrid}>
            {profile.badges.map((badge) => (
              <View key={badge} style={styles.badge}>
                <Star size={16} color="#F59E0B" />
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptySection}>No badges earned yet. Start reading and writing!</Text>
        )}
      </View>

      {/* Quick links */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem}>
          <BookOpen size={18} color="#9CA3AF" />
          <Text style={styles.menuText}>My Reading History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <PenLine size={18} color="#9CA3AF" />
          <Text style={styles.menuText}>My Stories</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Settings size={18} color="#9CA3AF" />
          <Text style={styles.menuText}>Account Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <LogOut size={18} color="#F87171" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
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
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerActions: {
    position: "absolute",
    top: 60,
    right: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
  },
  penName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F3F4F6",
  },
  realName: {
    fontSize: 15,
    color: "#9CA3AF",
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#7C3AED",
  },
  editButtonText: {
    color: "#C084FC",
    fontSize: 13,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    backgroundColor: "#1A1228",
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 4,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F3F4F6",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#2D2640",
  },
  section: {
    marginTop: 24,
    marginHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F3F4F6",
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1A1228",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2D2640",
  },
  badgeText: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "500",
  },
  emptySection: {
    color: "#6B7280",
    fontSize: 14,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1228",
  },
  menuText: {
    color: "#D1D5DB",
    fontSize: 15,
    fontWeight: "500",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 32,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#1A1228",
    borderWidth: 1,
    borderColor: "#F8717133",
  },
  signOutText: {
    color: "#F87171",
    fontSize: 15,
    fontWeight: "600",
  },
});
