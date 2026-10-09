import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  client!: SupabaseClient;
  /** true una vez que el cliente quedó creado (se hace automáticamente al arrancar). */
  ready = signal(false);

  init(url: string, key: string): void {
    this.client = createClient(url, key);
    this.ready.set(true);
  }
}
