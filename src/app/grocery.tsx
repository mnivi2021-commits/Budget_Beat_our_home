import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chips,
  Counter,
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
import { addMonths, formatMoney, formatMonth, todayKey, toMonthKey } from '@/lib/dates';
import { groceryTotal, newId, useStore } from '@/lib/store';
import { alpha, useColors } from '@/lib/theme';
import { CATEGORY_EMOJI, COMMON_GROCERIES, GROCERY_CATEGORIES, GROCERY_UNITS } from '@/lib/types';
import type { GroceryCategory, GroceryItem, GroceryUnit } from '@/lib/types';

const MODES = ['Monthly list', 'Master list'] as const;
type Mode = (typeof MODES)[number];

const FILTERS = ['All', 'To buy', 'Bought'] as const;
type Filter = (typeof FILTERS)[number];

/** Sensible +/− step for each unit. */
const stepFor = (unit: GroceryUnit) => (unit === 'g' || unit === 'ml' ? 100 : unit === 'kg' || unit === 'L' ? 0.5 : 1);

export default function GroceryScreen() {
  const { data } = useStore();
  const [mode, setMode] = useState<Mode>('Monthly list');
  const month = toMonthKey(new Date());
  const items = data.groceryMonths[month] ?? [];
  const total = groceryTotal(items);
  const budget = data.groceryBudget;
  return (
    <Screen
      title="Grocery"
      subtitle="Make the list once, update it every month"
      section="grocery"
      emoji="🛒"
      header={
        items.length ? (
          <View style={styles.heroBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={styles.heroText}>{formatMonth(month)} list</Text>
              <Text style={styles.heroText}>
                {formatMoney(total)}
                {budget ? ` / ${formatMoney(budget)}` : ''}
              </Text>
            </View>
            <ProgressBar value={budget ? total / budget : items.filter((i) => i.bought).length / items.length} color="#fff" />
            <Text style={[styles.heroText, { fontSize: 12, marginTop: 4, opacity: 0.9 }]}>
              {budget ? `${Math.round((total / budget) * 100)}% of grocery budget` : `${items.filter((i) => i.bought).length} of ${items.length} bought`}
            </Text>
          </View>
        ) : undefined
      }>
      <Segments options={MODES} value={mode} onChange={setMode} />
      {mode === 'Monthly list' ? <MonthlyList onOpenMaster={() => setMode('Master list')} /> : <MasterList />}
    </Screen>
  );
}

/** Add / edit form for one grocery item, with one-tap suggestions. */
function ItemEditor({
  item,
  existing,
  onSave,
  onDelete,
  onCancel,
}: {
  item: GroceryItem | null;
  existing: GroceryItem[];
  onSave: (i: GroceryItem) => void;
  onDelete?: () => void;
  onCancel?: () => void;
}) {
  const c = useColors();
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState<GroceryCategory>(item?.category ?? 'Grains');
  const [qty, setQty] = useState(item ? String(item.qty) : '1');
  const [unit, setUnit] = useState<GroceryUnit>(item?.unit ?? 'kg');
  const [price, setPrice] = useState(item ? String(item.price) : '');

  const have = new Set(existing.map((i) => i.name.toLowerCase()));
  const suggestions = COMMON_GROCERIES.filter((g) => !have.has(g.name.toLowerCase()));

  const save = () => {
    const q = Number(qty);
    const p = Number(price);
    if (!name.trim()) return Alert.alert('Missing product', 'Enter the product name.');
    if (!(q > 0)) return Alert.alert('Check quantity', 'Quantity must be greater than 0.');
    if (price.trim() === '' || !(p >= 0)) return Alert.alert('Check price', 'Enter the price per unit.');
    onSave({ id: item?.id ?? newId(), name: name.trim(), category, qty: q, unit, price: p, bought: item?.bought ?? false });
    if (!item) {
      setName('');
      setQty('1');
      setPrice('');
    }
  };

  return (
    <Card>
      <SectionTitle>{item ? `Edit: ${item.name}` : 'Add product'}</SectionTitle>
      {!item && suggestions.length ? (
        <>
          <Text style={[styles.label, { color: c.muted }]}>Quick add</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
            {suggestions.map((g) => (
              <Pressable
                key={g.name}
                onPress={() => {
                  setName(g.name);
                  setUnit(g.unit);
                  setCategory(g.category);
                }}
                style={[styles.suggest, { borderColor: c.border, backgroundColor: name === g.name ? alpha(c.orange, 0.15) : c.card }]}>
                <Text style={{ color: c.text, fontWeight: '800', fontSize: 13 }}>
                  {CATEGORY_EMOJI[g.category]} {g.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}
      <Field label="Product name" value={name} onChangeText={setName} placeholder="e.g. Rice" />
      <Text style={[styles.label, { color: c.muted }]}>Category</Text>
      <Chips options={GROCERY_CATEGORIES} value={category} onChange={setCategory} color={c.orange} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field label="Quantity" value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
        <Field label="Price per unit (₹)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0" />
      </View>
      <Text style={[styles.label, { color: c.muted }]}>Unit</Text>
      <Chips options={GROCERY_UNITS} value={unit} onChange={setUnit} color={c.orange} />
      {Number(qty) > 0 && Number(price) >= 0 && price !== '' ? (
        <Muted style={{ marginBottom: 10 }}>Line total: {formatMoney(Number(qty) * Number(price))}</Muted>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button title={item ? 'Save changes' : 'Add to list'} onPress={save} color={c.orange} />
        </View>
        {onCancel ? (
          <View style={{ flex: 1 }}>
            <Button title="Cancel" onPress={onCancel} variant="outline" color={c.orange} />
          </View>
        ) : null}
      </View>
      {onDelete ? (
        <View style={{ marginTop: 8 }}>
          <Button title="Remove item" onPress={onDelete} variant="outline" color={c.expense} />
        </View>
      ) : null}
    </Card>
  );
}

/** Items grouped by category: tick to mark bought, +/− to change quantity, tap the name to edit. */
function GroupedList({
  items,
  previous,
  onEdit,
  onChange,
  checkable,
}: {
  items: GroceryItem[];
  previous?: GroceryItem[];
  onEdit: (i: GroceryItem) => void;
  onChange: (i: GroceryItem) => void;
  checkable?: boolean;
}) {
  const c = useColors();
  const lastPrice = new Map((previous ?? []).map((p) => [p.name.toLowerCase(), p.price]));
  const groups = GROCERY_CATEGORIES.map((cat) => [cat, items.filter((i) => i.category === cat)] as const).filter(([, list]) => list.length);

  return (
    <View style={{ gap: 14 }}>
      {groups.map(([cat, list]) => (
        <View key={cat}>
          <View style={styles.groupHead}>
            <Text style={{ color: c.text, fontWeight: '900', fontSize: 15 }}>
              {CATEGORY_EMOJI[cat]} {cat}
            </Text>
            <Text style={{ color: c.orange, fontWeight: '900' }}>{formatMoney(groceryTotal(list))}</Text>
          </View>
          <Table
            columns={[
              ...(checkable ? [{ title: '✓', flex: 1.2, align: 'center' as const }] : []),
              { title: 'Product', flex: 4.5 },
              { title: 'Qty', flex: 4, align: 'center' as const },
              { title: 'Total', flex: 3, align: 'right' as const },
            ]}
            rows={list.map((i) => {
              const was = lastPrice.get(i.name.toLowerCase());
              const diff = was === undefined ? 0 : i.price - was;
              const done = checkable && i.bought;
              return [
                ...(checkable
                  ? [
                      <Pressable key="t" onPress={() => onChange({ ...i, bought: !i.bought })} hitSlop={8} style={{ alignItems: 'center' }}>
                        <View style={[styles.box, { borderColor: c.primary, backgroundColor: i.bought ? c.primary : 'transparent' }]}>
                          {i.bought ? <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text> : null}
                        </View>
                      </Pressable>,
                    ]
                  : []),
                <Pressable key="n" onPress={() => onEdit(i)}>
                  <Text
                    style={{ color: done ? c.muted : c.text, fontWeight: '800', fontSize: 13, textDecorationLine: done ? 'line-through' : 'none' }}>
                    {i.name}
                  </Text>
                  <Text style={{ color: c.muted, fontSize: 11 }}>
                    {formatMoney(i.price)}/{i.unit}
                    {diff !== 0 ? (
                      <Text style={{ color: diff > 0 ? c.expense : c.income, fontWeight: '900' }}>
                        {'  '}
                        {diff > 0 ? '▲' : '▼'}
                        {formatMoney(Math.abs(diff))}
                      </Text>
                    ) : null}
                  </Text>
                </Pressable>,
                <View key="q" style={{ alignItems: 'center' }}>
                  <Counter small value={i.qty} step={stepFor(i.unit)} onChange={(q) => onChange({ ...i, qty: q })} color={c.orange} />
                  <Text style={{ color: c.muted, fontSize: 10 }}>{i.unit}</Text>
                </View>,
                <Text key="t" style={{ color: done ? c.muted : c.text, fontWeight: '900', fontSize: 13, textAlign: 'right' }}>
                  {formatMoney(i.qty * i.price)}
                </Text>,
              ];
            })}
          />
        </View>
      ))}
    </View>
  );
}

function CategorySummary({ items }: { items: GroceryItem[] }) {
  const total = groceryTotal(items);
  const rows = GROCERY_CATEGORIES.map((cat) => [cat, items.filter((i) => i.category === cat)] as const)
    .filter(([, l]) => l.length)
    .map(([cat, l]) => [
      `${CATEGORY_EMOJI[cat]} ${cat}`,
      String(l.length),
      formatMoney(groceryTotal(l)),
      total ? `${Math.round((groceryTotal(l) / total) * 100)}%` : '0%',
    ]);
  return (
    <Table
      columns={[
        { title: 'Category', flex: 4 },
        { title: 'Items', flex: 1.5, align: 'right' },
        { title: 'Amount', flex: 3, align: 'right' },
        { title: '%', flex: 1.5, align: 'right' },
      ]}
      rows={rows}
      footer={['Total', String(items.length), formatMoney(total), '100%']}
    />
  );
}

function MasterList() {
  const c = useColors();
  const { data, saveGroceryTemplate } = useStore();
  const [editing, setEditing] = useState<GroceryItem | null>(null);
  const items = data.groceryTemplate;

  const upsert = (i: GroceryItem) => {
    const exists = items.some((x) => x.id === i.id);
    saveGroceryTemplate(exists ? items.map((x) => (x.id === i.id ? i : x)) : [...items, i]);
    setEditing(null);
  };

  return (
    <>
      <Muted>Prepare your regular grocery list once. Every new month starts from this list, so you only change what&apos;s different.</Muted>
      {editing ? (
        <ItemEditor
          key={editing.id}
          item={editing}
          existing={items}
          onSave={upsert}
          onCancel={() => setEditing(null)}
          onDelete={() => {
            saveGroceryTemplate(items.filter((x) => x.id !== editing.id));
            setEditing(null);
          }}
        />
      ) : (
        <ItemEditor key="new" item={null} existing={items} onSave={upsert} />
      )}
      <Card>
        <SectionTitle>Master list · {items.length} products</SectionTitle>
        {items.length ? (
          <>
            <GroupedList items={items} onEdit={setEditing} onChange={upsert} />
            <View style={{ marginTop: 10 }}>
              <Row label="Master list total" value={formatMoney(groceryTotal(items))} color={c.orange} bold />
            </View>
          </>
        ) : (
          <Muted>No products yet. Use Quick add above to start fast.</Muted>
        )}
      </Card>
    </>
  );
}

function MonthlyList({ onOpenMaster }: { onOpenMaster: () => void }) {
  const c = useColors();
  const { data, startGroceryMonth, saveGroceryMonth, saveGroceryTemplate, addExpenses, setGroceryBudget } = useStore();
  const [month, setMonth] = useState(toMonthKey(new Date()));
  const [editing, setEditing] = useState<GroceryItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<Filter>('All');
  const [budgetText, setBudgetText] = useState(data.groceryBudget ? String(data.groceryBudget) : '');
  const items = data.groceryMonths[month];
  const prevMonth = addMonths(month, -1);
  const previous = data.groceryMonths[prevMonth];

  const save = (next: GroceryItem[]) => saveGroceryMonth(month, next);

  const upsert = (i: GroceryItem) => {
    if (!items) return;
    const exists = items.some((x) => x.id === i.id);
    save(exists ? items.map((x) => (x.id === i.id ? i : x)) : [...items, i]);
    setEditing(null);
    setAdding(false);
  };

  const changeMonth = (delta: number) => {
    setMonth(addMonths(month, delta));
    setEditing(null);
    setAdding(false);
  };

  const recordExpense = () => {
    if (!items) return;
    const bought = items.filter((i) => i.bought);
    const total = groceryTotal(bought.length ? bought : items);
    Alert.alert(
      'Add to Budget?',
      `Record ${formatMoney(total)} as a Grocery expense today (${bought.length ? 'bought items only' : 'whole list'}).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: () => addExpenses([{ date: todayKey(), type: 'Grocery', amount: total, note: `Grocery list ${formatMonth(month)}` }]),
        },
      ],
    );
  };

  const updateMaster = () =>
    Alert.alert('Update master list?', 'Replace your master list with this month’s products, quantities and prices.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Update', onPress: () => items && saveGroceryTemplate(items.map((i) => ({ ...i, bought: false }))) },
    ]);

  const saveBudget = () => {
    const b = Number(budgetText || 0);
    if (!(b >= 0)) return Alert.alert('Check budget', 'Enter a valid amount.');
    setGroceryBudget(b);
  };

  if (!items) {
    return (
      <>
        <Stepper label={formatMonth(month)} onPrev={() => changeMonth(-1)} onNext={() => changeMonth(1)} />
        <Card>
          <SectionTitle>No list for {formatMonth(month)} yet</SectionTitle>
          {data.groceryTemplate.length || previous ? (
            <View style={{ gap: 10 }}>
              <Muted>Pick a starting point. You can change anything afterwards.</Muted>
              {data.groceryTemplate.length ? (
                <Button
                  title={`From master list (${data.groceryTemplate.length} items)`}
                  onPress={() => startGroceryMonth(month, data.groceryTemplate)}
                  color={c.orange}
                />
              ) : null}
              {previous ? (
                <Button
                  title={`Copy ${formatMonth(prevMonth)} (${previous.length} items)`}
                  onPress={() => startGroceryMonth(month, previous)}
                  variant="outline"
                  color={c.orange}
                />
              ) : null}
              <Button title="Start empty" onPress={() => startGroceryMonth(month, [])} variant="outline" color={c.muted} />
            </View>
          ) : (
            <>
              <Muted style={{ marginBottom: 12 }}>First, prepare your master grocery list. You only need to do this once.</Muted>
              <Button title="Prepare master list" onPress={onOpenMaster} color={c.orange} />
            </>
          )}
        </Card>
      </>
    );
  }

  const total = groceryTotal(items);
  const boughtItems = items.filter((i) => i.bought);
  const prevTotal = previous ? groceryTotal(previous) : null;
  const shown = filter === 'All' ? items : items.filter((i) => (filter === 'Bought' ? i.bought : !i.bought));
  const budget = data.groceryBudget;

  return (
    <>
      <Stepper label={formatMonth(month)} onPrev={() => changeMonth(-1)} onNext={() => changeMonth(1)} />

      <Card>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <Field label="Monthly grocery budget (₹)" value={budgetText} onChangeText={setBudgetText} keyboardType="decimal-pad" placeholder="e.g. 6000" />
          <View style={{ marginBottom: 12 }}>
            <Button title="Set" onPress={saveBudget} color={c.orange} />
          </View>
        </View>
        {budget ? (
          <>
            <ProgressBar value={total / budget} color={total > budget ? c.beat : c.orange} />
            <Muted style={{ marginTop: 6 }}>
              {total > budget
                ? `⚠ Over budget by ${formatMoney(total - budget)}`
                : `${formatMoney(budget - total)} left in budget`}
            </Muted>
          </>
        ) : null}
        {prevTotal !== null ? (
          <Muted style={{ marginTop: 4 }}>
            vs {formatMonth(prevMonth)}: {formatMoney(prevTotal)}{' '}
            <Text style={{ color: total > prevTotal ? c.expense : c.income, fontWeight: '900' }}>
              ({total >= prevTotal ? '+' : '−'}
              {formatMoney(Math.abs(total - prevTotal))})
            </Text>
          </Muted>
        ) : null}
      </Card>

      {editing ? (
        <ItemEditor
          key={editing.id}
          item={editing}
          existing={items}
          onSave={upsert}
          onCancel={() => setEditing(null)}
          onDelete={() => {
            save(items.filter((x) => x.id !== editing.id));
            setEditing(null);
          }}
        />
      ) : adding ? (
        <ItemEditor key="new" item={null} existing={items} onSave={upsert} onCancel={() => setAdding(false)} />
      ) : (
        <Button title="+ Add product for this month" onPress={() => setAdding(true)} variant="outline" color={c.orange} />
      )}

      <Card>
        <SectionTitle>{formatMonth(month)} list</SectionTitle>
        <View style={{ marginBottom: 12 }}>
          <Segments options={FILTERS} value={filter} onChange={setFilter} />
        </View>
        {shown.length ? (
          <GroupedList items={shown} previous={previous} onEdit={setEditing} onChange={upsert} checkable />
        ) : (
          <Muted>{items.length ? 'Nothing here.' : 'The list is empty.'}</Muted>
        )}
        <Muted style={{ marginTop: 10, fontSize: 12 }}>
          ✓ tick when bought · −/+ change quantity · tap a name to edit · ▲▼ price change vs last month
        </Muted>
      </Card>

      <Card>
        <SectionTitle>Summary</SectionTitle>
        <Row label="Bought" value={`${boughtItems.length} of ${items.length}`} />
        <View style={{ marginVertical: 6 }}>
          <ProgressBar value={items.length ? boughtItems.length / items.length : 0} color={c.primary} />
        </View>
        <Row label="Bought value" value={formatMoney(groceryTotal(boughtItems))} color={c.income} />
        <Row label="Still to buy" value={formatMoney(total - groceryTotal(boughtItems))} />
        <Row label="List total" value={formatMoney(total)} color={c.orange} bold />
        <View style={{ marginTop: 10 }}>
          <CategorySummary items={items} />
        </View>
      </Card>

      <Button title="Record grocery spend in Budget" onPress={recordExpense} color={c.orange} />
      <Button title="Save this list as my master list" onPress={updateMaster} variant="outline" color={c.orange} />
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '900', marginBottom: 6, letterSpacing: 0.8, textTransform: 'uppercase' },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  suggest: { borderWidth: 2, borderBottomWidth: 4, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10 },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  heroBox: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, padding: 12 },
  heroText: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
