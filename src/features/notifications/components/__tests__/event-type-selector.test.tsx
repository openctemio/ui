import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventTypeSelector } from '../event-type-selector'
import type {
  NotificationEventTypeInfo,
  NotificationEventCategoryInfo,
} from '@/features/integrations/api/use-event-types'

/**
 * The event-type catalog is served by the API from `integration.AllEventTypes()`,
 * the registry the notification outbox routes on. It used to be duplicated as a
 * hand-written array in the UI, and the copies drifted: six event types the
 * backend routes had no checkbox, so no operator could switch them on.
 *
 * These tests exist to make that regression loud. Several of them deliberately
 * feed the component event types that appear NOWHERE in this repository — if
 * someone reintroduces a baked-in list, an allowlist or a lookup keyed off a
 * local constant, those types stop rendering and these tests go red.
 */

const cat = (category: string, label: string): NotificationEventCategoryInfo => ({
  category,
  label,
})

const et = (
  type: string,
  category: string,
  label: string,
  overrides: Partial<NotificationEventTypeInfo> = {}
): NotificationEventTypeInfo => ({
  type,
  category,
  label,
  description: `${label} description`,
  default_enabled: false,
  ...overrides,
})

describe('EventTypeSelector', () => {
  it('renders whatever the API returned, including types unknown to this codebase', () => {
    // None of these identifiers exist anywhere in the UI source. A baked-in
    // list could not possibly produce them.
    const eventTypes = [
      et('quantum_breach', 'speculative', 'Quantum Breach'),
      et('sentiment_drift', 'speculative', 'Sentiment Drift'),
    ]

    render(
      <EventTypeSelector
        eventTypes={eventTypes}
        categories={[cat('speculative', 'Speculative Events')]}
        value={[]}
        onChange={vi.fn()}
        idPrefix="test"
      />
    )

    expect(screen.getByLabelText('Quantum Breach')).toBeInTheDocument()
    expect(screen.getByLabelText('Sentiment Drift')).toBeInTheDocument()
    expect(screen.getByText('Speculative Events')).toBeInTheDocument()
    // Exactly what was passed — nothing merged in from a local default.
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  })

  it('offers the six event types that previously had no checkbox', () => {
    // The concrete regression: registered and routed server-side, undeliverable
    // in practice because the UI's copy of the list did not know about them.
    const previouslyMissing = [
      et('sla_breach', 'finding', 'SLA Breached'),
      et('finding_assigned', 'finding', 'Finding Assigned'),
      et('approval_requested', 'approval', 'Approval Requested'),
      et('approval_approved', 'approval', 'Approval Approved'),
      et('approval_rejected', 'approval', 'Approval Rejected'),
      et('workflow_notification', 'workflow', 'Workflow Notification'),
    ]

    render(
      <EventTypeSelector
        eventTypes={previouslyMissing}
        categories={[
          cat('finding', 'Finding Events'),
          cat('approval', 'Approval Events'),
          cat('workflow', 'Workflow Events'),
        ]}
        value={[]}
        onChange={vi.fn()}
        idPrefix="test"
      />
    )

    for (const info of previouslyMissing) {
      expect(screen.getByLabelText(info.label)).toBeInTheDocument()
    }
    // Approval and workflow had no entry in the old client-side category label
    // map, so their headings rendered as "undefined".
    expect(screen.getByText('Approval Events')).toBeInTheDocument()
    expect(screen.getByText('Workflow Events')).toBeInTheDocument()
  })

  it('submits the event type identifier, not the display label', async () => {
    // enabled_event_types is matched literally by the outbox whitelist. Sending
    // anything but `type` means the channel routes nothing.
    const onChange = vi.fn()
    render(
      <EventTypeSelector
        eventTypes={[et('sla_breach', 'finding', 'SLA Breached')]}
        categories={[cat('finding', 'Finding Events')]}
        value={[]}
        onChange={onChange}
        idPrefix="test"
      />
    )

    await userEvent.click(screen.getByLabelText('SLA Breached'))
    expect(onChange).toHaveBeenCalledWith(['sla_breach'])
  })

  it('removes an identifier when unchecked, leaving the rest intact', async () => {
    const onChange = vi.fn()
    render(
      <EventTypeSelector
        eventTypes={[
          et('sla_breach', 'finding', 'SLA Breached'),
          et('new_finding', 'finding', 'New Finding'),
        ]}
        categories={[cat('finding', 'Finding Events')]}
        value={['sla_breach', 'new_finding']}
        onChange={onChange}
        idPrefix="test"
      />
    )

    await userEvent.click(screen.getByLabelText('SLA Breached'))
    expect(onChange).toHaveBeenCalledWith(['new_finding'])
  })

  it('groups in the order the server gave, and omits categories with no types', () => {
    render(
      <EventTypeSelector
        eventTypes={[
          et('new_finding', 'finding', 'New Finding'),
          et('security_alert', 'system', 'Security Alert'),
        ]}
        categories={[
          cat('system', 'System Events'),
          // Present in the category list but nothing available under it: a
          // tenant without the scans module should not see an empty heading.
          cat('scan', 'Scan Events'),
          cat('finding', 'Finding Events'),
        ]}
        value={[]}
        onChange={vi.fn()}
        idPrefix="test"
      />
    )

    expect(screen.queryByText('Scan Events')).not.toBeInTheDocument()

    const headings = screen.getAllByText(/Events$/).map((el) => el.textContent)
    expect(headings).toEqual(['System Events', 'Finding Events'])
  })

  it('still renders an event type whose category has no label entry', () => {
    // The old failure mode dropped these silently. Falling back to the raw
    // category id keeps the checkbox reachable.
    render(
      <EventTypeSelector
        eventTypes={[et('mystery_event', 'uncatalogued', 'Mystery Event')]}
        categories={[]}
        value={[]}
        onChange={vi.fn()}
        idPrefix="test"
      />
    )

    expect(screen.getByLabelText('Mystery Event')).toBeInTheDocument()
  })

  it('shows placeholders while the catalog is in flight, not a blank list', () => {
    // A settings pane that renders nothing on a slow request reads as "this
    // channel has no event types", which is a different claim entirely.
    render(
      <EventTypeSelector
        eventTypes={[]}
        categories={[]}
        value={[]}
        onChange={vi.fn()}
        idPrefix="test"
        isLoading
      />
    )

    expect(screen.getByTestId('event-types-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('event-types-empty')).not.toBeInTheDocument()
  })

  it('keeps the existing selection visible and editable when the request fails', async () => {
    // Rendering an empty list on error invites the operator to save over their
    // own routing config.
    const onChange = vi.fn()
    render(
      <EventTypeSelector
        eventTypes={[]}
        categories={[]}
        value={['sla_breach', 'new_finding']}
        onChange={onChange}
        idPrefix="test"
        error={new Error('boom')}
      />
    )

    expect(screen.getByTestId('event-types-error')).toBeInTheDocument()
    expect(screen.getByLabelText('sla_breach')).toBeChecked()
    expect(screen.getByLabelText('new_finding')).toBeChecked()

    await userEvent.click(screen.getByLabelText('sla_breach'))
    expect(onChange).toHaveBeenCalledWith(['new_finding'])
  })

  it('says so explicitly when the tenant genuinely has no event types', () => {
    render(
      <EventTypeSelector
        eventTypes={[]}
        categories={[]}
        value={[]}
        onChange={vi.fn()}
        idPrefix="test"
      />
    )

    expect(screen.getByTestId('event-types-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('event-types-loading')).not.toBeInTheDocument()
  })
})
