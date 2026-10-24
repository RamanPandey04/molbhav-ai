const TZ = "Asia/Kolkata";

export function formatMoney(minor: number): string {
  const rupees = minor / 100;
  const whole = minor % 100 === 0;
  return (
    "₹" +
    rupees.toLocaleString("en-IN", {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/** Rupees typed by a human → integer paise. Returns null for anything that isn't a positive amount. */
export function rupeesToMinor(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [r, p = ""] = cleaned.split(".");
  const minor = parseInt(r, 10) * 100 + parseInt(p.padEnd(2, "0") || "0", 10);
  return minor > 0 ? minor : null;
}

export function minorToRupeeInput(minor: number): string {
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}

export function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 36e5;
}

export function isExpired(iso: string): boolean {
  return new Date(iso).getTime() <= Date.now();
}

/** Plain-language expiry, always paired with the exact timestamp by the caller. */
export function relativeExpiry(iso: string): string {
  const h = hoursUntil(iso);
  if (h <= 0) return "expired";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min left`;
  if (h < 48) return `${Math.round(h)} h left`;
  return `${Math.round(h / 24)} days left`;
}

/** After a failed submit, move focus to the first field with an error so it's visible on small screens. */
export function focusFirstError(ids: { id: string; error: string | null }[]) {
  const first = ids.find((f) => f.error);
  if (!first) return;
  const el = document.getElementById(first.id);
  if (el) {
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    (el as HTMLElement).focus({ preventScroll: true });
  }
}
