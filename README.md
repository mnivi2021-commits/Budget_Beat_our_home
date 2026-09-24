# Budget & Beat 🐷❤

A home money and health buddy, built with Expo (SDK 57) and Expo Router. It has a playful, Duolingo-inspired look: chunky 3D buttons, bold rounded fonts, streaks and progress bars.

## Features

### ❤ Beat (health)
- Enter name, age, blood group, height (cm) and weight (kg)
- BMI calculation with a colour scale and your category (WHO: Underweight, Normal, Overweight, Obese I/II/III)
- Analysis report: healthy weight range for your height, how much to gain or lose, health risk, advice, daily calories and water
- Blood group compatibility (who you can donate to and receive from)
- Weight history each time you update

### ₹ Budget (home expenses)
- **Add**: date, expense type, amount and note, plus the monthly income
- **Day / Week / Month** summaries with totals, per-day bars and a breakdown by type
- **P&L**: a monthly Profit & Loss statement (income, expenses by type, net profit or loss, savings rate) and a 6-month overview table

### 🛒 Grocery
- **Master list**: make it once (product, quantity, unit, price per unit)
- **Monthly list**: each month starts from the master list. You can change quantities and prices, tick items as bought and add extra products
- Row-and-column summary table with line totals and a grand total
- Record the grocery spend in Budget with one tap, or save a month's list as the new master list

All data is stored on the phone (AsyncStorage). No account is needed.

## Run it on your phone

1. Install **Expo Go** from the Play Store (Android) or App Store (iOS)
2. In this folder:
   ```bash
   npm install
   npx expo start
   ```
3. Scan the QR code with Expo Go (Android) or the Camera app (iOS). Your phone and computer must be on the same Wi-Fi.
   - If they can't reach each other, use `npx expo start --tunnel`
   - With a USB cable and Android `adb` installed, press `a` in the terminal instead

## Project structure

```
src/app/_layout.tsx   tab navigation + font loading
src/app/index.tsx     Home (streak, stats, learning-path menu)
src/app/beat.tsx      Health form + BMI report
src/app/budget.tsx    Expenses, summaries, income, P&L
src/app/grocery.tsx   Master + monthly grocery lists
src/components/ui.tsx Shared Duolingo-style UI kit
src/lib/              store (AsyncStorage), BMI maths, dates, theme, types
```
