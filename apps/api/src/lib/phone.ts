// Canonical Indian mobile numbers, including common pasted country-code formats.
export function normalizePhone(value: string): string | null {
  if (!/^[+\d\s()-]+$/.test(value)) return null;
  let phone = value.replace(/[\s()-]/g, "");
  if (phone.startsWith("+91")) phone = phone.slice(3);
  else if (phone.length === 12 && phone.startsWith("91"))
    phone = phone.slice(2);
  else if (phone.length === 11 && phone.startsWith("0")) phone = phone.slice(1);
  return /^[6-9]\d{9}$/.test(phone) ? phone : null;
}

// Preserve access to legacy accounts stored with a country code.
export function phoneAliases(phone: string): string[] {
  return [phone, `91${phone}`, `+91${phone}`, `0${phone}`];
}
