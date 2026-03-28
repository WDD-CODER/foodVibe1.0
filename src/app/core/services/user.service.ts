import { inject, Injectable, signal } from '@angular/core'
import { User } from '../models/user.model'
import { from, map, of, switchMap, tap, throwError } from 'rxjs'
import { UserMsgService } from './user-msg.service'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import { hashPassword, verifyPassword } from '../utils/auth-crypto'

const SIGNED_USERS = 'signed-users-db'
const SESSION_USER_KEY = 'loggedInUser'

/** Stored record may include password hash; never expose hash to session or client. */
type StoredUser = User & { passwordHash?: string }

export interface LoginCredentials {
  name: string
  password: string
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private userMsgService = inject(UserMsgService)
  private storageService = inject(StorageService)
  private logging = inject(LoggingService)

  private _user_ = signal<User | null>(this._loadUserFromSession())
  public user_ = this._user_.asReadonly()

  public isLoggedIn = () => this._user_() !== null

  get currentUser(): User | null {
    return this._user_()
  }

  public signup(newUser: User, password: string) {
    return from(this.storageService.query<StoredUser>(SIGNED_USERS)).pipe(
      map(users => users.find(u => u.name === newUser.name)),
      switchMap(existing =>
        existing
          ? throwError(() => new Error('USERNAME_TAKEN'))
          : from(hashPassword(password)).pipe(
              switchMap(passwordHash =>
                from(
                  this.storageService.post(SIGNED_USERS, {
                    name: newUser.name,
                    email: newUser.email,
                    imgUrl: newUser.imgUrl,
                    role: (newUser.role ?? 'user') as 'admin' | 'user',
                    passwordHash
                  } as StoredUser)
                )
              )
            )
      ),
      tap(stored => {
        const user = this._toUser(stored)
        this.userMsgService.onSetSuccessMsg('Signup Successfully ')
        this._saveUserLocal(user)
        this.logging.info({ event: 'auth.signup', message: 'Signup success', context: { userId: user._id } })
      })
    )
  }

  public logout() {
    const userId = this._user_()?._id
    return of(null).pipe(
      tap(() => {
        this._saveUserLocal(null)
        this.logging.info({ event: 'auth.logout', message: 'Logout', context: userId ? { userId } : undefined })
      })
    )
  }

  public login(credentials: LoginCredentials) {
    const { name, password } = credentials
    return from(this.storageService.query<StoredUser>(SIGNED_USERS)).pipe(
      map(users => users.find(u => u.name === name)),
      switchMap(stored => {
        if (!stored) {
          this.logging.warn({ event: 'auth.login.failure', message: 'Login failed: user not found', context: {} })
          return throwError(() => new Error('USER_NOT_FOUND'))
        }
        if (!stored.passwordHash) {
          this.logging.warn({ event: 'auth.login.failure', message: 'Login failed: no password hash on record', context: {} })
          return throwError(() => new Error('USER_NOT_FOUND'))
        }
        return from(verifyPassword(password, stored.passwordHash)).pipe(
          switchMap(ok => {
            if (!ok) {
              this.logging.warn({ event: 'auth.login.failure', message: 'Login failed: invalid password', context: {} })
              return throwError(() => new Error('USER_NOT_FOUND'))
            }
            const user = this._toUser(stored)
            this._saveUserLocal(user)
            this.logging.info({ event: 'auth.login', message: 'Login success', context: { userId: user._id } })
            return of(user)
          })
        )
      })
    )
  }

  private _toUser(stored: StoredUser): User {
    return { _id: stored._id, name: stored.name, email: stored.email, imgUrl: stored.imgUrl, role: stored.role }
  }

  _saveUserLocal(user: User | null): void {
    this._user_.set(user && { ...user });
    this._saveUserToSession(user);
  }

  _clearSessionStorage() {
    sessionStorage.clear()
    this._user_.set(null)
  }

  _getLoggedInUser(): User {
    return this._user_()!
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
