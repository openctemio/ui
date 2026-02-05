# Assets API Integration Guide

**Last Updated:** 2026-01-14
**Version:** 1.0.0

Complete guide for integrating with the Assets API in the frontend.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Hook Usage](#hook-usage)
- [CRUD Operations](#crud-operations)
- [Filtering & Pagination](#filtering--pagination)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Assets feature uses a centralized hook-based approach for API integration:

- **`useAssets` hook**: SWR-based data fetching with automatic caching
- **CRUD functions**: `createAsset`, `updateAsset`, `deleteAsset`, `bulkDeleteAssets`
- **Type-safe filters**: `AssetSearchFilters` interface
- **Backend format mapping**: Automatic transformation between frontend/backend formats

**Architecture:**
```
Page Component
     ↓
useAssets({ types: ['host'] })
     ↓
SWR Cache → GET /api/v1/assets?types=host
     ↓
Transform Backend Response → Frontend Asset[]
```

---

## Quick Start

### 1. Import Required Functions

```typescript
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

### 2. Use in Component

```typescript
"use client";

export default function HostsPage() {
  // Fetch assets by type
  const { assets, isLoading, isError, mutate } = useAssets({
    types: ['host'],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create handler
  const handleCreate = async (data: CreateAssetInput) => {
    setIsSubmitting(true);
    try {
      await createAsset(data);
      await mutate(); // Refresh data
      toast.success("Asset created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Loading />;
  if (isError) return <Error />;

  return <AssetList assets={assets} onCreate={handleCreate} />;
}
```

---

## Hook Usage

### useAssets Hook

```typescript
const {
  assets,      // Asset[] - transformed data
  total,       // number - total count
  page,        // number - current page
  pageSize,    // number - items per page
  totalPages,  // number - total pages
  isLoading,   // boolean - loading state
  isError,     // boolean - error state
  error,       // Error | undefined
  mutate,      // () => Promise<void> - refresh function
} = useAssets(filters?: AssetSearchFilters);
```

### Available Filters

```typescript
interface AssetSearchFilters {
  // Pagination
  page?: number;
  pageSize?: number;

  // Filter by type(s)
  types?: AssetType[];

  // Filter by properties
  criticalities?: Criticality[];
  statuses?: ('active' | 'inactive' | 'archived')[];
  scopes?: AssetScope[];
  exposures?: ExposureLevel[];
  tags?: string[];

  // Text search (name + description)
  search?: string;

  // Risk score range
  minRiskScore?: number;
  maxRiskScore?: number;

  // Has security findings
  hasFindings?: boolean;

  // Sorting (prefix with - for descending)
  sort?: string; // e.g., "-created_at", "name", "-risk_score"
}
```

### Examples

```typescript
// Fetch all hosts
const { assets } = useAssets({ types: ['host'] });

// Fetch multiple types
const { assets } = useAssets({ types: ['compute', 'storage', 'serverless'] });

// With pagination
const { assets, totalPages } = useAssets({
  types: ['domain'],
  page: 1,
  pageSize: 20,
});

// With filters
const { assets } = useAssets({
  types: ['website'],
  criticalities: ['high', 'critical'],
  statuses: ['active'],
  search: 'production',
  sort: '-risk_score',
});

// Filter by risk score
const { assets } = useAssets({
  minRiskScore: 70,
  hasFindings: true,
});
```

---

## CRUD Operations

### Create Asset

```typescript
import { createAsset, type CreateAssetInput } from "@/features/assets";

const handleCreate = async () => {
  setIsSubmitting(true);
  try {
    await createAsset({
      name: "prod-server-01",
      type: "host",
      criticality: "high",
      description: "Production web server",
      scope: "internal",
      exposure: "private",
      tags: ["production", "web"],
    });
    await mutate(); // Refresh list
    toast.success("Asset created successfully");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to create asset");
  } finally {
    setIsSubmitting(false);
  }
};
```

### Update Asset

```typescript
import { updateAsset, type UpdateAssetInput } from "@/features/assets";

const handleUpdate = async (assetId: string) => {
  setIsSubmitting(true);
  try {
    await updateAsset(assetId, {
      name: "prod-server-01-updated",
      description: "Updated description",
      criticality: "critical",
      tags: ["production", "web", "updated"],
    });
    await mutate(); // Refresh list
    toast.success("Asset updated successfully");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to update asset");
  } finally {
    setIsSubmitting(false);
  }
};
```

### Delete Asset

```typescript
import { deleteAsset } from "@/features/assets";

const handleDelete = async (assetId: string) => {
  setIsSubmitting(true);
  try {
    await deleteAsset(assetId);
    await mutate(); // Refresh list
    toast.success("Asset deleted successfully");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to delete asset");
  } finally {
    setIsSubmitting(false);
  }
};
```

### Bulk Delete

```typescript
import { bulkDeleteAssets } from "@/features/assets";

const handleBulkDelete = async () => {
  const selectedIds = table.getSelectedRowModel().rows.map(r => r.original.id);
  if (selectedIds.length === 0) return;

  setIsSubmitting(true);
  try {
    await bulkDeleteAssets(selectedIds);
    await mutate(); // Refresh list
    setRowSelection({}); // Clear selection
    toast.success(`Deleted ${selectedIds.length} assets`);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to delete assets");
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## Filtering & Pagination

### Client-side Filtering (for small datasets)

```typescript
const { assets } = useAssets({ types: ['host'] });

// Filter in component
const filteredData = useMemo(() => {
  let data = [...assets];

  if (statusFilter !== "all") {
    data = data.filter(d => d.status === statusFilter);
  }

  if (searchTerm) {
    data = data.filter(d =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  return data;
}, [assets, statusFilter, searchTerm]);
```

### Server-side Filtering (for large datasets)

```typescript
const [filters, setFilters] = useState<AssetSearchFilters>({
  types: ['host'],
  page: 1,
  pageSize: 20,
});

const { assets, totalPages, isLoading } = useAssets(filters);

// Update filters
const handleSearch = (term: string) => {
  setFilters(prev => ({ ...prev, search: term, page: 1 }));
};

const handlePageChange = (newPage: number) => {
  setFilters(prev => ({ ...prev, page: newPage }));
};

const handleStatusFilter = (status: string) => {
  setFilters(prev => ({
    ...prev,
    statuses: status === 'all' ? undefined : [status],
    page: 1,
  }));
};
```

### Sorting

```typescript
// Client-side with TanStack Table
const [sorting, setSorting] = useState<SortingState>([]);

const table = useReactTable({
  data: assets,
  columns,
  state: { sorting },
  onSortingChange: setSorting,
  getSortedRowModel: getSortedRowModel(),
});

// Server-side
const { assets } = useAssets({
  types: ['host'],
  sort: '-created_at', // Descending by created_at
});
```

---

## Error Handling

### Standard Pattern

```typescript
const handleOperation = async () => {
  setIsSubmitting(true);
  try {
    await apiCall();
    await mutate();
    toast.success("Success message");
  } catch (err) {
    // Type-safe error handling
    toast.error(err instanceof Error ? err.message : "Operation failed");
  } finally {
    setIsSubmitting(false);
  }
};
```

### With Loading States in UI

```typescript
<Button
  onClick={handleCreate}
  disabled={isSubmitting || isLoading}
>
  {isSubmitting ? "Creating..." : "Create Asset"}
</Button>
```

### Error Display

```typescript
if (isError) {
  return (
    <div className="text-center py-8">
      <p className="text-destructive">
        {fetchError?.message || "Failed to load assets"}
      </p>
      <Button onClick={() => mutate()}>Retry</Button>
    </div>
  );
}
```

---

## Best Practices

### 1. Always use `mutate()` after mutations

```typescript
// Good
await createAsset(data);
await mutate(); // Refresh data from server

// Bad - data will be stale
await createAsset(data);
// Missing mutate() call
```

### 2. Use loading states for better UX

```typescript
// Good
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
  setIsSubmitting(true);
  try {
    await createAsset(data);
  } finally {
    setIsSubmitting(false);
  }
};

<Button disabled={isSubmitting}>
  {isSubmitting ? "Saving..." : "Save"}
</Button>
```

### 3. Handle errors gracefully

```typescript
// Good - user-friendly error message
catch (err) {
  toast.error(err instanceof Error ? err.message : "Something went wrong");
}

// Bad - generic error
catch (err) {
  console.error(err);
}
```

### 4. Use appropriate filter scope

```typescript
// Good - filter by specific type
const { assets } = useAssets({ types: ['host'] });

// Bad - fetch all assets then filter client-side (inefficient for large datasets)
const { assets } = useAssets();
const hosts = assets.filter(a => a.type === 'host');
```

### 5. Separate concerns

```typescript
// Good - Form validation separate from API call
const handleSubmit = async () => {
  if (!formData.name) {
    toast.error("Name is required");
    return;
  }

  await createAsset(formData);
};

// Bad - Mixed validation and API logic
```

### 6. Use TypeScript properly

```typescript
// Good - type-safe
const { assets } = useAssets({ types: ['host'] });
assets.forEach((asset: Asset) => {
  console.log(asset.name); // Type-safe
});

// Bad - no types
const { assets } = useAssets({ types: ['host'] });
assets.forEach((asset: any) => { // Loses type safety
```

---

## Migration Guide

### From Mock Data to Real API

**Before (Mock Data):**
```typescript
import { getHosts } from "@/features/assets";

const [hosts, setHosts] = useState<Asset[]>(getHosts());

const handleAdd = () => {
  const newHost = { ...data, id: `host-${Date.now()}` };
  setHosts([newHost, ...hosts]);
};
```

**After (Real API):**
```typescript
import { useAssets, createAsset } from "@/features/assets";

const { assets: hosts, mutate } = useAssets({ types: ['host'] });
const [isSubmitting, setIsSubmitting] = useState(false);

const handleAdd = async () => {
  setIsSubmitting(true);
  try {
    await createAsset(data);
    await mutate();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed");
  } finally {
    setIsSubmitting(false);
  }
};
```

### Step-by-step Migration

1. **Update imports:**
   ```typescript
   // Remove
   import { getHosts } from "@/features/assets";

   // Add
   import { useAssets, createAsset, updateAsset, deleteAsset, bulkDeleteAssets } from "@/features/assets";
   ```

2. **Replace state with hook:**
   ```typescript
   // Remove
   const [hosts, setHosts] = useState<Asset[]>(getHosts());

   // Add
   const { assets: hosts, isLoading, isError, mutate } = useAssets({ types: ['host'] });
   const [isSubmitting, setIsSubmitting] = useState(false);
   ```

3. **Convert handlers to async:**
   ```typescript
   // Remove
   const handleAdd = () => {
     setHosts([newAsset, ...hosts]);
   };

   // Add
   const handleAdd = async () => {
     setIsSubmitting(true);
     try {
       await createAsset(data);
       await mutate();
     } catch (err) {
       toast.error(err instanceof Error ? err.message : "Failed");
     } finally {
       setIsSubmitting(false);
     }
   };
   ```

---

## Troubleshooting

### Data not refreshing after mutation

**Problem:** List doesn't update after create/update/delete

**Solution:** Ensure `mutate()` is called after the API operation:
```typescript
await createAsset(data);
await mutate(); // This triggers a refresh
```

### Type errors with filters

**Problem:** TypeScript errors when using filters

**Solution:** Use the correct types:
```typescript
import type { AssetSearchFilters, AssetType } from "@/features/assets";

const filters: AssetSearchFilters = {
  types: ['host'] as AssetType[], // Explicit type assertion if needed
};
```

### Empty data on first load

**Problem:** `assets` is empty array initially

**Solution:** This is expected behavior. Use `isLoading` to show loading state:
```typescript
if (isLoading) return <Skeleton />;
if (assets.length === 0) return <EmptyState />;
```

### Backend returns different format

**Problem:** Data structure mismatch

**Solution:** The hook automatically transforms backend format. Check `transformAsset` in `use-assets.ts`:
```typescript
// Backend: snake_case
{ risk_score: 75, finding_count: 3 }

// Frontend: camelCase (transformed automatically)
{ riskScore: 75, findingCount: 3 }
```

---

## API Reference

### Backend Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/assets` | List assets with filters |
| GET | `/api/v1/assets/{id}` | Get single asset |
| POST | `/api/v1/assets` | Create asset |
| PUT | `/api/v1/assets/{id}` | Update asset |
| DELETE | `/api/v1/assets/{id}` | Delete asset |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (1-based) |
| `per_page` | number | Items per page (max 100) |
| `types` | string | Comma-separated types |
| `criticalities` | string | Comma-separated criticalities |
| `statuses` | string | Comma-separated statuses |
| `scopes` | string | Comma-separated scopes |
| `exposures` | string | Comma-separated exposures |
| `tags` | string | Comma-separated tags |
| `search` | string | Search term (name + description) |
| `min_risk_score` | number | Minimum risk score |
| `max_risk_score` | number | Maximum risk score |
| `has_findings` | boolean | Filter by findings |
| `sort` | string | Sort field (prefix - for desc) |

### Response Format

```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "name": "asset-name",
      "asset_type": "host",
      "criticality": "high",
      "status": "active",
      "scope": "internal",
      "exposure": "private",
      "risk_score": 75,
      "finding_count": 3,
      "description": "...",
      "tags": ["tag1", "tag2"],
      "metadata": {},
      "first_seen": "2024-01-01T00:00:00Z",
      "last_seen": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "per_page": 20,
  "total_pages": 5
}
```

---

**See Also:**
- [API Integration Guide](./API_INTEGRATION.md)
- [Architecture Documentation](./ARCHITECTURE.md)
- [Patterns Guide](../.claude/patterns.md)

---

**Last Updated:** 2026-01-14
**Version:** 1.0.0
