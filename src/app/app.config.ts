import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ItemDataService } from './core/services/items-data.service';

import { routes } from './app.routes';
import { ArrowLeft, Edit, LucideAngularModule, Plus, Trash2 } from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }),
     provideRouter(routes), 
    ItemDataService,
    importProvidersFrom(
      LucideAngularModule.pick({ Plus, Trash2, Edit, ArrowLeft }) // Register 'Plus' here
    )
  ]
};
