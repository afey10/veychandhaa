# Tha. Veymandoo Police Chandhaa

A financial management PWA for managing monthly Chandhaa collections, expenses, balances, and reports for Tha. Veymandoo Police.

**Stack:** React + Vite + TypeScript + Tailwind CSS + Supabase (Auth, Postgres, RLS, Edge Functions) + PWA, deployed via GitHub → Vercel.

**Architecture:** `User → Vercel (PWA) → Supabase Auth → Supabase PostgreSQL`

---

## 1. Roles

| Role | Can do |
|---|---|
| **Administrator** | Everything: manage Chandhaa & expenses (CRUD), all reports/exports, manage users, manage expense categories |
| **Staff** | Add/view/edit Chandhaa & expenses, view & export reports. Cannot manage users or settings |
| **View Only** | View & search Chandhaa, expenses, reports. No create/edit/delete |

Permissions are enforced in **two layers**:
1. The UI hides buttons/pages the role can't use.
2. **Supabase Row Level Security (RLS)** enforces the same rules on every database call, so permissions can't be bypassed by calling the API directly. See `supabase/schema.sql`.

---

## 2. Project structure

```
├── src/
│   ├── components/       # Layout, ProtectedRoute, shared UI (modals, badges, etc.)
│   ├── contexts/         # AuthContext (session/role), ToastContext
│   ├── lib/supabase.ts   # Supabase client (anon key only)
│   ├── pages/            # Login, Dashboard, Chandhaa, Expenses, Reports, Administration, Profile
│   ├── types/            # Shared TypeScript types
│   └── utils/export.ts   # PDF / Excel / Print helpers
├── supabase/
│   ├── schema.sql        # Full DB schema + RLS policies (run once in Supabase)
│   └── functions/
│       └── admin-users/  # Edge Function for privileged user management
├── public/                # PWA icons, favicon
├── .env.example
└── vite.config.ts         # Includes vite-plugin-pwa configuration
```

---

## 3. Supabase setup

### 3.1 Create the project
1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Choose a name, database password, and region. Save the database password somewhere safe.

### 3.2 Run the database schema
1. In the Supabase Dashboard, open **SQL Editor → New query**.
2. Paste the entire contents of `supabase/schema.sql` and click **Run**.
3. This creates the `profiles`, `chandhaa`, `expenses`, `expense_categories`, and `audit_logs` tables, all indexes/constraints, helper functions, triggers, and **all RLS policies**, plus a public `receipts` storage bucket for optional bill/receipt photos. Default expense categories are seeded automatically.
4. Already have a project running from an earlier version of this schema? Re-running `schema.sql` is safe — it will add the new `receipt_url` column and the `receipts` bucket without touching your existing data.

### 3.3 Enable email/password authentication
1. **Authentication → Providers → Email** should already be enabled by default.
2. **Authentication → Settings**: you can disable "Confirm email" if you want new accounts to be usable immediately (the app creates users as already-confirmed via the Edge Function anyway, so this is optional).

### 3.4 Deploy the `admin-users` Edge Function
User creation and password resets require Supabase's **admin API**, which needs the `service_role` key. That key must never be shipped to the browser, so this project uses a small Edge Function that runs on Supabase's servers instead.

```bash
# Install the Supabase CLI if you don't have it: https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy admin-users
```

The function automatically has access to `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` — Supabase injects these for you; you don't need to set them manually.

### 3.5 Create the first administrator
There are **no default/hardcoded credentials** in this system. Create your first administrator manually, once:

1. **Authentication → Users → Add user** in the Supabase Dashboard.
   - Email: `<servicenumber>@veymandoo-police.local` (lowercase, letters/numbers only — e.g. service number `VP-1001` → `vp1001@veymandoo-police.local`). This mapping is how the app turns a "Service Number" login into a standard Supabase email/password login.
   - Password: set a strong temporary password and share it securely with the first administrator.
   - Check **Auto Confirm User**.
2. Copy the new user's **UID**.
3. In **SQL Editor**, run:
   ```sql
   insert into public.profiles (id, service_number, full_name, role, active)
   values ('PASTE_THE_UID_HERE', 'VP-1001', 'Full Name Here', 'administrator', true);
   ```
4. Sign in to the app with service number `VP-1001` and the password you set. From here, all further users (staff, view-only, additional administrators) can be created from **Administration → Users** in the app — no more manual SQL needed.

### 3.6 Obtain your API keys
**Project Settings → API**:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon / publishable key** → `VITE_SUPABASE_ANON_KEY`

Never copy the `service_role` key into the frontend or into `.env` files used by the client app.

### Password resets
Because accounts log in with a Service Number (not a real email), self-service "forgot password" links only work if you've separately configured a way to deliver mail to that internal address. The reliable path is for an **administrator to reset a user's password** from Administration → Users → Reset Password, which uses the secure Edge Function above.

---

## 4. Local development

```bash
npm install
cp .env.example .env
# edit .env with your Supabase URL + anon key
npm run dev
```

---

## 5. GitHub setup

```bash
git init
git add .
git commit -m "Initial commit: Tha. Veymandoo Police Chandhaa"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/veymandoo-police-chandhaa.git
git push -u origin main
```

`.env` is already excluded via `.gitignore` — never commit it.

---

## 6. Vercel deployment

1. Go to [vercel.com](https://vercel.com) → **Add New… → Project** → import your GitHub repository.
2. Vercel auto-detects Vite. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. Before deploying, open **Environment Variables** and add:
   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon/publishable key |
4. Click **Deploy**.
5. Every future `git push` to `main` triggers an automatic redeploy. Pull requests get their own preview deployments.

---

## 7. Testing checklist

- [ ] Sign in as administrator, staff, and view-only accounts; confirm sidebar & buttons match each role
- [ ] Try navigating directly to `/administration/users` as staff/view-only — should be blocked
- [ ] Add, edit, delete a Chandhaa record as administrator; confirm staff cannot delete; confirm view-only sees no action buttons
- [ ] Add an expense, confirm dashboard totals update
- [ ] Generate Monthly, Collection, and Expense reports; test PDF, Excel, and Print
- [ ] Disable/enable a user; confirm the last active administrator cannot be disabled
- [ ] Install the PWA on a phone (Add to Home Screen) and confirm it opens standalone
- [ ] Turn off network and confirm the app shell still loads (static asset caching)

---

## 8. Security notes

- The frontend only ever uses the Supabase **anon key** — see `src/lib/supabase.ts`.
- All financial data access is enforced by **Postgres RLS policies** (`supabase/schema.sql`), not just UI checks.
- `created_by`/`updated_by`/timestamps on financial records are set by database triggers (`stamp_created_by`/`stamp_updated_by`), not by client input — users cannot forge audit fields.
- A trigger blocks disabling or demoting the last active administrator.
- Privileged actions (creating users, resetting passwords) run through the `admin-users` Edge Function, which verifies the caller is an active administrator **server-side** before touching the `service_role` API.

---

## 9. PWA icons

`public/icons/` ships with simple placeholder icons (navy background, gold emblem) so the app installs correctly out of the box. Before going live, swap `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, and `public/apple-touch-icon.png` for your official Tha. Veymandoo Police branding, keeping the same filenames and sizes referenced in `vite.config.ts`.
