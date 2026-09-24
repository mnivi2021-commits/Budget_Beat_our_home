import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { calcBmi } from './bmi';
import { todayKey } from './dates';
import { EMPTY_DATA } from './types';
import type { AppData, Expense, GroceryItem, Profile } from './types';

const STORAGE_KEY = 'budget-and-beat:v1';

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

type Store = {
  ready: boolean;
  data: AppData;
  saveProfile: (p: Profile) => void;
  addExpense: (e: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  setIncome: (month: string, amount: number) => void;
  saveGroceryTemplate: (items: GroceryItem[]) => void;
  /** Creates the month's list from the template if it doesn't exist yet. */
  startGroceryMonth: (month: string) => void;
  saveGroceryMonth: (month: string, items: GroceryItem[]) => void;
  resetAll: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setData({ ...EMPTY_DATA, ...JSON.parse(raw) });
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
      saveProfile: (p) =>
        update((d) => {
          const entry = { date: todayKey(), weightKg: p.weightKg, bmi: calcBmi(p.weightKg, p.heightCm) };
          const log = [...d.weightLog.filter((w) => w.date !== entry.date), entry].sort((a, b) =>
            a.date.localeCompare(b.date),
          );
          return { ...d, profile: p, weightLog: log };
        }),
      addExpense: (e) => update((d) => ({ ...d, expenses: [...d.expenses, { ...e, id: newId() }] })),
      deleteExpense: (id) => update((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) })),
      setIncome: (month, amount) => update((d) => ({ ...d, incomes: { ...d.incomes, [month]: amount } })),
      saveGroceryTemplate: (items) => update((d) => ({ ...d, groceryTemplate: items })),
      startGroceryMonth: (month) =>
        update((d) => {
          if (d.groceryMonths[month]) return d;
          const items = d.groceryTemplate.map((i) => ({ ...i, id: newId(), bought: false }));
          return { ...d, groceryMonths: { ...d.groceryMonths, [month]: items } };
        }),
      saveGroceryMonth: (month, items) =>
        update((d) => ({ ...d, groceryMonths: { ...d.groceryMonths, [month]: items } })),
      resetAll: () => update(() => EMPTY_DATA),
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
