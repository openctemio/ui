# Common Patterns & Templates

> Reusable code patterns for common scenarios in the project.

## 📋 Table of Contents

1. [CRUD Pattern](#crud-pattern)
2. [Server Component Pattern](#server-component-pattern)
3. [Client Component Pattern](#client-component-pattern)
4. [Form Pattern](#form-pattern)
5. [Dialog Pattern](#dialog-pattern)
6. [Server Action Pattern](#server-action-pattern)
7. [Layout Pattern](#layout-pattern)
8. [Error Handling Pattern](#error-handling-pattern)
9. [Loading State Pattern](#loading-state-pattern)
10. [API Route Pattern](#api-route-pattern)
11. [Asset API Pattern](#asset-api-pattern)
12. [Permission-Gated SWR Hook Pattern](#permission-gated-hook-pattern)
13. [Permission Guard Component Pattern](#permission-guard-pattern)

---

## 🔄 CRUD Pattern {#crud-pattern}

Complete CRUD implementation for a feature.

### 1. Types & Schema

```tsx
// features/users/types/user.types.ts
export interface User {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export type CreateUserInput = Omit<User, "id" | "createdAt" | "updatedAt">
export type UpdateUserInput = Partial<CreateUserInput>
```

```tsx
// features/users/schemas/user.schema.ts
import { z } from "zod"

export const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
})

export type UserFormData = z.infer<typeof userSchema>
```

### 2. Server Actions

```tsx
// features/users/actions/user-actions.ts
"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { userSchema } from "../schemas/user.schema"

export async function createUser(formData: FormData) {
  const validated = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  })

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    }
  }

  try {
    const user = await db.user.create({
      data: validated.data,
    })

    revalidatePath("/users")
    return { success: true, data: user }
  } catch (error) {
    console.error("Failed to create user:", error)
    return { success: false, error: "Failed to create user" }
  }
}

export async function updateUser(id: string, formData: FormData) {
  const validated = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  })

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    }
  }

  try {
    const user = await db.user.update({
      where: { id },
      data: validated.data,
    })

    revalidatePath("/users")
    revalidatePath(`/users/${id}`)
    return { success: true, data: user }
  } catch (error) {
    return { success: false, error: "Failed to update user" }
  }
}

export async function deleteUser(id: string) {
  try {
    await db.user.delete({
      where: { id },
    })

    revalidatePath("/users")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Failed to delete user" }
  }
}
```

### 3. Form Component

```tsx
// features/users/components/user-form.tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { createUser, updateUser } from "../actions/user-actions"
import { userSchema, type UserFormData } from "../schemas/user.schema"
import type { User } from "../types/user.types"

interface UserFormProps {
  user?: User
  onSuccess?: () => void
}

export function UserForm({ user, onSuccess }: UserFormProps) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: user
      ? {
          name: user.name,
          email: user.email,
        }
      : undefined,
  })

  const onSubmit = async (data: UserFormData) => {
    const formData = new FormData()
    formData.append("name", data.name)
    formData.append("email", data.email)

    const result = user
      ? await updateUser(user.id, formData)
      : await createUser(formData)

    if (result.success) {
      toast({
        title: "Success",
        description: `User ${user ? "updated" : "created"} successfully`,
      })
      onSuccess?.()
      router.refresh()
    } else {
      toast({
        title: "Error",
        description: result.error || "Something went wrong",
        variant: "destructive",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="John Doe"
          disabled={isSubmitting}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          placeholder="john@example.com"
          disabled={isSubmitting}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting
          ? "Saving..."
          : user
          ? "Update User"
          : "Create User"}
      </Button>
    </form>
  )
}
```

### 4. List Page

```tsx
// app/(dashboard)/users/page.tsx
import { db } from "@/lib/db"
import { UserList } from "@/features/users/components/user-list"
import { CreateUserDialog } from "@/features/users/components/create-user-dialog"

export const metadata = {
  title: "Users",
  description: "Manage your users",
}

async function getUsers() {
  return await db.user.findMany({
    orderBy: { createdAt: "desc" },
  })
}

export default async function UsersPage() {
  const users = await getUsers()

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        <CreateUserDialog />
      </div>
      <UserList users={users} />
    </div>
  )
}
```

---

## 🖥️ Server Component Pattern {#server-component-pattern}

```tsx
// app/(dashboard)/dashboard/page.tsx
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { DashboardStats } from "@/features/analytics/components/dashboard-stats"

// This runs on the server
async function getData(userId: string) {
  const [stats, recentActivity] = await Promise.all([
    db.stats.findUnique({ where: { userId } }),
    db.activity.findMany({
      where: { userId },
      take: 10,
      orderBy: { createdAt: "desc" },
    }),
  ])

  return { stats, recentActivity }
}

export default async function DashboardPage() {
  const session = await getServerSession()

  if (!session) {
    redirect("/login")
  }

  const { stats, recentActivity } = await getData(session.user.id)

  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <DashboardStats stats={stats} />
      <RecentActivity activity={recentActivity} />
    </div>
  )
}
```

---

## 💻 Client Component Pattern {#client-component-pattern}

```tsx
// features/users/components/user-list.tsx
"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { UserCard } from "./user-card"
import type { User } from "../types/user.types"

interface UserListProps {
  users: User[]
}

export function UserList({ users }: UserListProps) {
  const [search, setSearch] = useState("")

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {filteredUsers.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No users found
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## 📝 Form Pattern {#form-pattern}

### Simple Form with Server Action

```tsx
// features/contact/components/contact-form.tsx
"use client"

import { useFormState, useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { sendMessage } from "../actions/contact-actions"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Sending..." : "Send Message"}
    </Button>
  )
}

export function ContactForm() {
  const [state, formAction] = useFormState(sendMessage, null)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Input name="name" placeholder="Your name" required />
      </div>
      <div>
        <Input name="email" type="email" placeholder="Your email" required />
      </div>
      <div>
        <Textarea name="message" placeholder="Your message" required />
      </div>
      
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600">Message sent successfully!</p>
      )}
      
      <SubmitButton />
    </form>
  )
}
```

---

## 🎭 Dialog Pattern {#dialog-pattern}

```tsx
// features/users/components/create-user-dialog.tsx
"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { UserForm } from "./user-form"

export function CreateUserDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create User</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to your organization.
          </DialogDescription>
        </DialogHeader>
        <UserForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
```

### Delete Confirmation Dialog

```tsx
// features/users/components/delete-user-dialog.tsx
"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { deleteUser } from "../actions/user-actions"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface DeleteUserDialogProps {
  userId: string
  userName: string
}

export function DeleteUserDialog({ userId, userName }: DeleteUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteUser(userId)

    if (result.success) {
      toast({
        title: "User deleted",
        description: `${userName} has been deleted successfully`,
      })
      setOpen(false)
      router.refresh()
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }

    setIsDeleting(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{" "}
            <span className="font-semibold">{userName}</span> and remove their
            data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

## ⚡ Server Action Pattern {#server-action-pattern}

```tsx
// features/posts/actions/post-actions.ts
"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/features/auth/lib/session"

export async function createPost(formData: FormData) {
  // 1. Authentication
  const session = await getSession()
  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  // 2. Validation
  const title = formData.get("title") as string
  const content = formData.get("content") as string

  if (!title || !content) {
    return { success: false, error: "Title and content are required" }
  }

  // 3. Authorization (if needed)
  const canCreate = await checkPermission(session.user.id, "create:posts")
  if (!canCreate) {
    return { success: false, error: "Forbidden" }
  }

  // 4. Business logic
  try {
    const post = await db.post.create({
      data: {
        title,
        content,
        authorId: session.user.id,
      },
    })

    // 5. Cache revalidation
    revalidatePath("/posts")
    revalidateTag("posts")

    // 6. Return result
    return { success: true, data: post }
  } catch (error) {
    console.error("Failed to create post:", error)
    return { success: false, error: "Failed to create post" }
  }
}

// Action with redirect
export async function createPostAndRedirect(formData: FormData) {
  const result = await createPost(formData)

  if (result.success) {
    redirect(`/posts/${result.data.id}`)
  }

  return result
}
```

---

## 🎨 Layout Pattern {#layout-pattern}

```tsx
// app/(dashboard)/layout.tsx
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layouts/sidebar"
import { SiteHeader } from "@/components/layouts/site-header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader user={session.user} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
```

---

## 🚨 Error Handling Pattern {#error-handling-pattern}

```tsx
// app/(dashboard)/users/error.tsx
"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function UsersError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Users page error:", error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Something went wrong!</h2>
        <p className="text-muted-foreground">{error.message}</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}
```

```tsx
// app/(dashboard)/users/[id]/not-found.tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function UserNotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">User Not Found</h2>
        <p className="text-muted-foreground">
          The user you're looking for doesn't exist.
        </p>
        <Button asChild>
          <Link href="/users">Back to Users</Link>
        </Button>
      </div>
    </div>
  )
}
```

---

## ⏳ Loading State Pattern {#loading-state-pattern}

```tsx
// app/(dashboard)/users/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function UsersLoading() {
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  )
}
```

### Streaming with Suspense

```tsx
// app/(dashboard)/dashboard/page.tsx
import { Suspense } from "react"
import { UserStats } from "@/features/analytics/components/user-stats"
import { RecentActivity } from "@/features/analytics/components/recent-activity"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <Suspense fallback={<Skeleton className="h-32" />}>
        <UserStats />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <RecentActivity />
      </Suspense>
    </div>
  )
}
```

---

## 🔌 API Route Pattern {#api-route-pattern}

```tsx
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { userSchema } from "@/features/users/schemas/user.schema"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const users = await db.user.findMany()
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validated = userSchema.parse(body)

    const user = await db.user.create({
      data: validated,
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}
```

```tsx
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await db.user.findUnique({
    where: { id: params.id },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json(user)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json()

  const user = await db.user.update({
    where: { id: params.id },
    data: body,
  })

  return NextResponse.json(user)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await db.user.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
```

---

## 🎯 Quick Reference

### When to use what:

- **Server Components**: Default for data fetching
- **Client Components**: Interactivity, hooks, browser APIs
- **Server Actions**: Form submissions, mutations
- **API Routes**: External integrations, webhooks
- **Streaming**: Long-running queries, better UX
- **Parallel Routes**: Multiple sections simultaneously

### File locations:

- Feature logic → `features/[name]/`
- Shared UI → `components/ui/`
- Pages → `app/(...)/`
- API → `app/api/`

---

---

## 🏢 Asset API Pattern {#asset-api-pattern}

Pattern for asset pages with real API integration using SWR.

### 1. Import Required Functions

```tsx
import {
  useAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  bulkDeleteAssets,
  type Asset,
  type AssetSearchFilters,
} from "@/features/assets";
```

### 2. Component Setup

```tsx
"use client";

export default function HostsPage() {
  // Fetch assets from API
  const { assets: hosts, isLoading, isError, error, mutate } = useAssets({
    types: ['host'],
  });

  // Local states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
```

### 3. CRUD Handlers

```tsx
  // Create
  const handleCreate = async () => {
    if (!formData.name) {
      toast.error("Name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createAsset({
        name: formData.name,
        type: "host",
        criticality: "medium",
        description: formData.description,
        scope: "internal",
        exposure: "private",
        tags: formData.tags.split(",").map(s => s.trim()).filter(Boolean),
      });
      await mutate();
      setFormData(emptyForm);
      setAddDialogOpen(false);
      toast.success("Asset created successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update
  const handleUpdate = async () => {
    if (!selectedAsset || !formData.name) {
      toast.error("Please fill required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAsset(selectedAsset.id, {
        name: formData.name,
        description: formData.description,
        tags: formData.tags.split(",").map(s => s.trim()).filter(Boolean),
      });
      await mutate();
      setSelectedAsset(null);
      toast.success("Asset updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!assetToDelete) return;

    setIsSubmitting(true);
    try {
      await deleteAsset(assetToDelete.id);
      await mutate();
      setDeleteDialogOpen(false);
      toast.success("Asset deleted successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    const selectedIds = table.getSelectedRowModel().rows.map(r => r.original.id);
    if (selectedIds.length === 0) return;

    setIsSubmitting(true);
    try {
      await bulkDeleteAssets(selectedIds);
      await mutate();
      setRowSelection({});
      toast.success(`Deleted ${selectedIds.length} assets`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setIsSubmitting(false);
    }
  };
```

### 4. Render with Loading States

```tsx
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{error?.message || "Failed to load"}</p>
        <Button onClick={() => mutate()}>Retry</Button>
      </div>
    );
  }

  return (
    <div>
      <DataTable
        data={hosts}
        columns={columns}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
      />
    </div>
  );
}
```

### Key Points

1. **Always call `mutate()` after mutations** to refresh data
2. **Use `isSubmitting` state** to disable buttons during operations
3. **Handle errors with try/catch** and show user-friendly messages
4. **Transform form data to API format** before sending

---

---

## 🔐 Permission-Gated SWR Hook Pattern {#permission-gated-hook-pattern}

Pattern for API hooks that check permissions before fetching.

### Basic Hook with Permission Check

```tsx
'use client'

import useSWR from 'swr'
import { get } from '@/lib/api/client'
import { useTenant } from '@/context/tenant-provider'
import { usePermissions, Permission } from '@/lib/permissions'

export function useAssets(filters?: AssetFilters) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssets = can(Permission.AssetsRead)

  // Only fetch if user has permission
  const shouldFetch = currentTenant && canReadAssets

  const { data, error, isLoading, mutate } = useSWR<AssetListResponse>(
    shouldFetch ? ['assets', currentTenant, filters] : null,  // null key = no fetch
    () => get<AssetListResponse>(endpoints.assets.list(filters)),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  )

  return {
    assets: data?.data || [],
    total: data?.total || 0,
    isLoading: shouldFetch ? isLoading : false,  // Not loading if no permission
    isError: !!error,
    error,
    mutate,
  }
}
```

### Hook with Multiple Permission Options (canAny)

```tsx
export function useStats(tenantId: string | null) {
  const { canAny } = usePermissions()
  // Allow if user has EITHER permission
  const canReadStats = canAny(Permission.FindingsRead, Permission.DashboardRead)

  const shouldFetch = tenantId && canReadStats

  const { data, error, isLoading } = useSWR<Stats>(
    shouldFetch ? ['stats', tenantId] : null,
    () => get<Stats>(endpoints.stats()),
    { revalidateOnFocus: false }
  )

  return {
    stats: data || emptyStats,
    isLoading: shouldFetch ? isLoading : false,
    error,
  }
}
```

### Key Points

1. **Check permission first**: Use `usePermissions()` hook to check permissions
2. **Conditional SWR key**: Pass `null` as key if no permission → prevents fetch
3. **Handle isLoading**: Return `false` for isLoading if no permission
4. **Empty defaults**: Return empty arrays/objects instead of undefined

---

## 🔒 Permission Guard Component Pattern {#permission-guard-pattern}

Pattern for conditionally showing/disabling UI based on permissions.

### Can Component with Disable Mode

```tsx
import { Can, Permission } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// Quick Actions with permission-gated buttons
function QuickActions() {
  return (
    <div className="grid gap-2">
      {/* Hide if no permission */}
      <Can permission={Permission.ScansWrite}>
        <Button asChild>
          <Link href="/scans/new">New Scan</Link>
        </Button>
      </Can>

      {/* Disable with tooltip if no permission - Links won't navigate */}
      <Can
        permission={Permission.ReportsCreate}
        mode="disable"
        disabledTooltip="You don't have permission to generate reports"
      >
        <Button asChild>
          <Link href="/reports/generate">Generate Report</Link>
        </Button>
      </Can>

      {/* Multiple permissions (any) */}
      <Can permission={[Permission.FindingsWrite, Permission.FindingsAssign]}>
        <Button>Manage Finding</Button>
      </Can>
    </div>
  )
}
```

### Conditional Rendering with usePermissions Hook

```tsx
import { usePermissions, Permission } from '@/lib/permissions'

function AssetActions({ asset }) {
  const { can, canAny } = usePermissions()

  return (
    <div>
      {/* Single permission check */}
      {can(Permission.AssetsWrite) && (
        <Button onClick={handleEdit}>Edit</Button>
      )}

      {/* Any of multiple permissions */}
      {canAny(Permission.AssetsDelete, Permission.AssetsManage) && (
        <Button variant="destructive" onClick={handleDelete}>
          Delete
        </Button>
      )}
    </div>
  )
}
```

### When to Use Each Approach

| Approach | Use When |
|----------|----------|
| `<Can>` with `mode="hide"` (default) | Navigation items, menu entries |
| `<Can>` with `mode="disable"` | Action buttons, forms - show user what they can't do |
| `usePermissions().can()` | Conditional logic, not just rendering |
| Multiple permissions array | User needs ANY of the listed permissions |

---

**See also:**
- [architecture.md](architecture.md) - Project structure
- [access-control.md](access-control.md) - Complete RBAC guide
- [troubleshooting.md](troubleshooting.md) - Common issues
- [ASSETS_API_INTEGRATION.md](../docs/ASSETS_API_INTEGRATION.md) - Complete asset API guide
