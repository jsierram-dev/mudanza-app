export type Locale = 'en' | 'es';

const STORAGE_KEY = 'mv-locale';

/**
 * Lectura síncrona a propósito (localStorage plano, no Ionic Storage — que
 * es async, respaldado por IndexedDB). LOCALE_ID (usado por DatePipe, etc.)
 * es un token de Angular que se fija una sola vez al bootstrapear la app —
 * necesitamos saber el idioma elegido ANTES de llamar a bootstrapApplication
 * (ver main.ts), así que no hay forma de esperar una lectura async acá sin
 * complicarse con un APP_INITIALIZER. Cambiar de idioma recarga la página
 * entera (ver TranslationService.setLocale) — es la forma más simple de que
 * todo lo que depende de LOCALE_ID quede consistente, sin duplicar esa
 * lógica de forma reactiva.
 */
export function readStoredLocale(): Locale {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'es' ? 'es' : 'en';
  } catch {
    return 'en'; // localStorage puede fallar (modo privado estricto, etc.) — inglés por defecto igual.
  }
}

export function writeStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Si no se puede persistir, el próximo arranque vuelve a inglés — no rompe nada.
  }
}
