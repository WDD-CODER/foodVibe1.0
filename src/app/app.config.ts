import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { ArrowLeft, ArrowRight, Edit, FlaskConical, LucideAngularModule, Pencil, Plus, Save, Scale, ShieldAlert, Trash2, TrendingUp } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { AlertTriangle, ChevronLeft, Tag, X } from 'lucide-angular/src/icons';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }),
  provideRouter(routes),
    KitchenStateService,
  importProvidersFrom(
    LucideAngularModule.pick({
      Plus,
      Trash2,
      Edit,
      ArrowLeft,
      Pencil,
      Save,
      ArrowRight,
      ShieldAlert,
      X,
      FlaskConical,
      TrendingUp,
      Scale,
      AlertTriangle,
      Tag,
      ChevronLeft
    }) // Register 'Plus' here
  )
  ]
};
