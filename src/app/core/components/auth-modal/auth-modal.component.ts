import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { AuthModalService } from '@services/auth-modal.service';
import { UserService } from '@services/user.service';

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

  protected name = ''
  protected email = ''
  protected password = ''
  protected imgPreview = signal<string | null>(null)
  protected errorKey = signal<string | null>(null)
  protected isSubmitting = signal(false)

  private imgBase64: string | null = null

  protected get isSignUp(): boolean {
    return this.modalService.mode() === 'sign-up';
  }

  protected switchMode(mode: 'sign-in' | 'sign-up'): void {
    this.modalService.mode.set(mode);
    this.errorKey.set(null);
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
    if (this.isSubmitting()) return

    const trimmedName = this.name.trim()
    if (!trimmedName) return

    this.errorKey.set(null)
    this.isSubmitting.set(true)

    if (this.isSignUp) {
      const trimmedEmail = this.email.trim()
      const trimmedPassword = this.password.trim()
      if (!trimmedEmail) {
        this.isSubmitting.set(false)
        return
      }
      if (!trimmedPassword) {
        this.errorKey.set('password_required')
        this.isSubmitting.set(false)
        return
      }
      this.userService.signup(
        {
          name: trimmedName,
          email: trimmedEmail,
          imgUrl: this.imgBase64 ?? undefined
        },
        trimmedPassword
      ).subscribe({
        next: () => this._onSuccess(),
        error: (err: Error) => this._onError(err)
      })
    } else {
      this.userService.login({ name: trimmedName, password: this.password.trim() || undefined }).subscribe({
        next: () => this._onSuccess(),
        error: (err: Error) => this._onError(err)
      })
    }
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
    this.isSubmitting.set(false)
    if (err.message === 'USERNAME_TAKEN') {
      this.errorKey.set('username_taken')
    } else if (err.message === 'PASSWORD_REQUIRED') {
      this.errorKey.set('password_required')
    } else {
      this.errorKey.set('user_not_found')
    }
  }

  private _reset(): void {
    this.name = ''
    this.email = ''
    this.password = ''
    this.imgBase64 = null
    this.imgPreview.set(null)
    this.errorKey.set(null)
  }
}
