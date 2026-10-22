import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { AuthModalService } from '@services/auth-modal.service'
import { UserService } from '@services/user.service'
import { CloudinaryService } from '@services/cloudinary.service'
import { environment } from '../../../../environments/environment'
import { validateUsername, validateEmail, validatePassword } from '../../utils/auth-validation.util'
import { take } from 'rxjs/operators'
import { NAME_MAX_LENGTH } from '@schemas/base.schema'

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, TranslatePipe],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthModalComponent {
  protected readonly modalService = inject(AuthModalService)
  private readonly userService = inject(UserService)
  private readonly router = inject(Router)
  private readonly cloudinary = inject(CloudinaryService)
  private readonly cdr = inject(ChangeDetectorRef)

  protected nameInput = viewChild<ElementRef>('nameInput')

  constructor() {
    effect(() => {
      if (this.modalService.isOpen()) {
        setTimeout(() => this.nameInput()?.nativeElement.focus(), 0)
      }
    })
  }

  protected name = ''
  protected businessName = ''
  protected email = ''
  protected password = ''
  protected confirmPassword = ''
  protected imgPreview = signal<string | null>(null)
  protected isUploadingImage_ = signal(false)
  protected errorKey = signal<string | null>(null)
  protected isSubmitting = signal(false)
  protected shouldShowPassword_ = signal(false)
  protected shouldShowConfirmPassword_ = signal(false)
  protected isNameTouched_ = signal(false)
  protected isEmailTouched_ = signal(false)
  protected isPasswordTouched_ = signal(false)
  protected isConfirmTouched_ = signal(false)

  protected readonly isDev = environment.localDev

  private imgCloudinaryUrl: string | null = null

  protected get isSignUp(): boolean {
    return this.modalService.mode() === 'sign-up'
  }

  protected switchMode(mode: 'sign-in' | 'sign-up'): void {
    this.modalService.mode.set(mode)
    this._reset()
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    this.errorKey.set(null)
    this.isUploadingImage_.set(true)
    this.cdr.markForCheck()
    this.cloudinary
      .upload(file)
      .pipe(take(1))
      .subscribe({
        next: (url) => {
          this.imgCloudinaryUrl = url
          this.imgPreview.set(url)
          this.isUploadingImage_.set(false)
          this.cdr.markForCheck()
        },
        error: () => {
          this.isUploadingImage_.set(false)
          this.errorKey.set('image_upload_failed')
          this.cdr.markForCheck()
        }
      })
  }

  protected onNameBlur(): void {
    if (!this.name.trim()) return
    this.isNameTouched_.set(true)
    const err = validateUsername(this.name)
    if (err) this.errorKey.set(err)
  }

  protected onEmailBlur(): void {
    this.isEmailTouched_.set(true)
    const err = validateEmail(this.email)
    if (err) this.errorKey.set(err)
  }

  protected onPasswordBlur(): void {
    this.isPasswordTouched_.set(true)
    if (!this.isSignUp) {
      if (!this.password.trim()) this.errorKey.set('password_required')
      return
    }
    const err = validatePassword(this.password, this.name, this.email)
    if (err) this.errorKey.set(err)
  }

  protected onConfirmBlur(): void {
    this.isConfirmTouched_.set(true)
    if (this.password !== this.confirmPassword) this.errorKey.set('passwords_do_not_match')
  }

  protected onSubmit(): void {
    if (this.isSubmitting() || this.isUploadingImage_()) return

    const nameErr = validateUsername(this.name)
    if (nameErr) {
      this.errorKey.set(nameErr)
      return
    }

    if (this.isSignUp) {
      const businessName = this.businessName.trim()
      if (!businessName) {
        this.errorKey.set('business_name_required')
        return
      }
      if (businessName.length > NAME_MAX_LENGTH) {
        this.errorKey.set('business_name_too_long')
        return
      }

      const emailErr = validateEmail(this.email)
      if (emailErr) {
        this.errorKey.set(emailErr)
        return
      }

      const passwordErr = validatePassword(this.password, this.name, this.email)
      if (passwordErr) {
        this.errorKey.set(passwordErr)
        return
      }

      if (this.password !== this.confirmPassword) {
        this.errorKey.set('passwords_do_not_match')
        return
      }
    } else {
      if (!this.password.trim()) {
        this.errorKey.set('password_required')
        return
      }
    }

    this.errorKey.set(null)
    this.isSubmitting.set(true)

    if (this.isSignUp) {
      this.userService
        .signup(
          {
            name: this.name.trim(),
            email: this.email.trim(),
            imgUrl: this.imgCloudinaryUrl ?? undefined
          },
          this.password.trim(),
          this.businessName.trim()
        )
        .subscribe({
          next: () => this._onSuccess(),
          error: (err: Error) => this._onError(err)
        })
    } else {
      this.userService.login({ name: this.name.trim(), password: this.password.trim() }).subscribe({
        next: () => this._onSuccess(),
        error: (err: Error) => this._onError(err)
      })
    }
  }

  protected loginAsGuest(): void {
    this.errorKey.set(null)
    this.userService.loginAsGuestBackend().subscribe({
      next: () => this._onSuccess(),
      error: () => {
        this._reset()
        this.modalService.close()
      }
    })
  }

  protected onClose(): void {
    this._reset()
    this.modalService.close()
  }

  private _onSuccess(): void {
    this.isSubmitting.set(false)
    this._reset()
    const returnUrl = this.modalService.returnUrl()
    this.modalService.clearReturnUrl()
    this.modalService.close()
    if (returnUrl) this.router.navigateByUrl(returnUrl)
  }

  private _onError(err: Error): void {
    this.isSubmitting.set(false)
    if (err.message === 'USERNAME_TAKEN') {
      this.errorKey.set('username_taken')
    } else if (err.message === 'EMAIL_TAKEN') {
      this.errorKey.set('email_taken')
    } else if (err.message === 'INVALID_USERNAME') {
      this.errorKey.set('username_invalid_chars')
    } else if (err.message === 'INVALID_EMAIL') {
      this.errorKey.set('email_invalid')
    } else if (err.message === 'BUSINESS_NAME_REQUIRED') {
      this.errorKey.set('business_name_required')
    } else if (err.message === 'BUSINESS_NAME_TOO_LONG') {
      this.errorKey.set('business_name_too_long')
    } else if (err.message === 'NO_BUSINESS') {
      this.errorKey.set('no_business')
    } else if (err.message === 'USER_REMOVED') {
      this.errorKey.set('user_removed')
    } else if (err.message === 'PASSWORD_REQUIRED') {
      this.errorKey.set('password_required')
    } else if (err.message === 'ACCOUNT_LOCKED') {
      this.errorKey.set('account_locked')
    } else if (err.message === 'RATE_LIMITED') {
      this.errorKey.set('rate_limited')
    } else if (err.message === 'SERVER_ERROR') {
      this.errorKey.set('server_error')
    } else if (err.message === 'USER_NOT_FOUND') {
      this.errorKey.set('user_not_found')
    } else {
      this.errorKey.set('server_error')
    }
  }

  private _reset(): void {
    this.name = ''
    this.businessName = ''
    this.email = ''
    this.password = ''
    this.confirmPassword = ''
    this.shouldShowPassword_.set(false)
    this.shouldShowConfirmPassword_.set(false)
    this.imgCloudinaryUrl = null
    this.imgPreview.set(null)
    this.errorKey.set(null)
    this.isNameTouched_.set(false)
    this.isEmailTouched_.set(false)
    this.isPasswordTouched_.set(false)
    this.isConfirmTouched_.set(false)
  }
}
