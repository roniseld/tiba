-- תיבת הדילמות — סכמת מסד הנתונים
-- להריץ פעם אחת ב-Supabase → SQL Editor → New query → Run

create extension if not exists pgcrypto;

-- משתמשים
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,               -- בפורמט 05XXXXXXXX
  name text not null,
  email text,
  team text,                                -- רעננה / הרצליה / רמת השרון / חוף השרון
  role text not null default 'volunteer' check (role in ('volunteer','answerer','manager')),
  status text not null default 'pending' check (status in ('pending','active','blocked')),
  notify_sms boolean not null default true,
  notify_email boolean not null default true,
  notify_whatsapp boolean not null default false,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- קודי כניסה חד-פעמיים
create table if not exists otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  used boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists otp_codes_phone_idx on otp_codes(phone, created_at desc);

-- שאלות
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  asker_id uuid not null references users(id),
  category text not null,
  title text not null,
  body text not null,
  status text not null default 'new' check (status in ('new','claimed','answered','closed')),
  claimed_by uuid references users(id),
  claimed_at timestamptz,
  answered_at timestamptz,
  in_kb boolean not null default false,      -- מפורסם במאגר הידע
  notify_sms boolean not null default true,  -- איך לעדכן את השואל
  notify_email boolean not null default true,
  reminder_sent_at timestamptz,
  escalated_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists questions_status_idx on questions(status, created_at);
create index if not exists questions_asker_idx on questions(asker_id, created_at desc);

-- הודעות בשרשור (תשובות ושאלות המשך)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  author_id uuid not null references users(id),
  kind text not null check (kind in ('answer','followup')),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_q_idx on messages(question_id, created_at);

-- יומן התראות
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  channel text not null check (channel in ('sms','email','whatsapp')),
  destination text not null,
  event text not null,                        -- otp / new_question / claimed / answered / followup / reminder / escalation / registration / approved
  question_id uuid references questions(id) on delete set null,
  body text not null,
  ok boolean not null,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists notifications_created_idx on notifications(created_at desc);

-- אין גישה ישירה מהדפדפן: כל הפניות עוברות דרך השרת עם מפתח service role.
alter table users enable row level security;
alter table otp_codes enable row level security;
alter table questions enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
