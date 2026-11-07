/**
 * Ethiopian Calendar Converter (Ge'ez Calendar)
 * 
 * The Ethiopian calendar has 12 months of 30 days each, plus a 13th month
 * (Pagume) of 5 days (6 days in an Ethiopian leap year).
 * New Year (1 Meskerem) occurs on September 11 (or Sept 12 before leap year).
 */

export interface EthiopianDate {
  year: number;
  month: number; // 1 to 13
  day: number;   // 1 to 30 (or 1 to 6 for Pagume)
  monthName: string;
  formatted: string; // e.g. "Tikimt 18, 2019 E.C."
}

export const ETHIOPIAN_MONTH_NAMES = [
  "Meskerem", // Month 1 (Sep - Oct)
  "Tikimt",   // Month 2 (Oct - Nov)
  "Hidar",    // Month 3 (Nov - Dec)
  "Tahsas",   // Month 4 (Dec - Jan)
  "Tir",      // Month 5 (Jan - Feb)
  "Yakatit",  // Month 6 (Feb - Mar)
  "Magabit",  // Month 7 (Mar - Apr)
  "Miazia",   // Month 8 (Apr - May)
  "Ginbot",   // Month 9 (May - Jun)
  "Sene",     // Month 10 (Jun - Jul)
  "Hamle",    // Month 11 (Jul - Aug)
  "Nehase",   // Month 12 (Aug - Sep)
  "Pagume",   // Month 13 (Short month 5-6 days)
];

/**
 * Checks if a given Ethiopian year is a leap year.
 * In the Ethiopian calendar, a leap year occurs every 4 years without century exceptions.
 * Year modulo 4 === 3 is a leap year (Pagume has 6 days).
 */
export function isEthiopianLeapYear(year: number): boolean {
  return (year + 1) % 4 === 0;
}

/**
 * Converts a Gregorian date (Date object or YYYY-MM-DD string) to Ethiopian Date.
 * Accurate astronomical JD-based conversion.
 */
export function toEthiopianDate(gregorianInput: Date | string | number): EthiopianDate {
  const gDate = typeof gregorianInput === "object" ? gregorianInput : new Date(gregorianInput);

  const gy = gDate.getFullYear();
  const gm = gDate.getMonth() + 1; // 1-12
  const gd = gDate.getDate();

  // Calculate Julian Day Number from Gregorian Date
  const a = Math.floor((14 - gm) / 12);
  const y = gy + 4800 - a;
  const m = gm + 12 * a - 3;
  const jdn =
    gd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  // Ethiopian Julian Day offset (JD of Ethiopian calendar epoch: 1 Meskerem 1 EE = JD 1723856)
  const jdnOffset = 1723856;
  const r = (jdn - jdnOffset) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);

  const ethYear = 4 * Math.floor((jdn - jdnOffset) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const ethMonth = Math.floor(n / 30) + 1;
  const ethDay = (n % 30) + 1;

  const monthIndex = Math.min(Math.max(ethMonth - 1, 0), 12);
  const monthName = ETHIOPIAN_MONTH_NAMES[monthIndex];

  return {
    year: ethYear,
    month: ethMonth,
    day: ethDay,
    monthName,
    formatted: `${monthName} ${ethDay}, ${ethYear} E.C.`,
  };
}

/**
 * Format helper for showing dual dates:
 * e.g., "Wednesday, Oct 28, 2026 (Tikimt 18, 2019 E.C.)"
 */
export function formatDualDate(gregorianInput: Date | string | number): {
  gregorianFormatted: string;
  ethiopianFormatted: string;
  combined: string;
} {
  const gDate = typeof gregorianInput === "object" ? gregorianInput : new Date(gregorianInput);
  
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const gregorianFormatted = gDate.toLocaleDateString("en-US", options);
  const eth = toEthiopianDate(gDate);

  return {
    gregorianFormatted,
    ethiopianFormatted: eth.formatted,
    combined: `${gregorianFormatted} (${eth.formatted})`,
  };
}

/**
 * Currency formatter for Ethiopian Birr
 * Local context requirement: "Currency: Ethiopian Birr (ETB), displayed as '500 ETB'"
 */
export function formatETB(amount: number): string {
  return `${amount.toLocaleString("en-US")} ETB`;
}

