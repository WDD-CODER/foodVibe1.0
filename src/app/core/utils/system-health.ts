import { signal, type Signal } from '@angular/core';

export class SystemHealth {
  readonly appStatus: Signal<string> = signal('initialized');
}
