import { inject, Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';
import { BehaviorSubject, filter, from, map, Observable, of, switchMap, take, tap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { UtilService } from './util.service';
import { UserMsgService } from './user-msg.service';
import {  StorageService } from './async-storage.service';


const SINGED_USERS = 'signed-users-db'
@Injectable({
  providedIn: 'root',
})

export class UserService {

  utilService = inject(UtilService)
  userMsgService = inject(UserMsgService)
  storageService = inject(StorageService)
  router = inject(Router)

  
  private _users_ = signal<User[] | null>(this.utilService.LoadFromStorage())
  public users_ = this._users_.asReadonly()

  private _user_ = signal<User | null>(this.utilService.LoadUserFromSession())
  public user_ = this._user_.asReadonly()

  public signup(newUser: User) {
    return from(this.storageService.query<User>(SINGED_USERS)).pipe(
      map(users => users.find(_user => _user.name === newUser.name)),
      switchMap(user => user ?
        of(user)
        :
        from(this.storageService.post(SINGED_USERS, newUser))),
      tap(user => {
        this.userMsgService.onSetSuccessMsg('Signup Successfully ')
        this._saveUserLocal(user)
      }),
    )
  }


  public logout() {
    return of(null).pipe(
      tap(() => this._saveUserLocal(null))
    )
  }

  public login(userName: string) {
    return from(this.storageService.query<User>(SINGED_USERS)).pipe(
      map(users => users.find(_user => _user.name === userName)),
      filter(user => !!user),
      tap(user => {
        this._saveUserLocal(user as User)
      }),
    )
  }



  private _updateUser(user: User): void {
    this._users_.update(prevUsers => {
      const users = prevUsers ? [...prevUsers] : []
      const idx = users.findIndex(u => u.name === user.name)
      if (idx !== -1) {
        users[idx] = user
      } else {
        users.push(user)
      }
      return users
    })
    this._saveUserLocal(user)
}

_saveUserLocal(user: User | null): void {
  this._user_.set(user && { ...user })
    this.utilService.saveUserToSession(user)
}

_clearSessionStorage() {
  console.log('variable')

  sessionStorage.clear()
  this._user_.set(null)
}

_getLoggedInUser(): User {
  return this._user_()!
}
// _createMove(moveTo: Contact, amount: number): Move {
//   return {
//     toId: moveTo._id,
//     to: moveTo.name,
//     at: Date.now(),
//     amount
//   }
// }

// _createReceiveMove(moveFrom: User, amount: number): ReceiveMove {
//   return {
//     receivedFrom: moveFrom.name,
//     at: Date.now(),
//     amount
//   }
// }


}
