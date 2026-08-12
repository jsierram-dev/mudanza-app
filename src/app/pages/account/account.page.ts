import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import type { ViewWillEnter } from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { AuthService, SyncService } from '../../core/services';

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
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonButton, IonIcon, RouterLink, DatePipe],
})
export class AccountPage implements AfterViewInit, ViewWillEnter {
  @ViewChild('googleButton') private googleButtonRef?: ElementRef<HTMLDivElement>;

  protected readonly auth = inject(AuthService);
  protected readonly sync = inject(SyncService);
  private readonly toastController = inject(ToastController);

  readonly loginError = signal<string | null>(null);
  readonly lastSyncedAt = signal<string | null>(null);

  ionViewWillEnter(): void {
    this.loadLastSyncedAt();
  }

  async ngAfterViewInit(): Promise<void> {
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
      this.loginError.set('No se pudo cargar el inicio de sesión de Google.');
    }
  }

  private async handleGoogleCredential(idToken: string): Promise<void> {
    this.loginError.set(null);
    try {
      await this.auth.loginWithGoogle(idToken);
      await this.syncNow();
    } catch {
      this.loginError.set('No se pudo iniciar sesión con Google.');
    }
  }

  logOut(): void {
    this.auth.logout();
  }

  async syncNow(): Promise<void> {
    const result = await this.sync.sync();
    await this.loadLastSyncedAt();

    if (result.ok) {
      const message =
        result.conflicts > 0
          ? `Sincronizado — ${result.conflicts} cambio(s) en conflicto sin resolver todavía`
          : 'Sincronizado';
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
        message: 'No se pudo sincronizar. Revisá tu conexión e intentá de nuevo.',
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
