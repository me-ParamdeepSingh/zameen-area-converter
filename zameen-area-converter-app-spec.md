# Zameen Area Converter — App Build Spec

## 1. App Overview

**Name (working title):** Zameen Converter — Bigha, Kanal, Marla, Gaj Calculator
**One-liner:** A fast, fully offline Indian land-area converter that is *state-aware* (a bigha in UP is not a bigha in Rajasthan or Punjab), shows all units at once, and includes a plot-area and plot-price calculator, with a Hindi/Punjabi/English UI.

**Target platforms:** Android (Kotlin + Jetpack Compose) and iOS (Swift + SwiftUI). Same design system and tokens as the rest of this app suite.

**Core principle:** The user types one number and immediately sees it in every relevant unit, for their own state, without selecting anything twice. Accuracy and trust are the product — a wrong conversion in a land deal is costly.

---

## 2. Target User

- Property buyers/sellers, farmers, dealers, and agents in North/Central India (Punjab, Haryana, Rajasthan, UP, Bihar, MP, Gujarat, etc.) who deal with land records written in local units.
- Users who think in bigha/biswa/kanal/marla/gaj but receive documents or listings in sq ft, acres, or hectares (or the reverse).
- Many users are more comfortable in Hindi or Punjabi than English: localization is a core feature, not an extra.

---

## 3. Core Features (v1 scope)

