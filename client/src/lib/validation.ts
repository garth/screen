/**
 * Shared validation schemas and helpers using Valibot
 */
import * as v from 'valibot'

// ============================================================================
// Common Field Validators
// ============================================================================

/**
 * Required non-empty string validator
 */
export function requiredString(fieldName: string) {
  return v.pipe(v.string(), v.nonEmpty(`${fieldName} is required`))
}

/**
 * Optional string validator
 */
export const optionalString = v.optional(v.string())

/**
 * Email validator with required check
 */
export const emailSchema = v.pipe(v.string(), v.nonEmpty('Email is required'), v.email('Invalid email address'))

/**
 * Password validator (8+ chars)
 */
export const passwordSchema = v.pipe(
  v.string(),
  v.minLength(8, 'Password must be at least 8 characters'),
  v.maxLength(255, 'Password is too long'),
)

// ============================================================================
// Form Schemas
// ============================================================================

/**
 * Schema for user registration
 */
export const registrationSchema = v.object({
  firstName: requiredString('First name'),
  lastName: requiredString('Last name'),
  email: emailSchema,
  password: passwordSchema,
})

/**
 * Schema for login
 */
export const loginSchema = v.object({
  email: emailSchema,
  password: v.pipe(v.string(), v.nonEmpty('Password is required')),
})

/**
 * Schema for updating user name
 */
export const updateNameSchema = v.object({
  firstName: requiredString('First name'),
  lastName: requiredString('Last name'),
})

/**
 * Schema for changing password
 */
export const changePasswordFormSchema = v.object({
  currentPassword: v.pipe(v.string(), v.nonEmpty('Current password is required')),
  newPassword: passwordSchema,
  confirmPassword: v.string(),
})

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate data against a schema and return result
 */
export function validate<T>(schema: v.GenericSchema<T>, data: unknown): v.SafeParseResult<T> {
  return v.safeParse(schema, data)
}

/**
 * Check if passwords match (for password change forms)
 */
export function passwordsMatch(newPassword: string, confirmPassword: string): boolean {
  return newPassword === confirmPassword
}

/**
 * Get first validation error message for a field
 */
export function getFieldError(result: v.SafeParseResult<unknown>, fieldName: string): string | undefined {
  if (result.success) return undefined
  const issue = result.issues.find((i) => i.path && i.path.length > 0 && i.path[0].key === fieldName)
  return issue?.message
}

/**
 * Get all validation errors as a record
 */
export function getAllErrors(result: v.SafeParseResult<unknown>): Record<string, string> {
  if (result.success) return {}
  const errors: Record<string, string> = {}
  for (const issue of result.issues) {
    if (issue.path && issue.path.length > 0) {
      const key = String(issue.path[0].key)
      if (!errors[key]) {
        errors[key] = issue.message
      }
    }
  }
  return errors
}
