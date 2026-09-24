import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Bubble, Card, ProgressBar, Row, Screen, Text } from '@/components/ui';
import { bmiCategory, calcBmi } from '@/lib/bmi';
import { addDays, formatMoney, formatMonth, todayKey, toMonthKey } from '@/lib/dates';
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
  const { data } = useStore();
  const today = todayKey();
  const month = toMonthKey(new Date());

  const todaySpend = sum(data.expenses.filter((e) => e.date === today).map((e) => e.amount));
  const monthSpend = sum(data.expenses.filter((e) => e.date.startsWith(month)).map((e) => e.amount));
  const income = data.incomes[month] ?? 0;
  const net = income - monthSpend;
  const streak = logStreak(data.expenses);

  const profile = data.profile;
  const bmi = profile ? calcBmi(profile.weightKg, profile.heightCm) : 0;
  const cat = profile ? bmiCategory(bmi) : null;

  const groceries = data.groceryMonths[month] ?? [];
  const bought = groceries.filter((g) => g.bought).length;

  let tip: string;
  if (!profile) tip = "Hi there! Let's start with your health check. Tap the heart ❤ below.";
  else if (!data.expenses.some((e) => e.date === today))
    tip = `Hi ${profile.name}! You haven't logged any spending today. Tap the wallet to add it.`;
  else if (!income) tip = `Nice work, ${profile.name}! Now add this month's income to see your profit & loss.`;
  else if (streak >= 3) tip = `🔥 ${streak}-day streak, ${profile.name}! Keep logging every day.`;
  else tip = `Great job, ${profile.name}! Today you spent ${formatMoney(todaySpend)}.`;

  return (
    <Screen title="Budget & Beat">
      <View style={styles.stats}>
        <Stat icon="🔥" value={String(streak)} label="day streak" color={c.orange} />
        <Stat icon="⭐" value={String(data.expenses.length)} label="entries" color={c.yellow} />
        <Stat icon="❤" value={profile ? bmi.toFixed(1) : '–'} label="BMI" color={c.beat} />
      </View>

      <Bubble>{tip}</Bubble>

      <View style={[styles.unit, { backgroundColor: c.primary, borderColor: shade(c.primary) }]}>
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

      <View style={styles.path}>
        <PathNode
          offset={-60}
          icon="heart"
          color={c.beat}
          title="Beat"
          caption={cat ? cat.label : 'Health check'}
          onPress={() => router.navigate('/beat')}
        />
        <PathNode
          offset={50}
          icon="wallet"
          color={c.blue}
          title="Budget"
          caption={`Today ${formatMoney(todaySpend)}`}
          onPress={() => router.navigate('/budget')}
        />
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
    </Screen>
  );
}

function Stat({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  const c = useColors();
  return (
    <View style={[styles.stat, { borderColor: c.border }]}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <View>
        <Text style={{ color, fontWeight: '900', fontSize: 18, lineHeight: 22 }}>{value}</Text>
        <Text style={{ color: c.muted, fontWeight: '700', fontSize: 11 }}>{label}</Text>
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
            <View
              style={[
                styles.node,
                { backgroundColor: color, borderBottomColor: shade(color, 0.75), borderBottomWidth: pressed ? 0 : 6 },
              ]}>
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
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  unit: { borderRadius: 16, borderBottomWidth: 5, padding: 16 },
  unitTag: { color: 'rgba(255,255,255,0.85)', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  unitTitle: { color: '#fff', fontWeight: '900', fontSize: 24, marginTop: 2 },
  unitSub: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: 13 },
  path: { gap: 18, paddingVertical: 10 },
  nodeOuter: { height: 84, justifyContent: 'flex-start' },
  node: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center' },
});
