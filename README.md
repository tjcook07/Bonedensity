# DEXA Registry Prep

Progressive Web App for the ARRT Bone Densitometry Registry exam. Runs offline after first load, installs on iOS, Android, and desktop, and deploys to Cloudflare Pages.

## What's included

- **Question bank** drill with per module picker, mixed drill, and review-weak-areas mode.
- **Flashcards** with Leitner spaced repetition (5 boxes at 1, 2, 5, 10, 21 day intervals).
- **75 question timed exam simulator** that mirrors the 2022 ARRT blueprint (Patient Care 17, Equipment + QC 20, DXA Scanning 38), with flag, navigator, auto submit, and results.
- **Reference** sections: formulas and numbers, WHO and BHOF criteria, positioning cheat sheet, ISCD 2023 updates, pediatric rules, 2022 blueprint details.
- **Module study guide** for all 14 ASRT modules, with links to quiz or flashcard that module.
- **Precision and LSC calculator** with paired scan input, RMS SD, %CV, absolute and percent LSC.
- **Per module progress tracking** with seen and mastered bars. Mastery = last 3 attempts contain 2+ correct and most recent was correct.
- **Settings**: exam date countdown (urgency color at 60 and 30 days), daily goal, blueprint version toggle (2022 vs 2027), reset all data.

## Stack

- Vite 6 + vanilla JavaScript (no framework)
- Tailwind CSS 3.4 (dark default, amber accent, ink palette)
- IndexedDB for attempts, sessions, and SRS. localStorage for settings.
- vite-plugin-pwa 0.21+ for service worker and manifest
- Google Fonts: Fraunces, IBM Plex Sans, JetBrains Mono

## Local dev

```
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs dist/
npm run preview    # serves dist/
```

Node 20 recommended.

## Content

Travis provides the content JSON in `src/data/`:

- `questions.json` — question bank (single source of truth)
- `flashcards.json` — flashcard deck
- `modules.json` — module titles and topics

Stubs are checked in so `npm run build` succeeds on a fresh clone. Replace them with the real files before shipping.

Question types: `multiple_choice` and `true_false`. True/false questions render with T/F labels instead of A/B/C/D. A `duplicate_of` field pointing at another question's id prevents both from appearing in the same quiz or exam session.

## Cloudflare Pages deployment

**Direct upload**
1. `npm run build`
2. Zip the contents of `dist/`
3. Cloudflare dashboard → Pages → Create application → Upload assets

**GitHub auto-deploy**
1. Push the repo to GitHub
2. Cloudflare dashboard → Pages → Connect to Git
3. Build command: `npm run build`
4. Output directory: `dist`
5. Environment variable: `NODE_VERSION=20`

Pushes to main trigger a new deploy.

## Install as a PWA

- **iOS Safari:** open the site, tap the Share button, tap "Add to Home Screen"
- **Android Chrome:** tap the three-dot menu, tap "Install app"
- **Desktop Chrome / Edge:** click the install icon in the address bar

The app works offline after first load.

## Blueprint version toggle

Settings includes a blueprint version radio (2022 vs 2027). The 2022 blueprint is valid through Dec 31, 2026. The 2027 revision becomes effective Jan 1, 2027.

## Project structure

```
dexa-pwa/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── public/
│   ├── favicon.svg
│   └── icons/
│       ├── icon-192.png
│       ├── icon-512.png
│       └── icon-512-maskable.png
├── scripts/
│   └── gen_icons.py
└── src/
    ├── css/main.css
    ├── data/         (Travis provides questions.json, flashcards.json, modules.json)
    ├── js/           (main, router, storage, stats, util, icons)
    └── components/   (layout, home, quiz, flashcards, exam, reference, studyGuide, stats, precision, settings)
```

## Content sources

- ASRT Bone Densitometry Basics, 14-module series (2017)
- ISCD 2023 Official Positions
- ARRT Bone Densitometry Content Specifications (2022)
- Bone Health and Osteoporosis Foundation clinician's guide (2022)
- Bonnick, *Bone Densitometry in Clinical Practice* (reference)

Where ISCD 2023 and older ASRT content disagree, explanations defer to ISCD 2023 and flag the discrepancy.

## Style rules

- Dark theme only, amber accent.
- No em-dashes anywhere in content.
- No analytics, no tracking, no third-party scripts beyond Google Fonts.
- Mobile first. Safe area insets respected.
