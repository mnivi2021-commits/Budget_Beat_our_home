import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Bubble,
  Button,
  Card,
  Chips,
  Counter,
  Divider,
  Field,
  Muted,
  ProgressBar,
  Row,
  Screen,
  SectionTitle,
  Segments,
  Stepper,
  Table,
  Text,
} from '@/components/ui';
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
import { addDays, formatDate, formatShortDate, todayKey } from '@/lib/dates';
import { screenshotView } from '@/lib/share';
import { newId, sum, useStore } from '@/lib/store';
import { Gradients, alpha, useColors } from '@/lib/theme';
import { ACTIVITY_GOALS, AVATARS, BLOOD_GROUPS, MAX_PEOPLE } from '@/lib/types';
import type { Activity, BloodGroup, Person } from '@/lib/types';

const TABS = ['Report', 'Daily', 'Edit'] as const;
type Tab = (typeof TABS)[number];

export default function BeatScreen() {
  const c = useColors();
  const { data, activePerson, setActivePerson } = useStore();
  const [tab, setTab] = useState<Tab>('Report');
  const [adding, setAdding] = useState(data.people.length === 0);
  const [askShot, setAskShot] = useState(false);
  // Bumping this remounts the tab content: clears unsaved input and goes back to today.
  const [refreshKey, setRefreshKey] = useState(0);
  const reportRef = useRef<View>(null);

  // After details are saved, offer a screenshot of the final report.
  useEffect(() => {
    if (!askShot || tab !== 'Report' || !activePerson) return;
    const name = activePerson.name;
    const t = setTimeout(() => {
      setAskShot(false);
      Alert.alert('Final report is ready 🎉', `Do you want a screenshot of ${name}'s report?`, [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, take it', onPress: () => screenshotView(reportRef, name) },
      ]);
    }, 700);
    return () => clearTimeout(t);
  }, [askShot, tab, activePerson]);

  const refresh = () => {
    setRefreshKey((k) => k + 1);
    setAdding(false);
    setTab('Report');
  };

  const onSaved = () => {
    setAdding(false);
    setTab('Report');
    setAskShot(true);
  };

  const people = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
      {data.people.map((p) => {
        const active = !adding && p.id === activePerson?.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => {
              setAdding(false);
              setActivePerson(p.id);
            }}
            style={[styles.person, { backgroundColor: active ? '#fff' : 'rgba(255,255,255,0.22)' }]}>
            <Text style={{ fontSize: 26 }}>{p.avatar}</Text>
            <Text style={{ color: active ? c.beat : '#fff', fontWeight: '900', fontSize: 12 }} numberOfLines={1}>
              {p.name}
            </Text>
          </Pressable>
        );
      })}
      {data.people.length < MAX_PEOPLE ? (
        <Pressable
          onPress={() => setAdding(true)}
          style={[styles.person, styles.addPerson, { backgroundColor: adding ? '#fff' : 'transparent' }]}>
          <Text style={{ fontSize: 24, color: adding ? c.beat : '#fff', fontWeight: '900' }}>＋</Text>
          <Text style={{ color: adding ? c.beat : '#fff', fontWeight: '900', fontSize: 12 }}>Add</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );

  return (
    <Screen
      title="Beat"
      subtitle={`Family health · ${data.people.length}/${MAX_PEOPLE} people`}
      section="beat"
      emoji="❤"
      header={data.people.length ? people : undefined}>
      {adding || !activePerson ? (
        <PersonForm key="new" initial={null} onSaved={onSaved} onCancel={data.people.length ? () => setAdding(false) : undefined} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Segments options={TABS} value={tab} onChange={setTab} />
            </View>
            <Pressable
              onPress={refresh}
              hitSlop={6}
              style={({ pressed }) => [
                styles.refresh,
                { borderColor: c.border, backgroundColor: c.card, borderBottomWidth: pressed ? 2 : 4, marginTop: pressed ? 2 : 0 },
              ]}>
              <Text style={{ fontSize: 18 }}>🔄</Text>
            </Pressable>
          </View>
          {tab === 'Report' && <Report key={refreshKey} person={activePerson} reportRef={reportRef} onEdit={() => setTab('Edit')} />}
          {tab === 'Daily' && <DailyActivity key={refreshKey} person={activePerson} />}
          {tab === 'Edit' && <PersonForm key={`${activePerson.id}-${refreshKey}`} initial={activePerson} onSaved={onSaved} />}
        </>
      )}
    </Screen>
  );
}

