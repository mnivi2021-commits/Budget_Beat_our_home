import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text as RNText, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Gradients, alpha, shade, useColors } from '@/lib/theme';
import type { Section } from '@/lib/theme';

/**
 * Text that uses the rounded Nunito font. Android can't pick a font weight from a
 * custom family, so the fontWeight is mapped to the matching Nunito file.
 */
export function Text({ style, ...rest }: ComponentProps<typeof RNText>) {
  const flat = StyleSheet.flatten(style) ?? {};
  const w = String(flat.fontWeight ?? '600');
  const family =
    w === '900' || w === 'black' ? Fonts.black : w === '800' ? Fonts.heavy : w === '700' || w === 'bold' ? Fonts.bold : Fonts.regular;
  return <RNText {...rest} style={[flat, { fontFamily: family, fontWeight: undefined }]} />;
}

/** Page with a colourful gradient header that scrolls with the content. */
export function Screen({
  title,
  subtitle,
  section,
  emoji,
  header,
  children,
}: {
  title: string;
  subtitle?: string;
  section: Section;
  emoji: string;
  /** Extra content inside the header (stats, pickers…). */
  header?: ReactNode;
  children: ReactNode;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={Gradients[section]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 14 }]}>
          <Text style={styles.heroEmoji}>{emoji}</Text>
          <Text style={styles.heroTitle}>{title}</Text>
          {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
          {header ? <View style={{ marginTop: 14 }}>{header}</View> : null}
        </LinearGradient>
        <View style={styles.screen}>{children}</View>
      </ScrollView>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>;
}

/** − value + control. */
export function Counter({
  value,
  onChange,
  step = 1,
  min = 0,
  color,
  format,
  small,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  color?: string;
  format?: (v: number) => string;
  small?: boolean;
}) {
  const c = useColors();
  const tint = color ?? c.blue;
  const size = small ? 26 : 40;
  const btn = (label: string, next: number) => (
    <Pressable
      onPress={() => onChange(Math.max(min, Math.round(next * 100) / 100))}
      hitSlop={6}
      style={({ pressed }) => [
        styles.counterBtn,
        {
          width: size,
          height: size,
          borderRadius: size / 3,
          borderColor: alpha(tint, 0.5),
          backgroundColor: pressed ? alpha(tint, 0.3) : alpha(tint, 0.12),
        },
      ]}>
      <Text style={{ color: tint, fontWeight: '900', fontSize: small ? 15 : 20, lineHeight: small ? 18 : 24 }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: small ? 4 : 10 }}>
      {btn('−', value - step)}
      <Text style={{ color: c.text, fontWeight: '900', fontSize: small ? 13 : 18, minWidth: small ? 28 : 56, textAlign: 'center' }}>
        {format ? format(value) : String(value)}
      </Text>
      {btn('+', value + step)}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.sectionTitle, { color: c.text }]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[{ color: c.muted, fontSize: 14, lineHeight: 20 }, style]}>{children}</Text>;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
}) {
  const c = useColors();
  return (
    <View style={{ marginBottom: 12, flex: 1 }}>
      {label ? <Text style={[styles.label, { color: c.muted }]}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        keyboardType={keyboardType}
        style={[
          styles.input,
          { color: c.text, backgroundColor: c.inputBg, borderColor: c.border, fontFamily: Fonts.bold },
        ]}
      />
    </View>
  );
}

/** Chunky 3D button: a darker bottom edge that "presses in" when tapped. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  color,
  small,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  color?: string;
  small?: boolean;
}) {
  const c = useColors();
  const tint = color ?? c.primary;
  const filled = variant === 'primary';
  const edge = filled ? shade(tint) : c.border;
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View
          style={[
            styles.button,
            small && styles.buttonSmall,
            {
              backgroundColor: filled ? tint : c.card,
              borderColor: edge,
              borderBottomWidth: pressed ? 2 : small ? 3 : 4,
              marginTop: pressed ? (small ? 1 : 2) : 0,
            },
          ]}>
          <Text style={[styles.buttonText, { color: filled ? '#fff' : tint, fontSize: small ? 12 : 15 }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Answer-choice style chips: grey 3D tiles that turn coloured when selected. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  color,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  color?: string;
}) {
  const c = useColors();
  const tint = color ?? c.blue;
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const active = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            style={[
              styles.chip,
              {
                borderColor: active ? alpha(tint, 0.6) : c.border,
                backgroundColor: active ? alpha(tint, 0.15) : c.card,
              },
            ]}>
            <Text style={{ color: active ? tint : c.text, fontWeight: '800', fontSize: 14 }}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Segmented tabs in the same 3D-tile style. */
export function Segments<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={styles.segments}>
      {options.map((o) => {
        const active = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            style={[
              styles.segment,
              {
                borderColor: active ? alpha(c.blue, 0.6) : c.border,
                backgroundColor: active ? alpha(c.blue, 0.15) : c.card,
              },
            ]}>
            <Text style={{ color: active ? c.blue : c.muted, fontWeight: '800', fontSize: 13 }}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** "‹ label ›" navigator for days, weeks and months. */
export function Stepper({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  const c = useColors();
  const arrow = (txt: string, onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={10}>
      {({ pressed }) => (
        <View
          style={[
            styles.stepBtn,
            { borderColor: c.border, backgroundColor: c.card, borderBottomWidth: pressed ? 2 : 4, marginTop: pressed ? 2 : 0 },
          ]}>
          <Text style={{ color: c.blue, fontSize: 22, fontWeight: '900', lineHeight: 26 }}>{txt}</Text>
        </View>
      )}
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {arrow('‹', onPrev)}
      <Text style={{ color: c.text, fontWeight: '800', fontSize: 16, flex: 1, textAlign: 'center' }}>{label}</Text>
      {arrow('›', onNext)}
    </View>
  );
}

export function Row({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <Text style={{ color: c.text, fontWeight: bold ? '800' : '600', flex: 1, fontSize: 15 }}>{label}</Text>
      <Text style={{ color: color ?? c.text, fontWeight: bold ? '900' : '700', fontSize: 15 }}>{value}</Text>
    </View>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: 2, backgroundColor: c.border, marginVertical: 10, borderRadius: 1 }} />;
}

/** Thick rounded progress bar with a glossy highlight. value is 0–1. */
export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const c = useColors();
  const tint = color ?? c.primary;
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
      {pct > 0 ? (
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: tint }]}>
          <View style={styles.progressShine} />
        </View>
      ) : null}
    </View>
  );
}

