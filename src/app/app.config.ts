import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { LucideAngularModule, Search, Filter, Trash2, Plus, ChevronRight, X } from 'lucide-angular';
import { routes } from './app.routes';
import { ItemDataService } from './core/services/items-data.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), 
    ItemDataService,
    // Using importProvidersFrom ensures the internal hasIcon logic is initialized
    importProvidersFrom(
      LucideAngularModule.pick({ Search, Filter, Trash2, Plus, ChevronRight, X })
    )
  ]
};