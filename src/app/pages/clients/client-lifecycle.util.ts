import type { Client, ClientLifecycle } from '@models/client.model'

/** Plan 547: a client first seen within this many days is `new`. */
export const LIFECYCLE_NEW_DAYS = 30
/** Plan 547: no contact for more than this many days makes a client `dormant`. */
export const LIFECYCLE_DORMANT_DAYS = 180

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Works the lifecycle out in the browser (the stored `lifecycle` field is not read).
 * `new` = firstSeenAt within 30 days; `dormant` = lastContactAt (or firstSeenAt when none) older than 180 days
 * everything else, including a client with no dates at all, is `active`.
 */
export function clientLifecycle(client: Pick<Client, 'firstSeenAt' | 'lastContactAt'>, now: number): ClientLifecycle {
  const { firstSeenAt, lastContactAt } = client
  if (firstSeenAt != null && now - firstSeenAt <= LIFECYCLE_NEW_DAYS * DAY_MS) return 'new'
  const last = lastContactAt ?? firstSeenAt
  if (last != null && now - last > LIFECYCLE_DORMANT_DAYS * DAY_MS) return 'dormant'
  return 'active'
}
