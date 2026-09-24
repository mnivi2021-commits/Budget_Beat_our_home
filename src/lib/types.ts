export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const MAX_PEOPLE = 5;

export const AVATARS = ['👨', '👩', '👦', '👧', '👴', '👵', '🧑', '👶'] as const;

export type Person = {
  id: string;
  avatar: string;
  name: string;
  age: number;
  bloodGroup: BloodGroup;
  heightCm: number;
  weightKg: number;
};

export type WeightLog = {
  personId: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  bmi: number;
};

export type Activity = {
  personId: string;
  date: string; // YYYY-MM-DD
  steps: number;
  waterGlasses: number;
  exerciseMin: number;
  sleepHours: number;
};

/** Daily targets used for the activity report. */
export const ACTIVITY_GOALS = { steps: 8000, waterGlasses: 8, exerciseMin: 30, sleepHours: 8 };

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

export const EXPENSE_EMOJI: Record<ExpenseType, string> = {
  Food: '🍛',
  Grocery: '🛒',
  Transport: '🚌',
  Bills: '💡',
  Rent: '🏠',
  Medical: '💊',
  Education: '📚',
  Shopping: '🛍️',
  Entertainment: '🎬',
  Other: '📦',
};

export type Expense = {
  id: string;
  date: string; // YYYY-MM-DD
  type: ExpenseType;
  amount: number;
  note?: string;
};

export const GROCERY_UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'pack', 'dozen'] as const;

export type GroceryUnit = (typeof GROCERY_UNITS)[number];

export const GROCERY_CATEGORIES = [
  'Grains',
  'Pulses',
  'Oil & Ghee',
  'Spices',
  'Vegetables',
  'Fruits',
  'Dairy',
  'Snacks',
  'Cleaning',
  'Personal care',
  'Other',
] as const;

export type GroceryCategory = (typeof GROCERY_CATEGORIES)[number];

export const CATEGORY_EMOJI: Record<GroceryCategory, string> = {
  Grains: '🌾',
  Pulses: '🫘',
  'Oil & Ghee': '🫙',
  Spices: '🌶️',
  Vegetables: '🥕',
  Fruits: '🍌',
  Dairy: '🥛',
  Snacks: '🍪',
  Cleaning: '🧼',
  'Personal care': '🧴',
  Other: '📦',
};

/** One-tap suggestions when adding grocery products. */
export const COMMON_GROCERIES: { name: string; unit: GroceryUnit; category: GroceryCategory }[] = [
  { name: 'Rice', unit: 'kg', category: 'Grains' },
  { name: 'Wheat flour (Atta)', unit: 'kg', category: 'Grains' },
  { name: 'Rava', unit: 'kg', category: 'Grains' },
  { name: 'Toor dal', unit: 'kg', category: 'Pulses' },
  { name: 'Moong dal', unit: 'kg', category: 'Pulses' },
  { name: 'Urad dal', unit: 'kg', category: 'Pulses' },
  { name: 'Sunflower oil', unit: 'L', category: 'Oil & Ghee' },
  { name: 'Ghee', unit: 'L', category: 'Oil & Ghee' },
  { name: 'Salt', unit: 'kg', category: 'Spices' },
  { name: 'Sugar', unit: 'kg', category: 'Spices' },
  { name: 'Chilli powder', unit: 'g', category: 'Spices' },
  { name: 'Turmeric', unit: 'g', category: 'Spices' },
  { name: 'Onion', unit: 'kg', category: 'Vegetables' },
  { name: 'Tomato', unit: 'kg', category: 'Vegetables' },
  { name: 'Potato', unit: 'kg', category: 'Vegetables' },
  { name: 'Banana', unit: 'dozen', category: 'Fruits' },
  { name: 'Milk', unit: 'L', category: 'Dairy' },
  { name: 'Curd', unit: 'pack', category: 'Dairy' },
  { name: 'Eggs', unit: 'dozen', category: 'Dairy' },
  { name: 'Tea powder', unit: 'g', category: 'Snacks' },
  { name: 'Biscuits', unit: 'pack', category: 'Snacks' },
  { name: 'Detergent', unit: 'kg', category: 'Cleaning' },
  { name: 'Dish wash', unit: 'pcs', category: 'Cleaning' },
  { name: 'Soap', unit: 'pcs', category: 'Personal care' },
  { name: 'Toothpaste', unit: 'pcs', category: 'Personal care' },
];

export type GroceryItem = {
  id: string;
  name: string;
  category: GroceryCategory;
  qty: number;
  unit: GroceryUnit;
  price: number; // price per unit
  bought: boolean;
};

export type AppData = {
  people: Person[];
  activePersonId: string | null;
  weightLog: WeightLog[];
  activities: Activity[];
  expenses: Expense[];
  incomes: Record<string, number>; // YYYY-MM -> income
  groceryTemplate: GroceryItem[]; // the list prepared once, reused every month
  groceryMonths: Record<string, GroceryItem[]>; // YYYY-MM -> that month's list
  groceryBudget: number; // monthly grocery budget, 0 = not set
};

export const EMPTY_DATA: AppData = {
  people: [],
  activePersonId: null,
  weightLog: [],
  activities: [],
  expenses: [],
  incomes: {},
  groceryTemplate: [],
  groceryMonths: {},
  groceryBudget: 0,
};
