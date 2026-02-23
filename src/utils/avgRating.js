// utils/rating.util.js

/**
 * Safely calculate average rating
 * - prevents divide by zero
 * - caps at 5
 * - rounds to 2 decimals
 */
export function calculateAverageRating(ratingSum, reviewCount) {
  if (!reviewCount || reviewCount <= 0) return 0;

  let avg = ratingSum / reviewCount;

  if (avg > 5) avg = 5;
  if (avg < 0) avg = 0;

  return Number(avg.toFixed(2));
}