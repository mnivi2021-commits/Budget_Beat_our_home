export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export type Profile = {
  name: string;
  age: number;
  bloodGroup: BloodGroup;
  heightCm: number;
  weightKg: number;
};

export type WeightLog = {
  date: string; // YYYY-MM-DD
  weightKg: number;
  bmi: number;
};

export const EXPENSE_TYPES = [
  'Food',
  'Grocery',
  'Transport',
  'Bills',
  'Rent',
  'Medical',
  'Education',
  'Shopping',
  'Entertainment',
  'Other',
] as const;

export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export type Expense = {
  id: string;
  date: string; // YYYY-MM-DD
  type: ExpenseType;
  amount: number;
  note?: string;
};

export const GROCERY_UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'pack', 'dozen'] as const;

export type GroceryUnit = (typeof GROCERY_UNITS)[number];

export type GroceryItem = {
  id: string;
  name: string;
  qty: number;
  unit: GroceryUnit;
  price: number; // price per unit
  bought: boolean;
};

export type AppData = {
  profile: Profile | null;
  weightLog: WeightLog[];
  expenses: Expense[];
  incomes: Record<string, number>; // YYYY-MM -> income
  groceryTemplate: GroceryItem[]; // the list prepared once, reused every month
  groceryMonths: Record<string, GroceryItem[]>; // YYYY-MM -> that month's list
};

export const EMPTY_DATA: AppData = {
  profile: null,
  weightLog: [],
  expenses: [],
  incomes: {},
  groceryTemplate: [],
  groceryMonths: {},
};
