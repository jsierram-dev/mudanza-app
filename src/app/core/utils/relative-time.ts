import { TranslationKey } from '../i18n/en';

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** "2 min ago" / "3 h ago" / "5 d ago" — suficiente para la pantalla de conflictos, sin traer una librería aparte. t = TranslationService.t. */
export function formatRelativeTime(iso: string, t: TranslateFn): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return t('common.justNow');
  if (minutes < 60) return t('common.minutesAgo', { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t('common.hoursAgo', { n: hours });
  const days = Math.round(hours / 24);
  return t('common.daysAgo', { n: days });
}
