# שבצ׳׳קון — Changelog

כל השינויים שבוצעו בפרויקט מתועדים כאן בסדר כרונולוגי.

---

## [Planned] — דרישות פונקציונליות להמשך

פיצ'רים שנדרשו לפיתוח בשלבים הבאים:

סטטוס ביצוע נוכחי:

- [x] בקשת אילוץ/החלפת משמרת על ידי משתמש (יצירה מתוך "המשמרות שלי").
- [x] צפייה ב"משמרות שלי" + מצב ריק כאשר אין נתונים.
- [x] הוספת "המשמרות שלי" ליומן (בודד + מרובה).
- [x] למפקד: הזזה ידנית של משמרת מתוך פופאפ השיבוץ.
- [~] למפקד: עוזר AI
  - [x] פאנל קיים, שמירת אינטנטים ולוג פעולות.
  - [x] פעולה אופרטיבית ראשונה נתמכת: הזזת שיבוץ לפי מזהה ותאריך.
  - [ ] חיבור LLM מלא לשפה חופשית + מיפוי לפונקציות גלובליות.

פירוט פיצ'רים שתוכננו:

1. בקשת אילוץ או החלפת משמרת על ידי משתמש.
2. צפייה ב"משמרות שלי" (כולל טיפול במקרה שאין נתונים במערכת).
3. הוספת "המשמרות שלי" ליומן.
4. עבור משתמש מסוג מפקד: אפשרות להזזה ידנית של משמרות במקרה שאין התאמה במערכת.
5. עבור משתמש מסוג מפקד: אפשרות לשוחח עם עוזר AI המחובר לפונקציות גלובליות של המערכת.

---

## [1.x Legacy Timeline] — 2023-10 עד 2024-07

תיעוד היסטורי מרוכז של מה שקרה בפרויקט מהרגע שהוקם במחשב ועד לפני השינויים האחרונים:

### 2023-10: הקמת הפרויקט ובניית שלד המערכת
- `Initial commit` והקמת בסיס הפרויקט.
- הקמת ראוטינג, מבנה עמודים, בסיס ניהול כיתות/עמדות/שומרים.
- התאמה לעברית ו-RTL, שינויים ראשונים ב-UI, Header/Footer.
- הוספת CRUD ראשוני לקאמפים/עמדות ושיפורי טפסים ודיאלוגים.

### 2023-10 עד 2023-11: התייצבות פונקציונלית
- הרחבת ניהול שומרים, אילוצים, ולוגיקת שיבוץ.
- שיפורי חוויית משתמש, תיקוני ניווט, טיפול בשגיאות ו-404.
- הוספת עמודי פרטיות/תנאי שימוש וטיוב רספונסיביות.
- אינטגרציית Google Login וייצוב זרימת הזדהות.

### 2023-11 עד 2023-12: שיפורי תשתית, ביצועים ו-Auth
- רפקטור מבני לקבצי שירותים/קומפוננטות ושיפור ארגון קוד.
- עדכוני TypeScript, תיקוני Build וטיובי קריאות בדארק מוד.
- Code splitting וטעינה דינמית לשיפור ביצועי bundle.
- שיפורים ב-Private Routes, ניהול טוקנים וזרימת התחברות.

### 2024-01 עד 2024-07: הרחבות שיבוץ ויומן
- הוספת רכיב "הוספה ליומן" עבור שיבוצים (Google Calendar).
- שיפורי Schedule ותיקוני באגים סביב יצירה/עריכה של שיבוצים.
- תמיכה בטווח תאריכים ל-Auto Shibutsim.
- עדכוני README ותחזוקה שוטפת.

---

## [2.0.0] — 2026-04-07

שינוי מהותי של הפרויקט: מעבר ממערכת אימות Google לאימות מבוסס ת.ז + טלפון עם Supabase, עיצוב מחדש בסגנון צבאי/צה"לי, ומיתוג חדש.

---

### 1. מעבר מ-Google OAuth ל-Supabase (ת.ז + טלפון)

**הסרת תלויות Google:**
- הוסר `@react-oauth/google` מ-`package.json`
- הוסרו כל הקומפוננטות של Google: `GoogleOAuthProvider`, `useGoogleLogin`
- הוסרו פונקציות Google מ-`userService.ts`: `_getAccessToken`, `_getUserInfo`, `_refreshToken`, `_normalizeUserInfo`

