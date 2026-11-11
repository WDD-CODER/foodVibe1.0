import { DECLINE_REASONS, REQUEST_CHANNELS, REQUEST_KINDS, REQUEST_STATUSES, REQUEST_VIA } from '@schemas/entities'
import type {
  DeclineReason,
  FrontDeskRequest,
  ManualRequestInput,
  RequestChannel,
  RequestKind,
  RequestStatus
} from '@schemas/entities'

/** Plan 549: a customer request. Mirror of shared/schemas/entities/request.schema.ts (`FrontDeskRequest`, not `Request`: that is the Fetch global). */
export { DECLINE_REASONS, REQUEST_CHANNELS, REQUEST_KINDS, REQUEST_STATUSES, REQUEST_VIA }
export type { DeclineReason, FrontDeskRequest, ManualRequestInput, RequestChannel, RequestKind, RequestStatus }
