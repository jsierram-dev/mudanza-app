import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../services/translation.service';
import { TranslationKey } from './en';

/** {{ 'moves.empty' | translate }} / {{ 'moves.deleteConfirm' | translate: { name: move.name } }} */
@Pipe({ name: 'translate' })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(TranslationService);

  transform(key: TranslationKey, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
