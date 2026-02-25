import 'server-only'

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'
import * as OTPAuth from 'otpauth'

const MFA_ISSUER = 'Cromwell Chase'

/**
 * Generate a new MFA secret for TOTP.
 * Returns the secret object for QR code generation and the base32 secret.
 */
export function generateMfaSecret(email: string) {
  const totp = new OTPAuth.TOTP({
    issuer: MFA_ISSUER,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  })

  return {
    secret: totp.secret.base32,
    otpauthUrl: totp.toString(),
  }
}

/**
 * Verify a TOTP code against a base32 secret.
 * Allows a 1-period window for clock skew.
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: MFA_ISSUER,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  })

  const delta = totp.validate({ token: code, window: 1 })
  return delta !== null
}

/**
 * Encrypt an MFA secret using AES-256-GCM.
 * Returns a string of format: iv:authTag:ciphertext (all hex-encoded).
 */
export function encryptSecret(plaintext: string): string {
  const key = getMfaEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')

  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

/**
 * Decrypt an MFA secret encrypted with encryptSecret.
 */
export function decryptSecret(encrypted: string): string {
  const key = getMfaEncryptionKey()
  const [ivHex, authTagHex, ciphertext] = encrypted.split(':')

  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivHex, 'hex')
  )
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Generate 10 recovery codes (8 chars each, alphanumeric).
 */
export function generateRecoveryCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < 10; i++) {
    const bytes = randomBytes(5)
    codes.push(bytes.toString('hex').slice(0, 8).toUpperCase())
  }
  return codes
}

/**
 * Hash a recovery code for storage (SHA-256).
 */
export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code.toUpperCase()).digest('hex')
}

function getMfaEncryptionKey(): Buffer {
  const keyHex = process.env.MFA_ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('MFA_ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars)')
  }
  return Buffer.from(keyHex, 'hex')
}
