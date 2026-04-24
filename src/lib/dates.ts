// Relative date formatting — matches iOS RelativeDateHelper

export function relativeDate(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";

  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" };

  return date.toLocaleDateString("en-US", options);
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatMonthYearQuery(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Returns { start, end } ISO date strings for a month range.
 *  `start` = first day of the month, `end` = first day of NEXT month.
 *  Use with .gte(start).lt(end) to avoid invalid dates like Apr 31. */
export function getMonthRange(date: Date): { start: string; end: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(y, m + 1, 1);
  const end = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
  return { start, end };
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
