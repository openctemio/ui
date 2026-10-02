/**
 * Statuses the Findings list hides unless a status filter is set: pentest work
 * in progress that is not ready to be seen. Anything that links to the list
 * with a count (e.g. "View 12 findings") must leave these out of the count too,
 * or the number on the link will not match the list it opens.
 */
export const FINDINGS_LIST_HIDDEN_STATUSES = ['draft', 'in_review'] as const
