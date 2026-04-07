import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { UserService } from '@services/user.service';
import { AuthModalService, AuthMode } from '@services/auth-modal.service';
import { authGuard } from '../../guards/auth.guard';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule, TranslatePipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  private readonly userService = inject(UserService);
  private readonly authModal = inject(AuthModalService);
  private readonly router = inject(Router);

  isMobileMenuOpen = signal(false);

  protected readonly isLoggedIn = this.userService.isLoggedIn;
  protected readonly user_ = this.userService.user_;
  protected readonly userInitial = computed(() => {
    const name = this.user_()?.name;
    return name ? name.charAt(0).toUpperCase() : '';
  });

  openMobileMenu(): void {
    this.isMobileMenuOpen.set(true);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  protected openAuth(mode: AuthMode): void {
    this.closeMobileMenu();
    this.authModal.open(mode);
  }

  protected async logout(): Promise<void> {
    this.closeMobileMenu();
    if (this._isCurrentRouteProtected()) {
      // Navigate to a public page first so Angular can run canDeactivate guards.
      // If the user has unsaved changes, pendingChangesGuard shows the save/discard dialog.
      // navigate() returns false if a guard cancelled the navigation — abort logout.
      const navigated = await this.router.navigate(['/dashboard']);
      if (navigated === false) return;
    }
    this.userService.logout().subscribe();
  }

  private _isCurrentRouteProtected(): boolean {
    return this._snapshotHasAuthGuard(this.router.routerState.snapshot.root);
  }

  private _snapshotHasAuthGuard(snapshot: ActivatedRouteSnapshot): boolean {
    if (snapshot.routeConfig?.canActivate?.includes(authGuard)) return true;
    return snapshot.children.some(child => this._snapshotHasAuthGuard(child));
  }
}
