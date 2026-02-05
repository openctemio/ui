/**
 * Generate Cryptographically Secure Random Secret
 *
 * Usage:
 *   npm run generate-secret
 *   node scripts/generate-secret.js
 */

import { randomBytes } from 'crypto'

const DEFAULT_LENGTH = 32 // 32 bytes = 64 hex characters

function generateSecret(bytes: number = DEFAULT_LENGTH): string {
  return randomBytes(bytes).toString('hex')
}

function main() {
  const secret = generateSecret()

  console.log('\n🔐 Generated Cryptographically Secure Secret\n')
  console.log('━'.repeat(70))
  console.log(secret)
  console.log('━'.repeat(70))
  console.log(`\n✅ Length: ${secret.length} characters (${DEFAULT_LENGTH} bytes)`)
  console.log('\n📋 Copy this secret to your .env.local file:')
  console.log(`   CSRF_SECRET=${secret}`)
  console.log('\n⚠️  IMPORTANT:')
  console.log('   - Never commit this secret to git')
  console.log('   - Use a different secret for each environment')
  console.log('   - Rotate secrets regularly (every 90 days recommended)')
  console.log('   - Keep secrets in a secure vault in production\n')
}

// Run if called directly
if (require.main === module) {
  main()
}

export { generateSecret }
