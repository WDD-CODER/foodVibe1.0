---
name: Global user message queue behavior
overview: Fix unprofessional behavior when the user triggers many actions quickly by handling success and error messages in one place (UserMsgService). Success messages are coalesced so rapid actions don't create a long delaying queue; error messages always appear as they happen so the user understands what caused each error.
---

# Global user message queue behavior

## Problem

Today every call to `onSetSuccessMsg` / `onSetErrorMsg` pushes a message into a single queue in [UserMsgService](src/app/core/services/user-msg.service.ts). The queue is processed with `concatMap`: each message is shown for 2s then the next. When the user does several actions quickly (e.g. bulk delete, multiple saves, rapid clicks), many success messages queue up and display one after the other, which feels unprofessional and dysfunctional.

At the same time, **errors must appear as they happen** so the user always understands what caused each one. So we need one logic that works for all user messages, from any part of the app:

- **Success**: Avoid a long delaying queue when many successes happen quickly.
- **Error**: Always show each error when it occurs; never coalesce or hide so the user sees what caused it.

## Desired behavior (single place, all callers)

| Scenario | Desired behavior |
|----------|------------------|
| Rapid success messages (any source) | Do not queue multiple success toasts. Replace the current success and reset the display timer so at most one success is visible and it doesn't stretch into a long sequence. |
| Success while an error is showing | Enqueue success; let the current error finish, then show next in queue. User sees errors first. |
| Error while a success is showing | **Interrupt**: show the error immediately so the user sees what caused it. Success is replaced. |
| Multiple errors in quick succession | Show each error in order (queue errors). No coalescing so the user sees every cause. |
| Warning | Same coalesce rule as success (replace + reset when current is warning) so UI doesn't pile up. |

So the fix is entirely in **UserMsgService**. No need to change KitchenStateService, list components, or other call sites for message count—the service handles behavior globally.

## Approach

Refactor [UserMsgService](src/app/core/services/user-msg.service.ts) from a single `concatMap` pipeline to **explicit state**:

- **State**: current message (what's on screen), a **pending queue** (messages waiting to show), and a **timer** for auto-hiding.
- **Success** (and warning): If current is already success (or warning), **replace** current with the new message and **reset the timer**; do not enqueue. If current is error or null, show immediately or enqueue.
- **Error**: Always show. If current is success or warning, **interrupt**: set current to this error and reset timer. If current is already an error, **enqueue** this error. If current is null, show and start timer.
- When the timer fires: clear current; if the pending queue has items, show the next and start timer again; otherwise leave screen empty.
- Optional: show errors longer (e.g. 4s); success/warning stay at 2s.

## Implementation

- Replace `_msgQueue$` + `concatMap` with state: `_msg_` signal, `_pending: Msg[]`, `_timerHandle: ReturnType<typeof setTimeout> | null`.
- On message arrival: apply rules above; use 2s for success/warning, 4s for error.
- **CloseMsg()**: clear timer, set `_msg_` to null (leave pending so next message can show when timer would have fired, or clear pending—plan says optionally clear; we'll clear only current for consistency with "dismiss").
- Keep same public API: `onSetSuccessMsg`, `onSetSuccessMsgWithUndo`, `onSetErrorMsg`, `onSetWarningMsg`, `CloseMsg`, `msg_` read-only signal.
- Add **user-msg.service.spec.ts**: test success coalesce (multiple successes → one visible, last text); error interrupts success; multiple errors shown in order.

## Files to touch

- [src/app/core/services/user-msg.service.ts](src/app/core/services/user-msg.service.ts)
- **src/app/core/services/user-msg.service.spec.ts** (new)
