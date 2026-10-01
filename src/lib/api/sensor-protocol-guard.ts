/**
 * Sensors talk to the API directly over sensor protocol v1 (RFC-023 §9.2),
 * authenticated by their API key. This origin's /api/v1 proxy authenticates
 * with the browser session instead and does not forward the sensor's
 * Authorization header, so a sensor whose API_URL pointed at the web UI got
 * "401 API key required" and reported its key as invalid.
 *
 * The proxy answers those routes itself with 421 Misdirected Request and a
 * message that says what to change.
 */

/** First path segment of the protocol v1 routes (frozen wire name). */
const PROTOCOL_V1_SEGMENT = 'agent'

/** HTTP status for a sensor request sent to the web UI. */
export const SENSOR_PROTOCOL_REFUSAL_STATUS = 421

/** Body of that answer, in the API's error shape. */
export const SENSOR_PROTOCOL_REFUSAL = {
  error: 'WRONG_ENDPOINT',
  code: 'WRONG_ENDPOINT',
  message:
    'This is the OpenCTEM web UI, not the API. Set the sensor API_URL to the API base URL ' +
    '(the address that serves /health from the API), not the web UI address.',
} as const

/** Reports whether the proxied path (segments after /api/v1/) is a sensor route. */
export function isSensorProtocolPath(path: readonly string[]): boolean {
  return path.length > 0 && path[0] === PROTOCOL_V1_SEGMENT
}
