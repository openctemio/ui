# Coding Style Guide

## 🎨 Code Formatting Rules

### No Emoji in Code (Critical Rule)

**Rule**: Never use emoji characters in production code.

#### ❌ NEVER Use Emoji In:

1. **JSX/TSX Components**
```tsx
// ❌ WRONG
<Button>Save 💾</Button>
<h1>Hello World 👋</h1>
<p>Error ❌ occurred</p>

// ✅ CORRECT
<Button>Save</Button>
<h1>Hello World</h1>
<p>Error occurred</p>
```

2. **Variable/Function Names**
```tsx
// ❌ WRONG
const 📁fileName = "test.txt"
function 🔍searchUsers() {}

// ✅ CORRECT
const fileName = "test.txt"
function searchUsers() {}
```

3. **UI Text Content**
```tsx
// ❌ WRONG
const message = "Success! ✅"
const title = "Dashboard 📊"

// ✅ CORRECT
const message = "Success!"
const title = "Dashboard"
```

4. **Object Keys**
```tsx
// ❌ WRONG
const config = {
  "🏠 home": "/",
  "👤 profile": "/profile"
}

// ✅ CORRECT
const config = {
  home: "/",
  profile: "/profile"
}
```

5. **Class Names**
```tsx
// ❌ WRONG
<div className="✨special-effect">

// ✅ CORRECT
<div className="special-effect">
```

6. **Toast/Alert Messages**
```tsx
// ❌ WRONG
toast.success("User created! 🎉")
toast.error("Failed! ❌")

// ✅ CORRECT
toast.success("User created successfully")
toast.error("Failed to create user")
```

7. **Form Labels/Placeholders**
```tsx
// ❌ WRONG
<Label>Email 📧</Label>
<Input placeholder="Enter name 👤" />

// ✅ CORRECT
<Label>Email</Label>
<Input placeholder="Enter name" />
```

#### ✅ CORRECT Alternatives

**Use Icon Libraries Instead:**

```tsx
// ✅ lucide-react (recommended)
import { Save, Home, User, AlertCircle } from "lucide-react"

<Button>
  <Save className="mr-2 h-4 w-4" />
  Save
</Button>

// ✅ heroicons
import { HomeIcon } from "@heroicons/react/24/outline"

<HomeIcon className="h-6 w-6" />

// ✅ react-icons
import { FaSave } from "react-icons/fa"

<FaSave className="mr-2" />
```

**Use Unicode Symbols (Sparingly):**
```tsx
// ✅ OK for mathematical/technical symbols
const arrowRight = "→"
const checkmark = "✓"
const multiplication = "×"

// Use in text where appropriate
<p>Step 1 → Step 2 → Step 3</p>
```

#### ✅ When Emoji IS Allowed

**1. Markdown Documentation:**
```markdown
# 📚 Documentation
## 🚀 Quick Start
✅ This is allowed in .md files
```

**2. Commit Messages:**
```bash
git commit -m "✨ feat: add user profile"
git commit -m "🐛 fix: resolve login issue"
# OK - follows conventional commits with emoji
```

**3. Code Comments (Sparingly):**
```tsx
// ✅ Occasional use in comments is OK
// TODO: 🚨 Fix this before production
// NOTE: ⚠️ This is a critical section

// But prefer:
// TODO: CRITICAL - Fix this before production
// NOTE: WARNING - This is a critical section
```

**4. Development/Debug Only:**
```tsx
// ✅ OK in dev-only code (removed in production)
if (process.env.NODE_ENV === 'development') {
  console.log("🔍 Debug:", data)
}
```

---

## 📋 Other Style Rules

### Text Content

**Use Translation Keys:**
```tsx
// ❌ WRONG - Hardcoded text
<Button>Save Changes</Button>

// ✅ CORRECT - i18n translation
<Button>{dict.common.save}</Button>
```

**Be Descriptive:**
```tsx
// ❌ WRONG - Too short
<Button>OK</Button>

// ✅ CORRECT - Clear action
<Button>Confirm Changes</Button>
```

### Component Structure

**Order Elements Logically:**
```tsx
// ✅ CORRECT order
export function Component() {
  // 1. Hooks
  const [state, setState] = useState()
  const { data } = useQuery()
  
  // 2. Derived state
  const isLoading = !data
  
  // 3. Event handlers
  const handleClick = () => {}
  
  // 4. Effects
  useEffect(() => {}, [])
  
  // 5. Early returns
  if (isLoading) return <Skeleton />
  
  // 6. Main render
  return <div>...</div>
}
```

