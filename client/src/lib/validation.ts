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
 * Password validator for registration (6+ chars)
 */
export const registerPasswordSchema = v.pipe(
  v.string(),
  v.minLength(6, 'Password must be at least 6 characters'),
  v.maxLength(255, 'Password is too long'),
)

/**
 * Password validator for changing password (8+ chars)
 */
export const changePasswordSchema = v.pipe(v.string(), v.minLength(8, 'Password must be at least 8 characters'))

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
  password: registerPasswordSchema,
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
  newPassword: changePasswordSchema,
  confirmPassword: v.string(),
})

/**
 * Schema for activity creation/update
 */
export const activitySchema = v.object({
  description: requiredString('Description'),
  startTime: requiredString('Start time'),
  endTime: optionalString,
  tags: optionalString,
  note: optionalString,
  projectId: optionalString,
  timezone: requiredString('Timezone'),
})

/**
 * Schema for client creation/update
 */
export const clientSchema = v.object({
  name: requiredString('Name'),
})

/**
 * Schema for project creation
 */
export const projectSchema = v.object({
  name: requiredString('Name'),
  clientId: requiredString('Client'),
})

/**
 * Schema for phase creation
 */
export const phaseSchema = v.object({
  name: requiredString('Name'),
  clientId: requiredString('Client'),
  projectId: optionalString,
  startDate: requiredString('Start date'),
  endDate: requiredString('End date'),
  billingRate: optionalString,
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
