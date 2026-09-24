import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Bubble, Button, Card, ProgressBar, Row, Screen, SectionTitle, Text } from '@/components/ui';
import { bmiCategory, calcBmi } from '@/lib/bmi';
import { addDays, formatMoney, formatMonth, todayKey, toMonthKey } from '@/lib/dates';
import { exportExcel } from '@/lib/share';
import { groceryTotal, sum, useStore } from '@/lib/store';
import { shade, useColors } from '@/lib/theme';
import type { Expense } from '@/lib/types';

/** Days in a row (ending today, or yesterday if nothing logged yet today) with at least one expense. */
function logStreak(expenses: Expense[]): number {
  const days = new Set(expenses.map((e) => e.date));
  let day = todayKey();
  if (!days.has(day)) day = addDays(day, -1);
  let n = 0;
  while (days.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export default function HomeScreen() {
  const c = useColors();
  const { data, activePerson, setActivePerson } = useStore();
  const today = todayKey();
  const month = toMonthKey(new Date());

  const todaySpend = sum(data.expenses.filter((e) => e.date === today).map((e) => e.amount));
  const monthSpend = sum(data.expenses.filter((e) => e.date.startsWith(month)).map((e) => e.amount));
  const income = data.incomes[month] ?? 0;
  const net = income - monthSpend;
  const streak = logStreak(data.expenses);
  const activeToday = new Set(data.activities.filter((a) => a.date === today).map((a) => a.personId));

  const groceries = data.groceryMonths[month] ?? [];
  const bought = groceries.filter((g) => g.bought).length;

  const name = activePerson?.name;
  let tip: string;
  if (!data.people.length) tip = "Hi there! Let's start with your family's health check. Tap the heart ❤ below.";
  else if (!data.expenses.some((e) => e.date === today)) tip = `Hi ${name}! No spending logged today yet. Tap the wallet to add up to 5 at once.`;
  else if (activeToday.size < data.people.length) tip = `Don't forget today's activity: steps, water, exercise and sleep in Beat ❤.`;
  else if (!income) tip = `Nice work! Now add this month's income to see your profit & loss.`;
  else if (streak >= 3) tip = `🔥 ${streak}-day streak! Keep logging every day.`;
  else tip = `Great job! Today you spent ${formatMoney(todaySpend)}.`;

  const exportNow = () => exportExcel(data).catch(() => Alert.alert('Export failed', 'Please try again.'));

  return (
    <Screen
      title="Budget & Beat"
      subtitle={name ? `Hello, ${name} 👋` : 'Our home: money + health'}
      section="home"
      emoji="🏡"
      header={
        <View style={styles.stats}>
          <Stat icon="🔥" value={String(streak)} label="day streak" />
          <Stat icon="⭐" value={String(data.expenses.length + data.activities.length)} label="entries" />
          <Stat icon="👨‍👩‍👧" value={`${data.people.length}/5`} label="family" />
        </View>
      }>
      <Bubble>{tip}</Bubble>

      <View style={[styles.unit, { backgroundColor: c.blue, borderColor: shade(c.blue) }]}>
        <Text style={styles.unitTag}>THIS MONTH · {formatMonth(month).toUpperCase()}</Text>
        <Text style={styles.unitTitle}>{net >= 0 ? `Saved ${formatMoney(net)}` : `Over by ${formatMoney(-net)}`}</Text>
        <Text style={styles.unitSub}>
          Income {formatMoney(income)} · Spent {formatMoney(monthSpend)}
        </Text>
        <View style={{ marginTop: 10 }}>
          <ProgressBar value={income > 0 ? monthSpend / income : 0} color={monthSpend > income ? c.beat : c.yellow} />
        </View>
        <Text style={[styles.unitSub, { marginTop: 4 }]}>
          {income > 0 ? `${Math.round((monthSpend / income) * 100)}% of income used` : 'Add your income on the Budget tab'}
        </Text>
      </View>

      {data.people.length ? (
        <Card>
          <SectionTitle>Family health</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {data.people.map((p) => {
              const bmi = calcBmi(p.weightKg, p.heightCm);
              const cat = bmiCategory(bmi);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setActivePerson(p.id);
                    router.navigate('/beat');
                  }}
                  style={[styles.member, { borderColor: c.border }]}>
                  <Text style={{ fontSize: 30 }}>{p.avatar}</Text>
                  <Text style={{ color: c.text, fontWeight: '900', fontSize: 13 }} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={{ color: cat.color, fontWeight: '900', fontSize: 15 }}>{bmi.toFixed(1)}</Text>
                  <Text style={{ color: c.muted, fontSize: 10, fontWeight: '800' }}>{activeToday.has(p.id) ? '✅ logged today' : '⏳ log today'}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Card>
      ) : null}

      <View style={styles.path}>
        <PathNode offset={-60} icon="heart" color={c.beat} title="Beat" caption="Health & activity" onPress={() => router.navigate('/beat')} />
        <PathNode offset={50} icon="wallet" color={c.blue} title="Budget" caption={`Today ${formatMoney(todaySpend)}`} onPress={() => router.navigate('/budget')} />
        <PathNode
          offset={-40}
          icon="cart"
          color={c.orange}
          title="Grocery"
          caption={groceries.length ? `${bought}/${groceries.length} bought` : 'Make a list'}
          onPress={() => router.navigate('/grocery')}
        />
      </View>

      {groceries.length ? (
        <Card>
          <Row label="🛒 Grocery progress" value={`${bought} / ${groceries.length}`} bold />
          <View style={{ marginVertical: 8 }}>
            <ProgressBar value={bought / groceries.length} color={c.orange} />
          </View>
          <Row label="List total" value={formatMoney(groceryTotal(groceries))} />
        </Card>
      ) : null}

      <Card>
        <SectionTitle>📊 Excel report</SectionTitle>
        <Text style={{ color: c.muted, marginBottom: 12 }}>
          One Excel file with sheets for Family Health, Daily Activity, Weight Log, Expenses, Monthly P&L and Grocery. Save it to
          Drive, send it on WhatsApp or open it in Excel.
        </Text>
        <Button title="Export to Excel" onPress={exportNow} />
      </Card>
    </Screen>
  );
}

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <View>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 17, lineHeight: 21 }}>{value}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.88)', fontWeight: '800', fontSize: 11 }}>{label}</Text>
      </View>
    </View>
  );
}

