# 🌾 Zameen Converter — Bigha, Kanal, Marla, Gaj Calculator

> **A fast, fully offline, state-aware Indian land-area converter & plot calculator** supporting **English, Hindi (हिंदी), and Punjabi (ਪੰਜਾਬੀ)** with modern glassmorphism aesthetics.

Built precisely according to [`zameen-area-converter-app-spec.md`](./zameen-area-converter-app-spec.md).

---

## 🌟 Key Features

1. **State-Aware Smart Converter**:
   - Because a **Bigha in Uttar Pradesh (27,225 sq ft)** is NOT the same as a **Kachha Bigha (9,075 sq ft)** or a **Bigha in Himachal Pradesh (9,075 sq ft)** or **West Bengal (14,400 sq ft)**!
   - Supports: **Punjab, Haryana, Uttar Pradesh, Rajasthan, Bihar, Madhya Pradesh, Gujarat, Maharashtra, Himachal Pradesh & Uttarakhand, West Bengal, and South India**.
   - Handles official variants (e.g., *Pucca vs Kachha Bigha*, *Standard Marla 272.25 sq ft vs Old Settlement Marla 225 sq ft*).
   - Real-time conversion into **all units simultaneously** as you type.

2. **Full Tri-Lingual Localization**:
   - **English**, **Hindi (हिंदी)**, and **Punjabi (ਪੰਜਾਬੀ)**.
   - Dual-script unit names (e.g., `कनाल / Kanal`, `ਮਰਲਾ / Marla`, `पक्का बीघा / Pucca Bigha`).

3. **Plot Area Calculator with Live SVG Geometry**:
   - **Rectangle**: Length × Width (in Feet, Gaj/Yards, Metres, or Karam).
   - **Triangle**: 3 Sides using Heron's formula.
   - **4-Sided Irregular Plot**: 4 sides + 1 diagonal triangulation method (as surveyed by patwaris and amins in India).
   - Real-time SVG diagram showing side dimensions and diagonals.
   - 1-tap transfer to Land Price Calculator.

4. **Plot Price & Deal Calculator**:
   - **Direct Mode**: Area + Rate/Unit $\to$ Total Deal Amount in Indian notation (`₹1,45,20,000` — `1 Crore 45.20 Lakh`) with words representation.
   - **Reverse Mode**: Total Price + Area $\to$ Instant equivalent rate comparison across all units (₹/Gaj, ₹/Marla, ₹/Kanal, ₹/Bigha, ₹/Acre) to compare quotes.
   - **Stamp Duty & Registration Fee Estimator**: Pre-calculates 5–7% stamp duty and 1% registration fees.

5. **State Reference & Cheat-Sheet**:
   - Clean state-specific conversion formula cards (e.g. $1\text{ Acre} = 8\text{ Kanal} = 160\text{ Marla} = 43,560\text{ sq ft}$).
   - Standard conversion table for 1, 2, 5, 10, 20, 50 units.
   - **Revenue Glossary**: Comprehensive explanations of patwari terminology (*Patwari, Jamabandi, Khasra, Khatauni, Karam, Jarib, Inteqal, Girdawari*).

6. **History & Favorites**:
   - Auto-saves last 20 conversions in localStorage with 1-tap reload.
   - Save frequently checked properties as labeled favorites (*"Farm Ludhiana"*, *"Plot 200 Gaj"*).

7. **Aesthetics & Theme**:
   - Tailored design tokens (`primary: #4F46E5`, surface glass, smooth dark/light mode toggle).
   - Mobile-first app shell with bottom dock and quick actions.

---

## 📱 Mobile App Setup (Android & iOS)

This app is fully configured as a cross-platform native mobile application using **Capacitor**:
- **Android Target**: Native Android Studio / Gradle project in `android/`
- **iOS Target**: Native Xcode project in `ios/`
- Native capabilities: **Haptics on clicks**, **Native Status Bar styling**, **Splash Screen auto-hide**, and **Hardware Back Button handling**.

### 1. Run / Build on Android (APK)
```bash
# Sync web bundle into Android project
npm run build && npx cap sync android

# Open project in Android Studio
npx cap open android

# Or build debug APK directly via command line
cd android && ./gradlew assembleDebug
```
The output APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### 2. Run / Build on iOS (Xcode)
```bash
# Sync web bundle into iOS project
npm run build && npx cap sync ios

# Open project in Xcode
npx cap open ios
```

---

## 🚀 Running the App Locally (Web Dev Server)

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev
```

Open `http://localhost:5173/` in your browser.

---

## 🧪 Running Unit Tests

To run the automated test suite verifying universal values (Section 6.2), seed North-India values (Section 6.3), round-trips, Indian number formatting, and irregular plot triangulation:

```bash
npm test
```

> **Test Results:** 93/93 tests passing with 100% precision.

---

## 📂 Project Architecture

```
├── data/
│   └── units.json              # Canonical dataset with verified flags, multipliers & sources
├── js/
│   ├── app.js                  # Main controller, event wiring, and tab switching
│   ├── converter.js            # Math engine, floating point precision, Indian formatting
│   ├── i18n.js                 # Complete EN / HI / PA localization dictionary
│   ├── plot-calculator.js      # Plot area calculation & dynamic SVG renderer
│   ├── price-ui.js             # Price calculator, reverse quotes, stamp duty
│   ├── reference-ui.js         # Cheat-sheet formulas & revenue glossary
│   └── storage.js              # LocalStorage manager for history & favorites
├── css/
│   └── style.css               # Vanilla CSS design system, dark/light themes, glassmorphism
├── test/
│   └── conversion.test.js      # 93 automated unit tests
├── index.html                  # Accessible semantic HTML5 app shell
├── DATA_SOURCES.md             # Official state revenue department documentation
├── PRIVACY_POLICY.md           # App Store & Play Store ready privacy policy
└── zameen-area-converter-app-spec.md # Original build specification
```
