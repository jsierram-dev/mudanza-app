import { Injectable } from '@angular/core';
import { en, TranslationKey } from '../i18n/en';
import { es } from '../i18n/es';
import { Locale, readStoredLocale, writeStoredLocale } from '../i18n/locale';

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => String(params[key] ?? ''));
}

/**
 * Inglés/español, ver ROADMAP-mudanza.md. El idioma queda fijo para toda la
 * sesión (se lee una sola vez, síncrono, ver locale.ts) — cambiarlo recarga
 * la página entera (setLocale), así LOCALE_ID (fijado en main.ts al
 * bootstrapear, de donde toma el idioma DatePipe) queda consistente sin
 * necesidad de manejarlo de forma reactiva en paralelo.
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  readonly locale: Locale = readStoredLocale();
  private readonly dict = this.locale === 'es' ? es : en;

  t(key: TranslationKey, params?: Record<string, string | number>): string {
    const template = this.dict[key];
    return params ? interpolate(template, params) : template;
  }

  setLocale(locale: Locale): void {
    if (locale === this.locale) return;
    writeStoredLocale(locale);
    document.location.reload();
  }
}
