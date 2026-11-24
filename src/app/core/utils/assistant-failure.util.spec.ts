import { assistantFailureKey, showAssistantFailure, toAssistantFailureReason } from './assistant-failure.util'

describe('assistant-failure.util', () => {
  it('maps reasons to keys', () => {
    expect(assistantFailureKey('busy', 'suggest')).toBe('ibx_sg_failed_busy')
    expect(assistantFailureKey('other', 'suggest')).toBe('ibx_sg_failed')
    expect(assistantFailureKey('quota', 'note')).toBe('ibx_ai_failed_quota')
    expect(assistantFailureKey('other', 'note')).toBe('ibx_ai_failed_other')
  })

  it('falls back to other for an unknown reason', () => {
    expect(toAssistantFailureReason('timeout')).toBe('timeout')
    expect(toAssistantFailureReason('x')).toBe('other')
    expect(toAssistantFailureReason(undefined)).toBe('other')
  })

  it('shows only while at >= lastMessageAt', () => {
    expect(showAssistantFailure({ lastMessageAt: 5 })).toBe(false)
    expect(showAssistantFailure({ lastMessageAt: 5, assistantFailed: { at: 5, reason: 'busy' } })).toBe(true)
    expect(showAssistantFailure({ lastMessageAt: 6, assistantFailed: { at: 5, reason: 'busy' } })).toBe(false)
  })
})
