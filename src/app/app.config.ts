import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, CalendarClock, ChevronDown, ChevronLeft, ChevronRight, CookingPot, Edit, FilePlus, Flame, FlaskConical, History, Image, LucideAngularModule, MapPin, Menu, Minus, Package, Pencil, Plus, PlusCircle, RotateCcw, Save, Scale, Search, ShieldAlert, Timer, Trash2, Truck, TrendingUp, Utensils, Tags, BookOpen, Copy } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { AlertCircle, AlertTriangle, Tag, X } from 'lucide-angular/src/icons';
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
        AlertCircle,
        AlertTriangle,
        Tag,
        Tags,
        ChevronLeft,
        ChevronRight,
        Image,
        Search,
        PlusCircle,
        FilePlus,
        Utensils,
        ChevronDown,
        Timer,
        Menu,
        ArrowUpDown,
        ArrowUp,
        ArrowDown,
        Truck,
        Package,
        CalendarClock,
        RotateCcw,
        History,
        BookOpen,
        Copy,
        Flame,
        CookingPot,
        MapPin
      })
    )
  ]
};
