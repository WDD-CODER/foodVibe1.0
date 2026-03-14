import { APP_INITIALIZER, ApplicationConfig, ErrorHandler, importProvidersFrom, provideZoneChangeDetection } from '@angular/core'
import { GlobalErrorHandler } from './core/services/global-error.handler'
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, Archive, CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Circle, CircleCheck, CircleX, ClipboardList, CookingPot, Download, Edit, FileDown, FilePlus, Flame, FlaskConical, GripVertical, History, Image, LucideAngularModule, MapPin, Menu, Minus, Package, Pencil, Plus, PlusCircle, RotateCcw, Save, Scale, Search, Settings, ShieldAlert, Table2, Timer, Trash2, Truck, TrendingUp, Upload, Utensils, Tags, BookOpen, Copy, PanelRightClose, Filter, PanelLeftClose, Info, Printer, UtensilsCrossed, ChevronUp, Library, CircleUserRound, Eye, CookingPotIcon } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { AlertCircle, AlertTriangle, Tag, X, LogOut, ShoppingCart } from 'lucide-angular/src/icons';
import { provideHttpClient, withInterceptors } from '@angular/common/http'
import { authInterceptor } from './core/interceptors/auth.interceptor'
import { TranslationService } from '@services/translation.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    KitchenStateService,
    provideHttpClient(withInterceptors([authInterceptor])),
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
        MapPin,
        PanelRightClose,
        Filter,
        PanelLeftClose, 
        Info,
        Printer,
        UtensilsCrossed,
        ChevronUp,
        Circle,
        CircleCheck,
        CircleX,
        Library,
        Table2,
        ShoppingCart,
        LogOut,
        GripVertical,
        Archive,
        Download,
        Upload,
        CircleUserRound,
        ClipboardList,
        Settings,
        Eye,
        FileDown,
        CookingPotIcon
      })
    )
  ]
};

