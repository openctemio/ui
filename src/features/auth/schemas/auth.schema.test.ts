/**
 * Auth Schema Tests
 *
 * Tests for authentication validation schemas
 */

import { describe, it, expect } from 'vitest'
import {
  emailSchema,
  passwordSchema,
  confirmPasswordSchema,
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  oauthCallbackSchema,
  isValidEmail,
  isValidPassword,
  getPasswordStrength,
  getPasswordStrengthLabel,
} from './auth.schema'

// ============================================
// FIELD VALIDATORS
// ============================================

describe('emailSchema', () => {
  it('should accept valid email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@example.com',
      'user+tag@example.co.uk',
      'user123@test-domain.com',
    ]

    validEmails.forEach(email => {
      expect(() => emailSchema.parse(email)).not.toThrow()
    })
  })

  it('should reject empty email', () => {
    expect(() => emailSchema.parse('')).toThrow('Please enter your email')
  })

  it('should reject invalid email format', () => {
    const invalidEmails = [
      'notanemail',
      'missing@domain',
      '@example.com',
      'user@',
      'user @example.com',
    ]

    invalidEmails.forEach(email => {
      expect(() => emailSchema.parse(email)).toThrow('Please enter a valid email address')
    })
  })
})

describe('passwordSchema', () => {
  it('should accept valid passwords (8+ characters)', () => {
    const validPasswords = [
      'password123',
      'MyP@ssw0rd',
      'abcdefgh',
      'verylongpassword123',
    ]

    validPasswords.forEach(password => {
      expect(() => passwordSchema.parse(password)).not.toThrow()
    })
  })

  it('should reject empty password', () => {
    expect(() => passwordSchema.parse('')).toThrow('Please enter your password')
  })

  it('should reject passwords shorter than 8 characters', () => {
    const shortPasswords = ['pass', 'test', '1234567', 'abc']

    shortPasswords.forEach(password => {
      expect(() => passwordSchema.parse(password)).toThrow(
        'Password must be at least 8 characters long'
      )
    })
  })
})

describe('confirmPasswordSchema', () => {
  it('should accept any non-empty string', () => {
    expect(() => confirmPasswordSchema.parse('password123')).not.toThrow()
    expect(() => confirmPasswordSchema.parse('abc')).not.toThrow()
  })

  it('should reject empty string', () => {
    expect(() => confirmPasswordSchema.parse('')).toThrow(
      'Please confirm your password'
    )
  })
})

// ============================================
// LOGIN SCHEMA
// ============================================

describe('loginSchema', () => {
  it('should accept valid login credentials', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
    }

    expect(() => loginSchema.parse(validData)).not.toThrow()
  })

  it('should reject invalid email', () => {
    const invalidData = {
      email: 'invalid-email',
      password: 'password123',
    }

    expect(() => loginSchema.parse(invalidData)).toThrow()
  })

  it('should reject short password', () => {
    const invalidData = {
      email: 'test@example.com',
      password: 'short',
    }

    expect(() => loginSchema.parse(invalidData)).toThrow()
  })

  it('should reject missing fields', () => {
    expect(() => loginSchema.parse({})).toThrow()
    expect(() => loginSchema.parse({ email: 'test@example.com' })).toThrow()
    expect(() => loginSchema.parse({ password: 'password123' })).toThrow()
  })
})

// ============================================
// REGISTER SCHEMA
// ============================================

describe('registerSchema', () => {
  it('should accept valid registration data', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    }

    expect(() => registerSchema.parse(validData)).not.toThrow()
  })

  it('should reject when passwords do not match', () => {
    const invalidData = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'different123',
    }

    expect(() => registerSchema.parse(invalidData)).toThrow("Passwords don't match")
  })

  it('should reject invalid email', () => {
    const invalidData = {
      email: 'invalid-email',
      password: 'password123',
      confirmPassword: 'password123',
    }

    expect(() => registerSchema.parse(invalidData)).toThrow()
  })

  it('should reject short password', () => {
    const invalidData = {
      email: 'test@example.com',
      password: 'short',
      confirmPassword: 'short',
    }

    expect(() => registerSchema.parse(invalidData)).toThrow()
  })

  it('should reject missing fields', () => {
    expect(() => registerSchema.parse({})).toThrow()
    expect(() =>
      registerSchema.parse({
        email: 'test@example.com',
        password: 'password123'
      })
    ).toThrow()
  })
})

