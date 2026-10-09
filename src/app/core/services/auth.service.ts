import { Injectable, signal } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<User | null>(null);
  private listening = false;

  constructor(private sb: SupabaseService) {}

  /** Se llama una vez que sb.client ya existe (después de init/tryAutoInit). */
  async init(): Promise<void> {
    if (!this.listening) {
      this.sb.client.auth.onAuthStateChange((_event, session) => {
        this.user.set(session?.user ?? null);
      });
      this.listening = true;
    }
    const { data: { session } } = await this.sb.client.auth.getSession();
    this.user.set(session?.user ?? null);
  }

  signIn(email: string, password: string) {
    return this.sb.client.auth.signInWithPassword({ email, password });
  }

  signUp(email: string, password: string) {
    return this.sb.client.auth.signUp({ email, password });
  }

  signOut() {
    return this.sb.client.auth.signOut();
  }
}
