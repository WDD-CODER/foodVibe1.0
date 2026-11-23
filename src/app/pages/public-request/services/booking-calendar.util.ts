export interface BookingIcsInput {
  title: string
  /** `YYYY-MM-DD` */
  date: string
  /** `HH:mm` */
  time: string
  minutes: number
  location?: string
}

/**
 * Plan 670: the calendar text (`.ics`) of one booking, a plain local-time event. The package loads on first use so the
 * page's first bundle does not grow. `null` when the library reports an error.
 */
export async function bookingIcs(input: BookingIcsInput): Promise<string | null> {
  const [y, m, d] = input.date.split('-').map(Number)
  const [h, min] = input.time.split(':').map(Number)
  if ([y, m, d, h, min].some((n) => !Number.isFinite(n))) return null
  try {
    const { createEvent } = await import('ics')
    const { error, value } = createEvent({
      start: [y, m, d, h, min],
      startInputType: 'local',
      startOutputType: 'local',
      duration: { minutes: input.minutes },
      title: input.title,
      ...(input.location && { location: input.location })
    })
    return error || !value ? null : value
  } catch {
    return null
  }
}

/** Saves the text as `booking.ics` through a temporary object URL. */
export function downloadIcs(text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'booking.ics'
  link.click()
  URL.revokeObjectURL(url)
}
