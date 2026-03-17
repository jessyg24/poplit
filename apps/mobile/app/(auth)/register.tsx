import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  StyleSheet,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@poplit/core/validation";
import { supabase } from "@/lib/supabase";

export default function RegisterScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      pen_name: "",
      email: "",
      password: "",
      gdpr_consent: false as unknown as true,
    },
  });

  async function onSubmit(data: SignupInput) {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          pen_name: data.pen_name,
          gdpr_consent: data.gdpr_consent,
        },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert("Registration failed", error.message);
      return;
    }

    Alert.alert("Check your email", "We sent you a confirmation link to verify your account.", [
      { text: "OK", onPress: () => router.replace("/(auth)/login") },
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
        <Text style={styles.title}>Join PopLit</Text>
        <Text style={styles.subtitle}>Create your writer's account</Text>

        <Controller
          control={control}
          name="pen_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pen Name</Text>
              <TextInput
                style={styles.input}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="your-pen-name"
                placeholderTextColor="#666"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.pen_name && <Text style={styles.error}>{errors.pen_name.message}</Text>}
              <Text style={styles.hint}>Letters, numbers, hyphens, and underscores only</Text>
            </View>
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="you@example.com"
                placeholderTextColor="#666"
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
            </View>
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="At least 8 characters"
                placeholderTextColor="#666"
                secureTextEntry
                textContentType="newPassword"
              />
              {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
            </View>
          )}
        />

        <Controller
          control={control}
          name="gdpr_consent"
          render={({ field: { onChange, value } }) => (
            <View style={styles.consentRow}>
              <Switch
                value={value}
                onValueChange={onChange}
                trackColor={{ false: "#2D2640", true: "#7C3AED" }}
                thumbColor={value ? "#C084FC" : "#6B7280"}
              />
              <Text style={styles.consentText}>
                I agree to the{" "}
                <Text style={styles.consentLink}>Privacy Policy</Text> and{" "}
                <Text style={styles.consentLink}>Terms of Service</Text>
              </Text>
            </View>
          )}
        />
        {errors.gdpr_consent && (
          <Text style={[styles.error, { marginBottom: 8 }]}>{errors.gdpr_consent.message}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkTextBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </Link>
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
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#C084FC",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#D1D5DB",
    marginBottom: 6,
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
  error: {
    color: "#F87171",
    fontSize: 12,
    marginTop: 4,
  },
  hint: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 4,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
    marginTop: 8,
  },
  consentText: {
    flex: 1,
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 18,
  },
  consentLink: {
    color: "#C084FC",
    textDecorationLine: "underline",
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: "#7C3AED",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  linkButton: {
    marginTop: 24,
    alignItems: "center",
  },
  linkText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  linkTextBold: {
    color: "#C084FC",
    fontWeight: "700",
  },
});