function PersonForm({ initial, onSaved, onCancel }: { initial: Person | null; onSaved: () => void; onCancel?: () => void }) {
  const c = useColors();
  const { savePerson, deletePerson } = useStore();
  const [avatar, setAvatar] = useState<string>(initial?.avatar ?? AVATARS[0]);
  const [name, setName] = useState(initial?.name ?? '');
  const [age, setAge] = useState(initial ? String(initial.age) : '');
  const [blood, setBlood] = useState<BloodGroup>(initial?.bloodGroup ?? 'O+');
  const [height, setHeight] = useState(initial ? String(initial.heightCm) : '');
  const [weight, setWeight] = useState(initial ? String(initial.weightKg) : '');

  const submit = () => {
    const a = Number(age);
    const h = Number(height);
    const w = Number(weight);
    if (!name.trim()) return Alert.alert('Missing name', 'Please enter the name.');
    if (!(a > 0 && a < 120)) return Alert.alert('Check age', 'Enter an age between 1 and 119.');
    if (!(h >= 50 && h <= 250)) return Alert.alert('Check height', 'Enter height in centimetres (50–250).');
    if (!(w >= 2 && w <= 350)) return Alert.alert('Check weight', 'Enter weight in kilograms (2–350).');
    savePerson({ id: initial?.id ?? newId(), avatar, name: name.trim(), age: a, bloodGroup: blood, heightCm: h, weightKg: w });
    onSaved();
  };

  const remove = () =>
    initial &&
    Alert.alert(`Remove ${initial.name}?`, 'Their details, daily activity and weight history will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deletePerson(initial.id) },
    ]);

  return (
    <Card>
      <SectionTitle>{initial ? `Edit ${initial.name}` : 'Add a family member'}</SectionTitle>
      <Text style={[styles.label, { color: c.muted }]}>Avatar</Text>
      <Chips options={AVATARS} value={avatar as (typeof AVATARS)[number]} onChange={setAvatar} color={c.beat} />
      <Field label="Name" value={name} onChangeText={setName} placeholder="Name" />
      <Field label="Age (years)" value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="30" />
      <Text style={[styles.label, { color: c.muted }]}>Blood group</Text>
      <Chips options={BLOOD_GROUPS} value={blood} onChange={setBlood} color={c.beat} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="165" />
        <Field label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="62" />
      </View>
      <View style={{ gap: 10 }}>
        <Button title={initial ? 'Save & show report' : 'Calculate BMI & report'} onPress={submit} color={c.beat} />
        {onCancel ? <Button title="Cancel" onPress={onCancel} variant="outline" color={c.beat} /> : null}
        {initial ? <Button title="Remove person" onPress={remove} variant="outline" color={c.muted} /> : null}
      </View>
    </Card>
  );
}

function DailyActivity({ person }: { person: Person }) {
  const c = useColors();
  const [date, setDate] = useState(todayKey());
  const { data } = useStore();
  const recent = Array.from({ length: 7 }, (_, i) => addDays(todayKey(), -i));
  const logs = data.activities.filter((a) => a.personId === person.id);

  return (
    <>
      <Stepper
        label={formatDate(date)}
        onPrev={() => setDate(addDays(date, -1))}
        onNext={() => date < todayKey() && setDate(addDays(date, 1))}
      />
      <ActivityForm key={`${person.id}-${date}`} person={person} date={date} />
      <Card>
        <SectionTitle>Last 7 days</SectionTitle>
        <Table
          columns={[
            { title: 'Day', flex: 3 },
            { title: 'Steps', flex: 2, align: 'right' },
            { title: 'Water', flex: 2, align: 'right' },
            { title: 'Exer.', flex: 2, align: 'right' },
            { title: 'Sleep', flex: 2, align: 'right' },
          ]}
          rows={recent.map((d) => {
            const a = logs.find((x) => x.date === d);
            return [
              <Pressable key="d" onPress={() => setDate(d)}>
                <Text style={{ color: d === date ? c.beat : c.text, fontWeight: d === date ? '900' : '700', fontSize: 13 }}>
                  {a ? '✏️ ' : ''}
                  {formatShortDate(d)}
                </Text>
              </Pressable>,
              a ? String(a.steps) : '–',
              a ? `${a.waterGlasses}🥛` : '–',
              a ? `${a.exerciseMin}m` : '–',
              a ? `${a.sleepHours}h` : '–',
            ];
          })}
        />
        <Muted style={{ marginTop: 6, fontSize: 12 }}>Tap a day to open it and correct the entry.</Muted>
      </Card>
    </>
  );
}

