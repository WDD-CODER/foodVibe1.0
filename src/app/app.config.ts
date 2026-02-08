import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { ArrowLeft, ArrowRight, Edit, LucideAngularModule, Pencil, Plus, Save, Trash2 } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }),
     provideRouter(routes), 
    KitchenStateService,
    importProvidersFrom(
      LucideAngularModule.pick({ Plus, Trash2, Edit, ArrowLeft, Pencil,Save,ArrowRight }) // Register 'Plus' here
    )
  ]
};
