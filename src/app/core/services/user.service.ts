import { computed, inject, Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';
import { filter, from, map, of, switchMap, tap } from 'rxjs';
import { Router } from '@angular/router';
import { UserMsgService } from './user-msg.service';
import { StorageService } from './async-storage.service';


const SIGNED_USERS = 'signed-users-db';
const SESSION_USER_KEY = 'loggedInUser';

@Injectable({
  providedIn: 'root',
})
export class UserService {

  private userMsgService = inject(UserMsgService);
  private storageService = inject(StorageService);
  private router = inject(Router);

  private _users_ = signal<User[] | null>(this._loadUsersFromStorage());
  public users_ = this._users_.asReadonly();

  private _user_ = signal<User | null>(this._loadUserFromSession());
  public user_ = this._user_.asReadonly();

  public isLoggedIn = computed(() => this._user_() !== null);

  public signup(newUser: User) {
    return from(this.storageService.query<User>(SIGNED_USERS)).pipe(
      map(users => users.find(_user => _user.name === newUser.name)),
      switchMap(user => user ?
        of(user)
        :
        from(this.storageService.post(SIGNED_USERS, newUser))),
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
    return from(this.storageService.query<User>(SIGNED_USERS)).pipe(
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
  this._user_.set(user && { ...user });
  this._saveUserToSession(user);
}

_clearSessionStorage() {
  console.log('variable')

  sessionStorage.clear()
  this._user_.set(null)
}

_getLoggedInUser(): User {
  return this._user_()!
}
private _loadUsersFromStorage(): User[] | null {
  try {
    const raw = localStorage.getItem(SIGNED_USERS);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

private _loadUserFromSession(): User | null {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

private _saveUserToSession(user: User | null): void {
  if (user) {
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(SESSION_USER_KEY);
  }
}

}