function ActivityForm({ person, date }: { person: Person; date: string }) {
  const c = useColors();
  const { data, saveActivity, savePerson, deleteActivity } = useStore();
  const existing = data.activities.find((a) => a.personId === person.id && a.date === date);
  const [steps, setSteps] = useState(existing ? String(existing.steps) : '');
  const [water, setWater] = useState(existing?.waterGlasses ?? 0);
  const [exercise, setExercise] = useState(existing?.exerciseMin ?? 0);
  const [sleep, setSleep] = useState(existing?.sleepHours ?? 7);
  const [weight, setWeight] = useState('');

  const save = () => {
    const s = Number(steps || 0);
    if (!(s >= 0)) return Alert.alert('Check steps', 'Enter a valid number of steps.');
    saveActivity({ personId: person.id, date, steps: s, waterGlasses: water, exerciseMin: exercise, sleepHours: sleep });
    const w = Number(weight);
    if (weight.trim() && w >= 2 && w <= 350) savePerson({ ...person, weightKg: w });
    setWeight('');
    Alert.alert('Saved ✅', `${person.name}'s activity for ${formatShortDate(date)} is updated.`);
  };

  const item = (emoji: string, label: string, goal: string, control: ReactNode) => (
    <View style={[styles.activityRow, { borderColor: c.border }]}>
      <Text style={{ fontSize: 26 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontWeight: '900', fontSize: 15 }}>{label}</Text>
        <Muted style={{ fontSize: 12 }}>{goal}</Muted>
      </View>
      {control}
    </View>
  );

  return (
    <Card>
      <SectionTitle>
        {person.avatar} {person.name}&apos;s day
      </SectionTitle>
      <Field label="Steps walked 👟" value={steps} onChangeText={setSteps} keyboardType="number-pad" placeholder="e.g. 6000" />
      {item('🥛', 'Water', `Goal ${ACTIVITY_GOALS.waterGlasses} glasses`, <Counter value={water} onChange={setWater} color={c.blue} />)}
      {item('🏃', 'Exercise', `Goal ${ACTIVITY_GOALS.exerciseMin} min`, <Counter value={exercise} onChange={setExercise} step={5} color={c.primary} format={(v) => `${v}m`} />)}
      {item('😴', 'Sleep', `Goal 7–9 hours`, <Counter value={sleep} onChange={setSleep} step={0.5} color={c.purple} format={(v) => `${v}h`} />)}
      <View style={{ marginTop: 12 }}>
        <Field label={`Today's weight (optional, now ${person.weightKg} kg)`} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="kg" />
      </View>
      <View style={{ gap: 10 }}>
        <Button title={existing ? 'Update activity' : 'Save activity'} onPress={save} color={c.beat} />
        {existing ? (
          <Button
            title="Delete this day"
            variant="outline"
            color={c.muted}
            onPress={() =>
              Alert.alert('Delete this day?', `${person.name} · ${formatShortDate(date)}`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteActivity(person.id, date) },
              ])
            }
          />
        ) : null}
      </View>
    </Card>
  );
}

