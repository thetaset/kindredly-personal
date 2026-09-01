/**
 * Date and age calculation utilities
 */

import type { MinAgeGroup } from './content.types';

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

/**
 * Map an age in years to the MinAgeGroup band used by category sets and content tags
 * @param age Age in years, or null when unknown
 * @returns The matching age group, or null when age is unknown
 */
export function ageGroupForAge(age: number | null): MinAgeGroup | null {
  if (age === null) return null;
  if (age < 5) return 'minage_prek';
  if (age < 10) return 'minage_kids';
  if (age < 13) return 'minage_preteen';
  if (age < 18) return 'minage_teen';
  return 'minage_adult';
}
