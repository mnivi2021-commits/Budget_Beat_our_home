import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Card, Chips, Divider, Field, Muted, Row, Screen, SectionTitle, Table, Text } from '@/components/ui';
import {
  BMI_CATEGORIES,
  bmiCategory,
  calcBmi,
  canDonateTo,
  canReceiveFrom,
  dailyCalories,
  healthyWeightRange,
  idealWaterLitres,
} from '@/lib/bmi';
import { formatShortDate } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';
import { BLOOD_GROUPS } from '@/lib/types';
import type { BloodGroup, Profile } from '@/lib/types';

export default function BeatScreen() {
  const { data } = useStore();
  const [editing, setEditing] = useState(!data.profile);

  return (
    <Screen title="Beat ❤" subtitle="Your health details and BMI report">
      {editing || !data.profile ? (
        <ProfileForm initial={data.profile} onDone={() => setEditing(false)} />
      ) : (
        <Report profile={data.profile} onEdit={() => setEditing(true)} />
      )}
    </Screen>
  );
}

function ProfileForm({ initial, onDone }: { initial: Profile | null; onDone: () => void }) {
  const c = useColors();
  const { saveProfile } = useStore();
  const [name, setName] = useState(initial?.name ?? '');
  const [age, setAge] = useState(initial ? String(initial.age) : '');
  const [blood, setBlood] = useState<BloodGroup>(initial?.bloodGroup ?? 'O+');
  const [height, setHeight] = useState(initial ? String(initial.heightCm) : '');
  const [weight, setWeight] = useState(initial ? String(initial.weightKg) : '');

  const submit = () => {
    const a = Number(age);
    const h = Number(height);
    const w = Number(weight);
    if (!name.trim()) return Alert.alert('Missing name', 'Please enter your name.');
    if (!(a > 0 && a < 120)) return Alert.alert('Check age', 'Enter an age between 1 and 119.');
    if (!(h >= 50 && h <= 250)) return Alert.alert('Check height', 'Enter height in centimetres (50–250).');
    if (!(w >= 2 && w <= 350)) return Alert.alert('Check weight', 'Enter weight in kilograms (2–350).');
    saveProfile({ name: name.trim(), age: a, bloodGroup: blood, heightCm: h, weightKg: w });
    onDone();
  };

  return (
    <Card>
      <SectionTitle>{initial ? 'Update your details' : 'Tell us about you'}</SectionTitle>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
      <Field label="Age (years)" value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="30" />
      <Text style={[styles.label, { color: c.muted }]}>Blood group</Text>
      <Chips options={BLOOD_GROUPS} value={blood} onChange={setBlood} color={c.beat} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="165" />
        <Field label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="62" />
      </View>
      <Button title="Calculate BMI & show report" onPress={submit} color={c.beat} />
      {initial ? (
        <View style={{ marginTop: 8 }}>
          <Button title="Cancel" onPress={onDone} variant="outline" color={c.beat} />
        </View>
      ) : null}
    </Card>
  );
}

