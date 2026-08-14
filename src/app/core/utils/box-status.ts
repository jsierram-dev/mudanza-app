import { BoxStatus } from '../models';
import { TranslationKey } from '../i18n/en';

/**
 * Antes cada pantalla traducía el status a texto con `status.replace('_', ' ')`
 * — funcionaba en español "de casualidad" (in_transit → "in transit" se
 * colaba en inglés dentro de una UI en español, nadie lo había notado). Con
 * dos idiomas de verdad hace falta un mapeo real; centralizado acá para no
 * repetirlo en BoxesPage/BoxDetailPage/ConflictsPage.
 */
const STATUS_KEYS: Record<BoxStatus, TranslationKey> = {
  empty: 'boxStatus.empty',
  packed: 'boxStatus.packed',
  in_transit: 'boxStatus.in_transit',
  delivered: 'boxStatus.delivered',
  unpacked: 'boxStatus.unpacked',
};

export function boxStatusKey(status: BoxStatus): TranslationKey {
  return STATUS_KEYS[status];
}