/** Friendly mascot with a speech bubble. */
export function Bubble({ mascot = '🐷', children }: { mascot?: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.bubbleRow}>
      <Text style={{ fontSize: 54 }}>{mascot}</Text>
      <View style={[styles.bubble, { borderColor: c.border, backgroundColor: c.card }]}>
        <View style={[styles.bubbleTail, { borderRightColor: c.border }]} />
        <Text style={{ color: c.text, fontWeight: '700', fontSize: 15, lineHeight: 21 }}>{children}</Text>
      </View>
    </View>
  );
}

export type Column = { title: string; flex: number; align?: 'left' | 'right' | 'center' };

/** Simple rows-and-columns table. */
export function Table({ columns, rows, footer }: { columns: Column[]; rows: ReactNode[][]; footer?: ReactNode[] }) {
  const c = useColors();
  const cell = (content: ReactNode, col: Column, key: number, bold?: boolean) => (
    <View key={key} style={{ flex: col.flex, paddingHorizontal: 4 }}>
      {typeof content === 'string' || typeof content === 'number' ? (
        <Text
          style={{ color: c.text, textAlign: col.align ?? 'left', fontWeight: bold ? '900' : '600', fontSize: 13 }}>
          {content}
        </Text>
      ) : (
        content
      )}
    </View>
  );
  return (
    <View style={[styles.table, { borderColor: c.border }]}>
      <View style={[styles.tr, { backgroundColor: c.tableHead, borderColor: c.border }]}>
        {columns.map((col, i) => (
          <View key={i} style={{ flex: col.flex, paddingHorizontal: 4 }}>
            <Text style={{ color: c.muted, fontWeight: '900', fontSize: 11, textAlign: col.align ?? 'left', letterSpacing: 0.5 }}>
              {col.title.toUpperCase()}
            </Text>
          </View>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={[styles.tr, { borderColor: c.border }]}>
          {r.map((content, ci) => cell(content, columns[ci], ci))}
        </View>
      ))}
      {footer ? (
        <View style={[styles.tr, { backgroundColor: c.tableHead, borderColor: c.border, borderBottomWidth: 0 }]}>
          {footer.map((content, ci) => cell(content, columns[ci], ci, true))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 14 },
  hero: { paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroEmoji: { position: 'absolute', right: 18, bottom: 8, fontSize: 72, opacity: 0.25 },
  heroTitle: { color: '#fff', fontSize: 32, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: '700', marginTop: 2 },
  card: {
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 4,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  counterBtn: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 19, fontWeight: '900', marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '900', marginBottom: 6, letterSpacing: 0.8, textTransform: 'uppercase' },
  input: { borderWidth: 2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16 },
  button: {
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 12 },
  buttonText: { fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 2, borderBottomWidth: 4, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 13 },
  segments: { flexDirection: 'row', gap: 6 },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  progressTrack: { height: 16, borderRadius: 8, overflow: 'hidden' },
  progressFill: { height: 16, borderRadius: 8 },
  progressShine: {
    position: 'absolute',
    top: 4,
    left: 8,
    right: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  bubbleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bubble: { flex: 1, borderWidth: 2, borderRadius: 16, padding: 14 },
  bubbleTail: {
    position: 'absolute',
    left: -12,
    top: '50%',
    marginTop: -8,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  table: { borderWidth: 2, borderRadius: 14, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 2 },
});