**הוספת Supabase:**
- נוסף `@supabase/supabase-js` ל-`package.json`
- נוצר קובץ חדש `src/services/supabaseClient.ts` — אתחול Supabase client עם תמיכה בסביבת פיתוח מקומית (Docker) וסביבת production
- נוצר `supabase/` directory עם `config.toml` ו-`seed.sql`
- נוצר `.env.example` עם `VITE_SUPABASE_URL` ו-`VITE_SUPABASE_ANON_KEY`

**שינוי Login flow:**
- `src/services/userService.ts` — פונקציית `login()` שונתה לקבל `{ id, phone }` ולשלוח query ל-Supabase טבלת `users`
- `src/components/general_comps/LoginButton.jsx` — הוחלף כפתור Google בשני שדות קלט (תעודת זהות, טלפון) וכפתור "התחברות עם ת.ז + טלפון"
- `src/components/LoginPage/LoginPage.tsx` — הוסר `GoogleOAuthProvider`, נוסף לינק "עדיין לא רשומים? הירשמו כאן"
- `src/context/AuthContext.tsx` — עודכן `login` signature ל-`{ id, phone }`

**קבצים שהשתנו:**
- `src/services/userService.ts`
- `src/services/supabaseClient.ts` *(חדש)*
- `src/components/general_comps/LoginButton.jsx`
- `src/components/LoginPage/LoginPage.tsx`
- `src/context/AuthContext.tsx`
- `package.json`
- `.env.example` *(חדש)*

---

### 2. הוספת מערכת הרשמה (Registration)

**קומפוננטות חדשות:**
- `src/components/RegisterPage/RegisterPage.tsx` *(חדש)* — עמוד הרשמה עם שלושה שדות: שם מלא, תעודת זהות, טלפון

**שינויים ב-Auth:**
- `src/services/userService.ts` — נוספה פונקציית `register()` שבודקת אם המשתמש קיים ומוסיפה לטבלת `users`
- `src/context/AuthContext.tsx` — נוספה `register` ל-`AuthContextType` ול-`AuthProvider`

**Routing:**
- `src/constants/routeConstants.js` — נוסף `REGISTER: '/register'`
- `src/AppRoutes.tsx` — נוסף Route ל-`RegisterPage`, נוסף lazy import

**ניווט:**
- `LoginPage` — נוסף לינק "עדיין לא רשומים? הירשמו כאן"
- `RegisterPage` — לינק "כבר רשומים? התחברו כאן"

---

### 3. עיצוב עמוד נחיתה — סגנון צבאי/צה"לי

