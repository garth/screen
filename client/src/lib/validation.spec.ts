import { describe, expect, it } from 'vitest'
import {
  requiredString,
  emailSchema,
  registerPasswordSchema,
  changePasswordSchema,
  registrationSchema,
  loginSchema,
  updateNameSchema,
  changePasswordFormSchema,
  activitySchema,
  clientSchema,
  projectSchema,
  phaseSchema,
  validate,
  passwordsMatch,
  getFieldError,
  getAllErrors,
} from './validation'

describe('requiredString', () => {
  it('passes for non-empty strings', () => {
    const schema = requiredString('Name')
    const result = validate(schema, 'John Doe')
    expect(result.success).toBe(true)
  })

  it('fails for empty strings', () => {
    const schema = requiredString('Name')
    const result = validate(schema, '')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].message).toBe('Name is required')
    }
  })

  it('fails for non-string values', () => {
    const schema = requiredString('Name')
    const result = validate(schema, 123)
    expect(result.success).toBe(false)
  })

  it('fails for null', () => {
    const schema = requiredString('Name')
    const result = validate(schema, null)
    expect(result.success).toBe(false)
  })

  it('fails for undefined', () => {
    const schema = requiredString('Name')
    const result = validate(schema, undefined)
    expect(result.success).toBe(false)
  })
})

describe('emailSchema', () => {
  it('passes for valid email', () => {
    const result = validate(emailSchema, 'user@example.com')
    expect(result.success).toBe(true)
  })

  it('passes for email with subdomain', () => {
    const result = validate(emailSchema, 'user@mail.example.com')
    expect(result.success).toBe(true)
  })

  it('fails for empty string', () => {
    const result = validate(emailSchema, '')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].message).toBe('Email is required')
    }
  })

  it('fails for invalid email format', () => {
    const result = validate(emailSchema, 'not-an-email')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].message).toBe('Invalid email address')
    }
  })

  it('fails for email without domain', () => {
    const result = validate(emailSchema, 'user@')
    expect(result.success).toBe(false)
  })

  it('fails for email without @', () => {
    const result = validate(emailSchema, 'userexample.com')
    expect(result.success).toBe(false)
  })
})

describe('registerPasswordSchema', () => {
  it('passes for password with 6+ characters', () => {
    const result = validate(registerPasswordSchema, '123456')
    expect(result.success).toBe(true)
  })

  it('passes for long password', () => {
    const result = validate(registerPasswordSchema, 'a'.repeat(100))
    expect(result.success).toBe(true)
  })

  it('fails for password under 6 characters', () => {
    const result = validate(registerPasswordSchema, '12345')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].message).toBe('Password must be at least 6 characters')
    }
  })

  it('fails for empty password', () => {
    const result = validate(registerPasswordSchema, '')
    expect(result.success).toBe(false)
  })

  it('fails for password over 255 characters', () => {
    const result = validate(registerPasswordSchema, 'a'.repeat(256))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].message).toBe('Password is too long')
    }
  })
})

describe('changePasswordSchema', () => {
  it('passes for password with 8+ characters', () => {
    const result = validate(changePasswordSchema, '12345678')
    expect(result.success).toBe(true)
  })

  it('fails for password under 8 characters', () => {
    const result = validate(changePasswordSchema, '1234567')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].message).toBe('Password must be at least 8 characters')
    }
  })
})

