/**
 * Shared validation utilities for edge functions
 * Provides common validation functions for UUIDs, enums, and other types
 */

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format
 */
export function isValidUUID(value: any): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * Validate enum value
 */
export function isValidEnum<T extends string>(
  value: any,
  allowedValues: readonly T[]
): value is T {
  return typeof value === 'string' && allowedValues.includes(value as T);
}

/**
 * Validate email format
 */
export function isValidEmail(value: any): value is string {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Validate phone format (E.164 format: +1234567890)
 */
export function isValidPhone(value: any): value is string {
  if (typeof value !== 'string') return false;
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(value);
}

/**
 * Validate numeric range
 */
export function isValidNumberRange(
  value: any,
  min?: number,
  max?: number
): value is number {
  if (typeof value !== 'number' || isNaN(value)) return false;
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

/**
 * Validate array of values
 */
export function isValidArray<T>(
  value: any,
  validator?: (item: any) => item is T
): value is T[] {
  if (!Array.isArray(value)) return false;
  if (validator) {
    return value.every(item => validator(item));
  }
  return true;
}

/**
 * Validation error response helper
 */
export function validationErrorResponse(
  field: string,
  message: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ 
      error: `Validation error: ${field} - ${message}`,
      field,
      message
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    }
  );
}

