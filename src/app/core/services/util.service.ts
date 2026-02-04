import { Injectable } from '@angular/core';
import { User } from '../models/user.model';

const LOGGED_IN_USER = 'signed-user'
const SINGED_USERS = 'signed-users-db'


@Injectable({
  providedIn: 'root',
})
export class UtilService {

  LoadUserFromSession() {
    return JSON.parse(sessionStorage.getItem(LOGGED_IN_USER) || 'null')
  }

  saveUserToSession(entity: User | null): void {
    sessionStorage.setItem(LOGGED_IN_USER, JSON.stringify(entity))
  }

  LoadFromStorage() {
    return JSON.parse(localStorage.getItem(SINGED_USERS) || 'null')
  }

  saveToStorage(entity: User[]): void {
    localStorage.setItem(SINGED_USERS, JSON.stringify(entity))
  }


  makeId(length: number = 6): string {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }

    return result;
  }
}
