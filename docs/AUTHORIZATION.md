# מדריך הרשאות — שבצ'קון

## תוכן עניינים

- [סקירה כללית](#סקירה-כללית)
- [ארכיטקטורה](#ארכיטקטורה)
- [תפקידים](#תפקידים)
- [שכבה 1 — הגנת UI](#שכבה-1--הגנת-ui)
- [שכבה 2 — הגנת צד שרת (RLS + RPC)](#שכבה-2--הגנת-צד-שרת-rls--rpc)
- [מדריך מעשי — הוספת פיצ'ר חדש](#מדריך-מעשי--הוספת-פיצר-חדש)
- [מפת הרשאות נוכחית](#מפת-הרשאות-נוכחית)
- [קבצים רלוונטיים](#קבצים-רלוונטיים)
- [FAQ](#faq)

---

## סקירה כללית

המערכת משתמשת באותנטיקציה מבוססת **תעודת זהות + מספר טלפון** (ללא Supabase Auth / JWT סטנדרטי).
ההרשאות נאכפות ב-**שלוש שכבות** כדי למנוע עקיפה:

```
┌─────────────────────────────────────────────┐
│  שכבה 1 — UI (React)                        │
│  כפתורים/פעולות מוסתרים לפי תפקיד           │
├─────────────────────────────────────────────┤
│  שכבה 2 — RLS (Supabase/Postgres)           │
│  טבלאות חסומות לכתיבה ישירה מ-anon          │
├─────────────────────────────────────────────┤
│  שכבה 3 — RPC Functions (Postgres)          │
│  כל כתיבה עוברת פונקציה שמוודאת זהות+תפקיד │
└─────────────────────────────────────────────┘
```

> **חשוב:** שכבת ה-UI לבדה אינה מספיקה. משתמש יכול לשנות `role` ב-localStorage.
> לכן **כל** פעולת כתיבה חייבת לעבור דרך RPC שמוודא credentials מול הדאטאבייס.

---

## ארכיטקטורה

### זרימת בקשת כתיבה (מפקד)

```
React Component
  │
  ▼
Service Layer (e.g. guardService.js)
  │  קורא ל-getCredentials() → { p_user_id, p_phone }
  │  קורא ל-supabase.rpc("rpc_create_guard", { ...creds, ...data })
  │
  ▼
Supabase REST → Postgres RPC Function
  │  assert_commander(p_user_id, p_phone)
  │    └─ verify_user() → בודק שהמשתמש קיים בטבלת users
  │    └─ בודק ש-role = 'commander'
  │  מבצע INSERT/UPDATE/DELETE
  │
  ▼
הפעולה מתבצעת (או נזרקת שגיאה)
```

### זרימת בקשת כתיבה (חייל שמנסה לפרוץ)

```
כל ניסיון ישיר לטבלה → RLS חוסם (SELECT only for anon)
כל ניסיון דרך RPC → assert_commander() זורק FORBIDDEN
```

---

## תפקידים

| תפקיד | `role` בדאטאבייס | מה מותר |
|--------|------------------|---------|
| **מפקד** | `commander` | הכל — CRUD על בסיסים, עמדות, משמרות, חיילים, שיבוצים, מגבלות. אישור/דחיית בקשות. |
| **חייל** | `member` (ברירת מחדל) | צפייה בכל הנתונים. שליחת בקשות אילוץ/החלפה. הוספה ליומן גוגל. |

---

## שכבה 1 — הגנת UI

### Hook מרכזי

```javascript
// src/hooks/useIsCommander.js
import { useAuthContext } from "@/context/AuthContext";

export function useIsCommander() {
  const { user } = useAuthContext();
  return user?.role === "commander";
}
```

### דפוסי שימוש

#### 1. הסתרת כפתור

```jsx
const isCommander = useIsCommander();

return (
  <>
    {isCommander && (
      <Button onClick={handleAdd}>הוסף חייל</Button>
    )}
  </>
);
```

#### 2. הסתרת עמודה/אקשנים בטבלה

```jsx
// ברכיב actions — החזר null אם לא מפקד
export default function ItemActions({ item }) {
  const isCommander = useIsCommander();
  if (!isCommander) return null;

  return (
    <>
      <IconButton onClick={handleEdit}><EditIcon /></IconButton>
      <IconButton onClick={handleDelete}><DeleteIcon /></IconButton>
    </>
  );
}
```

#### 3. השבתת אינטראקציה (לא הסתרה)

```jsx
<Calendar
  selectable={isCommander}          // חייל לא יכול לבחור slot
  onSelectSlot={isCommander ? handleSelectSlot : undefined}
/>
```

#### 4. דיאלוג עם תוכן שונה לפי תפקיד

```jsx
<DialogContent>
  {isCommander ? (
    <>{/* טופס עריכה מלא */}</>
  ) : (
    <Typography>ניתן לצפות בלבד. לשינויים, פנה למפקד.</Typography>
  )}
</DialogContent>
<DialogActions>
  <Button onClick={onClose}>{isCommander ? "ביטול" : "סגור"}</Button>
  {isCommander && <Button onClick={handleSave}>שמור</Button>}
</DialogActions>
```

#### 5. הגנה ברמת route

```jsx
// src/AppRoutes.tsx
function CommanderRoute() {
  const { user } = useAuthContext();
  if (user?.role !== "commander") return <Navigate to={ROUTES.HOME} />;
  return <Outlet />;
}

// שימוש:
<Route element={<CommanderRoute />}>
  <Route path={ROUTES.SHIFT_REQUESTS} element={<ShiftRequestsPage />} />
</Route>
```

---

## שכבה 2 — הגנת צד שרת (RLS + RPC)

### RLS — מדיניות טבלאות

כל הטבלאות מוגבלות ל-**SELECT בלבד** עבור `anon`:

```sql
-- דוגמה: טבלת camps
DROP POLICY IF EXISTS "camps_anon_all" ON public.camps;
CREATE POLICY "camps_anon_read" ON public.camps
  FOR SELECT TO anon USING (true);
```

המשמעות: `INSERT`, `UPDATE`, `DELETE` ישירים מהקליינט **ייכשלו** עם:

```json
{ "code": "42501", "message": "new row violates row-level security policy" }
```

### RPC — פונקציות עם אימות

כל פעולת כתיבה עוברת דרך פונקציית Postgres שמוודאת:
1. **שהמשתמש קיים** — `verify_user(id, phone)` בודק מול טבלת `users`.
2. **שהוא מפקד** — `assert_commander(id, phone)` בודק ש-`role = 'commander'`.

```sql
-- verify_user: מחזיר את ה-role או זורק שגיאה
CREATE FUNCTION verify_user(p_user_id TEXT, p_phone TEXT)
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = p_user_id AND phone = p_phone;
  -- אם NULL → RAISE EXCEPTION 'AUTH_FAILED'
$$;

-- assert_commander: קורא ל-verify_user ובודק שהתוצאה = 'commander'
CREATE FUNCTION assert_commander(p_user_id TEXT, p_phone TEXT)
RETURNS VOID AS $$
  -- אם role <> 'commander' → RAISE EXCEPTION 'FORBIDDEN'
$$;
```

הפונקציות הן `SECURITY DEFINER` — רצות בהרשאות בעל הדאטאבייס, לא `anon`.

### Credentials Helper

```javascript
// src/services/authCredentials.js
import localStorageService from "@/services/localStorageService";
import { TOKEN_NAME } from "@/services/userService";

export function getCredentials() {
  const loginInfo = localStorageService.get(TOKEN_NAME);
  if (!loginInfo?.userInfo) throw new Error("NOT_LOGGED_IN");
  return {
    p_user_id: loginInfo.userInfo.id,
    p_phone: loginInfo.userInfo.phone,
  };
}
```

---

## מדריך מעשי — הוספת פיצ'ר חדש

### דוגמה: הוספת טבלת "ציוד" (equipment) שרק מפקד יכול לנהל

#### שלב 1 — יצירת טבלה + RLS (SQL)

```sql
CREATE TABLE public.equipment (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  "campId" INT REFERENCES public.camps(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1
);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- anon יכול רק לקרוא
CREATE POLICY "equipment_anon_read" ON public.equipment
  FOR SELECT TO anon USING (true);
```

#### שלב 2 — יצירת RPC Functions (SQL)

```sql
CREATE FUNCTION public.rpc_create_equipment(
  p_user_id TEXT, p_phone TEXT,
  p_name TEXT, p_camp_id INT, p_quantity INT
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id INT;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  INSERT INTO public.equipment (name, "campId", quantity)
  VALUES (p_name, p_camp_id, COALESCE(p_quantity, 1))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE FUNCTION public.rpc_delete_equipment(
  p_user_id TEXT, p_phone TEXT,
  p_equipment_id INT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  DELETE FROM public.equipment WHERE id = p_equipment_id;
END;
$$;
```

#### שלב 3 — Service Layer (JS)

```javascript
// src/services/equipmentService.js
import { supabase } from "./supabaseClient";
import { getCredentials } from "./authCredentials";

export async function getEquipment(campId) {
  // קריאה — לא צריך credentials
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("campId", campId);
  if (error) throw error;
  return data;
}

export async function createEquipment(name, campId, quantity) {
  // כתיבה — חייב credentials + RPC
  const creds = getCredentials();
  const { data, error } = await supabase.rpc("rpc_create_equipment", {
    ...creds,
    p_name: name,
    p_camp_id: campId,
    p_quantity: quantity,
  });
  if (error) throw error;
  return data;
}

export async function deleteEquipment(equipmentId) {
  const creds = getCredentials();
  const { error } = await supabase.rpc("rpc_delete_equipment", {
    ...creds,
    p_equipment_id: equipmentId,
  });
  if (error) throw error;
}
```

#### שלב 4 — React Component

```jsx
import { useIsCommander } from "@/hooks/useIsCommander";

function EquipmentPage() {
  const isCommander = useIsCommander();

  return (
    <div>
      {/* כפתור הוספה — רק למפקד */}
      {isCommander && (
        <Button onClick={handleAdd}>הוסף ציוד</Button>
      )}

      {/* רשימה — לכולם */}
      <EquipmentList
        items={equipment}
        onDelete={isCommander ? handleDelete : undefined}
      />
    </div>
  );
}
```

### צ'קליסט לפיצ'ר חדש

- [ ] **SQL:** יצירת טבלה עם `ENABLE ROW LEVEL SECURITY`
- [ ] **SQL:** מדיניות `FOR SELECT TO anon USING (true)` בלבד
- [ ] **SQL:** פונקציות RPC עם `assert_commander` / `verify_user`
- [ ] **SQL:** הפונקציות מסומנות `SECURITY DEFINER`
- [ ] **JS Service:** פעולות קריאה ישירות מהטבלה (בלי credentials)
- [ ] **JS Service:** פעולות כתיבה דרך `supabase.rpc()` עם `getCredentials()`
- [ ] **React:** שימוש ב-`useIsCommander()` להסתרת כפתורי כתיבה
- [ ] **React:** אם זה עמוד שלם למפקדים — עטיפה ב-`CommanderRoute`

---

## מפת הרשאות נוכחית

### פעולות מפקד בלבד

| ישות | פעולה | RPC | רכיב UI |
|------|-------|-----|---------|
| בסיס | הוספה/עריכה/מחיקה | `rpc_create/update/delete_camp` | `CampsPage`, `CampItemActions` |
| עמדה | הוספה/עריכה/מחיקה | `rpc_create/update/delete_outpost` | `OutpostsPage`, `OutpostItemActions` |
| משמרת | הוספה/מחיקה | `rpc_create/delete_shift` | `ShiftsPage`, `ShiftItemActions` |
| חייל | הוספה/עריכה/מחיקה | `rpc_create/update/delete_guard` | `GuardsPage`, `GuardCard` |
| שיבוץ | יצירה/עדכון/מחיקה | `rpc_create/update/delete_shibuts` | `ShiftSchedule` |
| שיבוץ | מחיקה לפי טווח | `rpc_delete_shibuts_range` | `ShiftSchedule` (מחיקת שיבוצים) |
| שיבוץ | הזזה לתאריך | `rpc_move_shibuts_date` | `ShiftSchedule` (DatePicker) |
| מגבלת זמן | הוספה/מחיקה | `rpc_create/delete_time_limit` | `GuardProfile` |
| מגבלת עמדה | הוספה/מחיקה | `rpc_create/delete_outpost_limit` | `GuardProfileOutpostLimit` |
| בקשת משמרת | אישור/דחייה | `rpc_review_shift_request` | `ShiftRequestsPage` |

### פעולות כל משתמש מאומת

| ישות | פעולה | RPC | רכיב UI |
|------|-------|-----|---------|
| בקשת אילוץ/החלפה | יצירה | `rpc_create_shift_request` | `MyShiftsPage` |

### פעולות ללא הגבלה (קריאה)

כל המשתמשים המחוברים יכולים **לצפות** בכל הנתונים: בסיסים, עמדות, משמרות, חיילים, שיבוצים, מגבלות, יומן.

---

## קבצים רלוונטיים

```
src/
├── hooks/
│   └── useIsCommander.js          ← Hook לבדיקת תפקיד ב-UI
├── services/
│   ├── authCredentials.js         ← Helper לשליפת credentials מ-localStorage
│   ├── campService.js             ← CRUD בסיסים (RPC)
│   ├── guardService.js            ← CRUD חיילים (RPC)
│   ├── outpostService.js          ← CRUD עמדות (RPC)
│   ├── shiftService.js            ← CRUD משמרות (RPC)
│   ├── shibutsService.js          ← CRUD שיבוצים (RPC)
│   ├── timeLimitService.js        ← מגבלות זמן (RPC)
│   ├── outpostLimitService.js     ← מגבלות עמדה (RPC)
│   ├── shiftRequestService.js     ← בקשות משמרת (RPC)
│   └── userService.ts             ← login/register/logout
├── context/
│   └── AuthContext.tsx             ← ניהול state של המשתמש
└── AppRoutes.tsx                   ← CommanderRoute לעמודים מוגבלים

supabase/
├── migrations/
│   └── 001_enforce_commander_role.sql  ← כל ה-RPC + RLS
└── seed.sql                            ← סכמת טבלאות + data ראשוני
```

---

## FAQ

### למה לא Supabase Auth רגיל?

האותנטיקציה מבוססת תעודת זהות + טלפון, ללא email/password. אין JWT מ-Supabase Auth,
כל הבקשות מגיעות כ-`anon`. לכן אי אפשר להשתמש ב-`auth.uid()` ב-RLS.

### מה קורה אם משתמש משנה role ב-localStorage?

שום דבר. ה-UI ישתנה (יראה כפתורים שהוא לא אמור לראות),
אבל כל ניסיון כתיבה ייכשל כי ה-RPC בודק את ה-`role` **מטבלת `users` בדאטאבייס**.

### מה קורה אם מישהו שולח RPC עם userId/phone של מפקד?

הוא צריך לדעת גם את התעודת זהות וגם את מספר הטלפון של המפקד.
זוהי חולשה תיאורטית — אם צריך אבטחה חזקה יותר, יש להוסיף:
- rate limiting על RPC calls
- OTP/SMS verification
- Supabase Auth אמיתי עם JWT

### איך מוסיפים תפקיד חדש (למשל "סמל")?

1. הוסף את הערך לעמודת `role` בטבלת `users`.
2. צור פונקציית assert חדשה (למשל `assert_sergeant`).
3. בצד ה-UI — הרחב את `useIsCommander` או צור hook נוסף.
4. השתמש בפונקציית ה-assert המתאימה ב-RPC.
