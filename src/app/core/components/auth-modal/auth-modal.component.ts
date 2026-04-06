import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { AuthModalService } from '@services/auth-modal.service';
import { UserService } from '@services/user.service';
import { environment } from '../../../../environments/environment';
import { validateUsername, validateEmail, validatePassword } from '../../utils/auth-validation.util';

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
  protected nameTouched_ = signal(false);
  protected emailTouched_ = signal(false);
  protected passwordTouched_ = signal(false);
  protected confirmTouched_ = signal(false);

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

  protected onNameBlur(): void {
    this.nameTouched_.set(true);
    const err = validateUsername(this.name);
    if (err) this.errorKey.set(err);
  }

  protected onEmailBlur(): void {
    this.emailTouched_.set(true);
    const err = validateEmail(this.email);
    if (err) this.errorKey.set(err);
  }

  protected onPasswordBlur(): void {
    this.passwordTouched_.set(true);
    if (!this.isSignUp) {
      if (!this.password.trim()) this.errorKey.set('password_required');
      return;
    }
    const err = validatePassword(this.password, this.name, this.email);
    if (err) this.errorKey.set(err);
  }

  protected onConfirmBlur(): void {
    this.confirmTouched_.set(true);
    if (this.password !== this.confirmPassword) this.errorKey.set('passwords_do_not_match');
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;

    const nameErr = validateUsername(this.name);
    if (nameErr) { this.errorKey.set(nameErr); return; }

    if (this.isSignUp) {
      const emailErr = validateEmail(this.email);
      if (emailErr) { this.errorKey.set(emailErr); return; }

      const passwordErr = validatePassword(this.password, this.name, this.email);
      if (passwordErr) { this.errorKey.set(passwordErr); return; }

      if (this.password !== this.confirmPassword) {
        this.errorKey.set('passwords_do_not_match');
        return;
      }
    } else {
      if (!this.password.trim()) { this.errorKey.set('password_required'); return; }
    }

    this.errorKey.set(null);
    this.isSubmitting.set(true);

    if (this.isSignUp) {
      this.userService.signup(
        { name: this.name.trim(), email: this.email.trim(), imgUrl: this.imgBase64 ?? undefined, role: this.isAdminSignup ? 'admin' : 'user' },
        this.password.trim()
      ).subscribe({
        next: () => this._onSuccess(),
        error: (err: Error) => this._onError(err)
      });
    } else {
      this.userService.login({ name: this.name.trim(), password: this.password.trim() }).subscribe({
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
    } else if (err.message === 'EMAIL_TAKEN') {
      this.errorKey.set('email_taken');
    } else if (err.message === 'INVALID_USERNAME') {
      this.errorKey.set('username_invalid_chars');
    } else if (err.message === 'INVALID_EMAIL') {
      this.errorKey.set('email_invalid');
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
    this.nameTouched_.set(false);
    this.emailTouched_.set(false);
    this.passwordTouched_.set(false);
    this.confirmTouched_.set(false);
  }
}
