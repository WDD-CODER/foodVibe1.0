import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MenuLibraryListComponent } from './components/menu-library-list/menu-library-list.component';
import { HeroFabService } from '@services/hero-fab.service';

@Component({
  selector: 'app-menu-library-page',
  standalone: true,
  imports: [MenuLibraryListComponent],
  templateUrl: './menu-library.page.html',
  styleUrl: './menu-library.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuLibraryPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly heroFab = inject(HeroFabService);

  ngOnInit(): void {
    this.heroFab.setPageActions(
      [{ labelKey: 'menu_new_event', icon: 'file-plus', run: () => this.router.navigate(['/menu-intelligence']) }],
      'replace'
    );
  }

  ngOnDestroy(): void {
    this.heroFab.clearPageActions();
  }
}
