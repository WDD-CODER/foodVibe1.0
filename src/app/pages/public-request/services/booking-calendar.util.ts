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
 * Plan 670: a plain local-time calendar entry (no reminder) for a booking, or `null` when the library reports an
 * error. The `ics` package is loaded on demand so the page's first bundle does not grow.
 */
export async function bookingIcs(input: BookingIcsInput): Promise<string | null> {
  try {
    const { createEvent } = await import('ics')
    const [year, month, day] = input.date.split('-').map(Number)
    const [hour, minute] = input.time.split(':').map(Number)
    const { error, value } = createEvent({
      start: [year, month, day, hour, minute],
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

/** Saves the calendar text as `booking.ics` through a temporary object URL. */
export function downloadIcs(text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'booking.ics'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
