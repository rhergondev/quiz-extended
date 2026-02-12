# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run build        # Full build (Tailwind CSS + webpack)
npm run start        # Dev mode with hot reload (alias: npm run dev)
npm run css:build    # Tailwind compilation only (minified)
npm run css:watch    # Tailwind watch mode
npm run i18n:all     # Extract + compile translation strings
```

Build output goes to `build/index.js` and `build/index.css`. There are no JavaScript tests configured in this project.

## Architecture Overview

This is the React admin interface for the **Quiz Extended** WordPress plugin, which extends Tutor LMS with risk-based scoring and analytics. The app runs inside WordPress, not standalone.

### Two Entry Points

- **`src/AdminApp.js`** — Admin panel UI (wp-admin pages). Direct routing.
- **`src/FrontendApp.js`** — Frontend-embedded interface with lazy-loaded admin components, role-based access, and protected routes.

Both use hash-based routing via React Router DOM v7.

### WordPress Integration

The app receives configuration through `window.qe_data`, injected by PHP (`class-qe-assets.php`). This object provides: API URL, nonce, endpoints, current user data, theme settings, and locale. All API requests use this nonce for authentication.

### API Layer (`src/api/`)

- **`config/apiConfig.js`** — Reads `window.qe_data`, constructs base URLs
- **`services/baseService.js`** — Factory that generates CRUD operations for any resource type. All other services extend this.
- **`services/`** — ~25 specialized services (courseService, quizService, lessonService, etc.)
- **`utils/`** — Data transformation, validation, error handling (`errorHandler.js` with ErrorType enum)

API optimization: `_embed=false` by default (90% data reduction), `perPage=100` for admin lists.

### State Management

No Redux. Uses React Context API + custom hooks:

- **`ThemeContext`** — Dynamic theming with CSS variables, dark/light mode (detects from WordPress + localStorage)
- **`ScoreFormatContext`** — Toggle between Base10 (0-10) and Percentage (0-100) display. Scores stored internally as 0-10 scale.
- **`MessagesContext`** — Message polling (30s interval), pauses when page hidden
- **`QuizFocusContext`** — Quiz state tracking

### Custom Hooks Pattern (`src/hooks/`)

- **`useResource.js`** — Base hook providing generic CRUD, pagination, filtering, and debounced search (500ms)
- Specialized hooks (`useCourses`, `useLessons`, `useQuizzes`, etc.) extend `useResource` with data processors and computed values

Data flow: `qe_data` → `apiConfig` → `baseService` → specialized service → custom hook → component

### Styling

Tailwind CSS scoped to `.qe-lms-app` class to avoid WordPress style conflicts. Theme colors use CSS custom properties defined in `tailwind.config.js`. Custom animations: slideDown, slideInRight, slideOutRight.

### Internationalization

i18next with English (`en`) and Spanish (`es`) locales in `src/i18n/locales/`. Locale detected from `window.qe_data.locale`.

## Scoring System (v2.0)

All scores are stored and transmitted as **0-10 scale** internally. Use `ScoreFormatContext` for display formatting:

```javascript
const { formatScore, toBase10 } = useScoreFormat();
formatScore(7.5);  // "7.5" (base10) or "75" (percentage)
toBase10(75);      // 7.5 (converts percentage input to storage format)
```

Risk-based scoring: correct = +1 point, incorrect without risk = -1/n penalty (n = number of options), incorrect with risk = no penalty, unanswered = 0.

## Key Plugin API Endpoints

- `POST /wp-json/qe/v1/quiz-attempts/start` and `/submit` — Quiz lifecycle
- `GET /wp-json/qe/v1/questions` and `/questions/batch` — Question retrieval
- `GET /wp-json/qe/v1/course-ranking/{course_id}` — Rankings
- `POST /wp-json/qe/v1/enrollments` — Course enrollment
