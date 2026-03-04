import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { UserService } from '@services/user.service';
import { AuthModalService, AuthMode } from '@services/auth-modal.service';

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

  protected logout(): void {
    this.userService.logout().subscribe();
    this.closeMobileMenu();
  }
}