describe('registrationSchema', () => {
  it('passes for valid registration data', () => {
    const result = validate(registrationSchema, {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('fails for missing firstName', () => {
    const result = validate(registrationSchema, {
      firstName: '',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'firstName')).toBe('First name is required')
  })

  it('fails for missing lastName', () => {
    const result = validate(registrationSchema, {
      firstName: 'John',
      lastName: '',
      email: 'john@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'lastName')).toBe('Last name is required')
  })

  it('fails for missing email', () => {
    const result = validate(registrationSchema, {
      firstName: 'John',
      lastName: 'Doe',
      email: '',
      password: 'password123',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'email')).toBe('Email is required')
  })

  it('fails for invalid email', () => {
    const result = validate(registrationSchema, {
      firstName: 'John',
      lastName: 'Doe',
      email: 'invalid-email',
      password: 'password123',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'email')).toBe('Invalid email address')
  })

  it('fails for short password', () => {
    const result = validate(registrationSchema, {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: '12345',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'password')).toBe('Password must be at least 6 characters')
  })
})

describe('loginSchema', () => {
  it('passes for valid login data', () => {
    const result = validate(loginSchema, {
      email: 'user@example.com',
      password: 'anypassword',
    })
    expect(result.success).toBe(true)
  })

  it('fails for empty email', () => {
    const result = validate(loginSchema, {
      email: '',
      password: 'password',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'email')).toBe('Email is required')
  })

  it('fails for empty password', () => {
    const result = validate(loginSchema, {
      email: 'user@example.com',
      password: '',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'password')).toBe('Password is required')
  })
})

describe('updateNameSchema', () => {
  it('passes for valid name', () => {
    const result = validate(updateNameSchema, { firstName: 'Jane', lastName: 'Doe' })
    expect(result.success).toBe(true)
  })

  it('fails for empty firstName', () => {
    const result = validate(updateNameSchema, { firstName: '', lastName: 'Doe' })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'firstName')).toBe('First name is required')
  })

  it('fails for empty lastName', () => {
    const result = validate(updateNameSchema, { firstName: 'Jane', lastName: '' })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'lastName')).toBe('Last name is required')
  })
})

describe('changePasswordFormSchema', () => {
  it('passes for valid password change data', () => {
    const result = validate(changePasswordFormSchema, {
      currentPassword: 'oldpass123',
      newPassword: 'newpassword',
      confirmPassword: 'newpassword',
    })
    expect(result.success).toBe(true)
  })

  it('fails for empty current password', () => {
    const result = validate(changePasswordFormSchema, {
      currentPassword: '',
      newPassword: 'newpassword',
      confirmPassword: 'newpassword',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'currentPassword')).toBe('Current password is required')
  })

  it('fails for short new password', () => {
    const result = validate(changePasswordFormSchema, {
      currentPassword: 'oldpass',
      newPassword: '1234567',
      confirmPassword: '1234567',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'newPassword')).toBe('Password must be at least 8 characters')
  })
})

describe('activitySchema', () => {
  it('passes for valid activity with required fields', () => {
    const result = validate(activitySchema, {
      description: 'Working on feature',
      startTime: '2024-01-15T09:00',
      timezone: 'America/New_York',
    })
    expect(result.success).toBe(true)
  })

  it('passes for activity with all fields', () => {
    const result = validate(activitySchema, {
      description: 'Working on feature',
      startTime: '2024-01-15T09:00',
      endTime: '2024-01-15T17:00',
      tags: 'coding, frontend',
      note: 'Made good progress',
      projectId: 'proj-123',
      timezone: 'America/New_York',
    })
    expect(result.success).toBe(true)
  })

  it('fails for missing description', () => {
    const result = validate(activitySchema, {
      description: '',
      startTime: '2024-01-15T09:00',
      timezone: 'America/New_York',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'description')).toBe('Description is required')
  })

  it('fails for missing start time', () => {
    const result = validate(activitySchema, {
      description: 'Working',
      startTime: '',
      timezone: 'America/New_York',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'startTime')).toBe('Start time is required')
  })

  it('fails for missing timezone', () => {
    const result = validate(activitySchema, {
      description: 'Working',
      startTime: '2024-01-15T09:00',
      timezone: '',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'timezone')).toBe('Timezone is required')
  })
})

describe('clientSchema', () => {
  it('passes for valid client', () => {
    const result = validate(clientSchema, { name: 'Acme Corp' })
    expect(result.success).toBe(true)
  })

  it('fails for empty name', () => {
    const result = validate(clientSchema, { name: '' })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'name')).toBe('Name is required')
  })
})

