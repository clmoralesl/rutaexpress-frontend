import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { Login } from './features/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { Landing } from './features/landing/landing';
import { RastreoComponent } from './features/rastreo/rastreo.component';
import { CatalogoComponent } from './features/catalogo/catalogo.component';
import { AuditoriaComponent } from './features/auditoria/auditoria.component';
import { ReportesComponent } from './features/reportes/reportes.component';

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
    path: 'cotizar',
    loadComponent: () => import('./features/cotizar/cotizar.component').then(m => m.CotizarComponent)
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
    path: 'reportes',
    component: ReportesComponent
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [MsalGuard]
  },
  {
    path: 'envios',
    loadComponent: () => import('./features/shipments/shipments').then(m => m.Shipments),
    canActivate: [MsalGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
