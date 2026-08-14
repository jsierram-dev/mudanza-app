import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, TranslatePipe],
})
export class TabsPage {}
