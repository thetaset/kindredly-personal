/**
 * Date and age calculation utilities
 */

export interface DateOfBirth {
  y: number;
  m: number;
  d?: number;
}

/**
 * Calculate age based on date of birth
 * @param dob Date of birth object with year, month, and optional day
 * @param referenceDate Optional reference date (defaults to today)
 * @returns Age in years
 */
export function calculateAge(dob: DateOfBirth | null | undefined, referenceDate?: Date): number | null {
  if (!dob?.y) {
    return null;
  }

  const today = referenceDate || new Date();
  const birthDate = new Date(dob.y, (dob.m || 1) - 1, dob.d || 1);
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  
  // Adjust age if birthday hasn't occurred yet this year
  const actualAge = (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) ? age - 1 : age;
  
  return actualAge;
}

/**
 * Check if a user is under a certain age based on their date of birth
 * @param dob Date of birth object with year, month, and optional day
 * @param ageThreshold Age threshold to check against (default: 18)
 * @param referenceDate Optional reference date (defaults to today)
 * @returns True if user is under the age threshold, false otherwise, null if dob is invalid
 */
export function isUnderAge(dob: DateOfBirth | null | undefined, ageThreshold: number = 18, referenceDate?: Date): boolean | null {
  const age = calculateAge(dob, referenceDate);
  if (age === null) {
    return null;
  }
  return age < ageThreshold;
}
