# תיבת הדילמות (Tiba)

Web app for volunteer EMTs to submit professional questions/dilemmas and get answers from senior-qualified volunteers. Hebrew, RTL, installable as a PWA (no app stores).

**Stack:** Next.js 15 (App Router, server actions) · Supabase Postgres (service-role access from the server only) · phone OTP login with signed JWT cookies (jose) · SMS via 019 / InforUMobile / Twilio · email via Resend · optional WhatsApp via Twilio · reminder endpoint driven by an external cron.

The full Hebrew deployment guide is in `מדריך-התקנה.md`.

## Roles
- `volunteer` — asks questions, sees own questions + knowledge base
- `answerer` — sees the queue, claims and answers questions, publishes to the knowledge base
- `manager` — everything above plus user approval/roles, report, notification log

## Notifications
| Event | Recipients | Channels |
|---|---|---|
| new question | all active answerers + managers | per user preference (SMS / email / WhatsApp) |
| question claimed | other answerers | per preference |
| answer posted | asker | as chosen on the question (SMS / email) |
| follow-up | claimer (or all answerers) | per preference |
| unclaimed > `REMIND_AFTER_HOURS` | answerers | per preference (once per question) |
| open > `ESCALATE_AFTER_HOURS` | managers | per preference (once per question) |
| new registration / approval | managers / the volunteer | SMS + email |

## Local development
```bash
cp .env.example .env.local   # fill SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AUTH_SECRET, MANAGER_PHONE
npm install
npm run dev
```
With `SMS_PROVIDER=log` the login screen shows the OTP code instead of sending it.

## Cron
`GET /api/cron/reminders` with header `Authorization: Bearer $CRON_SECRET` (or `?secret=`). Call it every 15–60 minutes from cron-job.org or similar.

## Layout
```
app/            pages (login, register, pending, /, ask, q/[id], kb, queue, admin, me) + actions.ts + api routes
components/     Shell (header + tab bar), QuestionCard
lib/            db, auth (OTP + JWT), sms, email, whatsapp, notify, questions, phone, format
supabase/       schema.sql
```
