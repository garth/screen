import { describe, expect, it } from 'vitest'
import {
  requiredString,
  emailSchema,
  passwordSchema,
  registrationSchema,
  loginSchema,
  updateNameSchema,
  changePasswordFormSchema,
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

describe('passwordSchema', () => {
  it('passes for password with 8+ characters', () => {
    const result = validate(passwordSchema, '12345678')
    expect(result.success).toBe(true)
  })

  it('passes for long password', () => {
    const result = validate(passwordSchema, 'a'.repeat(100))
    expect(result.success).toBe(true)
  })

  it('fails for password under 8 characters', () => {
    const result = validate(passwordSchema, '1234567')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].message).toBe('Password must be at least 8 characters')
    }
  })

  it('fails for empty password', () => {
    const result = validate(passwordSchema, '')
    expect(result.success).toBe(false)
  })

  it('fails for password over 255 characters', () => {
    const result = validate(passwordSchema, 'a'.repeat(256))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].message).toBe('Password is too long')
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
      password: '1234567',
    })
    expect(result.success).toBe(false)
    expect(getFieldError(result, 'password')).toBe('Password must be at least 8 characters')
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
    const result = validate(updateNameSchema, { firstName: 'Jane', lastName: 'Doe' })
    expect(getFieldError(result, 'firstName')).toBeUndefined()
  })

  it('returns error message for failed field', () => {
    const result = validate(updateNameSchema, { firstName: '', lastName: 'Doe' })
    expect(getFieldError(result, 'firstName')).toBe('First name is required')
  })

  it('returns undefined for non-errored field', () => {
    const result = validate(registrationSchema, {
      firstName: 'John',
      lastName: 'Doe',
      email: '',
      password: 'password123',
    })
    expect(getFieldError(result, 'firstName')).toBeUndefined()
    expect(getFieldError(result, 'email')).toBe('Email is required')
  })
})

describe('getAllErrors', () => {
  it('returns empty object for successful validation', () => {
    const result = validate(updateNameSchema, { firstName: 'Jane', lastName: 'Doe' })
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
