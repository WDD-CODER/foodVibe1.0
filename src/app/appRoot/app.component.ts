import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { filter } from 'rxjs';
import { HeaderComponent } from '../core/components/header/header.component';
import { FooterComponent } from '../core/components/footer/footer.component';
import { UserMsg } from "src/app/core/components/user-msg/user-msg.component";
import { UnitCreatorModal } from 'src/app/shared/unit-creator/unit-creator.component';
import { TranslationKeyModalComponent } from 'src/app/shared/translation-key-modal/translation-key-modal.component';
import { AddItemModalComponent } from 'src/app/shared/add-item-modal/add-item-modal.component';
import { GlobalSpecificModalComponent } from 'src/app/shared/global-specific-modal/global-specific-modal.component';
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component';
import { RestoreChoiceModalComponent } from 'src/app/shared/restore-choice-modal/restore-choice-modal.component';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';
import { AddEquipmentModalComponent } from 'src/app/shared/add-equipment-modal/add-equipment-modal.component';
import { HeroFabComponent } from '../core/components/hero-fab/hero-fab.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, UserMsg, UnitCreatorModal, TranslationKeyModalComponent, AddItemModalComponent, AddEquipmentModalComponent, GlobalSpecificModalComponent, ConfirmModalComponent, RestoreChoiceModalComponent, LoaderComponent, HeroFabComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'foodVibe1.0';
  private readonly router = inject(Router);

  protected isRouteLoading = signal(false);

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationStart | NavigationEnd | NavigationCancel | NavigationError =>
        e instanceof NavigationStart || e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError)
    ).subscribe(event => {
      this.isRouteLoading.set(event instanceof NavigationStart);
    });
  }
}
