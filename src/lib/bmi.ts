import type { BloodGroup } from './types';

export type BmiCategory = {
  label: string;
  min: number;
  max: number; // exclusive upper bound
  color: string;
  risk: string;
  advice: string;
};

// WHO adult BMI classification.
export const BMI_CATEGORIES: BmiCategory[] = [
  {
    label: 'Underweight',
    min: 0,
    max: 18.5,
    color: '#3B82F6',
    risk: 'Risk of nutritional deficiency, weak immunity and low bone density.',
    advice:
      'Eat regular, energy-dense meals with protein (dal, eggs, milk, paneer, nuts). Add strength training and consult a doctor if weight keeps dropping.',
  },
  {
    label: 'Normal weight',
    min: 18.5,
    max: 25,
    color: '#16A34A',
    risk: 'Lowest health risk range.',
    advice:
      'Keep it up: balanced meals, 150 minutes of activity per week, 7–8 hours of sleep and regular check-ups.',
  },
  {
    label: 'Overweight',
    min: 25,
    max: 30,
    color: '#F59E0B',
    risk: 'Increased risk of high blood pressure, type 2 diabetes and heart disease.',
    advice:
      'Aim to lose 0.5 kg per week: cut sugary drinks and fried snacks, add vegetables and fibre, walk 30–45 minutes daily.',
  },
  {
    label: 'Obese (Class I)',
    min: 30,
    max: 35,
    color: '#EA580C',
    risk: 'High risk of diabetes, heart disease, joint problems and sleep apnea.',
    advice:
      'Plan a steady weight-loss program with a doctor or dietitian. Check blood sugar, BP and cholesterol.',
  },
  {
    label: 'Obese (Class II)',
    min: 35,
    max: 40,
    color: '#DC2626',
    risk: 'Very high health risk.',
    advice: 'Medical guidance is strongly recommended. Get a full health check-up.',
  },
  {
    label: 'Obese (Class III)',
    min: 40,
    max: Infinity,
    color: '#991B1B',
    risk: 'Extremely high health risk.',
    advice: 'Please consult a doctor soon for a supervised treatment plan.',
  },
];

export function calcBmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  if (m <= 0) return 0;
  return weightKg / (m * m);
}

export function bmiCategory(bmi: number): BmiCategory {
  return BMI_CATEGORIES.find((c) => bmi >= c.min && bmi < c.max) ?? BMI_CATEGORIES[0];
}

export function healthyWeightRange(heightCm: number): [number, number] {
  const m = heightCm / 100;
  return [18.5 * m * m, 24.9 * m * m];
}

/** Rough daily calorie need (Mifflin-St Jeor, sedentary, gender-neutral midpoint). */
export function dailyCalories(weightKg: number, heightCm: number, age: number): number {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 78; // midpoint of +5 (male) / -161 (female)
  return Math.round(bmr * 1.2);
}

export function idealWaterLitres(weightKg: number): number {
  return Math.round(weightKg * 0.033 * 10) / 10;
}

// Red blood cell compatibility.
const DONATE_TO: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

export function canDonateTo(bg: BloodGroup): BloodGroup[] {
  return DONATE_TO[bg];
}

export function canReceiveFrom(bg: BloodGroup): BloodGroup[] {
  return (Object.keys(DONATE_TO) as BloodGroup[]).filter((d) => DONATE_TO[d].includes(bg));
}
