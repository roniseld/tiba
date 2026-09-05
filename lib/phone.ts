// נרמול מספרי טלפון ישראליים לפורמט 05XXXXXXXX (לאחסון) ו-+9725XXXXXXXX (לשליחה)

export function normalizeIsraeliPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let local: string;
  if (digits.startsWith("972")) local = "0" + digits.slice(3);
  else if (digits.startsWith("0")) local = digits;
  else if (digits.length === 9) local = "0" + digits;
  else return null;
  if (!/^05\d{8}$/.test(local)) return null;
  return local;
}

export function toE164(local: string): string {
  return "+972" + local.slice(1);
}

export function formatPhone(local: string): string {
  return local.slice(0, 3) + "-" + local.slice(3);
}