### 3.1 Smart Converter (home screen)
- One input field for the number, one dropdown for the "From" unit, one state/region selector.
- **Show all units at once:** as soon as the user types, display a result list/grid for all relevant units (sq ft, sq yd/gaj, sq m, acre, hectare, bigha, biswa, kanal, marla, katha, guntha, cent, etc. — filtered by selected state so irrelevant units don't clutter the screen).
- Tap any result row to copy it; long-press or a button to share the full conversion as text/image.
- Remember the last used state and unit so repeat users open straight into their usual setup.

### 3.2 State-aware unit data
- Selecting a state/region changes the definition of bigha, biswa, katha, etc. (see Section 6 for the data model and the accuracy rules).
- Show a small "Based on: [state] — [unit definition]" line under results so the user knows which definition was used.
- Where a unit has variants (for example pucca vs kachha bigha, or old vs new marla), let the user choose the variant explicitly rather than silently picking one.

### 3.3 Plot Area Calculator
- Enter length × width (in feet, yards, or metres) → get area in all units at once.
- Support rectangle first; add triangle and "four-sided irregular plot (by 4 sides + 1 diagonal)" as v1.1 if time allows.

### 3.4 Plot Price Calculator
- Enter area (any unit) + rate per unit (e.g., ₹ per gaj, per marla, per bigha, per acre) → total price in Indian number format (₹1,00,000).
- Reverse mode: enter total price and area → rate per unit in the other common units, so users can compare quotes given in different units.

### 3.5 Favorites & History
- Save frequent conversions as favorites.
- Auto-keep the last 20 conversions in a History screen.

### 3.6 Reference Cheat-Sheet
- A simple screen listing common conversions for the selected state (e.g., 1 acre = 8 kanal, 1 kanal = 20 marla, 1 gaj = 9 sq ft) in a clean table, readable without typing anything — good for quick glances and good for app-store screenshots.

### 3.7 Language
- UI languages: English, Hindi, Punjabi in v1 (others later: Gujarati, Marathi, Bengali). All unit names should appear in the local script and in Roman script (for example, "कनाल / Kanal").
- Use standard localization resources on each platform (Android string resources, iOS String Catalogs), not hardcoded strings.

**All processing is on-device. No internet is required for any feature.**

---

## 4. UI/UX Design Requirements

### 4.1 Design philosophy
- **Simple, modern, minimal. Zero onboarding.** The first screen is the converter itself, ready to type.
- **Everything visible:** input, unit selector, state selector and results on a single screen. No hidden menus for the main task.
- **Big number input.** The number field should be large and focused on launch with the numeric keyboard open.
- **Results are the hero:** large, readable cards with the unit name in local script + Roman, the value in bold, and tabular figures so numbers align.
- **Trust cues:** always display which state's definition is applied, and include a short disclaimer link ("Verify with your local revenue record before any transaction").

### 4.2 Home screen layout
- Top bar: app name, language switcher, and a settings icon.
- Row of chips: **State/Region selector** (most important control) and **From unit** selector.
- Large number input field.
- Results list (scrollable), each row: unit name, value, copy icon.
- Bottom nav with 3 items: **Converter**, **Plot Calculator** (area + price), **Reference**. Favorites and History live inside the Converter screen header.
- Banner ad at the very bottom, below the navigation bar's safe area, visually separated from content.

### 4.3 Design system (shared tokens)
Same tokens as the other apps in this suite:
- `primary`: `#4F46E5`, `primary-light`: `#EEF2FF`
- `surface`: `#FFFFFF` / dark `#111827`
- `background`: `#F9FAFB` / dark `#0B0F19`
- `text-primary`: `#111827` / dark `#F9FAFB`, `text-muted`: `#6B7280` / dark `#9CA3AF`
- `success`: `#16A34A`, `warning`: `#D97706`, `danger`: `#DC2626`
- Typography: Inter/system font (ensure Devanagari and Gurmukhi render well — use Noto Sans Devanagari / Noto Sans Gurmukhi fallbacks), scale 12/14/16/20/24/32px.
- Spacing 4/8/12/16/24/32/48px. Corner radius 12px cards, 8px buttons, 999px chips.
- Light and dark mode both supported.
- Implement as one `Theme`/`DesignTokens` file per platform.

---

## 5. Tech Stack

### Android
- Kotlin, Jetpack Compose, Material 3 with the custom tokens above.
- Room (or DataStore) for favorites/history/settings.
- Conversion data stored in a bundled JSON asset, parsed once at launch.
- AdMob SDK for banner + interstitial.

### iOS
- Swift, SwiftUI, SwiftData/Core Data (or UserDefaults for small data) for favorites/history.
- Same bundled JSON for conversion data.
- Google AdMob SDK (Swift).

### Shared
- One canonical `units.json` (see Section 6) used by both apps, so a data correction is made in one place and copied to both.

---

## 6. Conversion Data Model and Accuracy Rules (CRITICAL)

Land units in India were never fully standardised. A bigha, biswa and katha change in size from state to state, and even within a state there can be variants (for example pucca vs kachha bigha, or old vs new marla). This is the single biggest risk and the single biggest differentiator of this app.

### 6.1 Data structure
Store everything as a **base-unit multiplier in square feet** per (unit, region, variant) in `units.json`, for example:

```json
{
  "regions": [
    {
      "id": "up",
      "name": {"en": "Uttar Pradesh", "hi": "उत्तर प्रदेश", "pa": "ਉੱਤਰ ਪ੍ਰਦੇਸ਼"},
      "units": [
        {"id": "bigha", "variant": "pucca", "sqft": 27225, "source": "TO_VERIFY", "verified": false}
      ]
    }
  ]
}
```

Every record must carry `sqft`, `source` (where the value came from) and a `verified` flag. Do not invent values. Any value the developer cannot source must stay `verified: false`.

### 6.2 Universal values (safe to hard-code, same everywhere)
- 1 acre = 43,560 sq ft
- 1 hectare = 107,639.1 sq ft (10,000 sq m)
- 1 sq yard (gaj) = 9 sq ft
- 1 sq metre = 10.7639 sq ft

### 6.3 Widely used North-India values (seed data, still tag with a source)
- 1 acre = 8 kanal, 1 kanal = 20 marla
- 1 marla = 272.25 sq ft (standard), so 1 kanal = 5,445 sq ft. Note that some regions use an "old" and a "new" marla, so expose a variant option.
- Uttar Pradesh pucca bigha: 27,225 sq ft, with 1 biswa = 1,361.25 sq ft (20 biswa = 1 bigha).

### 6.4 Everything else (state-wise bigha, katha, guntha, cent, ground, etc.)
- Must be collected from official revenue-department references or reputable published sources per state, and entered with `source` filled in.
- Different websites give different numbers for the same unit name (for example generic "1 bigha" figures such as 12,000 sq ft appear on some sites while UP uses 27,225 sq ft), so **never use a single generic bigha value**. Always require a region.
- Ship v1 only with regions whose data has been verified. It is better to launch with 6–8 regions done properly than 28 regions half-guessed. Show "More states coming soon" for the rest.

### 6.5 Rounding and display
- Calculate in double precision, round only for display (up to 4 decimals, trimmed of trailing zeros).
- Use the Indian digit grouping (1,00,000) for large numbers and prices.

### 6.6 In-app disclaimer
A short, visible note: "Values follow commonly used definitions. Local revenue records may differ. Always confirm with your patwari/revenue office before any transaction." Place it on the Reference screen and in Settings > About, and link to it from the results screen.

---

## 7. Monetization

- **Banner ad** on the Converter and Reference screens (bottom).
- **Interstitial** at most once every 90 seconds, shown only after the user has completed a Plot Price or Plot Area calculation (never on a simple conversion — that flow must feel instant).
- No rewarded ads in v1; the app is a quick-use utility and friction hurts retention.
- Optional later: a small one-time "Remove ads" in-app purchase.

---

## 8. Permissions and Privacy

- No special permissions. No location, contacts or storage access required.
- No account, no analytics beyond AdMob's own.
- Privacy policy: state clearly that no personal data is collected or stored off-device.

---

## 9. Non-Functional Requirements

- Works fully offline. Cold start under 1.5 seconds on a mid-range device.
- Typing a number must update all results in real time with no visible lag.
- Support small screens and large font settings without clipping Hindi/Punjabi text.
- Accessibility: minimum 48dp/44pt tap targets, sufficient contrast in both themes.
- Unit tests for the conversion engine covering: every unit round-trip (convert A→B→A returns the original within tolerance), universal values in 6.2, and the seed values in 6.3.

---

## 10. Deliverables Expected From Build

1. Android app (Kotlin/Compose) with all features in Section 3.
2. iOS app (Swift/SwiftUI) with all features in Section 3.
3. `units.json` following Section 6, containing only values that are either universal (6.2), seeded (6.3), or explicitly marked `verified: false`, plus a short `DATA_SOURCES.md` listing where each region's data must be verified before release.
4. English, Hindi and Punjabi string resources.
5. Unit tests for the conversion engine.
6. AdMob integration per Section 7.
7. Privacy policy text suitable for Play Store / App Store submission.

---

## 11. Out of Scope for v1

- Map/GPS-based area measurement (competitors do this; skip it for v1 and consider it for v2).
- Land listings, marketplace, or any buyer-seller features.
- Cloud sync or accounts.
- Statutory valuation, circle rates, or legal advice features.
