import { Injectable, signal } from '@angular/core';
import { concatMap, delay, of, Subject, tap } from 'rxjs';
import { Msg } from '../models/msg.model';

@Injectable({
  providedIn: 'root',
})

export class UserMsgService {

  private _msg_ = signal<Msg | null>(null);
  public msg_ = this._msg_.asReadonly();

  private _msgQueue$ = new Subject<Msg>();
  private _msgQueueTimeOut$ = this._msgQueue$.pipe(
    concatMap(msg => {
      return of(msg).pipe(
        delay(0),
        tap(m => this._msg_.set(m)),
        delay(2000),
        tap(() => this._msg_.set(null))
      );
    })
  );

  constructor() {
    // Root service: subscription lives for app lifetime; takeUntilDestroyed is for components only.
    this._msgQueueTimeOut$.subscribe();
  }

  CloseMsg() {
    this._msg_.set(null)
  }

  private _setMsg(msg: Msg) {
    this._msgQueue$.next(msg)
  }

  public onSetSuccessMsg(txt: string) {
    this._setMsg({ txt, type: 'success' })
  }

  /** Success message with optional undo action. */
  public onSetSuccessMsgWithUndo(txt: string, undo: () => void) {
    this._setMsg({ txt, type: 'success', undo })
  }
  public onSetErrorMsg(txt: string) {
    this._setMsg({ txt, type: 'error' })
  }



}
