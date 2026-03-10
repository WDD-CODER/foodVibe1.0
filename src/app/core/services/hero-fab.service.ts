import { Injectable, signal } from '@angular/core';

export interface HeroFabAction {
  labelKey: string;
  icon: string;
  run: () => void;
}

export type HeroFabPageMode = 'replace' | 'append';

export interface HeroFabPageState {
  actions: HeroFabAction[];
  mode: HeroFabPageMode;
}

@Injectable({ providedIn: 'root' })
export class HeroFabService {
  private readonly pageState_ = signal<HeroFabPageState | null>(null);

  readonly pageActions = this.pageState_.asReadonly();

  setPageActions(actions: HeroFabAction[], mode: HeroFabPageMode): void {
    this.pageState_.set({ actions, mode });
  }

  clearPageActions(): void {
    this.pageState_.set(null);
  }
}
