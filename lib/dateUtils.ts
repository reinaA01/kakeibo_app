// lib/dateUtils.ts
// @ts-ignore
import holidayJp from "holiday-jp";

export function getActualWithdrawalDate(
  year: number,
  month: number,
  day: number,
): Date {
  let date = new Date(year, month - 1, day);

  if (date.getMonth() !== month - 1) {
    date = new Date(year, month, 0);
  }

  while (true) {
    const dayOfWeek = date.getDay();
    const isHoliday = holidayJp.isHoliday(date);

    if (dayOfWeek === 0 || dayOfWeek === 6 || isHoliday) {
      date.setDate(date.getDate() + 1);
    } else {
      break;
    }
  }
  return date;
}

export function formatDateToString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
