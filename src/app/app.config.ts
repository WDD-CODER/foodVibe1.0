import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { ArrowLeft, ArrowRight, ChevronDown, Edit, FlaskConical, Image, LucideAngularModule, Minus, Pencil, Plus, PlusCircle, Save, Scale, Search, ShieldAlert, Trash2, TrendingUp } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { AlertTriangle, ChevronLeft, Tag, X } from 'lucide-angular/src/icons';
import { provideHttpClient } from '@angular/common/http';
import { TranslationService } from '@services/translation.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    KitchenStateService,
    provideHttpClient(),
    {
      provide: APP_INITIALIZER,
      useFactory: (transService: TranslationService) => () => transService.loadGlobalDictionary(),
      deps: [TranslationService],
      multi: true
    },
    importProvidersFrom(
      LucideAngularModule.pick({
        Minus,
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
        ChevronLeft,
        Image,
        Search,
        PlusCircle,
        ChevronDown,
        
      }) // Register 'Plus' here
    )
  ]
};