describe('projectSchema', () => {
  it('passes for valid project', () => {
    const result = validate(projectSchema, {
      name: 'Website Redesign',
      clientId: 'client-123',
    })
    expect(result.success).toBe(true)
  })

  it('fails for empty name', () => {
    const result = validate(projectSchema, {
      name: '',
      clientId: 'client-123',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'name')).toBe('Name is required')
  })

  it('fails for missing client', () => {
    const result = validate(projectSchema, {
      name: 'Website Redesign',
      clientId: '',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'clientId')).toBe('Client is required')
  })
})

describe('phaseSchema', () => {
  it('passes for valid phase with required fields', () => {
    const result = validate(phaseSchema, {
      name: 'Q1 2024',
      clientId: 'client-123',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
    })
    expect(result.success).toBe(true)
  })

  it('passes for phase with all fields', () => {
    const result = validate(phaseSchema, {
      name: 'Q1 2024',
      clientId: 'client-123',
      projectId: 'proj-123',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      billingRate: '150.00',
    })
    expect(result.success).toBe(true)
  })

  it('fails for missing name', () => {
    const result = validate(phaseSchema, {
      name: '',
      clientId: 'client-123',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'name')).toBe('Name is required')
  })

  it('fails for missing client', () => {
    const result = validate(phaseSchema, {
      name: 'Q1 2024',
      clientId: '',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'clientId')).toBe('Client is required')
  })

  it('fails for missing start date', () => {
    const result = validate(phaseSchema, {
      name: 'Q1 2024',
      clientId: 'client-123',
      startDate: '',
      endDate: '2024-03-31',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'startDate')).toBe('Start date is required')
  })

  it('fails for missing end date', () => {
    const result = validate(phaseSchema, {
      name: 'Q1 2024',
      clientId: 'client-123',
      startDate: '2024-01-01',
      endDate: '',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'endDate')).toBe('End date is required')
  })
})

describe('passwordsMatch', () => {
  it('returns true when passwords match', () => {
    expect(passwordsMatch('password123', 'password123')).toBe(true)
  })

  it('returns false when passwords differ', () => {
    expect(passwordsMatch('password123', 'password456')).toBe(false)
  })

  it('returns false for case differences', () => {
    expect(passwordsMatch('Password', 'password')).toBe(false)
  })

  it('returns true for empty strings', () => {
    expect(passwordsMatch('', '')).toBe(true)
  })
})

describe('getFieldError', () => {
  it('returns undefined for successful validation', () => {
    const result = validate(clientSchema, { name: 'Test' })
    expect(getFieldError(result, 'name')).toBeUndefined()
  })

  it('returns error message for failed field', () => {
    const result = validate(clientSchema, { name: '' })
    expect(getFieldError(result, 'name')).toBe('Name is required')
  })

  it('returns undefined for non-errored field', () => {
    const result = validate(registrationSchema, {
      name: 'John',
      email: '',
      password: 'password123',
    })
    expect(getFieldError(result, 'name')).toBeUndefined()
    expect(getFieldError(result, 'email')).toBe('Email is required')
  })
})

describe('getAllErrors', () => {
  it('returns empty object for successful validation', () => {
    const result = validate(clientSchema, { name: 'Test' })
    expect(getAllErrors(result)).toEqual({})
  })

  it('returns all errors for multiple failures', () => {
    const result = validate(registrationSchema, {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    })
    const errors = getAllErrors(result)
    expect(errors.firstName).toBe('First name is required')
    expect(errors.lastName).toBe('Last name is required')
    expect(errors.email).toBe('Email is required')
    // Password has minLength error when empty
    expect(errors.password).toBeDefined()
  })

  it('returns first error per field only', () => {
    const result = validate(registrationSchema, {
      firstName: 'John',
      lastName: 'Doe',
      email: 'invalid',
      password: 'password123',
    })
    const errors = getAllErrors(result)
    expect(errors.email).toBe('Invalid email address')
    expect(Object.keys(errors)).toHaveLength(1)
  })
})
