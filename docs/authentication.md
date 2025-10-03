# 🔐 Authentication System (Supabase Auth)

This documentation outlines the authentication system used in the project. It uses **Supabase Auth** with support for **email/password sign-up**, **Google**, and **GitHub OAuth**. The system includes secure **profile creation**, **trigger-based automation**, and **row-level security (RLS)** enforcement.

---

## 📥 Sign Up Flow

### ✅ What Happens When a User Signs Up:

1. User fills a form with:

   - Full name
   - Email
   - Password (must meet strength requirements)

2. Before signup:

   - The frontend checks whether the email is already in the `profiles` table

3. On signup:

   - Supabase creates the user in `auth.users`
   - A database **trigger** inserts the corresponding row into `profiles`
   - Each profile row receives a `user_avatar` that defaults to the shared placeholder URL
   - A confirmation email is sent (if enabled)

---

## ⚙️ Trigger to Insert Profile

Create this trigger to automatically add a row to `profiles` when a user signs up:

```sql
create or replace function handle_new_user()
returns trigger as $$
declare
  default_avatar constant text :=
    'https://izngyuhawwlxopcdmfry.supabase.co/storage/v1/object/public/assets/user.svg';
begin
  insert into profiles (id, email, full_name, user_avatar)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'user_avatar', default_avatar)
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure handle_new_user();
```

---

## 📄 Profiles Table

Create the `profiles` table like this:

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  user_avatar text default 'https://izngyuhawwlxopcdmfry.supabase.co/storage/v1/object/public/assets/user.svg',
  created_at timestamptz default now()
);
```

---

## 🔐 RLS (Row-Level Security)

Enable RLS:

```sql
alter table profiles enable row level security;
```

### ✅ RLS Policies:

```sql
-- Allow trigger (supabase_auth_admin) to insert
create policy "Allow inserts from Supabase"
on profiles for insert
using (auth.role() = 'supabase_auth_admin')
with check (auth.role() = 'supabase_auth_admin');

-- Allow authenticated users to select their own profile
create policy "Users can view their own profile"
on profiles for select
using (auth.uid() = id);

-- Allow authenticated users to update their own profile
create policy "Users can update their own profile"
on profiles for update
using (auth.uid() = id);
```

### Optional: Allow public read by email (only if you want to check email before signup)

```sql
create policy "Allow public read access for email checks"
on profiles for select
using (true);
```

> ⚠️ Only enable this policy if you need to check for email existence in `profiles` before `signUp()`.

---

## 🧪 Frontend: Sign Up with Validation

```ts
import { DEFAULT_AVATAR } from "@/lib/constants";

const { data, error } = await supabase.auth.signUp({
  email: formData.email,
  password: formData.password,
  options: {
    data: {
      full_name: formData.name,
      user_avatar: DEFAULT_AVATAR,
    },
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});

if (error) {
  setError(error.message);
  return;
}

if (!data.user && !data.session) {
  setError("This email is already registered. Try logging in instead.");
  return;
}

if (data.user?.id) {
  localStorage.setItem("pendingEmail", formData.email);
  router.push("/verify-email");
}
```

---

## 🔐 Social OAuth (GitHub/Google)

```ts
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: `${window.location.origin}/auth/callback` },
});
```

---

## ✅ Password Requirements (Frontend)

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

Handled client-side with validation logic before allowing submit.

---

## ✅ Email Confirm Flow

1. After signing up, users receive a verification email
2. They click the link → redirected to `/auth/callback`
3. Supabase automatically logs them in
4. You redirect them to `/dashboard` or equivalent

---

## ✅ Cleanup Policy

Ensure cascade deletes on user deletion:

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  ...
);
```

---

## 📌 Notes

- Never expose the `service_role` key in the frontend
- Keep RLS enabled and policies strict
- Always handle `.user = null && .session = null` case in `signUp`

---
