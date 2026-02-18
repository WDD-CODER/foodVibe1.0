import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RecipeBookListComponent } from './components/recipe-book-list/recipe-book-list.component';

@Component({
  selector: 'app-recipe-book-page',
  standalone: true,
  imports: [RecipeBookListComponent],
  templateUrl: './recipe-book.page.html',
  styleUrl: './recipe-book.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeBookPage {}
