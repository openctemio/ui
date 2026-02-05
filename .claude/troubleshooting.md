# Troubleshooting Guide

> Common issues and their solutions for Next.js 16 App Router projects.

## 📋 Table of Contents

1. [App Router Issues](#app-router-issues)
2. [Server Component Issues](#server-component-issues)
3. [Client Component Issues](#client-component-issues)
4. [Server Actions Issues](#server-actions-issues)
5. [Build & Deployment Issues](#build-deployment-issues)
6. [Performance Issues](#performance-issues)
7. [TypeScript Issues](#typescript-issues)

---

## 🚀 App Router Issues {#app-router-issues}

### Issue: "use client" not working

**Problem:**
```tsx
"use client"
export default function Component() {
  const [state, setState] = useState() // Error: useState is not defined
}
```

**Solution:**
```tsx
"use client"
import { useState } from "react" // ✅ Import React first

export default function Component() {
  const [state, setState] = useState()
}
```

---

### Issue: Metadata not showing

**Problem:**
```tsx
"use client"
export const metadata = { title: "Page" } // Ignored!
```

**Solution:**
Metadata only works in Server Components:
```tsx
// Remove "use client" or move to separate file
export const metadata = { title: "Page" }

export default function Page() {
  return <ClientComponent />
}
```

---

### Issue: Page not found (404)

**Problem:**
```
app/
├── users/
│   └── page.tsx    ← Not accessible
```

**Solution:**
File must be named exactly `page.tsx` (lowercase):
```
app/
├── users/
│   └── page.tsx    ✅ Works
```

---

### Issue: Layout not applying

**Problem:**
Route group layout not working.

**Solution:**
```
app/
├── (dashboard)/
│   ├── layout.tsx       ✅ Must have layout.tsx
│   └── users/
│       └── page.tsx
```

---

## 🖥️ Server Component Issues {#server-component-issues}

### Issue: Can't use hooks in Server Component

**Problem:**
```tsx
export default function Page() {
  const [state, setState] = useState() // Error!
  const router = useRouter() // Error!
}
```

**Solution:**
Either add "use client" or use Server Component alternatives:
```tsx
// Option 1: Make it Client Component
"use client"
export default function Page() {
  const [state, setState] = useState() // ✅
}

// Option 2: Use Server alternatives
import { redirect } from "next/navigation"

export default function Page() {
  redirect("/login") // ✅ Server-side redirect
}
```

---

### Issue: Promise returned instead of data

**Problem:**
```tsx
export default function Page() {
  const data = fetch('/api/data') // Returns Promise!
  return <div>{data}</div> // [object Promise]
}
```

**Solution:**
Add `async/await`:
```tsx
export default async function Page() {
  const res = await fetch('/api/data')
  const data = await res.json()
  return <div>{data}</div> // ✅
}
```

---

### Issue: Cannot read headers/cookies

**Problem:**
```tsx
import { headers } from "next/headers"

export default function Page() {
  const headersList = headers() // Error: headers is not a function
}
```

**Solution:**
Use async function:
```tsx
import { headers } from "next/headers"

export default async function Page() {
  const headersList = await headers() // ✅
}
```

---

## 💻 Client Component Issues {#client-component-issues}

### Issue: Hydration mismatch

**Problem:**
```
Error: Text content does not match server-rendered HTML
```

**Common causes:**
1. Using `window` or `localStorage` during render
2. Random values without seed
3. Date formatting differences

**Solution:**
```tsx
"use client"
import { useEffect, useState } from "react"

export function Component() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div>Loading...</div> // ✅ Consistent server & client
  }

  return <div>{window.location.href}</div> // ✅ Only renders client-side
}
```

Or use custom hook:
```tsx
// hooks/use-mounted.ts
import { useEffect, useState } from "react"

export function useMounted() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return mounted
}

// Usage
function Component() {
  const mounted = useMounted()
  
  if (!mounted) return null
  
  return <div>{window.location.href}</div>
}
```

---

### Issue: Event handlers not working

**Problem:**
```tsx
export default function Page() {
  const handleClick = () => console.log("clicked")
  return <button onClick={handleClick}>Click</button> // Not working
}
```

**Solution:**
Add "use client":
```tsx
"use client"
export default function Page() {
  const handleClick = () => console.log("clicked")
  return <button onClick={handleClick}>Click</button> // ✅
}
```

---

## ⚡ Server Actions Issues {#server-actions-issues}

### Issue: Server Action not revalidating

**Problem:**
```tsx
"use server"
export async function createUser(data) {
  await db.user.create({ data })
  // Page not updating!
}
```

**Solution:**
Call `revalidatePath`:
```tsx
"use server"
import { revalidatePath } from "next/cache"

export async function createUser(data) {
  await db.user.create({ data })
  revalidatePath("/users") // ✅
}
```

---

### Issue: Can't call Server Action from Client

**Problem:**
```tsx
"use client"
import { createUser } from "./actions" // Error: Server actions must be async

export function Form() {
  return <button onClick={createUser}>Submit</button>
}
```

**Solution:**
Wrap in async function:
```tsx
"use client"
import { createUser } from "./actions"

export function Form() {
  const handleClick = async () => {
    await createUser() // ✅
  }
  
  return <button onClick={handleClick}>Submit</button>
}
```

---

### Issue: FormData not working

**Problem:**
```tsx
"use server"
export async function action(formData: FormData) {
  const name = formData.get("name") // null
}
```

**Solution:**
Ensure form has proper name attributes:
```tsx
<form action={action}>
  <input name="name" /> {/* ✅ name attribute required */}
  <button type="submit">Submit</button>
</form>
```

---

## 🏗️ Build & Deployment Issues {#build-deployment-issues}

### Issue: Build fails with "Module not found"

**Problem:**
```
Error: Cannot find module '@/components/ui/button'
```

**Solution:**
Check `tsconfig.json` paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]  // ✅ Ensure this is set
    }
  }
}
```

---

### Issue: Static export error

**Problem:**
```
Error: Page /users/[id] couldn't be rendered statically
```

**Solution:**
Add `generateStaticParams`:
```tsx
export async function generateStaticParams() {
  const users = await db.user.findMany()
  return users.map((user) => ({ id: user.id }))
}
```

Or force dynamic:
```tsx
export const dynamic = 'force-dynamic'
```

---

### Issue: Environment variables not working

**Problem:**
```tsx
const API_KEY = process.env.API_KEY // undefined
```

**Solution:**
For client-side, use `NEXT_PUBLIC_` prefix:
```env
# .env.local
NEXT_PUBLIC_API_KEY=xxx  # ✅ Accessible in browser
API_SECRET=xxx           # ✅ Server-only
```

```tsx
// Client
const key = process.env.NEXT_PUBLIC_API_KEY

// Server
const secret = process.env.API_SECRET
```

---

## 🚀 Performance Issues {#performance-issues}

### Issue: Slow page loads

**Diagnosis:**
```bash
npm run build

# Check output:
# λ  (Server)  - Uses server-side rendering
# ○  (Static)  - Pre-rendered at build time
```

**Solutions:**

1. **Use Static Generation** when possible:
```tsx
// Force static
export const dynamic = 'force-static'

// Or use ISR
export const revalidate = 3600 // 1 hour
```

2. **Implement Streaming**:
```tsx
import { Suspense } from "react"

export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <SlowComponent />
    </Suspense>
  )
}
```

3. **Optimize Images**:
```tsx
import Image from "next/image"

<Image
  src="/hero.jpg"
  width={1200}
  height={600}
  priority  // For above-fold images
  alt="Hero"
/>
```

---

### Issue: Large bundle size

**Solution:**

1. **Use Dynamic Imports**:
```tsx
import dynamic from "next/dynamic"

const HeavyComponent = dynamic(() => import("./heavy-component"), {
  loading: () => <Skeleton />,
  ssr: false, // Skip SSR if not needed
})
```

2. **Check bundle size**:
```bash
npm run build

# Look for large modules
# Consider lazy loading or removing
```

---

## 📝 TypeScript Issues {#typescript-issues}

### Issue: Type errors in Server Actions

**Problem:**
```tsx
"use server"
export async function action(data: FormData) {
  // Type error on FormData
}
```

**Solution:**
Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "types": ["node"]
  }
}
```

---

### Issue: Import type errors

**Problem:**
```tsx
import { User } from "@/types/user" // Cannot find module
```

**Solution:**
Check file extension and paths:
```tsx
// Correct
import { User } from "@/types/user.types"
// Or
import type { User } from "@/types/user.types"
```

---

## 🔧 Debug Tips

### Enable Logging

```js
// next.config.js
module.exports = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}
```

### Check Rendering Type

```bash
npm run build

# Output:
# ○  (Static)   - Prerendered at build
# ƒ  (Dynamic)  - Server-rendered at runtime
# λ  (Server)   - Uses getServerSideProps
```

### Force Specific Rendering

```tsx
// Force dynamic
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Force static
export const dynamic = 'force-static'

// ISR
export const revalidate = 3600 // seconds
```

---

## 🎯 Common Patterns That Work

### Pattern 1: Hybrid Rendering
```tsx
// Server Component (default)
export default async function Page() {
  const data = await fetchData() // Server
  return <ClientList data={data} /> // Pass to client
}

// Client Component
"use client"
export function ClientList({ data }) {
  const [filtered, setFiltered] = useState(data)
  // Client interactivity
}
```

### Pattern 2: Progressive Enhancement
```tsx
<form action={serverAction}>
  <input name="email" />
  <SubmitButton />  {/* Works without JS */}
</form>
```

### Pattern 3: Optimistic Updates
```tsx
"use client"
import { useOptimistic } from "react"

export function Component({ data }) {
  const [optimisticData, addOptimistic] = useOptimistic(data)
  
  async function action(formData) {
    addOptimistic({ ...newData }) // Instant UI update
    await serverAction(formData)  // Then persist
  }
}
```

---

## 📞 Getting Help

1. **Check official docs**: [nextjs.org/docs](https://nextjs.org/docs)
2. **Search GitHub issues**: [github.com/vercel/next.js/issues](https://github.com/vercel/next.js/issues)
3. **Ask in Discord**: [nextjs.org/discord](https://nextjs.org/discord)

---

**See also:**
- [patterns.md](patterns.md) - Working code examples
- [architecture.md](architecture.md) - Project structure
