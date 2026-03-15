import { Injectable, signal } from '@angular/core';
import { Msg } from '../models/msg.model';

const SUCCESS_DURATION_MS = 2000;
const ERROR_DURATION_MS = 4000;

@Injectable({
  providedIn: 'root',
})
export class UserMsgService {
  private _msg_ = signal<Msg | null>(null);
  public msg_ = this._msg_.asReadonly();

  private _pending: Msg[] = [];
  private _timerHandle: ReturnType<typeof setTimeout> | null = null;

  private _clearTimer(): void {
    if (this._timerHandle !== null) {
      clearTimeout(this._timerHandle);
      this._timerHandle = null;
    }
  }

  private _durationMs(type: string): number {
    return type === 'error' ? ERROR_DURATION_MS : SUCCESS_DURATION_MS;
  }

  private _showNext(): void {
    this._msg_.set(null);
    if (this._pending.length > 0) {
      const next = this._pending.shift()!;
      this._msg_.set(next);
      this._timerHandle = setTimeout(() => this._showNext(), this._durationMs(next.type));
    } else {
      this._timerHandle = null;
    }
  }

  private _startTimer(durationMs: number): void {
    this._clearTimer();
    this._timerHandle = setTimeout(() => this._showNext(), durationMs);
  }

  private _setMsg(msg: Msg): void {
    const current = this._msg_();

    if (msg.type === 'success' || msg.type === 'warning') {
      if (current && (current.type === 'success' || current.type === 'warning')) {
        this._msg_.set(msg);
        this._startTimer(SUCCESS_DURATION_MS);
        return;
      }
      if (!current) {
        this._msg_.set(msg);
        this._startTimer(SUCCESS_DURATION_MS);
        return;
      }
      this._pending.push(msg);
      return;
    }

    if (msg.type === 'error') {
      if (current && current.type !== 'error') {
        this._msg_.set(msg);
        this._startTimer(ERROR_DURATION_MS);
        return;
      }
      if (current && current.type === 'error') {
        this._pending.push(msg);
        return;
      }
      this._msg_.set(msg);
      this._startTimer(ERROR_DURATION_MS);
    }
  }

  CloseMsg(): void {
    this._clearTimer();
    this._msg_.set(null);
    if (this._pending.length > 0) {
      const next = this._pending.shift()!;
      this._msg_.set(next);
      this._timerHandle = setTimeout(() => this._showNext(), this._durationMs(next.type));
    }
  }

  public onSetSuccessMsg(txt: string): void {
    this._setMsg({ txt, type: 'success' });
  }

  /** Success message with optional undo action. */
  public onSetSuccessMsgWithUndo(txt: string, undo: () => void): void {
    this._setMsg({ txt, type: 'success', undo });
  }

  public onSetErrorMsg(txt: string): void {
    this._setMsg({ txt, type: 'error' });
  }

  public onSetWarningMsg(txt: string): void {
    this._setMsg({ txt, type: 'warning' });
  }
}
