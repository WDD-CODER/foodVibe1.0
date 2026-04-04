import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { AuthModalService } from '@services/auth-modal.service';
import { UserService } from '@services/user.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, TranslatePipe],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthModalComponent {
  protected readonly modalService = inject(AuthModalService);
  private readonly userService = inject(UserService);

  protected nameInput = viewChild<ElementRef>('nameInput');

  constructor() {
    effect(() => {
      if (this.modalService.isOpen()) {
        setTimeout(() => this.nameInput()?.nativeElement.focus(), 0);
      }
    });
  }

  protected name = '';
  protected email = '';
  protected password = '';
  protected confirmPassword = '';
  protected isAdminSignup = false;
  protected imgPreview = signal<string | null>(null);
  protected errorKey = signal<string | null>(null);
  protected isSubmitting = signal(false);
  protected showPassword_ = signal(false);
  protected showConfirmPassword_ = signal(false);

  protected readonly isDev = environment.localDev;

  private imgBase64: string | null = null;

  protected get isSignUp(): boolean {
    return this.modalService.mode() === 'sign-up';
  }

  protected switchMode(mode: 'sign-in' | 'sign-up'): void {
    this.modalService.mode.set(mode);
    this._reset();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      this.imgBase64 = result;
      this.imgPreview.set(result);
    };
    reader.readAsDataURL(file);
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;

    const trimmedName = this.name.trim();
    if (!trimmedName) {
      this.errorKey.set('name_required');
      return;
    }

    const trimmedPassword = this.password.trim();
    if (!trimmedPassword) {
      this.errorKey.set('password_required');
      return;
    }

    if (this.isSignUp) {
      const trimmedEmail = this.email.trim();
      if (!trimmedEmail) {
        this.errorKey.set('email_required');
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.errorKey.set('passwords_do_not_match');
        return;
      }
    }

    this.errorKey.set(null);
    this.isSubmitting.set(true);

    if (this.isSignUp) {
      this.userService.signup(
        { name: trimmedName, email: this.email.trim(), imgUrl: this.imgBase64 ?? undefined, role: this.isAdminSignup ? 'admin' : 'user' },
        trimmedPassword
      ).subscribe({
        next: () => this._onSuccess(),
        error: (err: Error) => this._onError(err)
      });
    } else {
      this.userService.login({ name: trimmedName, password: trimmedPassword }).subscribe({
        next: () => this._onSuccess(),
        error: (err: Error) => this._onError(err)
      });
    }
  }

  protected loginAsGuest(): void {
    if (environment.useBackendAuth) {
      this.userService.loginAsGuestBackend().subscribe({
        next: () => { this._reset(); this.modalService.close(); },
        error: () => { this._reset(); this.modalService.close(); }
      });
      return;
    }
    this.userService._saveUserLocal({ _id: 'dev-guest', name: 'Guest Admin', email: 'guest@dev.local', role: 'admin' });
    this._reset();
    this.modalService.close();
  }

  protected onClose(): void {
    this._reset();
    this.modalService.close();
  }

  private _onSuccess(): void {
    this.isSubmitting.set(false);
    this._reset();
    this.modalService.close();
  }

  private _onError(err: Error): void {
    this.isSubmitting.set(false);
    if (err.message === 'USERNAME_TAKEN') {
      this.errorKey.set('username_taken');
    } else if (err.message === 'PASSWORD_REQUIRED') {
      this.errorKey.set('password_required');
    } else {
      this.errorKey.set('user_not_found');
    }
  }

  private _reset(): void {
    this.name = '';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
    this.isAdminSignup = false;
    this.showPassword_.set(false);
    this.showConfirmPassword_.set(false);
    this.imgBase64 = null;
    this.imgPreview.set(null);
    this.errorKey.set(null);
  }
}
