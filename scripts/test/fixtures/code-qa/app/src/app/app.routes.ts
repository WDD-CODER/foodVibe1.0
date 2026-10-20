import { Routes } from '@angular/router'

export const routes: Routes = [
  { path: 'old-home', redirectTo: 'home', pathMatch: 'full' },
  { path: 'planted-dead', redirectTo: 'nowhere', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () => import('@pages/home/home.page').then(m => m.HomePage),
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage) },
      { path: 'broken', loadComponent: () => import('./pages/home/home.page').then(m => m.MissingPage) },
    ],
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
]