function Report({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  const c = useColors();
  const { data } = useStore();
  const bmi = calcBmi(profile.weightKg, profile.heightCm);
  const cat = bmiCategory(bmi);
  const [lo, hi] = healthyWeightRange(profile.heightCm);

  let weightAdvice = 'Your weight is inside the healthy range for your height. 🎉';
  if (profile.weightKg < lo) weightAdvice = `Gain about ${(lo - profile.weightKg).toFixed(1)} kg to reach the healthy range.`;
  if (profile.weightKg > hi) weightAdvice = `Lose about ${(profile.weightKg - hi).toFixed(1)} kg to reach the healthy range.`;

  // Position of the marker on a 12–42 BMI scale.
  const pct = Math.min(100, Math.max(0, ((bmi - 12) / 30) * 100));

  return (
    <>
      <Card style={{ alignItems: 'center' }}>
        <Muted>BMI report for</Muted>
        <Text style={{ color: c.text, fontSize: 20, fontWeight: '800' }}>{profile.name}</Text>
        <Text style={[styles.bmi, { color: cat.color }]}>{bmi.toFixed(1)}</Text>
        <View style={[styles.badge, { backgroundColor: cat.color }]}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>{cat.label}</Text>
        </View>

        <View style={styles.scaleWrap}>
          <View style={styles.scale}>
            {BMI_CATEGORIES.map((k) => {
              const from = Math.max(12, k.min);
              const to = Math.min(42, k.max);
              return <View key={k.label} style={{ flex: to - from, backgroundColor: k.color }} />;
            })}
          </View>
          <View style={[styles.marker, { left: `${pct}%`, borderTopColor: c.text }]} />
          <View style={styles.scaleLabels}>
            {['12', '18.5', '25', '30', '35', '40+'].map((l) => (
              <Text key={l} style={{ color: c.muted, fontSize: 10 }}>
                {l}
              </Text>
            ))}
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle>Analysis</SectionTitle>
        <Row label="Age" value={`${profile.age} yrs`} />
        <Row label="Height" value={`${profile.heightCm} cm`} />
        <Row label="Weight" value={`${profile.weightKg} kg`} />
        <Row label="Healthy weight for you" value={`${lo.toFixed(1)} – ${hi.toFixed(1)} kg`} />
        <Row label="Daily calories (approx.)" value={`${dailyCalories(profile.weightKg, profile.heightCm, profile.age)} kcal`} />
        <Row label="Daily water" value={`${idealWaterLitres(profile.weightKg)} L`} />
        <Divider />
        <Text style={{ color: c.text, fontWeight: '700', marginBottom: 4 }}>{weightAdvice}</Text>
        <Text style={{ color: c.text, marginBottom: 4 }}>
          <Text style={{ fontWeight: '700' }}>Health risk: </Text>
          {cat.risk}
        </Text>
        <Text style={{ color: c.text }}>
          <Text style={{ fontWeight: '700' }}>What to do: </Text>
          {cat.advice}
        </Text>
        {profile.age < 18 ? (
          <Muted style={{ marginTop: 8 }}>
            Note: for people under 18, doctors use BMI-for-age percentile charts. Treat this result as a rough guide only.
          </Muted>
        ) : null}
        {profile.age >= 65 ? (
          <Muted style={{ marginTop: 8 }}>
            Note: for people over 65, a BMI slightly above 25 is often considered fine. Ask your doctor.
          </Muted>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>BMI categories</SectionTitle>
        <Table
          columns={[
            { title: 'Category', flex: 3 },
            { title: 'BMI range', flex: 2, align: 'right' },
          ]}
          rows={BMI_CATEGORIES.map((k) => {
            const range = k.min === 0 ? `< ${k.max}` : k.max === Infinity ? `≥ ${k.min}` : `${k.min} – ${(k.max - 0.1).toFixed(1)}`;
            const mine = k.label === cat.label;
            return [
              <View key="c" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.dot, { backgroundColor: k.color }]} />
                <Text style={{ color: c.text, fontWeight: mine ? '800' : '400', fontSize: 13 }}>
                  {k.label}
                  {mine ? '  ← you' : ''}
                </Text>
              </View>,
              range,
            ];
          })}
        />
      </Card>

      <Card>
        <SectionTitle>Blood group {profile.bloodGroup}</SectionTitle>
        <Row label="Can donate to" value={canDonateTo(profile.bloodGroup).join(', ')} />
        <Row label="Can receive from" value={canReceiveFrom(profile.bloodGroup).join(', ')} />
        {profile.bloodGroup === 'O-' ? <Muted>You are a universal donor. 🩸</Muted> : null}
        {profile.bloodGroup === 'AB+' ? <Muted>You are a universal recipient.</Muted> : null}
      </Card>

      {data.weightLog.length > 1 ? (
        <Card>
          <SectionTitle>Weight history</SectionTitle>
          <Table
            columns={[
              { title: 'Date', flex: 3 },
              { title: 'Weight', flex: 2, align: 'right' },
              { title: 'BMI', flex: 2, align: 'right' },
            ]}
            rows={[...data.weightLog]
              .reverse()
              .slice(0, 12)
              .map((w) => [formatShortDate(w.date), `${w.weightKg} kg`, w.bmi.toFixed(1)])}
          />
        </Card>
      ) : null}

      <Button title="Update weight / details" onPress={onEdit} color={c.beat} />
      <Muted style={{ textAlign: 'center' }}>BMI is a screening tool, not a diagnosis. Consult a doctor for medical advice.</Muted>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  bmi: { fontSize: 64, fontWeight: '900', marginVertical: 4 },
  badge: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  scaleWrap: { alignSelf: 'stretch', marginTop: 20 },
  scale: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' },
  marker: {
    position: 'absolute',
    top: -10,
    marginLeft: -7,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
