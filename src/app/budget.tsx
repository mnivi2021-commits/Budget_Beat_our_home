import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chips,
  Divider,
  Field,
  Muted,
  Row,
  Screen,
  SectionTitle,
  Segments,
  Stepper,
  Table,
  Text,
} from '@/components/ui';
import {
  addDays,
  addMonths,
  formatDate,
  formatMoney,
  formatMonth,
  formatShortDate,
  isValidDateKey,
  todayKey,
  toMonthKey,
  weekStart,
} from '@/lib/dates';
import { sum, useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';
import { EXPENSE_TYPES } from '@/lib/types';
import type { Expense, ExpenseType } from '@/lib/types';

const TABS = ['Add', 'Day', 'Week', 'Month', 'P&L'] as const;
type Tab = (typeof TABS)[number];

export default function BudgetScreen() {
  const [tab, setTab] = useState<Tab>('Add');
  return (
    <Screen title="Budget ₹" subtitle="Daily expenses, income and monthly P&L">
      <Segments options={TABS} value={tab} onChange={setTab} />
      {tab === 'Add' && <AddExpense />}
      {tab === 'Day' && <DailySummary />}
      {tab === 'Week' && <WeeklySummary />}
      {tab === 'Month' && <MonthlySummary />}
      {tab === 'P&L' && <ProfitLoss />}
    </Screen>
  );
}

function byType(expenses: Expense[]): [ExpenseType, number][] {
  const totals = new Map<ExpenseType, number>();
  for (const e of expenses) totals.set(e.type, (totals.get(e.type) ?? 0) + e.amount);
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

function AddExpense() {
  const c = useColors();
  const { addExpense, data, setIncome } = useStore();
  const [date, setDate] = useState(todayKey());
  const [type, setType] = useState<ExpenseType>('Food');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const month = toMonthKey(new Date());
  const [income, setIncomeText] = useState(data.incomes[month] ? String(data.incomes[month]) : '');

  const save = () => {
    const a = Number(amount);
    if (!isValidDateKey(date)) return Alert.alert('Check date', 'Use the format YYYY-MM-DD, e.g. 2026-09-24.');
    if (!(a > 0)) return Alert.alert('Check amount', 'Enter an amount greater than 0.');
    addExpense({ date, type, amount: a, note: note.trim() || undefined });
    setAmount('');
    setNote('');
    Alert.alert('Saved', `${type} · ${formatMoney(a)} on ${formatShortDate(date)}`);
  };

  const saveIncome = () => {
    const a = Number(income);
    if (!(a >= 0) || income.trim() === '') return Alert.alert('Check income', 'Enter a valid amount.');
    setIncome(month, a);
    Alert.alert('Income saved', `${formatMonth(month)}: ${formatMoney(a)}`);
  };

  return (
    <>
      <Card>
        <SectionTitle>Add expense</SectionTitle>
        <Text style={[styles.label, { color: c.muted }]}>Date</Text>
        <View style={styles.dateRow}>
          <Button small variant="outline" title="◀ Prev" onPress={() => isValidDateKey(date) && setDate(addDays(date, -1))} />
          <View style={{ flex: 1 }}>
            <Field label="" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          </View>
          <Button small variant="outline" title="Next ▶" onPress={() => isValidDateKey(date) && setDate(addDays(date, 1))} />
        </View>
        <Muted style={{ marginTop: -6, marginBottom: 10 }}>
          {isValidDateKey(date) ? formatDate(date) : 'Invalid date'}
          {date !== todayKey() ? '  ·  ' : ''}
          {date !== todayKey() ? (
            <Text style={{ color: c.primary, fontWeight: '700' }} onPress={() => setDate(todayKey())}>
              Today
            </Text>
          ) : null}
        </Muted>
        <Text style={[styles.label, { color: c.muted }]}>Expense type</Text>
        <Chips options={EXPENSE_TYPES} value={type} onChange={setType} />
        <Field label="Amount (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
        <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. vegetables, bus ticket" />
        <Button title="Save expense" onPress={save} />
      </Card>

      <Card>
        <SectionTitle>Income for {formatMonth(month)}</SectionTitle>
        <Field label="Monthly income (₹)" value={income} onChangeText={setIncomeText} keyboardType="decimal-pad" placeholder="0" />
        <Button title="Save income" onPress={saveIncome} variant="outline" />
        <Muted style={{ marginTop: 8 }}>For other months, open the P&L tab.</Muted>
      </Card>
    </>
  );
}

function ExpenseList({ expenses, showDate }: { expenses: Expense[]; showDate?: boolean }) {
  const c = useColors();
  const { deleteExpense } = useStore();
  if (!expenses.length) return <Muted>No expenses.</Muted>;
  const confirmDelete = (e: Expense) =>
    Alert.alert('Delete expense?', `${e.type} · ${formatMoney(e.amount)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(e.id) },
    ]);
  return (
    <View>
      {expenses.map((e) => (
        <Pressable key={e.id} onLongPress={() => confirmDelete(e)} style={[styles.item, { borderColor: c.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontWeight: '700' }}>{e.type}</Text>
            <Muted>
              {showDate ? formatShortDate(e.date) : ''}
              {showDate && e.note ? ' · ' : ''}
              {e.note ?? ''}
            </Muted>
          </View>
          <Text style={{ color: c.expense, fontWeight: '700' }}>{formatMoney(e.amount)}</Text>
          <Pressable onPress={() => confirmDelete(e)} hitSlop={10} style={{ marginLeft: 12 }}>
            <Text style={{ color: c.muted, fontSize: 18 }}>✕</Text>
          </Pressable>
        </Pressable>
      ))}
    </View>
  );
}

function TypeTable({ expenses }: { expenses: Expense[] }) {
  const total = sum(expenses.map((e) => e.amount));
  const rows = byType(expenses);
  if (!rows.length) return null;
  return (
    <Table
      columns={[
        { title: 'Type', flex: 3 },
        { title: 'Amount', flex: 3, align: 'right' },
        { title: '%', flex: 2, align: 'right' },
      ]}
      rows={rows.map(([t, amt]) => [t, formatMoney(amt), `${((amt / total) * 100).toFixed(0)}%`])}
      footer={['Total', formatMoney(total), '100%']}
    />
  );
}

function DailySummary() {
  const c = useColors();
  const { data } = useStore();
  const [day, setDay] = useState(todayKey());
  const list = data.expenses.filter((e) => e.date === day);
  const total = sum(list.map((e) => e.amount));
  return (
    <>
      <Stepper label={formatDate(day)} onPrev={() => setDay(addDays(day, -1))} onNext={() => setDay(addDays(day, 1))} />
      <Card>
        <Row label="Total spent" value={formatMoney(total)} color={c.expense} bold />
        <Divider />
        <ExpenseList expenses={list} />
        {list.length ? <Muted style={{ marginTop: 8 }}>Tap ✕ to delete an entry.</Muted> : null}
      </Card>
    </>
  );
}

function WeeklySummary() {
  const c = useColors();
  const { data } = useStore();
  const [start, setStart] = useState(weekStart(todayKey()));
  const end = addDays(start, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const list = data.expenses.filter((e) => e.date >= start && e.date <= end);
  const total = sum(list.map((e) => e.amount));
  const perDay = days.map((d) => sum(list.filter((e) => e.date === d).map((e) => e.amount)));
  const max = Math.max(1, ...perDay);

  return (
    <>
      <Stepper
        label={`${formatShortDate(start)} – ${formatShortDate(end)}`}
        onPrev={() => setStart(addDays(start, -7))}
        onNext={() => setStart(addDays(start, 7))}
      />
      <Card>
        <Row label="Week total" value={formatMoney(total)} color={c.expense} bold />
        <Row label="Daily average" value={formatMoney(Math.round((total / 7) * 100) / 100)} />
        <Divider />
        {days.map((d, i) => (
          <View key={d} style={styles.barRow}>
            <Text style={{ color: c.text, width: 90, fontSize: 13 }}>{formatShortDate(d)}</Text>
            <View style={[styles.barTrack, { backgroundColor: c.border }]}>
              <View style={[styles.bar, { width: `${(perDay[i] / max) * 100}%`, backgroundColor: c.primary }]} />
            </View>
            <Text style={{ color: c.text, width: 80, textAlign: 'right', fontSize: 13 }}>{formatMoney(perDay[i])}</Text>
          </View>
        ))}
      </Card>
      <Card>
        <SectionTitle>By expense type</SectionTitle>
        {list.length ? <TypeTable expenses={list} /> : <Muted>No expenses this week.</Muted>}
      </Card>
    </>
  );
}

function MonthlySummary() {
  const c = useColors();
  const { data } = useStore();
  const [month, setMonth] = useState(toMonthKey(new Date()));
  const list = data.expenses
    .filter((e) => e.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = sum(list.map((e) => e.amount));
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  return (
    <>
      <Stepper label={formatMonth(month)} onPrev={() => setMonth(addMonths(month, -1))} onNext={() => setMonth(addMonths(month, 1))} />
      <Card>
        <Row label="Month total" value={formatMoney(total)} color={c.expense} bold />
        <Row label="Entries" value={String(list.length)} />
        <Row label="Average per day" value={formatMoney(Math.round((total / daysInMonth) * 100) / 100)} />
      </Card>
      <Card>
        <SectionTitle>By expense type</SectionTitle>
        {list.length ? <TypeTable expenses={list} /> : <Muted>No expenses this month.</Muted>}
      </Card>
      <Card>
        <SectionTitle>All entries</SectionTitle>
        <ExpenseList expenses={list} showDate />
      </Card>
    </>
  );
}

function ProfitLoss() {
  const c = useColors();
  const { data, setIncome } = useStore();
  const [month, setMonth] = useState(toMonthKey(new Date()));
  const [incomeText, setIncomeText] = useState(data.incomes[month] != null ? String(data.incomes[month]) : '');

  const changeMonth = (delta: number) => {
    const next = addMonths(month, delta);
    setMonth(next);
    setIncomeText(data.incomes[next] != null ? String(data.incomes[next]) : '');
  };

  const income = data.incomes[month] ?? 0;
  const list = data.expenses.filter((e) => e.date.startsWith(month));
  const totalExp = sum(list.map((e) => e.amount));
  const net = income - totalExp;
  const rate = income > 0 ? (net / income) * 100 : 0;

  const saveIncome = () => {
    const a = Number(incomeText);
    if (incomeText.trim() === '' || !(a >= 0)) return Alert.alert('Check income', 'Enter a valid amount.');
    setIncome(month, a);
  };

  // Last 6 months overview, ending at the selected month.
  const history = Array.from({ length: 6 }, (_, i) => addMonths(month, -i)).map((mk) => {
    const inc = data.incomes[mk] ?? 0;
    const exp = sum(data.expenses.filter((e) => e.date.startsWith(mk)).map((e) => e.amount));
    return { mk, inc, exp, net: inc - exp };
  });

  return (
    <>
      <Stepper label={formatMonth(month)} onPrev={() => changeMonth(-1)} onNext={() => changeMonth(1)} />
      <Card>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <Field label={`Income for ${formatMonth(month)} (₹)`} value={incomeText} onChangeText={setIncomeText} keyboardType="decimal-pad" placeholder="0" />
          <View style={{ marginBottom: 12 }}>
            <Button title="Save" onPress={saveIncome} />
          </View>
        </View>
      </Card>

      <Card>
        <Text style={[styles.statementTitle, { color: c.text }]}>Profit & Loss Statement</Text>
        <Muted style={{ textAlign: 'center', marginBottom: 10 }}>For the month of {formatMonth(month)}</Muted>

        <Text style={[styles.stmtHead, { color: c.income }]}>INCOME</Text>
        <Row label="Monthly income" value={formatMoney(income)} />
        <Row label="Total income" value={formatMoney(income)} color={c.income} bold />
        <Divider />

        <Text style={[styles.stmtHead, { color: c.expense }]}>EXPENSES</Text>
        {byType(list).map(([t, amt]) => (
          <Row key={t} label={t} value={formatMoney(amt)} />
        ))}
        {!list.length ? <Muted>No expenses recorded.</Muted> : null}
        <Row label="Total expenses" value={formatMoney(totalExp)} color={c.expense} bold />
        <Divider />

        <View style={[styles.netBox, { backgroundColor: net >= 0 ? c.primarySoft : c.beatSoft }]}>
          <Text style={{ color: c.text, fontWeight: '800', fontSize: 16 }}>
            {net >= 0 ? 'NET PROFIT (Savings)' : 'NET LOSS'}
          </Text>
          <Text style={{ color: net >= 0 ? c.income : c.expense, fontWeight: '900', fontSize: 26 }}>
            {formatMoney(net)}
          </Text>
          {income > 0 ? <Muted>Savings rate: {rate.toFixed(1)}% of income</Muted> : <Muted>Add income to see savings rate.</Muted>}
        </View>
      </Card>

      <Card>
        <SectionTitle>Last 6 months</SectionTitle>
        <Table
          columns={[
            { title: 'Month', flex: 3 },
            { title: 'Income', flex: 3, align: 'right' },
            { title: 'Expense', flex: 3, align: 'right' },
            { title: 'P / L', flex: 3, align: 'right' },
          ]}
          rows={history.map((h) => [
            formatMonth(h.mk),
            formatMoney(h.inc),
            formatMoney(h.exp),
            <Text key="n" style={{ color: h.net >= 0 ? c.income : c.expense, textAlign: 'right', fontWeight: '700', fontSize: 13 }}>
              {formatMoney(h.net)}
            </Text>,
          ])}
        />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 6 },
  barTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 5 },
  statementTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  stmtHead: { fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  netBox: { borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
});
