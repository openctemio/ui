import { redirect } from 'next/navigation'

/**
 * The full asset list now lives at /assets (the default view). Old links and
 * bookmarks to /assets/all keep their filters.
 */
export default async function AllAssetsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value == null ? [] : [value])
      params.append(key, v)
  }
  const query = params.toString()
  redirect(query ? `/assets?${query}` : '/assets')
}
