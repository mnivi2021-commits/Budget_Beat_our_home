import { useColorScheme } from 'react-native';

// Playful, Duolingo-inspired palette: bright flat colours with darker "3D" edges.
const light = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  text: '#4B4B4B',
  muted: '#777777',
  border: '#E5E5E5',
  primary: '#58CC02', // green
  primarySoft: '#D7FFB8',
  blue: '#1CB0F6',
  blueSoft: '#DDF4FF',
  orange: '#FF9600',
  orangeSoft: '#FFF0D9',
  yellow: '#FFC800',
  purple: '#CE82FF',
  beat: '#FF4B4B', // red
  beatSoft: '#FFDFE0',
  income: '#58A700',
  expense: '#EA2B2B',
  inputBg: '#F7F7F7',
  tableHead: '#F7F7F7',
};

const dark: typeof light = {
  bg: '#131F24',
  card: '#131F24',
  text: '#F1F7FB',
  muted: '#8FA1AD',
  border: '#37464F',
  primary: '#58CC02',
  primarySoft: '#1F3A12',
  blue: '#1CB0F6',
  blueSoft: '#0E3447',
  orange: '#FF9600',
  orangeSoft: '#3D2A10',
  yellow: '#FFC800',
  purple: '#CE82FF',
  beat: '#FF4B4B',
  beatSoft: '#3D1F22',
  income: '#79D634',
  expense: '#FF6B6B',
  inputBg: '#202F36',
  tableHead: '#202F36',
};

export type Palette = typeof light;

export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Darker shade of a #RRGGBB colour, used for the chunky bottom edge of buttons. */
export function shade(hex: string, factor = 0.82): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const ch = (v: number) => Math.round(v * factor).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

/** #RRGGBB + alpha (0–1) → #RRGGBBAA */
export function alpha(hex: string, a: number): string {
  return `${hex.slice(0, 7)}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
}

/** Header gradients for each section of the app. */
export const Gradients = {
  home: ['#58CC02', '#89E219'],
  beat: ['#FF4B4B', '#FF7B9C'],
  budget: ['#1CB0F6', '#4DD0FF'],
  grocery: ['#FF9600', '#FFC800'],
} as const;

export type Section = keyof typeof Gradients;

export const Fonts = {
  regular: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  heavy: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
};
