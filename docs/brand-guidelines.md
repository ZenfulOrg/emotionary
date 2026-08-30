# Emotionary Brand Guidelines

Exact colors, type, and iconography as shipped in the Emotionary app (v1.4).
Written so the book and any print/marketing material can match the app's style
one-for-one. Source of truth in code: `src/theme/tokens.ts`.

---

## 1. The mark

Three overlapping circles, reading left to right — rose, gold, blue — on warm
cream. Used on the app icon, splash, and the onboarding wordmark.

| Element | Color |
| --- | --- |
| Rose circle | `#B26B80` |
| Gold circle | `#D9A629` |
| Blue circle | `#3F73B3` |
| Cream ground | `#FAF7F0` |

- Circles overlap slightly; overlaps darken naturally (multiply-style).
- App icon artwork: `assets/images/icon.png` (1024×1024, full bleed, no baked
  corner radius — iOS masks it).

## 2. Core palette

"Paper and ink" — everything sits on warm paper with near-black warm ink.

| Token | Hex | Use |
| --- | --- | --- |
| `paper` | `#FAF7F0` | App background, text on dark fills |
| `ink` | `#211C15` | Primary text, filled buttons, dark widget |
| `inkMuted` | `#6E675C` | Secondary text |
| `inkFaint` | `#9A927F` | Tertiary text, tiny caps labels |
| `hairline` | `#E5DFD2` | Rules, card borders |
| `card` | `#FFFFFF` | Card surfaces |
| `overlay` | `rgba(24, 20, 14, 0.62)` | Modal scrim |

Accent green (pricing "BEST VALUE" tag + notes): text `#2F6B45` on `#DCEEDE`.

## 3. Color depth levels

Every word has a depth level 1–5; each level owns a palette. `tint` is the
soft page background, `deep` is the saturated fill (share cards, dots),
`onDeep` is text on top of `deep`.

| Level | Name | tint | deep | onDeep |
| --- | --- | --- | --- | --- |
| 1 | FLEETING | `#F6F1E3` | `#B9973E` | `#FFFBEF` |
| 2 | UNDERCURRENTS | `#ECE7F5` | `#6F63A8` | `#F6F3FF` |
| 3 | IN-BETWEEN | `#F6E4E9` | `#B26B80` | `#FFF4F6` |
| 4 | THE WEIGHT | `#E4EDE4` | `#5F8464` | `#F2FAF2` |
| 5 | THE DEPTHS | `#F0DEEA` | `#A93A78` | `#FDF0F7` |

Word-type accents (used on the onboarding source cards):

| Type | Accent | Tint |
| --- | --- | --- |
| Wanderword | `#8A5E35` | `#F8E8D8` |
| Hidden English | `#466A55` | `#DEE9E2` |
| Psychology | `#7C3D64` | `#E9CFE0` |

Onboarding page tints: `#FAF7F0`, `#F8E8EE`, `#E9EFEA`, `#ECE8F4`, `#F7EFE4`,
`#F8EEE8`.

## 4. Typography

Two Google typefaces. Display serif for the words themselves; a workhorse
serif for everything read at length.

**Fraunces** — the display face. The hero word, the wordmark, screen titles,
big numbers.
- Weights used: 300 Light, 400 Regular, 400 Italic, 600 SemiBold.

**Literata** — the text face. Definitions, body copy, labels, buttons.
- Weights used: 400 Regular, 400 Italic, 500 Medium, 600 SemiBold.

Type scale (points, from `src/theme/tokens.ts`):

| Role | Size | Face |
| --- | --- | --- |
| Word hero (Today page) | 56 / 62 line height | Fraunces 400 |
| Hero | 44 | Fraunces 400 |
| Screen title | 28 | Fraunces 400 |
| Definition (Today) | 21 / 32 line height | Literata 400 |
| Body | 17 | Literata 400 |
| Small | 14 | Literata 400 |
| Caption | 12 | Literata 400 |
| Badge / tiny caps | 11 | Literata 500 |

Letterspaced small caps are the signature label style: ALL CAPS Literata
Medium, letterspacing **2.2** (badges, e.g. "PSYCHOLOGY") or **1.6** (section
caps, e.g. "FAVORITED WORDS"). Pronunciations are Literata Italic in
brackets: `[FEIRN-vey]`. Origins are tiny caps in `inkFaint`.

## 5. Iconography

Line icons from Apple's SF Symbols, thin and quiet, usually in `ink` or
`inkMuted`:

| Meaning | SF Symbol |
| --- | --- |
| Wanderword | `globe` |
| Hidden English | `building.columns` |
| Psychology | `brain` |
| Save / favorited | `heart` / `heart.fill` |
| Share | `square.and.arrow.up` |
| Back / forward | `arrow.left` / `arrow.right` |
| Show / hide password | `eye` / `eye.slash` |
| Selected | `checkmark` |
| Drill-in | `chevron.right` |
| Apple sign-in | `apple.logo` |

Tab bar glyphs are typographic characters, not icons: ✦ Today, ≡ Browse,
◈ Stats. Streak moments use emoji: 🔥 (living streak, animated stop-motion in
app), 🥀 (broken streak).

## 6. Shape & surface

- Corner radii: cards 12–18, sheets/modals 22–26, buttons and pills fully
  round (999). iOS uses continuous ("squircle") corner curves.
- Borders are hairline `#E5DFD2`; shadows are soft, warm, and low
  (e.g. `0 12px 28px rgba(67, 52, 35, 0.10)`).
- Ambient texture: large blurred dots of the level `deep` colors at ~12%
  opacity drift slowly in backgrounds; small dots float upward on the stats
  page. Motion is calm, never springy-loud.

## 7. Asset files

| File | What it is |
| --- | --- |
| `assets/images/icon.png` | App icon — three-dot mark, 1024×1024 |
| `assets/images/book-cover.png` | Archived campaign mockup; retained as a source asset, not shown in the app |
| `assets/images/splash-icon.png` | Splash mark on `#FAF7F0` |
| `assets/images/android-icon-foreground.png` | Android adaptive icon |

## 8. Voice

Lowercase-calm, second person, short sentences. The app "feels like opening
the book": one word at a time, generous whitespace, wisdom lines in italics.
CTA labels are letterspaced caps ("ENABLE DAILY WORD", "HOW TO ADD THE WIDGET");
everything else reads like a sentence.
