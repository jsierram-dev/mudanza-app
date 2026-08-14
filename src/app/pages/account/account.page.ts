import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Injector, ViewChild, afterNextRender, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import type { ViewWillEnter } from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Locale } from '../../core/i18n/locale';
import { AuthService, SyncService, TranslationService } from '../../core/services';

function loadGoogleIdentityScript(): Promise<void> {
  if (document.getElementById('google-identity-script')) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar el script de Google'));
    document.head.appendChild(script);
  });
}

/**
 * Login opcional + sincronización manual — ver ROADMAP-mudanza.md. Sin login
 * la app sigue andando 100% local igual que siempre; esta pantalla es la
 * única que necesita conexión.
 */
@Component({
  selector: 'app-account',
  templateUrl: './account.page.html',
  styleUrl: './account.page.scss',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    RouterLink,
    DatePipe,
    TranslatePipe,
  ],
})
export class AccountPage implements AfterViewInit, ViewWillEnter {
  @ViewChild('googleButton') private googleButtonRef?: ElementRef<HTMLDivElement>;

  protected readonly auth = inject(AuthService);
  protected readonly sync = inject(SyncService);
  protected readonly i18n = inject(TranslationService);
  private readonly toastController = inject(ToastController);
  private readonly injector = inject(Injector);

  readonly loginError = signal<string | null>(null);
  readonly lastSyncedAt = signal<string | null>(null);
  /**
   * Entre elegir la cuenta de Google y que la pantalla cambie a "Cuenta" no
   * había ningún indicio visual — con jp-back-auth/mudanza-back en el plan
   * free de Render (se duermen sin uso), el primer login real puede tardar
   * varios segundos reales en despertarlos, y sin esto parece que no pasó
   * nada. Pedido explícito del usuario, 2026-08-13.
   */
  readonly loggingIn = signal(false);

  ionViewWillEnter(): void {
    this.loadLastSyncedAt();
  }

  async ngAfterViewInit(): Promise<void> {
    await this.setupGoogleButton();
  }

  /**
   * Bug real encontrado 2026-08-13: si se entra a Cuenta ya logueado,
   * `ngAfterViewInit` (que corre una sola vez) nunca llega a dibujar el
   * botón de Google porque en ese momento `isAuthenticated()` da true. Al
   * cerrar sesión, el `@if` del template vuelve a mostrar el div del botón
   * (Ionic/Angular lo recrea), pero nadie le pide a Google que lo dibuje
   * ahí — por eso `logOut()` también llama a esto. `afterNextRender`
   * asegura que ya exista el div nuevo en el DOM (y que `@ViewChild` ya lo
   * haya agarrado) antes de intentar usarlo.
   */
  private async setupGoogleButton(): Promise<void> {
    if (this.auth.isAuthenticated() || !this.googleButtonRef) return;
    try {
      await loadGoogleIdentityScript();
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response) => this.handleGoogleCredential(response.credential),
      });
      google.accounts.id.renderButton(this.googleButtonRef.nativeElement, {
        theme: 'filled_black',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        logo_alignment: 'left',
        width: 320,
      });
    } catch {
      this.loginError.set(this.i18n.t('account.googleLoadError'));
    }
  }

  setLocale(locale: Locale): void {
    this.i18n.setLocale(locale);
  }

  private async handleGoogleCredential(idToken: string): Promise<void> {
    this.loginError.set(null);
    this.loggingIn.set(true);
    try {
      await this.auth.loginWithGoogle(idToken);
      await this.syncNow();
    } catch {
      this.loginError.set(this.i18n.t('account.googleLoginError'));
    } finally {
      this.loggingIn.set(false);
    }
  }

  logOut(): void {
    this.auth.logout();
    // Angular recrea el div del botón (el @if del template vuelve a la rama
    // "no logueado") y actualiza @ViewChild solo — afterNextRender espera a
    // que ese render ya haya pasado antes de intentar usarlo.
    afterNextRender(() => void this.setupGoogleButton(), { injector: this.injector });
  }

  async syncNow(): Promise<void> {
    const result = await this.sync.sync();
    await this.loadLastSyncedAt();

    if (result.ok) {
      const message =
        result.conflicts > 0
          ? this.i18n.t('account.syncedWithConflicts', { n: result.conflicts })
          : this.i18n.t('account.synced');
      const toast = await this.toastController.create({
        message,
        duration: 2500,
        color: result.conflicts > 0 ? 'warning' : 'success',
      });
      await toast.present();
      return;
    }

    if (result.reason === 'error') {
      const toast = await this.toastController.create({
        message: this.i18n.t('account.syncError'),
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    }
  }

  private async loadLastSyncedAt(): Promise<void> {
    this.lastSyncedAt.set(await this.sync.lastSyncedAt());
  }
}
