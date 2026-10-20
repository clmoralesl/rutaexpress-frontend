
import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { Login } from './features/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { Shipments } from './features/shipments/shipments';
import { Landing } from './features/landing/landing';
import { RastreoComponent } from './features/rastreo/rastreo.component';
import { CatalogoComponent } from './features/catalogo/catalogo.component';
import { AuditoriaComponent } from './features/auditoria/auditoria.component';

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
    component: RastreoComponent
  },
  {
    path: 'rastreo/:codigo',
    component: RastreoComponent
  },
  {
    path: 'catalogo',
    component: CatalogoComponent
  },
  {
    path: 'auditoria',
    component: AuditoriaComponent
  },
  {
    path: 'auditoria/:envioId',
    component: AuditoriaComponent
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
