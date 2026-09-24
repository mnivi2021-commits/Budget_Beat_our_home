import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Chips, Field, Muted, Row, Screen, SectionTitle, Segments, Stepper, Table, Text } from '@/components/ui';
import { addMonths, formatMoney, formatMonth, todayKey, toMonthKey } from '@/lib/dates';
import { groceryTotal, newId, useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';
import { GROCERY_UNITS } from '@/lib/types';
import type { GroceryItem, GroceryUnit } from '@/lib/types';

const MODES = ['Monthly list', 'Master list'] as const;
type Mode = (typeof MODES)[number];

export default function GroceryScreen() {
  const [mode, setMode] = useState<Mode>('Monthly list');
  return (
    <Screen title="Grocery 🛒" subtitle="Make the list once, then update it every month">
      <Segments options={MODES} value={mode} onChange={setMode} />
      {mode === 'Monthly list' ? <MonthlyList onOpenMaster={() => setMode('Master list')} /> : <MasterList />}
    </Screen>
  );
}

/** Add / edit form for one grocery item. */
function ItemEditor({
  item,
  onSave,
  onDelete,
  onCancel,
}: {
  item: GroceryItem | null;
  onSave: (i: GroceryItem) => void;
  onDelete?: () => void;
  onCancel?: () => void;
}) {
  const c = useColors();
  const [name, setName] = useState(item?.name ?? '');
  const [qty, setQty] = useState(item ? String(item.qty) : '1');
  const [unit, setUnit] = useState<GroceryUnit>(item?.unit ?? 'kg');
  const [price, setPrice] = useState(item ? String(item.price) : '');

  const save = () => {
    const q = Number(qty);
    const p = Number(price);
    if (!name.trim()) return Alert.alert('Missing product', 'Enter the product name.');
    if (!(q > 0)) return Alert.alert('Check quantity', 'Quantity must be greater than 0.');
    if (price.trim() === '' || !(p >= 0)) return Alert.alert('Check price', 'Enter the price per unit.');
    onSave({ id: item?.id ?? newId(), name: name.trim(), qty: q, unit, price: p, bought: item?.bought ?? false });
    if (!item) {
      setName('');
      setQty('1');
      setPrice('');
    }
  };

  return (
    <Card>
      <SectionTitle>{item ? `Edit: ${item.name}` : 'Add product'}</SectionTitle>
      <Field label="Product name" value={name} onChangeText={setName} placeholder="e.g. Rice" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field label="Quantity" value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
        <Field label="Price per unit (₹)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0" />
      </View>
      <Text style={[styles.label, { color: c.muted }]}>Unit</Text>
      <Chips options={GROCERY_UNITS} value={unit} onChange={setUnit} />
      {Number(qty) > 0 && Number(price) >= 0 && price !== '' ? (
        <Muted style={{ marginBottom: 10 }}>Line total: {formatMoney(Number(qty) * Number(price))}</Muted>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button title={item ? 'Save changes' : 'Add to list'} onPress={save} />
        </View>
        {onCancel ? (
          <View style={{ flex: 1 }}>
            <Button title="Cancel" onPress={onCancel} variant="outline" />
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

/** Rows-and-columns summary; tap a row to edit, tap the box to mark bought. */
function GroceryTable({
  items,
  onEdit,
  onToggle,
}: {
  items: GroceryItem[];
  onEdit: (i: GroceryItem) => void;
  onToggle?: (i: GroceryItem) => void;
}) {
  const c = useColors();
  const cols = [
    ...(onToggle ? [{ title: '✓', flex: 1, align: 'center' as const }] : [{ title: '#', flex: 1 }]),
    { title: 'Product', flex: 4 },
    { title: 'Qty', flex: 3, align: 'right' as const },
    { title: 'Price', flex: 3, align: 'right' as const },
    { title: 'Total', flex: 3, align: 'right' as const },
  ];
  const txt = (s: string, i: GroceryItem, align: 'left' | 'right' = 'right') => (
    <Pressable onPress={() => onEdit(i)}>
      <Text
        style={{
          color: i.bought && onToggle ? c.muted : c.text,
          textDecorationLine: i.bought && onToggle ? 'line-through' : 'none',
          textAlign: align,
          fontSize: 13,
        }}>
        {s}
      </Text>
    </Pressable>
  );
  return (
    <Table
      columns={cols}
      rows={items.map((i, idx) => [
        onToggle ? (
          <Pressable key="t" onPress={() => onToggle(i)} hitSlop={8} style={{ alignItems: 'center' }}>
            <View style={[styles.box, { borderColor: c.primary, backgroundColor: i.bought ? c.primary : 'transparent' }]}>
              {i.bought ? <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>✓</Text> : null}
            </View>
          </Pressable>
        ) : (
          String(idx + 1)
        ),
        txt(i.name, i, 'left'),
        txt(`${i.qty} ${i.unit}`, i),
        txt(formatMoney(i.price), i),
        txt(formatMoney(i.qty * i.price), i),
      ])}
      footer={['', 'Total', `${items.length} items`, '', formatMoney(groceryTotal(items))]}
    />
  );
}

function MasterList() {
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
      <Muted>
        Prepare your regular grocery list once. Every new month starts from this list, so you only change quantities
        and prices.
      </Muted>
      {editing ? (
        <ItemEditor
          key={editing.id}
          item={editing}
          onSave={upsert}
          onCancel={() => setEditing(null)}
          onDelete={() => {
            saveGroceryTemplate(items.filter((x) => x.id !== editing.id));
            setEditing(null);
          }}
        />
      ) : (
        <ItemEditor key="new" item={null} onSave={upsert} />
      )}
      <Card>
        <SectionTitle>Master list</SectionTitle>
        {items.length ? (
          <>
            <GroceryTable items={items} onEdit={setEditing} />
            <Muted style={{ marginTop: 8 }}>Tap a row to edit or remove it.</Muted>
          </>
        ) : (
          <Muted>No products yet. Add your first product above.</Muted>
        )}
      </Card>
    </>
  );
}

function MonthlyList({ onOpenMaster }: { onOpenMaster: () => void }) {
  const c = useColors();
  const { data, startGroceryMonth, saveGroceryMonth, saveGroceryTemplate, addExpense } = useStore();
  const [month, setMonth] = useState(toMonthKey(new Date()));
  const [editing, setEditing] = useState<GroceryItem | null>(null);
  const [adding, setAdding] = useState(false);
  const items = data.groceryMonths[month];

  const save = (next: GroceryItem[]) => saveGroceryMonth(month, next);

  const upsert = (i: GroceryItem) => {
    if (!items) return;
    const exists = items.some((x) => x.id === i.id);
    save(exists ? items.map((x) => (x.id === i.id ? i : x)) : [...items, i]);
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
          onPress: () => addExpense({ date: todayKey(), type: 'Grocery', amount: total, note: `Grocery list ${formatMonth(month)}` }),
        },
      ],
    );
  };

  const updateMaster = () =>
    Alert.alert('Update master list?', 'Replace your master list with this month’s products, quantities and prices.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Update', onPress: () => items && saveGroceryTemplate(items.map((i) => ({ ...i, bought: false }))) },
    ]);

  return (
    <>
      <Stepper
        label={formatMonth(month)}
        onPrev={() => {
          setMonth(addMonths(month, -1));
          setEditing(null);
        }}
        onNext={() => {
          setMonth(addMonths(month, 1));
          setEditing(null);
        }}
      />

      {!items ? (
        <Card>
          <SectionTitle>No list for {formatMonth(month)} yet</SectionTitle>
          {data.groceryTemplate.length ? (
            <>
              <Muted style={{ marginBottom: 12 }}>
                Start this month from your master list ({data.groceryTemplate.length} products,{' '}
                {formatMoney(groceryTotal(data.groceryTemplate))}). You can then change anything for this month.
              </Muted>
              <Button title={`Start ${formatMonth(month)} list`} onPress={() => startGroceryMonth(month)} />
            </>
          ) : (
            <>
              <Muted style={{ marginBottom: 12 }}>First, prepare your master grocery list. You only need to do this once.</Muted>
              <Button title="Prepare master list" onPress={onOpenMaster} />
            </>
          )}
        </Card>
      ) : (
        <>
          {editing ? (
            <ItemEditor
              key={editing.id}
              item={editing}
              onSave={upsert}
              onCancel={() => setEditing(null)}
              onDelete={() => {
                save(items.filter((x) => x.id !== editing.id));
                setEditing(null);
              }}
            />
          ) : adding ? (
            <ItemEditor key="new" item={null} onSave={upsert} onCancel={() => setAdding(false)} />
          ) : null}

          <Card>
            <SectionTitle>{formatMonth(month)} list</SectionTitle>
            {items.length ? (
              <GroceryTable items={items} onEdit={setEditing} onToggle={(i) => save(items.map((x) => (x.id === i.id ? { ...x, bought: !x.bought } : x)))} />
            ) : (
              <Muted>The list is empty.</Muted>
            )}
            <Muted style={{ marginTop: 8 }}>Tick the box when bought. Tap a row to change quantity or price.</Muted>
          </Card>

          <Card>
            <SectionTitle>Summary</SectionTitle>
            <Row label="Products" value={String(items.length)} />
            <Row label="Bought" value={`${items.filter((i) => i.bought).length} of ${items.length}`} />
            <Row label="Bought value" value={formatMoney(groceryTotal(items.filter((i) => i.bought)))} />
            <Row label="Remaining value" value={formatMoney(groceryTotal(items.filter((i) => !i.bought)))} />
            <Row label="List total" value={formatMoney(groceryTotal(items))} color={c.primary} bold />
          </Card>

          {!adding && !editing ? <Button title="+ Add product for this month" onPress={() => setAdding(true)} variant="outline" /> : null}
          <Button title="Record grocery spend in Budget" onPress={recordExpense} />
          <Button title="Save this list as my master list" onPress={updateMaster} variant="outline" />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
