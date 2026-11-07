/**
 * Ethiopian Mobile Phone Number Validation and Formatting
 * Supported network codes:
 * - Ethio Telecom: +251 9XX XXX XXX (or 09XX XXX XXX)
 * - Safaricom Ethiopia: +251 7XX XXX XXX (or 07XX XXX XXX)
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized?: string; // Standard E.164 format: +251911234567
  formatted?: string;  // Display format: +251 911 234 567
  error?: string;
}

/**
 * Validates and normalizes an Ethiopian phone number.
 * Accepts formats:
 * - +251911234567
 * - +251 911 234 567
 * - 0911234567
 * - 0711234567
 * - 911234567
 */
export function validateEthiopianPhone(input: string): PhoneValidationResult {
  if (!input || typeof input !== "string") {
    return { isValid: false, error: "Phone number is required" };
  }

  // Remove all whitespace, dashes, brackets, and parentheses
  const cleaned = input.replace(/[\s\-\(\)\.]/g, "");

  // Match variants:
  // 1. +251 (9 or 7) followed by 8 digits
  // 2. 00251 (9 or 7) followed by 8 digits
  // 3. 251 (9 or 7) followed by 8 digits
  // 4. 0 (9 or 7) followed by 8 digits
  // 5. (9 or 7) followed by 8 digits
  let nationalDigits = "";

  if (/^\+251[79]\d{8}$/.test(cleaned)) {
    nationalDigits = cleaned.slice(4);
  } else if (/^00251[79]\d{8}$/.test(cleaned)) {
    nationalDigits = cleaned.slice(5);
  } else if (/^251[79]\d{8}$/.test(cleaned)) {
    nationalDigits = cleaned.slice(3);
  } else if (/^0[79]\d{8}$/.test(cleaned)) {
    nationalDigits = cleaned.slice(1);
  } else if (/^[79]\d{8}$/.test(cleaned)) {
    nationalDigits = cleaned;
  } else {
    return {
      isValid: false,
      error: "Invalid Ethiopian phone number. Must be a valid mobile number (e.g., +251 9XX XXX XXX or 09XX XXX XXX)",
    };
  }

  const normalized = `+251${nationalDigits}`;
  const prefix = nationalDigits.slice(0, 2); // e.g. 91
  const mid = nationalDigits.slice(2, 5);    // e.g. 123
  const end = nationalDigits.slice(5);       // e.g. 4567
  const formatted = `+251 ${prefix} ${mid} ${end}`;

  return {
    isValid: true,
    normalized,
    formatted,
  };
}

/**
 * Quick boolean check for Ethiopian phone number
 */
export function isEthiopianPhone(input: string): boolean {
  return validateEthiopianPhone(input).isValid;
}

/**
 * Format an Ethiopian phone number for clean UI display
 */
export function formatEthiopianPhone(input: string): string {
  const result = validateEthiopianPhone(input);
  return result.isValid && result.formatted ? result.formatted : input;
}