**פלטת צבעים חדשה (theme):**
- `src/theme/theme.ts` — שונה לפלטת צבעים צבאית:
  - Primary: `#6B7A52` (ירוק זית), `#4B5A3E` (כהה), `#8A8F63` (בהיר)
  - Secondary/Warning: `#C8A94A` (צהוב צה"ל — accent)
  - Background: `#1F2A1F` (כהה), `#2F3B2A` (paper)
  - Text: `#D7D3B1` (בהיר), `#A8AA7A` (משני)
  - Divider: `#4B5A3E`

**עמוד נחיתה — Header:**
- `src/components/LandingPage/LandingPageHeader/landingHeader.tsx` — רקע gradient עם תמונת camouflage בשקיפות נמוכה, צבעי טקסט וכפתורים עם accent צהוב

**עמוד נחיתה — Section I:**
- `src/components/LandingPage/LandingPageSectionI/landingSection.tsx` — רקע `#5A6848` עם camouflage overlay, גבולות צבעוניים, כרטיסים בסגנון צבאי

**עמוד נחיתה — Section II:**
- `src/components/LandingPage/LandingPageSectionII/landingSectionTwo.tsx` — gradient עם camouflage overlay, כרטיסים וכפתורים עם accent צהוב

**מפרידים בין חלקים:**
- `src/components/LandingPage/LandingPage.tsx` — נוספו שני `Box` components עם `repeating-linear-gradient` בצבעי צבא כמפרידים ויזואליים בין הסקשנים

---

### 4. עדכון קופי ומיתוג

**קופי עמוד נחיתה:**
- `src/components/LandingPage/landingPageContent.tsx` — כותרת שונתה ל"ניהול שבצ׳׳ק עבור כיתות כוננות", תיאור על הזנת עמדות, אילוצים, וניהול יעיל

**מיתוג:**
- `src/components/Layout/Footer/Footer.jsx` — הוסר קרדיט ליוצרים המקוריים (`2023 Chaya & Dan & Hadas & Niv & Ofir`), הוחלף ב:
  - `© שבצ׳׳קון`
  - `נוצר על ידי בולדוג פתרונות מדיה`

---

### 5. Supabase מקומי (Docker)

**אתחול:**
- הורץ `supabase init` ו-`supabase start` בתיקיית הפרויקט
- Docker containers רצים עם כל שירותי Supabase

**טבלת users:**
```sql
CREATE TABLE public.users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  picture TEXT,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now()
);
```
- RLS מופעל עם policies לקריאה (SELECT) והכנסה (INSERT) ל-anon

**Seed data:**
- משתמש מפקד כיתת כוננות: ת.ז `000000000`, טלפון `0500000000`, שם `מפקד כיתת כוננות גורן`, role: `commander`

**קבצים חדשים:**
- `supabase/config.toml` (generated by `supabase init`)
- `supabase/seed.sql`

---

### 6. תיקון באגים

| באג | קובץ | פתרון |
|-----|-------|-------|
| `TypeError: Cannot read properties of undefined (reading 'main')` — crash ב-Layout | `src/components/Layout/Layout.tsx` | שונו `useMemo` hooks לשימוש ב-palette keys קיימים (`theme.palette.text.primary`, hex values) במקום מפתחות שלא קיימים (`lightMode`, `gray`, `darkMode`) |
| React Router v7 future flag warnings | `src/AppRoutes.tsx` | נוסף `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` ל-`Router` |
| ESLint: `'React' is defined but never used` | `src/components/LoginPage/LoginPage.tsx` | הוסר `import React from 'react'` |
| ESLint: `'payload' is defined but never used` | `src/context/AuthContext.tsx` | נוסף `eslint-disable-next-line no-unused-vars` |
| ESLint: `'steps' is assigned but never used` | `src/components/LandingPage/LandingPageSectionI/landingSection.tsx` | הוסר הקבוע שלא בשימוש |

---

### 7. סיכום קבצים

**קבצים חדשים (4):**
- `.env.example`
- `src/services/supabaseClient.ts`
- `src/components/RegisterPage/RegisterPage.tsx`
- `supabase/seed.sql`

**קבצים שנמחקו (1):**
- `.npmrc`

**קבצים ששונו (27):**
- `README.md`
- `index.html`
- `package.json`
- `src/App.css`
- `src/AppRoutes.tsx`
- `src/components/CampsPage/campList/campItem/campItem.jsx`
- `src/components/LandingPage/LandingPage.tsx`
- `src/components/LandingPage/LandingPageHeader/landingHeader.tsx`
- `src/components/LandingPage/LandingPageSectionI/landingSection.tsx`
- `src/components/LandingPage/LandingPageSectionII/landingSectionTwo.tsx`
- `src/components/LandingPage/landingPageContent.tsx`
- `src/components/Layout/Footer/Footer.jsx`
- `src/components/Layout/Header/Header.jsx`
- `src/components/Layout/Layout.tsx`
- `src/components/LoginPage/LoginPage.tsx`
- `src/components/PrivacyPage/PrivacyContent/PrivacyContent.jsx`
- `src/components/PrivacyPage/PrivacyHeader/PrivacyHeader.jsx`
- `src/components/ShiftSchedule/AddToCalendar.jsx`
- `src/components/ShiftSchedule/ShiftSchedule.jsx`
- `src/components/general_comps/LoadingComp.jsx`
- `src/components/general_comps/LoginButton.jsx`
- `src/components/general_comps/Logo.jsx`
- `src/constants/routeConstants.js`
- `src/context/AuthContext.tsx`
- `src/index.css`
- `src/services/userService.ts`
- `src/theme/theme.ts`

**סה"כ: +1,453 שורות / −736 שורות**

---

### 8. פרטי סביבה (Supabase Docker מקומי)

| שירות | כתובת |
|--------|-------|
| API URL | `http://127.0.0.1:54321` |
| Studio (ממשק ניהול) | `http://127.0.0.1:54323` |
| DB URL | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Inbucket (email testing) | `http://127.0.0.1:54324` |

**פרטי התחברות לבדיקה:**
| שדה | ערך |
|------|------|
| תעודת זהות | `000000000` |
| טלפון | `0500000000` |
| שם | `מפקד כיתת כוננות גורן` |
| תפקיד | `commander` |
