
import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { Login } from './features/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { Shipments } from './features/shipments/shipments';
import { Landing } from './features/landing/landing';
import { RastreoProvisional } from './features/rastreo-provisional/rastreo-provisional';

export const routes: Routes = [
  {
    path: '',
    component: Landing,
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'rastreo',
    component: RastreoProvisional
  },
  {
    path: 'rastreo/:codigo',
    component: RastreoProvisional
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [MsalGuard]
  },
  {
    path: 'envios',
    component: Shipments,
    canActivate: [MsalGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
