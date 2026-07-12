import { Component, inject, signal } from '@angular/core'
import { Router, RouterOutlet, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router'
import { filter } from 'rxjs'
import { UserService } from '../core/services/user.service'
import { ServerHeartbeatService } from '../core/services/server-heartbeat.service'
import { HeaderComponent } from '../core/components/header/header.component'
import { UserMsg } from 'src/app/core/components/user-msg/user-msg.component'
import { UnitCreatorModal } from 'src/app/shared/unit-creator/unit-creator.component'
import { TranslationKeyModalComponent } from 'src/app/shared/translation-key-modal/translation-key-modal.component'
import { AddItemModalComponent } from 'src/app/shared/add-item-modal/add-item-modal.component'
import { QuickAddProductModalComponent } from 'src/app/shared/quick-add-product-modal/quick-add-product-modal.component'
import { QuickEditProductModalComponent } from 'src/app/shared/quick-edit-product-modal/quick-edit-product-modal.component'
import { GlobalSpecificModalComponent } from 'src/app/shared/global-specific-modal/global-specific-modal.component'
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component'
import { RestoreChoiceModalComponent } from 'src/app/shared/restore-choice-modal/restore-choice-modal.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { AddEquipmentModalComponent } from 'src/app/shared/add-equipment-modal/add-equipment-modal.component'
import { HeroFabComponent } from '../core/components/hero-fab/hero-fab.component'
import { LabelCreationModalComponent } from 'src/app/shared/label-creation-modal/label-creation-modal.component'
import { AuthModalComponent } from '../core/components/auth-modal/auth-modal.component'
import { SupplierModalComponent } from '../shared/supplier-modal/supplier-modal.component'
import { AiRecipeModalComponent } from '../shared/ai-recipe-modal/ai-recipe-modal.component'
import { AiMenuModalComponent } from '../shared/ai-menu-modal/ai-menu-modal.component'
import { AiProductModalComponent } from '../shared/ai-product-modal/ai-product-modal.component'
import { AiRecipeModalService } from '../shared/ai-recipe-modal/ai-recipe-modal.service'
import { AiMenuModalService } from '../shared/ai-menu-modal/ai-menu-modal.service'
import { AiProductModalService } from '../shared/ai-product-modal/ai-product-modal.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { TranslationKeyModalService } from '@services/translation-key-modal.service'
import { LabelCreationModalService } from '../shared/label-creation-modal/label-creation-modal.service'
import { AddItemModalService } from '@services/add-item-modal.service'
import { QuickAddProductModalService } from '@services/quick-add-product-modal.service'
import { QuickEditProductModalService } from '@services/quick-edit-product-modal.service'
import { AddEquipmentModalService } from '@services/add-equipment-modal.service'
import { GlobalSpecificModalService } from '@services/global-specific-modal.service'
import { SupplierModalService } from '@services/supplier-modal.service'
import { RestoreChoiceModalService } from '@services/restore-choice-modal.service'

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HeaderComponent,
    UserMsg,
    UnitCreatorModal,
    TranslationKeyModalComponent,
    LabelCreationModalComponent,
    AddItemModalComponent,
    QuickAddProductModalComponent,
    QuickEditProductModalComponent,
    AddEquipmentModalComponent,
    GlobalSpecificModalComponent,
    ConfirmModalComponent,
    RestoreChoiceModalComponent,
    LoaderComponent,
    HeroFabComponent,
    AuthModalComponent,
    SupplierModalComponent,
    AiRecipeModalComponent,
    AiMenuModalComponent,
    AiProductModalComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'foodVibe1.0'
  private readonly router = inject(Router)
  private readonly userService = inject(UserService)
  private readonly serverHeartbeat_ = inject(ServerHeartbeatService)

  // Open signals for @defer (when …) — services stay root singletons; only the modal component chunks defer.
  protected readonly aiRecipeModal = inject(AiRecipeModalService)
  protected readonly aiMenuModal = inject(AiMenuModalService)
  protected readonly aiProductModal = inject(AiProductModalService)
  protected readonly unitRegistry = inject(UnitRegistryService)
  protected readonly translationKeyModal = inject(TranslationKeyModalService)
  protected readonly labelCreationModal = inject(LabelCreationModalService)
  protected readonly addItemModal = inject(AddItemModalService)
  protected readonly quickAddProductModal = inject(QuickAddProductModalService)
  protected readonly quickEditProductModal = inject(QuickEditProductModalService)
  protected readonly addEquipmentModal = inject(AddEquipmentModalService)
  protected readonly globalSpecificModal = inject(GlobalSpecificModalService)
  protected readonly supplierModal = inject(SupplierModalService)
  protected readonly restoreChoiceModal = inject(RestoreChoiceModalService)

  protected isRouteLoading = signal(false)
  protected isDataReloading_ = this.userService.isDataReloading_

  constructor() {
    this.serverHeartbeat_.start()
    this.router.events.pipe(
      filter((e): e is NavigationStart | NavigationEnd | NavigationCancel | NavigationError =>
        e instanceof NavigationStart || e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError)
    ).subscribe(event => {
      this.isRouteLoading.set(event instanceof NavigationStart)
    })
  }
}
