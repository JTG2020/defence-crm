import { format } from "date-fns";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(value: number): string {
  return inr.format(value);
}

export function formatQty(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatDate(iso: string): string {
  return format(new Date(iso), "dd MMM yyyy");
}
