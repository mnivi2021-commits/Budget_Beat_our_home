import type { RefObject } from 'react';
import { Alert } from 'react-native';
import type { View } from 'react-native';

import { bmiCategory, calcBmi, healthyWeightRange } from './bmi';
import { formatMonth, todayKey } from './dates';
import { sum } from './store';
import { EXPENSE_TYPES } from './types';
import type { AppData } from './types';

// Native-backed libraries are loaded only when a button is tapped, so a module that is
// missing from Expo Go breaks just that feature instead of crashing the app on start.
/* eslint-disable @typescript-eslint/no-require-imports */
const load = {
  sharing: () => require('expo-sharing') as typeof import('expo-sharing'),
  viewShot: () => require('react-native-view-shot') as typeof import('react-native-view-shot'),
  fileSystem: () => require('expo-file-system') as typeof import('expo-file-system'),
  xlsx: () => require('xlsx') as typeof import('xlsx'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

async function share(uri: string, mimeType: string, title: string) {
  const Sharing = load.sharing();
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert('Sharing not available', 'This device cannot share files.');
    return;
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: title });
}

/** Captures a view as PNG and opens the share sheet (Save to Photos, Drive, WhatsApp…). */
export async function screenshotView(ref: RefObject<View | null>, name: string) {
  if (!ref.current) return;
  try {
    const uri = await load.viewShot().captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
    await share(uri, 'image/png', `${name} report`);
  } catch {
    Alert.alert('Screenshot failed', 'Could not capture the report. You can still use your phone screenshot buttons.');
  }
}

/** Builds one Excel workbook with every section of the app and opens the share sheet. */
export async function exportExcel(data: AppData) {
  const XLSX = load.xlsx();
  const { File, Paths } = load.fileSystem();
  const wb = XLSX.utils.book_new();
  const add = (title: string, rows: (string | number)[][], widths: number[]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = widths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, title);
  };

  // Family health
  add(
    'Family Health',
    [
      ['Name', 'Age', 'Blood group', 'Height (cm)', 'Weight (kg)', 'BMI', 'Category', 'Healthy weight (kg)'],
      ...data.people.map((p) => {
        const bmi = calcBmi(p.weightKg, p.heightCm);
        const [lo, hi] = healthyWeightRange(p.heightCm);
        return [p.name, p.age, p.bloodGroup, p.heightCm, p.weightKg, +bmi.toFixed(1), bmiCategory(bmi).label, `${lo.toFixed(1)} - ${hi.toFixed(1)}`];
      }),
    ],
    [16, 6, 12, 12, 12, 8, 18, 20],
  );

  const nameOf = (id: string) => data.people.find((p) => p.id === id)?.name ?? '(deleted)';

  add(
    'Daily Activity',
    [
      ['Date', 'Person', 'Steps', 'Water (glasses)', 'Exercise (min)', 'Sleep (hrs)'],
      ...data.activities.map((a) => [a.date, nameOf(a.personId), a.steps, a.waterGlasses, a.exerciseMin, a.sleepHours]),
    ],
    [12, 16, 10, 16, 16, 12],
  );

  add(
    'Weight Log',
    [['Date', 'Person', 'Weight (kg)', 'BMI'], ...data.weightLog.map((w) => [w.date, nameOf(w.personId), w.weightKg, +w.bmi.toFixed(1)])],
    [12, 16, 12, 8],
  );

  const expenses = [...data.expenses].sort((a, b) => a.date.localeCompare(b.date));
  add(
    'Expenses',
    [
      ['Date', 'Type', 'Amount (Rs)', 'Note'],
      ...expenses.map((e) => [e.date, e.type, e.amount, e.note ?? '']),
      [],
      ['', 'TOTAL', sum(expenses.map((e) => e.amount)), ''],
    ],
    [12, 14, 14, 30],
  );

  // Monthly P&L: one row per month that has income or expenses.
  const months = [...new Set([...Object.keys(data.incomes), ...data.expenses.map((e) => e.date.slice(0, 7))])].sort();
  add(
    'Monthly P&L',
    [
      ['Month', 'Income', ...EXPENSE_TYPES, 'Total expenses', 'Net profit / loss', 'Savings %'],
      ...months.map((m) => {
        const list = data.expenses.filter((e) => e.date.startsWith(m));
        const income = data.incomes[m] ?? 0;
        const total = sum(list.map((e) => e.amount));
        const net = income - total;
        return [
          formatMonth(m),
          income,
          ...EXPENSE_TYPES.map((t) => sum(list.filter((e) => e.type === t).map((e) => e.amount))),
          total,
          net,
          income > 0 ? +((net / income) * 100).toFixed(1) : '',
        ];
      }),
    ],
    [10, 12, ...EXPENSE_TYPES.map(() => 12), 14, 16, 10],
  );

  const groceryRows = (month: string, items: AppData['groceryTemplate']) =>
    items.map((i) => [month, i.category, i.name, i.qty, i.unit, i.price, +(i.qty * i.price).toFixed(2), i.bought ? 'Yes' : 'No']);
  add(
    'Grocery',
    [
      ['Month', 'Category', 'Product', 'Qty', 'Unit', 'Price/unit', 'Total', 'Bought'],
      ...Object.keys(data.groceryMonths)
        .sort()
        .flatMap((m) => groceryRows(formatMonth(m), data.groceryMonths[m])),
      ...groceryRows('MASTER LIST', data.groceryTemplate),
    ],
    [12, 14, 22, 8, 8, 10, 10, 8],
  );

  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const file = new File(Paths.cache, `Budget_and_Beat_${todayKey()}.xlsx`);
  if (file.exists) file.delete();
  file.create();
  file.write(base64, { encoding: 'base64' });
  await share(file.uri, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Budget & Beat Excel');
}