/** Big round 3D button, like a lesson on a learning path. */
function PathNode({
  offset,
  icon,
  color,
  title,
  caption,
  onPress,
}: {
  offset: number;
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
  title: string;
  caption: string;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', transform: [{ translateX: offset }] }}>
      <Pressable onPress={onPress}>
        {({ pressed }) => (
          <View style={[styles.nodeOuter, { paddingTop: pressed ? 6 : 0 }]}>
            <View style={[styles.node, { backgroundColor: color, borderBottomColor: shade(color, 0.75), borderBottomWidth: pressed ? 0 : 6 }]}>
              <Ionicons name={icon} size={36} color="#fff" />
            </View>
          </View>
        )}
      </Pressable>
      <Text style={{ color: c.text, fontWeight: '900', fontSize: 16, marginTop: 6 }}>{title}</Text>
      <Text style={{ color: c.muted, fontWeight: '700', fontSize: 12 }}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  unit: { borderRadius: 18, borderBottomWidth: 5, padding: 16 },
  unitTag: { color: 'rgba(255,255,255,0.85)', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  unitTitle: { color: '#fff', fontWeight: '900', fontSize: 24, marginTop: 2 },
  unitSub: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: 13 },
  member: { width: 96, alignItems: 'center', borderWidth: 2, borderBottomWidth: 4, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 6 },
  path: { gap: 18, paddingVertical: 10 },
  nodeOuter: { height: 84, justifyContent: 'flex-start' },
  node: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center' },
});
