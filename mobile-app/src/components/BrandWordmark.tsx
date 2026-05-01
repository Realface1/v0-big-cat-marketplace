import { Image, StyleSheet, Text, View } from "react-native"

import { colors } from "../theme"

export function BrandWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={[styles.logoWrap, compact ? styles.logoWrapCompact : null]}>
        <Image source={require("../../assets/icon.png")} style={styles.logo} resizeMode="contain" />
      </View>
      <Text style={[styles.wordmark, compact ? styles.wordmarkCompact : null]}>BigCat Marketplace</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoWrap: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoWrapCompact: {
    width: 36,
    height: 36,
  },
  logo: {
    width: 30,
    height: 30,
  },
  wordmark: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  wordmarkCompact: {
    fontSize: 18,
  },
})
