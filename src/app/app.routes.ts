import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CasaDetailComponent } from './features/casa-detail/casa-detail.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'casas/:id', component: CasaDetailComponent },
  { path: '**', redirectTo: '' },
];
