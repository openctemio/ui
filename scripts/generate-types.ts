/**
 * Type Generator Helper
 *
 * Helps generate TypeScript interfaces from JSON responses
 *
 * Usage:
 * 1. Copy your backend JSON response
 * 2. Run: npx tsx scripts/generate-types.ts
 * 3. Paste JSON when prompted
 * 4. Get TypeScript interface
 *
 * Or use online: https://transform.tools/json-to-typescript
 */

// Sample JSON responses for reference
export const SAMPLE_RESPONSES = {
  user: {
    user_id: '123',
    full_name: 'John Doe',
    email_address: 'john@example.com',
    created_date: '2024-01-01T00:00:00Z',
    profile: {
      avatar_url: 'https://example.com/avatar.jpg',
      bio: 'Hello world',
    },
    permissions: ['read', 'write'],
  },

  product: {
    product_id: 'p123',
    name: 'Widget',
    price: {
      amount: 9999,
      currency: 'USD',
    },
    inventory: {
      in_stock: true,
      quantity: 42,
    },
    images: [
      { url: 'https://...', alt: 'Front view' },
    ],
    category: {
      id: 'c1',
      name: 'Electronics',
    },
  },

  post: {
    id: 'post-123',
    title: 'My Post',
    content: 'Lorem ipsum...',
    author: {
      id: 'user-1',
      name: 'John Doe',
    },
    published_at: '2024-01-01T00:00:00Z',
    status: 'published',
    tags: ['tech', 'tutorial'],
    meta: {
      views: 1234,
      likes: 56,
    },
  },
}

/**
 * Basic JSON to TypeScript converter
 * NOTE: This is a simple helper. For complex types, use online tools or manually create
 */
export function jsonToTypeScript(
  json: unknown,
  interfaceName: string = 'Generated'
): string {
  if (typeof json !== 'object' || json === null) {
    return `export type ${interfaceName} = ${typeof json}`
  }

  const lines: string[] = [`export interface ${interfaceName} {`]

  for (const [key, value] of Object.entries(json)) {
    const type = inferType(value)
    lines.push(`  ${key}: ${type}`)
  }

  lines.push('}')

  return lines.join('\n')
}

function inferType(value: unknown): string {
  if (value === null) {
    return 'null'
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'any[]'
    }
    const firstItem = value[0]
    if (typeof firstItem === 'object' && firstItem !== null) {
      return 'Array<{\n    ' + Object.keys(firstItem).map(k => `${k}: ${inferType(firstItem[k as keyof typeof firstItem])}`).join('\n    ') + '\n  }>'
    }
    return `${typeof firstItem}[]`
  }

  if (typeof value === 'object') {
    return '{\n    ' + Object.entries(value).map(([k, v]) => `${k}: ${inferType(v)}`).join('\n    ') + '\n  }'
  }

  return typeof value
}

/**
 * Example usage
 */
if (require.main === module) {
  console.log('=== TypeScript Type Generator ===\n')

  console.log('Sample User Type:')
  console.log(jsonToTypeScript(SAMPLE_RESPONSES.user, 'User'))

  console.log('\n\nSample Product Type:')
  console.log(jsonToTypeScript(SAMPLE_RESPONSES.product, 'Product'))

  console.log('\n\nSample Post Type:')
  console.log(jsonToTypeScript(SAMPLE_RESPONSES.post, 'Post'))

  console.log('\n\n=== Recommended Tools ===')
  console.log('For better type generation:')
  console.log('1. https://transform.tools/json-to-typescript')
  console.log('2. https://quicktype.io')
  console.log('3. VS Code extension: "Paste JSON as Code"')
  console.log('\n4. Or use Zod to infer types:')
  console.log('   const UserSchema = z.object({ ... })')
  console.log('   type User = z.infer<typeof UserSchema>')
}
