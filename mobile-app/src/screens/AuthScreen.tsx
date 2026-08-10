import { useState } from "react"
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { BrandWordmark } from "../components/BrandWordmark"
import { useAuth } from "../context/auth-context"
import { colors } from "../theme"

type Role = "buyer" | "merchant"

export function AuthScreen() {
  const { login, signup } = useAuth()

  const [isSignup, setIsSignup] = useState(false)
  const [role, setRole] = useState<Role>("buyer")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [city, setCity] = useState("")
  const [stateText, setStateText] = useState("")
  const [cacId, setCacId] = useState("")
  const [smedanId, setSmedanId] = useState("")

  const onSubmit = async () => {
    setError("")
    setLoading(true)

    const result = isSignup
      ? await signup({
          email,
          password,
          name,
          phone,
          city,
          state: stateText,
          role,
          ...(role === "merchant" ? { cacId, smedanId, merchantType: "products" } : {}),
        })
      : await login(email, password)

    setLoading(false)

    if (!result.success) {
      setError(result.error || "Authentication failed")
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BrandWordmark />

        <View style={styles.card}>
          <Text style={styles.title}>{isSignup ? "Create Account" : "Welcome Back"}</Text>
          <Text style={styles.subtitle}>
            {isSignup ? "Join the BigCat Marketplace" : "Sign in to continue to your account"}
          </Text>

          {isSignup ? (
            <>
              {/* Role selector */}
              <View style={styles.roleRow}>
                {(["buyer", "merchant"] as Role[]).map((r) => (
                  <Pressable
                    key={r}
                    style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                    onPress={() => setRole(r)}
                  >
                    <Ionicons
                      name={r === "buyer" ? "person-outline" : "storefront-outline"}
                      size={16}
                      color={role === r ? "#fff" : colors.mutedText}
                    />
                    <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                      {r === "buyer" ? "Buyer" : "Merchant"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor={colors.mutedText}
                style={styles.input}
                autoCapitalize="words"
              />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone"
                placeholderTextColor={colors.mutedText}
                style={styles.input}
                keyboardType="phone-pad"
              />
              <View style={styles.doubleRow}>
                <TextInput
                  value={stateText}
                  onChangeText={setStateText}
                  placeholder="State"
                  placeholderTextColor={colors.mutedText}
                  style={[styles.input, styles.rowInput]}
                  autoCapitalize="words"
                />
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor={colors.mutedText}
                  style={[styles.input, styles.rowInput]}
                  autoCapitalize="words"
                />
              </View>

              {role === "merchant" && (
                <>
                  <TextInput
                    value={cacId}
                    onChangeText={setCacId}
                    placeholder="CAC Registration Number (optional)"
                    placeholderTextColor={colors.mutedText}
                    style={styles.input}
                    autoCapitalize="characters"
                  />
                  <TextInput
                    value={smedanId}
                    onChangeText={setSmedanId}
                    placeholder="SMEDAN ID (optional)"
                    placeholderTextColor={colors.mutedText}
                    style={styles.input}
                    autoCapitalize="characters"
                  />
                </>
              )}
            </>
          ) : null}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
            secureTextEntry
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={[styles.primaryButton, loading ? styles.primaryButtonDisabled : null]} onPress={onSubmit} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? "Please wait..." : isSignup ? "Create Account" : "Sign In"}</Text>
          </Pressable>

          <Pressable style={styles.switchButton} onPress={() => { setIsSignup((v) => !v); setError("") }}>
            <Text style={styles.switchButtonText}>
              {isSignup ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  doubleRow: {
    flexDirection: "row",
    gap: 8,
  },
  rowInput: {
    flex: 1,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 2,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: "700",
  },
  switchButton: {
    alignItems: "center",
    paddingVertical: 6,
  },
  switchButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  roleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
  },
  roleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleBtnText: {
    fontSize: 13,
    color: colors.mutedText,
    fontWeight: "600",
  },
  roleBtnTextActive: {
    color: "#fff",
  },
})
