import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { calcBmi } from './bmi';
import { todayKey } from './dates';
import { EMPTY_DATA, MAX_PEOPLE } from './types';
import type { Activity, AppData, Expense, GroceryItem, Person } from './types';

const STORAGE_KEY = 'budget-and-beat:v1';

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Upgrades data saved by older versions of the app (single profile, no grocery categories). */
function migrate(raw: any): AppData {
  const d: AppData = { ...EMPTY_DATA, ...raw };
  if (raw.profile && !raw.people) {
    const id = 'p1';
    d.people = [{ id, avatar: '🧑', ...raw.profile }];
    d.activePersonId = id;
    d.weightLog = (raw.weightLog ?? []).map((w: any) => ({ personId: id, ...w }));
  }
  delete (d as any).profile;
  const withCategory = (items: GroceryItem[]) => items.map((i) => ({ ...i, category: i.category ?? 'Other' }));
  d.groceryTemplate = withCategory(d.groceryTemplate);
  d.groceryMonths = Object.fromEntries(Object.entries(d.groceryMonths).map(([m, items]) => [m, withCategory(items)]));
  return d;
}

type Store = {
  ready: boolean;
  data: AppData;
  activePerson: Person | null;
  savePerson: (p: Person) => void;
  deletePerson: (id: string) => void;
  setActivePerson: (id: string) => void;
  saveActivity: (a: Activity) => void;
  deleteActivity: (personId: string, date: string) => void;
  deleteWeightLog: (personId: string, date: string) => void;
  addExpenses: (list: Omit<Expense, 'id'>[]) => void;
  deleteExpense: (id: string) => void;
  setIncome: (month: string, amount: number) => void;
  saveGroceryTemplate: (items: GroceryItem[]) => void;
  /** Creates the month's list from the given items (master list or another month). */
  startGroceryMonth: (month: string, from: GroceryItem[]) => void;
  saveGroceryMonth: (month: string, items: GroceryItem[]) => void;
  setGroceryBudget: (amount: number) => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setData(migrate(JSON.parse(raw)));
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [data]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData(fn), []);

  const store = useMemo<Store>(
    () => ({
      ready,
      data,
      activePerson: data.people.find((p) => p.id === data.activePersonId) ?? data.people[0] ?? null,
      savePerson: (p) =>
        update((d) => {
          const exists = d.people.some((x) => x.id === p.id);
          if (!exists && d.people.length >= MAX_PEOPLE) return d;
          const people = exists ? d.people.map((x) => (x.id === p.id ? p : x)) : [...d.people, p];
          const entry = { personId: p.id, date: todayKey(), weightKg: p.weightKg, bmi: calcBmi(p.weightKg, p.heightCm) };
          const weightLog = [
            ...d.weightLog.filter((w) => !(w.personId === p.id && w.date === entry.date)),
            entry,
          ].sort((a, b) => a.date.localeCompare(b.date));
          return { ...d, people, weightLog, activePersonId: p.id };
        }),
      deletePerson: (id) =>
        update((d) => {
          const people = d.people.filter((p) => p.id !== id);
          return {
            ...d,
            people,
            activePersonId: d.activePersonId === id ? (people[0]?.id ?? null) : d.activePersonId,
            weightLog: d.weightLog.filter((w) => w.personId !== id),
            activities: d.activities.filter((a) => a.personId !== id),
          };
        }),
      setActivePerson: (id) => update((d) => ({ ...d, activePersonId: id })),
      saveActivity: (a) =>
        update((d) => ({
          ...d,
          activities: [...d.activities.filter((x) => !(x.personId === a.personId && x.date === a.date)), a].sort(
            (x, y) => x.date.localeCompare(y.date),
          ),
        })),
      deleteActivity: (personId, date) =>
        update((d) => ({ ...d, activities: d.activities.filter((a) => !(a.personId === personId && a.date === date)) })),
      deleteWeightLog: (personId, date) =>
        update((d) => ({ ...d, weightLog: d.weightLog.filter((w) => !(w.personId === personId && w.date === date)) })),
      addExpenses: (list) =>
        update((d) => ({ ...d, expenses: [...d.expenses, ...list.map((e) => ({ ...e, id: newId() }))] })),
      deleteExpense: (id) => update((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) })),
      setIncome: (month, amount) => update((d) => ({ ...d, incomes: { ...d.incomes, [month]: amount } })),
      saveGroceryTemplate: (items) => update((d) => ({ ...d, groceryTemplate: items })),
      startGroceryMonth: (month, from) =>
        update((d) => {
          if (d.groceryMonths[month]) return d;
          const items = from.map((i) => ({ ...i, id: newId(), bought: false }));
          return { ...d, groceryMonths: { ...d.groceryMonths, [month]: items } };
        }),
      saveGroceryMonth: (month, items) =>
        update((d) => ({ ...d, groceryMonths: { ...d.groceryMonths, [month]: items } })),
      setGroceryBudget: (amount) => update((d) => ({ ...d, groceryBudget: amount })),
    }),
    [data, ready, update],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

export function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

export function groceryTotal(items: GroceryItem[]): number {
  return sum(items.map((i) => i.qty * i.price));
}
