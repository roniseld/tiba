-- להריץ ב-Supabase → SQL Editor אם הסכמה הותקנה לפני גרסה 1.1
alter table messages add column if not exists consulted_with text;
