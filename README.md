
# [👋 Live Demo 😊](https://shabtsak.top)

## שבצ׳׳קון React Application
This is a React + Vite application named שבצ׳׳קון (Shabtzakon).

## 🚀 Setup and Running


1. **Install the necessary dependencies:**

```bash
npm install
```

2. **Configure Supabase environment variables:**

Create `.env.local` from `.env.example` and update production values when deploying.

```bash
cp .env.example .env.local
```

3. **Start the application:**

```bash
npm run dev
```

After running, visit `http://localhost:3000/` in your browser to view the app.

## Supabase Auth (ID + Phone)

- Login now uses `id + phone` against Supabase table `users`.
- App uses Supabase Cloud values via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`.

Suggested table:

```sql
create table if not exists public.users (
  id text primary key,
  phone text not null,
  name text,
  email text,
  picture text
);
```

## 📖 More Information


"camp"= "בסיס";
"outpost" ="עמדה";
"shift"="משמרת";
"guard" ="שומר";

כל יוזר יכול להוסיף בסיס
לראות שיבוץ שמירות

רק מי שOWNER על הבסיס יכול לערוך או למחוק הכל




