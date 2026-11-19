import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRouteSnapshot, Router, RouterLink, RouterLinkActive } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { UserService } from '@services/user.service'
import { ModuleService } from '@services/module.service'
import { BusinessService } from '@services/business.service'
import { AuthModalService, AuthMode } from '@services/auth-modal.service'
import { FrontDeskBadgeService } from '@services/front-desk-badge.service'
import { TranslationService } from '@services/translation.service'
import { AccessService } from '@services/access.service'
import { UserMsgService } from '@services/user-msg.service'
import { CustomSelectComponent } from '../../../shared/custom-select/custom-select.component'
import { NotificationBellComponent } from '../notification-bell/notification-bell.component'
import { authGuard } from '../../guards/auth.guard'

/** The top-level pages every signed-in or guest user can open (desktop pills and drawer). */
const NAV_LINKS = [
  { path: '/dashboard', key: 'dashboard', icon: 'layout-dashboard' },
  { path: '/inventory', key: 'inventory', icon: 'package' },
  { path: '/recipe-book', key: 'recipe_book', icon: 'book-open' },
  { path: '/menu-library', key: 'menu_library', icon: 'library' },
  { path: '/clients', key: 'frontdesk_section', icon: 'users' }
]
/** Plan 646: the consultant's tool, shown with the consultant_diag module (the home module while acting). */
const DIAGNOSIS_LINK = { path: '/diagnosis', key: 'diagnosis', icon: 'stethoscope' }
/** Only the business owner gets this one (plan 428). */
const SETTINGS_LINK = { path: '/settings', key: 'settings', icon: 'sliders-vertical' }
/** Only the platform admin gets this one (plan 448). */
const PLATFORM_LINK = { path: '/platform', key: 'platform_dashboard', icon: 'activity' }

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
    TranslatePipe,
    FormsModule,
    CustomSelectComponent,
    NotificationBellComponent
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  private readonly userService = inject(UserService)
  private readonly businessService = inject(BusinessService)
  private readonly modules = inject(ModuleService)
  private readonly authModal = inject(AuthModalService)
  private readonly router = inject(Router)
  private readonly translation = inject(TranslationService)
  private readonly access = inject(AccessService)
  private readonly userMsg = inject(UserMsgService)

  isMobileMenuOpen = signal(false)
  isMobileAvatarOpen = signal(false)

  protected readonly isLoggedIn = this.userService.isLoggedIn
  protected readonly user_ = this.userService.user_
  protected readonly isPlatformAdmin_ = this.userService.isPlatformAdmin_
  protected readonly isOwner_ = this.userService.isOwner_
  /** Plan 552: requests waiting for a decision, shown on the front desk entry. */
  protected readonly waitingCount_ = inject(FrontDeskBadgeService).waitingCount_
  protected readonly waitingLabel_ = computed(() =>
    this.translation.translate('rq_waiting_count_label').replace('{count}', String(this.waitingCount_()))
  )
  /** Plan 620: the events and clients entries follow the business's modules. */
  protected readonly showEvents_ = computed(() => this.modules.has('events'))
  protected readonly showClients_ = computed(() => this.modules.has(['events', 'frontdesk']))
  /** Plan 646: while acting the home modules decide (as the diagnosis guard does), else the business modules. */
  protected readonly showDiagnosis_ = computed(() =>
    this.userService.acting_()
      ? this.userService.homeModules_().includes('consultant_diag')
      : this.modules.has('consultant_diag')
  )
  protected readonly navLinks_ = computed(() => [
    ...NAV_LINKS.filter(
      (link) =>
        (link.path !== '/menu-library' || this.showEvents_()) && (link.path !== '/clients' || this.showClients_())
    ),
    ...(this.showDiagnosis_() ? [DIAGNOSIS_LINK] : []),
    ...(this.isOwner_() ? [SETTINGS_LINK] : []),
    ...(this.isPlatformAdmin_() ? [PLATFORM_LINK] : [])
  ])
  protected readonly business_ = this.businessService.business_
  // Resets whenever the stored photo URL changes (new user, re-login, profile update).
  protected readonly imgFailed_ = linkedSignal({ source: () => this.user_()?.imgUrl, computation: () => false })
  protected readonly showAvatarImg = computed(() => !!this.user_()?.imgUrl && !this.imgFailed_())
  protected readonly userInitial = computed(() => {
    const name = this.user_()?.name
    return name ? name.charAt(0).toUpperCase() : ''
  })

  /** Plan 632: the switcher shows only when the user has another business to enter (or is inside one). */
  protected readonly canSwitch_ = this.access.canSwitch_
  protected readonly activeBusinessId_ = computed(() => this.user_()?.businessId ?? '')
  /** What the switcher shows; set to the picked value while a switch runs and back on failure. */
  protected readonly selectedBusinessId_ = linkedSignal(() => this.activeBusinessId_())
  protected readonly businessOptions_ = computed(() => {
    const homeId = this.userService.homeBusinessId_()
    const active = this.activeBusinessId_()
    const rows = this.access.businesses_().map((b) => ({
      value: b.businessId,
      label: b.businessId === homeId ? `${b.name} · ${this.translation.translate('my_business')}` : b.name
    }))
    const activeName = this.business_()?.name
    if (active && !rows.some((r) => r.value === active) && activeName) rows.push({ value: active, label: activeName })
    return rows
  })
  /** The phone profile menu lists every business but the active one. */
  protected readonly otherBusinesses_ = computed(() =>
    this.businessOptions_().filter((b) => b.value !== this.activeBusinessId_())
  )

  constructor() {
    const userId_ = computed(() => this.user_()?._id ?? null)
    effect(() => {
      if (userId_()) untracked(() => void this.access.loadBusinesses())
    })
    if (this.userService.consumeAccessEndedNotice()) {
      this.userMsg.onSetSuccessMsg(this.translation.translate('access_ended'))
    }
  }

  /** Switches into the picked business (the home id goes as null); a failure keeps the user where he was. */
  protected async switchTo(businessId: string): Promise<void> {
    this.isMobileAvatarOpen.set(false)
    if (businessId === this.activeBusinessId_()) return
    this.selectedBusinessId_.set(businessId)
    const target = businessId === this.userService.homeBusinessId_() ? null : businessId
    const ok = await this.userService.switchBusiness(target)
    if (!ok) {
      this.selectedBusinessId_.set(this.activeBusinessId_())
      this.userMsg.onSetErrorMsg(this.translation.translate('switch_failed'))
    }
  }

  openMobileMenu(): void {
    this.isMobileMenuOpen.set(true)
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false)
  }

  toggleMobileAvatar(): void {
    this.isMobileAvatarOpen.update((v) => !v)
  }

  protected openAuth(mode: AuthMode): void {
    this.closeMobileMenu()
    this.isMobileAvatarOpen.set(false)
    this.authModal.open(mode)
  }

  protected async logout(): Promise<void> {
    this.isMobileAvatarOpen.set(false)
    this.closeMobileMenu()
    if (this._isCurrentRouteProtected()) {
      // Navigate to a public page first so Angular can run canDeactivate guards.
      // If the user has unsaved changes, pendingChangesGuard shows the save/discard dialog.
      // navigate() returns false if a guard cancelled the navigation — abort logout.
      const navigated = await this.router.navigate(['/dashboard'])
      if (navigated === false) return
    }
    this.userService.logout().subscribe()
  }

  private _isCurrentRouteProtected(): boolean {
    return this._snapshotHasAuthGuard(this.router.routerState.snapshot.root)
  }

  private _snapshotHasAuthGuard(snapshot: ActivatedRouteSnapshot): boolean {
    if (snapshot.routeConfig?.canActivate?.includes(authGuard)) return true
    return snapshot.children.some((child) => this._snapshotHasAuthGuard(child))
  }
}
