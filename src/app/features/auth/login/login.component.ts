import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  mode = signal<'signin' | 'signup'>('signin');
  email = '';
  password = '';
  message = signal<string | null>(null);
  messageKind = signal<'error' | 'success'>('error');

  constructor(private auth: AuthService) {}

  toggleMode(): void {
    this.mode.set(this.mode() === 'signup' ? 'signin' : 'signup');
    this.message.set(null);
  }

  async submit(): Promise<void> {
    if (!this.email.trim() || !this.password) {
      this.message.set('Completá correo y contraseña.');
      this.messageKind.set('error');
      return;
    }
    if (this.mode() === 'signup') {
      const { error } = await this.auth.signUp(this.email.trim(), this.password);
      if (error) {
        this.message.set(error.message);
        this.messageKind.set('error');
        return;
      }
      this.mode.set('signin');
      this.message.set('Cuenta creada. Si el proyecto pide confirmación por correo, revisá tu bandeja antes de entrar.');
      this.messageKind.set('success');
    } else {
      const { error } = await this.auth.signIn(this.email.trim(), this.password);
      if (error) {
        this.message.set(error.message);
        this.messageKind.set('error');
      }
      // Si no hay error, el AuthService actualiza el signal `user` y el
      // componente raíz cambia automáticamente a la app.
    }
  }
}
