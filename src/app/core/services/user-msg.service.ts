import { Injectable, signal } from '@angular/core';
import { concatMap, delay, of, Subject, tap } from 'rxjs';
import { Msg } from '../models/msg.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})

export class UserMsgService {
  
  private _msg_ =signal<Msg | null>(null)
  public msg_ = this._msg_.asReadonly()

  private _msgQueue$ = new Subject<Msg>()
  private _msgQueueTimeOut$ = this._msgQueue$.pipe(
    concatMap(msg => {
      return of(msg).pipe(
        delay(0),
        tap(msg => this._msg_.set(msg)),
        delay(2000),
        tap(() => this._msg_.set(null))
      )
    })
  )

  constructor() {
    this._msgQueueTimeOut$.pipe(takeUntilDestroyed()).subscribe()
  }

  CloseMsg() {
    this._msg_.set(null)
  }

  private _setMsg(msg: Msg) {
    this._msgQueue$.next(msg)
  }

  public onSetSuccessMsg(txt: string) {
    console.log("🚀 ~ UserMsgService ~ onSetSuccessMsg ~ txt:", txt)
    this._setMsg({ txt, type: 'success' })
  }
  public onSetErrorMsg(txt: string) {
    console.log("🚀 ~ UserMsgService ~ onSetErrorMsg ~ txt:", txt)
    
    this._setMsg({ txt, type: 'error' })
  }



}
