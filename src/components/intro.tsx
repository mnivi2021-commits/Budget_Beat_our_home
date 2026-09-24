import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';

/** Opening page shown each time the app starts. Tap to skip. */
export function Intro({ onDone }: { onDone: () => void }) {
  const [fade] = useState(() => new Animated.Value(0));
  const [rise] = useState(() => new Animated.Value(24));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [fade, rise, onDone]);

  return (
    <Pressable style={{ flex: 1 }} onPress={onDone}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0F172A', '#1E3A8A', '#58CC02']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bg}>
        <Animated.View style={{ alignItems: 'center', opacity: fade, transform: [{ translateY: rise }] }}>
          <View style={styles.logo}>
            <Text style={{ fontSize: 44 }}>🤖</Text>
          </View>
          <Text style={styles.company}>NIVIRAGA</Text>
          <Text style={styles.companySub}>AI SOLUTION</Text>
          <View style={styles.line} />
          <Text style={styles.presents}>presents</Text>
          <Text style={styles.app}>Budget & Beat</Text>
          <Text style={styles.tagline}>💰 Money · ❤ Health · 🛒 Home</Text>
        </Animated.View>
        <Animated.Text style={[styles.skip, { opacity: fade }]}>Tap to continue</Animated.Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  company: { color: '#fff', fontSize: 42, fontWeight: '900', letterSpacing: 6 },
  companySub: { color: '#89E219', fontSize: 20, fontWeight: '900', letterSpacing: 8, marginTop: 2 },
  line: { width: 60, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)', marginVertical: 22 },
  presents: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  app: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 4 },
  tagline: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '700', marginTop: 8 },
  skip: {
    position: 'absolute',
    bottom: 48,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
  },
});
