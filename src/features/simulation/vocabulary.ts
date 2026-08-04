/**
 * The control-test result vocabulary, in one place so the form and the tests
 * cannot drift from what the API accepts.
 *
 * This mirrors `src/features/controls/vocabulary.ts`, which exists for the same
 * reason: the compensating-controls form offered Preventive/Detective/
 * Corrective/Compensating while the database accepted segmentation/identity/
 * runtime/detection/other — zero overlap, and every create returned 500.
 *
 * Control tests fail more quietly than that. `control_tests` has no CHECK
 * constraint on `status`, so before api#417 the server stored whatever string
 * arrived. A near-miss like 'passed' persisted happily and then matched neither
 * `status === 'pass'` nor `'fail'` in this page's own summary — a control that
 * HAD been tested read as neither passed nor failed, with no error anywhere.
 */

/** Every status the backend understands — simulation.AllControlTestStatuses. */
export const CONTROL_TEST_STATUSES = [
  'untested',
  'pass',
  'fail',
  'partial',
  'not_applicable',
] as const

export type ControlTestStatus = (typeof CONTROL_TEST_STATUSES)[number]

/**
 * What the Record-result form offers.
 *
 * 'untested' is deliberately absent: it is the initial state, not an outcome
 * someone records. Offering it would let a user set a control back to untested
 * while stamping last_tested_at, which reads as "tested, result: not tested".
 */
export const CONTROL_TEST_RESULTS: ReadonlyArray<{
  value: Exclude<ControlTestStatus, 'untested'>
  label: string
}> = [
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'partial', label: 'Partial' },
  { value: 'not_applicable', label: 'Not applicable' },
]
