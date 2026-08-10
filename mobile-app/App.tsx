import { StatusBar } from "expo-status-bar"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Animated,
  Dimensions,
  Image,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native"
import { WebView } from "react-native-webview"

const FALLBACK_URL = "https://v0-big-cat-marketplace.vercel.app"
const SPLASH_DURATION = 2800 // ms before WebView is shown

const { width, height } = Dimensions.get("window")

function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const logoScale = useRef(new Animated.Value(0.7)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const textOpacity = useRef(new Animated.Value(0)).current
  const dotOpacity = useRef(new Animated.Value(0)).current
  const fadeOut = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.sequence([
      // Logo pops in with spring
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Brand name fades in
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        delay: 100,
        useNativeDriver: true,
      }),
      // Loading dots appear
      Animated.timing(dotOpacity, {
        toValue: 1,
        duration: 300,
        delay: 300,
        useNativeDriver: true,
      }),
      // Hold
      Animated.delay(900),
      // Fade everything out
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish())
  }, [])

  return (
    <Animated.View style={[styles.splash, { opacity: fadeOut }]}>
      <Animated.View
        style={[
          styles.logoWrap,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <Image
          source={require("./assets/image.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.Text style={[styles.brandName, { opacity: textOpacity }]}>
        BigCat
      </Animated.Text>

      <Animated.View style={[styles.dotsRow, { opacity: dotOpacity }]}>
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </Animated.View>
    </Animated.View>
  )
}

function Dot({ delay }: { delay: number }) {
  const bounce = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(bounce, { toValue: -8, duration: 300, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600 - delay),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [])

  return (
    <Animated.View
      style={[styles.dot, { transform: [{ translateY: bounce }] }]}
    />
  )
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false)

  const appUrl = useMemo(() => {
    const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim()
    if (!configured) return FALLBACK_URL
    return configured.endsWith("/") ? configured.slice(0, -1) : configured
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
      {splashDone && (
        <WebView
          source={{ uri: appUrl }}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          setSupportMultipleWindows={false}
          bounces={false}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  logoWrap: {
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  logo: {
    width: 120,
    height: 120,
  },
  brandName: {
    fontSize: 36,
    fontWeight: "900",
    color: "#000000",
    letterSpacing: -1,
    marginBottom: 40,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00A651",
  },
})