// ============================================
// FORGOT PASSWORD SCHEMA
// ============================================

describe('forgotPasswordSchema', () => {
  it('should accept valid email', () => {
    const validData = { email: 'test@example.com' }
    expect(() => forgotPasswordSchema.parse(validData)).not.toThrow()
  })

  it('should reject invalid email', () => {
    const invalidData = { email: 'invalid-email' }
    expect(() => forgotPasswordSchema.parse(invalidData)).toThrow()
  })

  it('should reject empty email', () => {
    const invalidData = { email: '' }
    expect(() => forgotPasswordSchema.parse(invalidData)).toThrow()
  })
})

// ============================================
// RESET PASSWORD SCHEMA
// ============================================

describe('resetPasswordSchema', () => {
  it('should accept valid reset password data', () => {
    const validData = {
      password: 'newpassword123',
      confirmPassword: 'newpassword123',
      token: 'valid-reset-token',
    }

    expect(() => resetPasswordSchema.parse(validData)).not.toThrow()
  })

  it('should reject when passwords do not match', () => {
    const invalidData = {
      password: 'newpassword123',
      confirmPassword: 'different123',
      token: 'valid-reset-token',
    }

    expect(() => resetPasswordSchema.parse(invalidData)).toThrow("Passwords don't match")
  })

  it('should reject missing token', () => {
    const invalidData = {
      password: 'newpassword123',
      confirmPassword: 'newpassword123',
      token: '',
    }

    expect(() => resetPasswordSchema.parse(invalidData)).toThrow('Reset token is required')
  })

  it('should reject short password', () => {
    const invalidData = {
      password: 'short',
      confirmPassword: 'short',
      token: 'valid-reset-token',
    }

    expect(() => resetPasswordSchema.parse(invalidData)).toThrow()
  })
})

// ============================================
// CHANGE PASSWORD SCHEMA
// ============================================

describe('changePasswordSchema', () => {
  it('should accept valid change password data', () => {
    const validData = {
      currentPassword: 'oldpassword123',
      newPassword: 'newpassword123',
      confirmNewPassword: 'newpassword123',
    }

    expect(() => changePasswordSchema.parse(validData)).not.toThrow()
  })

  it('should reject when new passwords do not match', () => {
    const invalidData = {
      currentPassword: 'oldpassword123',
      newPassword: 'newpassword123',
      confirmNewPassword: 'different123',
    }

    expect(() => changePasswordSchema.parse(invalidData)).toThrow("Passwords don't match")
  })

  it('should reject when new password is same as current password', () => {
    const invalidData = {
      currentPassword: 'samepassword123',
      newPassword: 'samepassword123',
      confirmNewPassword: 'samepassword123',
    }

    expect(() => changePasswordSchema.parse(invalidData)).toThrow(
      'New password must be different from current password'
    )
  })

  it('should reject empty current password', () => {
    const invalidData = {
      currentPassword: '',
      newPassword: 'newpassword123',
      confirmNewPassword: 'newpassword123',
    }

    expect(() => changePasswordSchema.parse(invalidData)).toThrow(
      'Please enter your current password'
    )
  })

  it('should reject short new password', () => {
    const invalidData = {
      currentPassword: 'oldpassword123',
      newPassword: 'short',
      confirmNewPassword: 'short',
    }

    expect(() => changePasswordSchema.parse(invalidData)).toThrow()
  })
})

// ============================================
// OAUTH CALLBACK SCHEMA
// ============================================

