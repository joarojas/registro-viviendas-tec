import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { ToastService } from './toast.service';

/**
 * Red de seguridad: si algo revienta en cualquier parte de la app (un dato
 * raro, una respuesta inesperada de Supabase, etc.), esto evita que la
 * página quede en blanco. Se ve el aviso y la app sigue funcionando.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: unknown): void {
    // eslint-disable-next-line no-console
    console.error('Error no controlado:', error);
    try {
      const toast = this.injector.get(ToastService);
      toast.show('Ocurrió un error inesperado. La página sigue funcionando; si algo se ve mal, recargá.', 'error');
    } catch {
      // si ni siquiera se pudo mostrar el toast, al menos ya quedó en consola
    }
  }
}