/** 0–100 score: half from BMI, half from the last 7 days of activity. */
function healthScore(bmi: number, week: Activity[]): number {
  const bmiPts = bmi >= 18.5 && bmi < 25 ? 50 : Math.max(0, 50 - Math.min(Math.abs(bmi < 18.5 ? 18.5 - bmi : bmi - 24.9), 10) * 5);
  if (!week.length) return Math.round(bmiPts);
  const avg = (f: (a: Activity) => number) => sum(week.map(f)) / week.length;
  const part = (v: number, goal: number) => Math.min(1, v / goal) * 12.5;
  const sleepAvg = avg((a) => a.sleepHours);
  const sleepPts = sleepAvg >= 7 && sleepAvg <= 9 ? 12.5 : Math.max(0, 12.5 - Math.abs(sleepAvg < 7 ? 7 - sleepAvg : sleepAvg - 9) * 4);
  return Math.round(
    bmiPts +
      part(avg((a) => a.steps), ACTIVITY_GOALS.steps) +
      part(avg((a) => a.waterGlasses), ACTIVITY_GOALS.waterGlasses) +
      part(avg((a) => a.exerciseMin), ACTIVITY_GOALS.exerciseMin) +
      sleepPts,
  );
}

function Report({ person, reportRef, onEdit }: { person: Person; reportRef: RefObject<View | null>; onEdit: () => void }) {
  const c = useColors();
  const { data, deleteWeightLog } = useStore();
  const [cardSize, setCardSize] = useState<{ width: number; height: number } | undefined>();
  const bmi = calcBmi(person.weightKg, person.heightCm);
  const cat = bmiCategory(bmi);
  const [lo, hi] = healthyWeightRange(person.heightCm);
  const since = addDays(todayKey(), -6);
  const week = data.activities.filter((a) => a.personId === person.id && a.date >= since);
  const score = healthScore(bmi, week);
  const avg = (f: (a: Activity) => number) => (week.length ? sum(week.map(f)) / week.length : 0);
  const history = data.weightLog.filter((w) => w.personId === person.id);

  let weightAdvice = 'Weight is inside the healthy range for this height. 🎉';
  if (person.weightKg < lo) weightAdvice = `Gain about ${(lo - person.weightKg).toFixed(1)} kg to reach the healthy range.`;
  if (person.weightKg > hi) weightAdvice = `Lose about ${(person.weightKg - hi).toFixed(1)} kg to reach the healthy range.`;


  const goalRow = (emoji: string, label: string, value: number, goal: number, unit: string, color: string) => (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: c.text, fontWeight: '800' }}>
          {emoji} {label}
        </Text>
        <Text style={{ color: c.muted, fontWeight: '800' }}>
          {Math.round(value * 10) / 10} / {goal} {unit}
        </Text>
      </View>
      <ProgressBar value={value / goal} color={color} />
    </View>
  );

  return (
    <>
      <Button title="✏️ Edit details (name, age, height, weight…)" onPress={onEdit} variant="outline" color={c.beat} />

      {/* This compact card is what the screenshot captures. */}
      <View ref={reportRef} collapsable={false} onLayout={(e) => setCardSize(e.nativeEvent.layout)}>
        <ReportCard person={person} bmi={bmi} score={score} week={week} weightAdvice={weightAdvice} />
      </View>

      <Button title="📸 Screenshot report card" onPress={() => screenshotView(reportRef, person.name, cardSize)} color={c.beat} />

      <Text style={{ color: c.muted, fontWeight: '900', fontSize: 12, letterSpacing: 1, marginTop: 6 }}>DETAILS</Text>
      <Card>
        <SectionTitle>Analysis</SectionTitle>
        <Row label="Healthy weight" value={`${lo.toFixed(1)} – ${hi.toFixed(1)} kg`} />
        <Row label="Daily calories (approx.)" value={`${dailyCalories(person.weightKg, person.heightCm, person.age)} kcal`} />
        <Row label="Daily water" value={`${idealWaterLitres(person.weightKg)} L`} />
        <Divider />
        <Text style={{ color: c.text, fontWeight: '800', marginBottom: 6 }}>{weightAdvice}</Text>
        <Text style={{ color: c.text, marginBottom: 6 }}>
          <Text style={{ fontWeight: '900' }}>Health risk: </Text>
          {cat.risk}
        </Text>
        <Text style={{ color: c.text }}>
          <Text style={{ fontWeight: '900' }}>What to do: </Text>
          {cat.advice}
        </Text>
        {person.age < 18 ? (
          <Muted style={{ marginTop: 8 }}>Under 18: doctors use BMI-for-age charts, so treat this as a rough guide.</Muted>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>Activity · last 7 days</SectionTitle>
        {week.length ? (
          <>
            {goalRow('👟', 'Steps / day', avg((a) => a.steps), ACTIVITY_GOALS.steps, '', c.primary)}
            {goalRow('🥛', 'Water / day', avg((a) => a.waterGlasses), ACTIVITY_GOALS.waterGlasses, 'glasses', c.blue)}
            {goalRow('🏃', 'Exercise / day', avg((a) => a.exerciseMin), ACTIVITY_GOALS.exerciseMin, 'min', c.orange)}
            {goalRow('😴', 'Sleep / night', avg((a) => a.sleepHours), ACTIVITY_GOALS.sleepHours, 'hrs', c.purple)}
            <Muted>Based on {week.length} logged day(s).</Muted>
          </>
        ) : (
          <Muted>No activity logged this week. Open the Daily tab to add steps, water, exercise and sleep.</Muted>
        )}
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
                <Text style={{ color: c.text, fontWeight: mine ? '900' : '600', fontSize: 13 }}>
                  {k.label}
                  {mine ? '  ← now' : ''}
                </Text>
              </View>,
              range,
            ];
          })}
        />
      </Card>

      <Card>
        <SectionTitle>Blood group {person.bloodGroup} 🩸</SectionTitle>
        <Row label="Can donate to" value={canDonateTo(person.bloodGroup).join(', ')} />
        <Row label="Can receive from" value={canReceiveFrom(person.bloodGroup).join(', ')} />
      </Card>
      {history.length > 1 ? (
        <Card>
          <SectionTitle>Weight history</SectionTitle>
          <Table
            columns={[
              { title: 'Date', flex: 3 },
              { title: 'Weight', flex: 2, align: 'right' },
              { title: 'BMI', flex: 2, align: 'right' },
            ]}
            rows={[...history]
              .reverse()
              .slice(0, 12)
              .map((w) => [
                <Pressable
                  key="d"
                  onPress={() =>
                    Alert.alert('Delete this entry?', `${formatShortDate(w.date)} · ${w.weightKg} kg`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteWeightLog(person.id, w.date) },
                    ])
                  }>
                  <Text style={{ color: c.text, fontSize: 13 }}>✕ {formatShortDate(w.date)}</Text>
                </Pressable>,
                `${w.weightKg} kg`,
                w.bmi.toFixed(1),
              ])}
          />
          <Muted style={{ marginTop: 6, fontSize: 12 }}>Tap a date to delete a wrong entry.</Muted>
        </Card>
      ) : null}

      {data.people.length > 1 ? <FamilyTable /> : <Bubble mascot="🩺">Add up to {MAX_PEOPLE} family members with the ＋ button above.</Bubble>}
    </>
  );
}