describe('oauthCallbackSchema', () => {
  it('should accept valid callback parameters', () => {
    const validData = {
      code: 'auth-code-123',
      state: 'state-token',
      session_state: 'session-123',
    }

    expect(() => oauthCallbackSchema.parse(validData)).not.toThrow()
  })

  it('should accept error parameters', () => {
    const validData = {
      error: 'access_denied',
      error_description: 'User denied access',
    }

    expect(() => oauthCallbackSchema.parse(validData)).not.toThrow()
  })

  it('should accept empty object (all fields are optional)', () => {
    expect(() => oauthCallbackSchema.parse({})).not.toThrow()
  })

  it('should accept partial data', () => {
    expect(() => oauthCallbackSchema.parse({ code: 'auth-code' })).not.toThrow()
    expect(() => oauthCallbackSchema.parse({ state: 'state-token' })).not.toThrow()
  })
})

// ============================================
// HELPER FUNCTIONS
// ============================================

describe('isValidEmail', () => {
  it('should return true for valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@example.com')).toBe(true)
    expect(isValidEmail('user+tag@example.co.uk')).toBe(true)
  })

  it('should return false for invalid emails', () => {
    expect(isValidEmail('invalid-email')).toBe(false)
    expect(isValidEmail('missing@domain')).toBe(false)
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('@example.com')).toBe(false)
  })
})

describe('isValidPassword', () => {
  it('should return true for valid passwords (8+ characters)', () => {
    expect(isValidPassword('password123')).toBe(true)
    expect(isValidPassword('MyP@ssw0rd')).toBe(true)
    expect(isValidPassword('abcdefgh')).toBe(true)
  })

  it('should return false for invalid passwords', () => {
    expect(isValidPassword('short')).toBe(false)
    expect(isValidPassword('1234567')).toBe(false)
    expect(isValidPassword('')).toBe(false)
  })
})

describe('getPasswordStrength', () => {
  it('should return 0 for empty password', () => {
    expect(getPasswordStrength('')).toBe(0)
  })

  it('should return 1 for password with only length >= 8', () => {
    expect(getPasswordStrength('abcdefgh')).toBe(1)
  })

  it('should return 2 for password with length >= 8 and mixed case', () => {
    expect(getPasswordStrength('Abcdefgh')).toBe(2)
  })

  it('should return 3 for password with length >= 8, mixed case, and numbers', () => {
    expect(getPasswordStrength('Abcdef123')).toBe(3)
  })

  it('should return 4 for strong password (length >= 12, mixed case, numbers, special chars)', () => {
    expect(getPasswordStrength('Abcd1234!@#$')).toBe(4)
  })

  it('should not exceed maximum strength of 4', () => {
    expect(getPasswordStrength('VeryStr0ng!P@ssw0rd#123')).toBe(4)
  })

  it('should handle various password combinations', () => {
    expect(getPasswordStrength('password')).toBe(1) // Only length
    expect(getPasswordStrength('Password')).toBe(2) // Length + mixed case
    expect(getPasswordStrength('Pass1234')).toBe(3) // Length + mixed case + numbers
    expect(getPasswordStrength('Pass123!')).toBe(4) // All criteria
  })
})

describe('getPasswordStrengthLabel', () => {
  it('should return correct labels for each strength level', () => {
    expect(getPasswordStrengthLabel(0)).toBe('Very Weak')
    expect(getPasswordStrengthLabel(1)).toBe('Weak')
    expect(getPasswordStrengthLabel(2)).toBe('Fair')
    expect(getPasswordStrengthLabel(3)).toBe('Good')
    expect(getPasswordStrengthLabel(4)).toBe('Strong')
  })

  it('should return "Very Weak" for invalid strength values', () => {
    expect(getPasswordStrengthLabel(-1)).toBe('Very Weak')
    expect(getPasswordStrengthLabel(5)).toBe('Very Weak')
    expect(getPasswordStrengthLabel(100)).toBe('Very Weak')
  })
})