### Conditional Rendering

**Use Proper Patterns:**
```tsx
// ❌ AVOID - Inline ternary hell
{isLoading ? <Spinner /> : data ? <Content /> : error ? <Error /> : <Empty />}

// ✅ PREFER - Early returns or variables
if (isLoading) return <Spinner />
if (error) return <Error />
if (!data) return <Empty />
return <Content />
```

### Class Names

**Use cn() Utility:**
```tsx
import { cn } from "@/lib/utils"

// ✅ CORRECT
<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  variant === "primary" && "primary-styles",
  className
)}>
```

**Organize by Type:**
```tsx
// ✅ CORRECT order
<div className={cn(
  // Layout
  "flex items-center gap-4",
  // Spacing
  "p-4 m-2",
  // Typography
  "text-lg font-bold",
  // Colors
  "bg-white text-black",
  // States
  "hover:bg-gray-100",
  // Conditionals
  isActive && "border-blue-500",
  className
)}>
```

---

## 🎯 Why No Emoji?

### Problems with Emoji in Code:

1. **Encoding Issues**
   - Can break in some environments
   - Database encoding problems
   - Git diff issues

2. **Accessibility**
   - Screen readers don't read emoji well
   - Not all platforms render emoji same way
   - Can be confusing for users

3. **Professionalism**
   - Looks unprofessional in production
   - Hard to maintain
   - Not standard practice

4. **Searchability**
   - Hard to search for emoji in code
   - Can't grep for 🔍
   - IDE search issues

5. **Consistency**
   - Different rendering across platforms
   - Windows vs Mac vs Linux
   - Font differences

6. **i18n Issues**
   - Emoji meaning differs by culture
   - 👍 is offensive in some countries
   - Not translatable

### Better Alternatives:

```tsx
// ❌ Emoji
<Button>Download 📥</Button>

// ✅ Icon library
<Button><Download className="mr-2" />Download</Button>

// ✅ Text only (simple)
<Button>Download</Button>

// ✅ Text with unicode arrow
<Button>Download →</Button>
```

---

## ✅ Checklist

Before committing code, verify:

- [ ] No emoji in JSX/TSX
- [ ] No emoji in variable names
- [ ] No emoji in function names
- [ ] No emoji in UI text
- [ ] No emoji in class names
- [ ] Using icon libraries instead
- [ ] Text is clear without emoji
- [ ] Accessible for all users

---

## 🔧 ESLint Rule (Optional)

Add to `.eslintrc.json`:

```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "Literal[value=/[\\u{1F300}-\\u{1F9FF}]/u]",
        "message": "No emoji allowed in code. Use icon libraries instead."
      }
    ]
  }
}
```

---

## 📚 Icon Libraries We Use

**Primary: lucide-react**
- Clean, consistent design
- Tree-shakeable
- TypeScript support
- [Docs](https://lucide.dev)

**Installation:**
```bash
npm install lucide-react
```

**Usage:**
```tsx
import { Save, User, Home, Settings } from "lucide-react"

<Button>
  <Save className="mr-2 h-4 w-4" />
  Save Changes
</Button>
```

**Available Icons:**
- 1000+ icons
- Consistent 24x24 grid
- Customizable size, color, stroke

---

## 🎓 Examples

### Good vs Bad

**Bad - Emoji everywhere:**
```tsx
export function UserProfile() {
  return (
    <div>
      <h1>Profile 👤</h1>
      <Button>Edit ✏️</Button>
      <Button>Delete 🗑️</Button>
      <p>Status: Active ✅</p>
    </div>
  )
}
```

**Good - Clean with icons:**
```tsx
import { User, Edit, Trash, CheckCircle } from "lucide-react"

export function UserProfile() {
  return (
    <div>
      <h1 className="flex items-center gap-2">
        <User className="h-6 w-6" />
        Profile
      </h1>
      <Button>
        <Edit className="mr-2 h-4 w-4" />
        Edit
      </Button>
      <Button variant="destructive">
        <Trash className="mr-2 h-4 w-4" />
        Delete
      </Button>
      <p className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-500" />
        Status: Active
      </p>
    </div>
  )
}
```

---

**Remember**: Clean, professional code without emoji! 🎯

(Yes, emoji in docs is OK 😊)