/**
 * Scan zones (RFC-023): tenant-owned address ranges and the sensors that may
 * scan them. Contract: openctemio/api docs/architecture/scan-zones.md.
 */
export { ScanZonesPanel } from './components/scan-zones-panel'
export { SensorZonesSection } from './components/sensor-zones-section'
export {
  ScanRoutingSection,
  ScanZonePicker,
  ZoneRoutingPreview,
} from './components/zone-routing-preview'
export { toZonePreviewRequest } from './lib/preview-request'
export { RunDispatchPanel } from './components/run-dispatch-panel'
export { scanZoneErrorCode, scanZoneErrorHint, triggerErrorHint } from './lib/errors'
