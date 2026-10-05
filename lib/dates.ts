import { differenceInCalendarDays, parseISO } from "date-fns";

export function toDate(value: string | Date): Date {
  return typeof value === "string" ? parseISO(value) : value;
}

export function daysBetween(from: string | Date, to: string | Date): number {
  return differenceInCalendarDays(toDate(to), toDate(from));
}

export function daysSince(iso: string, now: Date = new Date()): number {
  return daysBetween(iso, now);
}

export function isDeliveryAtRisk(
  expectedDate: string,
  committedDeadline: string,
): boolean {
  return daysBetween(expectedDate, committedDeadline) < 0;
}

export type ExpiryState = "valid" | "expiring" | "expired";

export function expiryState(
  expiryDate: string,
  now: Date = new Date(),
  windowDays = 60,
): ExpiryState {
  const daysLeft = daysBetween(now, expiryDate);
  if (daysLeft < 0) return "expired";
  if (daysLeft <= windowDays) return "expiring";
  return "valid";
}

export function agingBucket(days: number): string {
  if (days < 7) return "0-6 days";
  if (days < 14) return "7-13 days";
  if (days < 30) return "14-29 days";
  return "30+ days";
}

export function isISODateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return !Number.isNaN(parsed.getTime());
}
