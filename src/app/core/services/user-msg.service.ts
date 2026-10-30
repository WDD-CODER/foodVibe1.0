import { DestroyRef, Injectable, signal } from '@angular/core'
import { Msg } from '../models/msg.model'

const SUCCESS_DURATION_MS = 2000
const ERROR_DURATION_MS = 4000
/** Plan 511: a line-removal undo toast stays long enough to change one's mind. */
const UNDO_DURATION_MS = 30000

@Injectable({
  providedIn: 'root'
})
export class UserMsgService {
  private _msg_ = signal<Msg | null>(null)
  public msg_ = this._msg_.asReadonly()

  private _pending: Msg[] = []
  private _timerHandle: ReturnType<typeof setTimeout> | null = null

  private _clearTimer(): void {
    if (this._timerHandle !== null) {
      clearTimeout(this._timerHandle)
      this._timerHandle = null
    }
  }

  private readonly _lineUndos = new WeakSet<() => void>()

  private _durationMs(msg: Msg): number {
    if (msg.undo && this._lineUndos.has(msg.undo)) return UNDO_DURATION_MS
    return msg.type === 'error' ? ERROR_DURATION_MS : SUCCESS_DURATION_MS
  }

  private _showNext(): void {
    this._msg_.set(null)
    if (this._pending.length > 0) {
      const next = this._pending.shift()!
      this._msg_.set(next)
      this._timerHandle = setTimeout(() => this._showNext(), this._durationMs(next))
    } else {
      this._timerHandle = null
    }
  }

  private _startTimer(durationMs: number): void {
    this._clearTimer()
    this._timerHandle = setTimeout(() => this._showNext(), durationMs)
  }

  private _setMsg(msg: Msg): void {
    const current = this._msg_()

    if (msg.type === 'success' || msg.type === 'warning') {
      if (current && (current.type === 'success' || current.type === 'warning')) {
        this._msg_.set(msg)
        this._startTimer(this._durationMs(msg))
        return
      }
      if (!current) {
        this._msg_.set(msg)
        this._startTimer(this._durationMs(msg))
        return
      }
      this._pending.push(msg)
      return
    }

    if (msg.type === 'error') {
      if (current && current.type !== 'error') {
        this._msg_.set(msg)
        this._startTimer(ERROR_DURATION_MS)
        return
      }
      if (current && current.type === 'error') {
        this._pending.push(msg)
        return
      }
      this._msg_.set(msg)
      this._startTimer(ERROR_DURATION_MS)
    }
  }

  CloseMsg(): void {
    this._clearTimer()
    this._msg_.set(null)
    if (this._pending.length > 0) {
      const next = this._pending.shift()!
      this._msg_.set(next)
      this._timerHandle = setTimeout(() => this._showNext(), this._durationMs(next))
    }
  }

  public onSetSuccessMsg(txt: string): void {
    this._setMsg({ txt, type: 'success' })
  }

  /** Success message with optional undo action. */
  public onSetSuccessMsgWithUndo(txt: string, undo: () => void): void {
    this._setMsg({ txt, type: 'success', undo })
  }

  /**
   * Plan 501: a line the user can re-add was just removed. Shows the undo toast; `restore` puts the line back.
   * With `owner`, the toast is dismissed when the owning component is destroyed (the undo would act on a dead view).
   */
  public onLineRemoved(txt: string, restore: () => void | Promise<void>, owner?: DestroyRef): void {
    const undo = () => {
      void restore()
    }
    this._lineUndos.add(undo)
    this.onSetSuccessMsgWithUndo(txt, undo)
    owner?.onDestroy(() => {
      if (this._msg_()?.undo === undo) this.CloseMsg()
    })
  }

  public onSetErrorMsg(txt: string): void {
    this._setMsg({ txt, type: 'error' })
  }

  public onSetWarningMsg(txt: string): void {
    this._setMsg({ txt, type: 'warning' })
  }
}
