import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Bell, MessageCircle } from "lucide-react-native";
import { supabase } from "@/lib/supabase";

type TabType = "notifications" | "messages";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

interface Message {
  id: string;
  sender_pen_name: string;
  body: string;
  read: boolean;
  created_at: string;
}

export default function ActivityScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("notifications");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setNotifications(data as Notification[]);
  }, []);

  const fetchMessages = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase
      .from("messages")
      .select("id, sender_pen_name, body, read, created_at")
      .eq("receiver_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setMessages(data as Message[]);
  }, []);

  useEffect(() => {
    Promise.all([fetchNotifications(), fetchMessages()]).finally(() => setLoading(false));
  }, [fetchNotifications, fetchMessages]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchNotifications(), fetchMessages()]);
    setRefreshing(false);
  }, [fetchNotifications, fetchMessages]);

  function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "notifications" && styles.tabActive]}
          onPress={() => setActiveTab("notifications")}
        >
          <Bell size={16} color={activeTab === "notifications" ? "#C084FC" : "#6B7280"} />
          <Text style={[styles.tabText, activeTab === "notifications" && styles.tabTextActive]}>
            Notifications
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "messages" && styles.tabActive]}
          onPress={() => setActiveTab("messages")}
        >
          <MessageCircle size={16} color={activeTab === "messages" ? "#C084FC" : "#6B7280"} />
          <Text style={[styles.tabText, activeTab === "messages" && styles.tabTextActive]}>
            Messages
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "notifications" ? (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C084FC" />
          }
          renderItem={({ item }) => (
            <View style={[styles.card, !item.read && styles.cardUnread]}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
              <Text style={styles.cardTime}>{formatTimeAgo(item.created_at)}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Bell size={40} color="#2D2640" />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C084FC" />
          }
          renderItem={({ item }) => (
            <View style={[styles.card, !item.read && styles.cardUnread]}>
              <Text style={styles.cardSender}>{item.sender_pen_name}</Text>
              <Text style={styles.cardBody} numberOfLines={2}>
                {item.body}
              </Text>
              <Text style={styles.cardTime}>{formatTimeAgo(item.created_at)}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MessageCircle size={40} color="#2D2640" />
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          }
        />
      )}
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
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F3F4F6",
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: "#1A1228",
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "#2D2640",
  },
  tabText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#C084FC",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    backgroundColor: "#1A1228",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D2640",
  },
  cardUnread: {
    borderColor: "#7C3AED",
    borderLeftWidth: 3,
  },
  cardTitle: {
    color: "#F3F4F6",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardSender: {
    color: "#C084FC",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardBody: {
    color: "#9CA3AF",
    fontSize: 14,
    lineHeight: 20,
  },
  cardTime: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 8,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 16,
  },
});
