import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MenuLibraryListComponent } from './components/menu-library-list/menu-library-list.component';

@Component({
  selector: 'app-menu-library-page',
  standalone: true,
  imports: [MenuLibraryListComponent],
  templateUrl: './menu-library.page.html',
  styleUrl: './menu-library.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuLibraryPage {}
