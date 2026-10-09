import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SupabaseService } from './core/services/supabase.service';
import { AuthService } from './core/services/auth.service';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './core/config/supabase.config';
import { LoginComponent } from './features/auth/login/login.component';
import { HeaderComponent } from './features/layout/header/header.component';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, LoginComponent, HeaderComponent, ToastComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  constructor(public sb: SupabaseService, public auth: AuthService) {}

  async ngOnInit(): Promise<void> {
    // La conexión a Supabase es automática: no se le pide nada a la persona.
    this.sb.init(SUPABASE_URL, SUPABASE_ANON_KEY);
    await this.auth.init();
  }
}
