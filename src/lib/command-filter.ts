/**
 * Filter for the command palette (cmdk `filter` prop).
 *
 * cmdk's default is a fuzzy subsequence score over the value plus keywords, so
 * with ~90 entries almost every short query matches dozens of them ("siem"
 * matched "Business Impact", "audit" ranked Preferences above Audit log). Here
 * every word of the query must occur in the entry, and entries rank by where:
 *
 *   1    the label starts with the query
 *   0.9  a word of the label starts with the first query word
 *   0.7  every query word is in the label
 *   0.4  matched only through keywords (group name, synonyms)
 *   0    no match (hidden)
 *
 * Case and accents are ignored, so Vietnamese labels match unaccented input.
 */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function commandFilter(value: string, search: string, keywords?: string[]): number {
  const words = fold(search).split(/\s+/).filter(Boolean)
  if (words.length === 0) return 1
  const label = fold(value)
  const hay = `${label} ${fold((keywords ?? []).join(' '))}`
  if (!words.every((w) => hay.includes(w))) return 0
  if (label.startsWith(words.join(' '))) return 1
  if (label.split(/[^a-z0-9]+/).some((t) => t.startsWith(words[0]))) return 0.9
  if (words.every((w) => label.includes(w))) return 0.7
  return 0.4
}