// Fixed light colours so the shared image looks the same in light and dark mode.
const R = {
  text: '#3C3C3C',
  muted: '#7A7A7A',
  border: '#ECECEC',
  soft: '#F7F7F7',
  green: '#58CC02',
  orange: '#FF9600',
  red: '#FF4B4B',
  blue: '#1CB0F6',
  purple: '#CE82FF',
};

/** Compact, shareable report card (the part that gets screenshotted). */
function ReportCard({
  person,
  bmi,
  score,
  week,
  weightAdvice,
}: {
  person: Person;
  bmi: number;
  score: number;
  week: Activity[];
  weightAdvice: string;
}) {
  const cat = bmiCategory(bmi);
  const [lo, hi] = healthyWeightRange(person.heightCm);
  const pct = Math.min(100, Math.max(0, ((bmi - 12) / 30) * 100));
  const scoreColor = score >= 75 ? R.green : score >= 50 ? R.orange : R.red;
  const avg = (f: (a: Activity) => number) => (week.length ? sum(week.map(f)) / week.length : 0);

  const tile = (label: string, value: string) => (
    <View style={card.tile}>
      <Text style={card.tileLabel}>{label}</Text>
      <Text style={card.tileValue}>{value}</Text>
    </View>
  );
  const bar = (emoji: string, label: string, value: number, goal: number, unit: string, color: string) => (
    <View style={{ flex: 1, minWidth: '45%' }}>
      <Text style={{ color: R.text, fontWeight: '800', fontSize: 12 }}>
        {emoji} {label}{' '}
        <Text style={{ color: R.muted }}>
          {Math.round(value * 10) / 10}/{goal}
          {unit}
        </Text>
      </Text>
      <View style={card.track}>
        <View style={[card.fill, { width: `${Math.min(1, value / goal) * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );

  return (
    <View style={card.wrap}>
      <LinearGradient colors={Gradients.beat} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={card.header}>
        <View style={{ flex: 1 }}>
          <Text style={card.brand}>NIVIRAGA AI SOLUTION</Text>
          <Text style={card.headTitle}>Health Report ❤</Text>
        </View>
        <Text style={card.headDate}>{formatShortDate(todayKey())}</Text>
      </LinearGradient>

      <View style={card.body}>
        <View style={card.personRow}>
          <Text style={{ fontSize: 40 }}>{person.avatar}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: R.text, fontSize: 22, fontWeight: '900' }}>{person.name}</Text>
            <Text style={{ color: R.muted, fontWeight: '700', fontSize: 13 }}>
              {person.age} yrs · Blood {person.bloodGroup} · {person.heightCm} cm · {person.weightKg} kg
            </Text>
          </View>
        </View>

        <View style={card.bigRow}>
          <View style={[card.bigBox, { borderColor: alpha(cat.color, 0.4), backgroundColor: alpha(cat.color, 0.08) }]}>
            <Text style={card.bigLabel}>BMI</Text>
            <Text style={{ color: cat.color, fontSize: 40, fontWeight: '900', lineHeight: 46 }}>{bmi.toFixed(1)}</Text>
            <View style={[card.badge, { backgroundColor: cat.color }]}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>{cat.label}</Text>
            </View>
          </View>
          <View style={[card.bigBox, { borderColor: alpha(scoreColor, 0.4), backgroundColor: alpha(scoreColor, 0.08) }]}>
            <Text style={card.bigLabel}>HEALTH SCORE</Text>
            <Text style={{ color: scoreColor, fontSize: 40, fontWeight: '900', lineHeight: 46 }}>{score}</Text>
            <Text style={{ color: R.muted, fontWeight: '800', fontSize: 12 }}>out of 100</Text>
          </View>
        </View>

        <View style={{ marginTop: 14, marginBottom: 4 }}>
          <View style={card.scale}>
            {BMI_CATEGORIES.map((k) => {
              const from = Math.max(12, k.min);
              const to = Math.min(42, k.max);
              return <View key={k.label} style={{ flex: to - from, backgroundColor: k.color }} />;
            })}
          </View>
          <View style={[card.marker, { left: `${pct}%` }]} />
          <View style={card.scaleLabels}>
            {['Under', 'Normal', 'Over', 'Obese'].map((l) => (
              <Text key={l} style={{ color: R.muted, fontSize: 10, fontWeight: '800' }}>
                {l}
              </Text>
            ))}
          </View>
        </View>

        <View style={card.tiles}>
          {tile('Healthy weight', `${lo.toFixed(0)}–${hi.toFixed(0)} kg`)}
          {tile('Calories / day', `${dailyCalories(person.weightKg, person.heightCm, person.age)}`)}
          {tile('Water / day', `${idealWaterLitres(person.weightKg)} L`)}
        </View>

        <Text style={card.section}>ACTIVITY · LAST 7 DAYS</Text>
        {week.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {bar('👟', 'Steps', avg((a) => a.steps), ACTIVITY_GOALS.steps, '', R.green)}
            {bar('🥛', 'Water', avg((a) => a.waterGlasses), ACTIVITY_GOALS.waterGlasses, '', R.blue)}
            {bar('🏃', 'Exercise', avg((a) => a.exerciseMin), ACTIVITY_GOALS.exerciseMin, 'm', R.orange)}
            {bar('😴', 'Sleep', avg((a) => a.sleepHours), ACTIVITY_GOALS.sleepHours, 'h', R.purple)}
          </View>
        ) : (
          <Text style={{ color: R.muted, fontSize: 12, fontWeight: '700' }}>No activity logged yet.</Text>
        )}

        <View style={card.advice}>
          <Text style={{ color: R.text, fontWeight: '900', fontSize: 13, marginBottom: 2 }}>{weightAdvice}</Text>
          <Text style={{ color: R.text, fontSize: 12, lineHeight: 17 }}>{cat.advice}</Text>
        </View>

        <Text style={{ color: R.muted, fontSize: 11, fontWeight: '700', marginTop: 10 }}>
          🩸 {person.bloodGroup} can donate to {canDonateTo(person.bloodGroup).join(', ')} · receive from{' '}
          {canReceiveFrom(person.bloodGroup).join(', ')}
        </Text>
      </View>

      <View style={card.footer}>
        <Text style={{ color: R.muted, fontSize: 10, fontWeight: '800' }}>Budget & Beat · by NIVIRAGA AI SOLUTION</Text>
        <Text style={{ color: R.muted, fontSize: 10, fontWeight: '700' }}>Screening only, not a diagnosis</Text>
      </View>
    </View>
  );
}

const card = StyleSheet.create({
  wrap: { backgroundColor: '#FFFFFF', borderRadius: 22, overflow: 'hidden', borderWidth: 2, borderColor: R.border },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  brand: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  headTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  headDate: { color: '#fff', fontSize: 12, fontWeight: '900' },
  body: { padding: 16 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  bigRow: { flexDirection: 'row', gap: 10 },
  bigBox: { flex: 1, alignItems: 'center', borderRadius: 16, borderWidth: 2, paddingVertical: 10 },
  bigLabel: { color: R.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 2 },
  scale: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' },
  marker: {
    position: 'absolute',
    top: -9,
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: R.text,
  },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  tiles: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tile: { flex: 1, backgroundColor: R.soft, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 8 },
  tileLabel: { color: R.muted, fontSize: 10, fontWeight: '800' },
  tileValue: { color: R.text, fontSize: 14, fontWeight: '900' },
  section: { color: R.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  track: { height: 8, borderRadius: 4, backgroundColor: R.border, marginTop: 3, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  advice: { backgroundColor: R.soft, borderRadius: 12, padding: 10, marginTop: 14 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderColor: R.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});

function FamilyTable() {
  const { data } = useStore();
  return (
    <Card>
      <SectionTitle>Family overview</SectionTitle>
      <Table
        columns={[
          { title: 'Name', flex: 4 },
          { title: 'Age', flex: 2, align: 'right' },
          { title: 'BMI', flex: 2, align: 'right' },
          { title: 'Status', flex: 4, align: 'right' },
        ]}
        rows={data.people.map((p) => {
          const bmi = calcBmi(p.weightKg, p.heightCm);
          const cat = bmiCategory(bmi);
          return [
            `${p.avatar} ${p.name}`,
            String(p.age),
            bmi.toFixed(1),
            <Text key="s" style={{ color: cat.color, fontWeight: '900', fontSize: 12, textAlign: 'right' }}>
              {cat.label}
            </Text>,
          ];
        })}
      />
      <Muted style={{ marginTop: 6 }}>Tap a person at the top to see their report.</Muted>
    </Card>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '900', marginBottom: 6, letterSpacing: 0.8, textTransform: 'uppercase' },
  refresh: { width: 46, height: 46, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  person: { width: 66, paddingVertical: 8, borderRadius: 16, alignItems: 'center', gap: 2 },
  addPerson: { borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.8)' },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 2 },
  bmiScoreRow: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 14 },
  badge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  scoreRing: { width: 92, height: 92, borderRadius: 46, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  scaleWrap: { alignSelf: 'stretch', marginTop: 22 },
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
  dot: { width: 10, height: 10, borderRadius: 5 },
});
