import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  Button,
  Card,
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
  todayKey,
  toMonthKey,
  weekStart,
} from '@/lib/dates';
import { sum, useStore } from '@/lib/store';
import { exportExcel } from '@/lib/share';
import { Fonts, alpha, useColors } from '@/lib/theme';
import { EXPENSE_EMOJI, EXPENSE_TYPES } from '@/lib/types';
import type { Expense, ExpenseType } from '@/lib/types';

const TABS = ['Add', 'Day', 'Week', 'Month', 'P&L'] as const;
type Tab = (typeof TABS)[number];

export default function BudgetScreen() {
  const { data } = useStore();
  const [tab, setTab] = useState<Tab>('Add');
  const today = todayKey();
  const month = toMonthKey(new Date());
  const todaySpend = sum(data.expenses.filter((e) => e.date === today).map((e) => e.amount));
  const monthSpend = sum(data.expenses.filter((e) => e.date.startsWith(month)).map((e) => e.amount));
  const income = data.incomes[month] ?? 0;
  return (
    <Screen
      title="Budget"
      subtitle="Daily expenses, income and monthly P&L"
      section="budget"
      emoji="₹"
      header={
        <View style={styles.heroStats}>
          <HeroStat label="Today" value={formatMoney(todaySpend)} />
          <HeroStat label={formatMonth(month)} value={formatMoney(monthSpend)} />
          <HeroStat label="Balance" value={formatMoney(income - monthSpend)} />
        </View>
      }>
      <Segments options={TABS} value={tab} onChange={setTab} />
      {tab === 'Add' && <AddExpenses />}
      {tab === 'Day' && <DailySummary />}
      {tab === 'Week' && <WeeklySummary />}
      {tab === 'Month' && <MonthlySummary />}
      {tab === 'P&L' && <ProfitLoss />}
    </Screen>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: 11 }}>{label.toUpperCase()}</Text>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function byType(expenses: Expense[]): [ExpenseType, number][] {
  const totals = new Map<ExpenseType, number>();
  for (const e of expenses) totals.set(e.type, (totals.get(e.type) ?? 0) + e.amount);
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

type Line = { type: ExpenseType; amount: string; note: string };

const LINE_COUNT = 5;
const DEFAULT_TYPES: ExpenseType[] = ['Food', 'Transport', 'Grocery', 'Bills', 'Other'];
const emptyLines = (): Line[] => DEFAULT_TYPES.slice(0, LINE_COUNT).map((type) => ({ type, amount: '', note: '' }));

/** Pop-up grid for choosing an expense type. */
function TypePicker({ value, onClose }: { value: ExpenseType | null; onClose: (t: ExpenseType | null) => void }) {
  const c = useColors();
  return (
    <Modal transparent visible={value !== null} animationType="fade" onRequestClose={() => onClose(null)}>
      <Pressable style={styles.modalBg} onPress={() => onClose(null)}>
        <View style={[styles.modalCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <SectionTitle>Choose expense type</SectionTitle>
          <View style={styles.typeGrid}>
            {EXPENSE_TYPES.map((t) => {
              const active = t === value;
              return (
                <Pressable
                  key={t}
                  onPress={() => onClose(t)}
                  style={[
                    styles.typeTile,
                    { borderColor: active ? alpha(c.blue, 0.6) : c.border, backgroundColor: active ? alpha(c.blue, 0.15) : c.card },
                  ]}>
                  <Text style={{ fontSize: 24 }}>{EXPENSE_EMOJI[t]}</Text>
                  <Text style={{ color: active ? c.blue : c.text, fontWeight: '800', fontSize: 12 }}>{t}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

function AddExpenses() {
  const c = useColors();
  const { addExpenses, data, setIncome } = useStore();
  const [date, setDate] = useState(todayKey());
  const [lines, setLines] = useState<Line[]>(emptyLines);
  const [picking, setPicking] = useState<number | null>(null);

  const month = toMonthKey(new Date());
  const [income, setIncomeText] = useState(data.incomes[month] ? String(data.incomes[month]) : '');

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const filled = lines.filter((l) => l.amount.trim() !== '');
  const linesTotal = sum(filled.map((l) => Number(l.amount) || 0));
  const dayList = data.expenses.filter((e) => e.date === date);

  const saveAll = () => {
    if (!filled.length) return Alert.alert('Nothing to save', 'Enter an amount in at least one line.');
    const bad = filled.findIndex((l) => !(Number(l.amount) > 0));
    if (bad >= 0) return Alert.alert('Check amount', `Line ${lines.indexOf(filled[bad]) + 1} has an invalid amount.`);
    addExpenses(filled.map((l) => ({ date, type: l.type, amount: Number(l.amount), note: l.note.trim() || undefined })));
    setLines(emptyLines());
    Alert.alert('Saved ✅', `${filled.length} expense(s) · ${formatMoney(linesTotal)} on ${formatShortDate(date)}`);
  };

  const saveIncome = () => {
    const a = Number(income);
    if (!(a >= 0) || income.trim() === '') return Alert.alert('Check income', 'Enter a valid amount.');
    setIncome(month, a);
    Alert.alert('Income saved', `${formatMonth(month)}: ${formatMoney(a)}`);
  };

  return (
    <>
      <Stepper label={formatDate(date)} onPrev={() => setDate(addDays(date, -1))} onNext={() => setDate(addDays(date, 1))} />
      {date !== todayKey() ? (
        <Text style={{ color: c.blue, fontWeight: '900', textAlign: 'center', marginTop: -6 }} onPress={() => setDate(todayKey())}>
          ↺ Back to today
        </Text>
      ) : null}

      <Card>
        <SectionTitle>Day expenses · 5 lines</SectionTitle>
        <Muted style={{ marginBottom: 10 }}>Tap the type to change it. Empty lines are skipped.</Muted>
        {lines.map((l, i) => (
          <View key={i} style={[styles.line, { borderColor: c.border }]}>
            <View style={[styles.lineNo, { backgroundColor: alpha(c.blue, 0.15) }]}>
              <Text style={{ color: c.blue, fontWeight: '900' }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => setPicking(i)}
                  style={[styles.typeBtn, { borderColor: c.border, backgroundColor: c.inputBg }]}>
                  <Text style={{ color: c.text, fontWeight: '800' }} numberOfLines={1}>
                    {EXPENSE_EMOJI[l.type]} {l.type} ▾
                  </Text>
                </Pressable>
                <TextInput
                  value={l.amount}
                  onChangeText={(t) => setLine(i, { amount: t })}
                  placeholder="₹ 0"
                  placeholderTextColor={c.muted}
                  keyboardType="decimal-pad"
                  style={[styles.lineInput, { flex: 1, color: c.text, borderColor: c.border, backgroundColor: c.inputBg, fontFamily: Fonts.heavy }]}
                />
              </View>
              <TextInput
                value={l.note}
                onChangeText={(t) => setLine(i, { note: t })}
                placeholder="Note (optional)"
                placeholderTextColor={c.muted}
                style={[styles.lineInput, { color: c.text, borderColor: c.border, backgroundColor: c.inputBg, fontFamily: Fonts.bold }]}
              />
            </View>
          </View>
        ))}
        <Row label="Lines total" value={formatMoney(linesTotal)} color={c.expense} bold />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <View style={{ flex: 2 }}>
            <Button title={`Save ${filled.length || ''} expense${filled.length === 1 ? '' : 's'}`} onPress={saveAll} color={c.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Clear" onPress={() => setLines(emptyLines())} variant="outline" color={c.muted} />
          </View>
        </View>
      </Card>

      <TypePicker
        value={picking === null ? null : lines[picking].type}
        onClose={(t) => {
          if (t && picking !== null) setLine(picking, { type: t });
          setPicking(null);
        }}
      />

      <Card>
        <Row label={`Already saved on ${formatShortDate(date)}`} value={formatMoney(sum(dayList.map((e) => e.amount)))} bold />
        <Divider />
        <ExpenseList expenses={dayList} />
      </Card>

      <Card>
        <SectionTitle>Income for {formatMonth(month)}</SectionTitle>
        <Field label="Monthly income (₹)" value={income} onChangeText={setIncomeText} keyboardType="decimal-pad" placeholder="0" />
        <Button title="Save income" onPress={saveIncome} variant="outline" color={c.blue} />
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

      <Button
        title="📊 Export all data to Excel"
        onPress={() => exportExcel(data).catch(() => Alert.alert('Export failed', 'Please try again.'))}
        color={c.primary}
      />
    </>
  );
}

const styles = StyleSheet.create({
  heroStats: { flexDirection: 'row', gap: 8 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 10 },
  line: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: 2 },
  lineNo: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  typeBtn: { flex: 1.3, borderWidth: 2, borderRadius: 12, paddingHorizontal: 10, justifyContent: 'center' },
  lineInput: { borderWidth: 2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 20, borderWidth: 2, padding: 18 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeTile: { width: '31%', alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: 2, borderBottomWidth: 4, gap: 2 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 6 },
  barTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 5 },
  statementTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  stmtHead: { fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  netBox: { borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
});
