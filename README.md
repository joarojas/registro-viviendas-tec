# Registro de Viviendas — TEC (proyecto Angular)

Aplicación Angular con estilo visual institucional del Tecnológico de Costa Rica (encabezado azul marino, tarjetas blancas, sin efectos de vidrio ni colores neón), conectada automáticamente a Supabase — nadie tiene que pegar credenciales a mano.

## 1. Árbol de carpetas

```
tec-viviendas/
├── schema.sql                               # Esquema de Supabase
├── .github/workflows/deploy.yml             # Despliegue automático a GitHub Pages
├── supabase/functions/
│   ├── _shared/                             # Código común: correo (Gmail/Resend), CORS, utilidades
│   ├── enviar-reporte/index.ts              # Reporte de ocupación al correo de quien lo pide
│   └── confirmar-registro/index.ts          # Confirmación al correo del ocupante al registrarlo
├── tailwind.config.js                       # Paleta institucional (colores "tec")
├── postcss.config.js
├── angular.json
├── package.json
└── src/
    ├── index.html
    ├── styles.css                           # Tailwind + clases utilitarias
    ├── main.ts
    └── app/
        ├── app.component.ts / .html         # Raíz: decide login / app
        ├── app.config.ts
        ├── app.routes.ts                    # "/" y "/casas/:id"
        │
        ├── core/
        │   ├── config/
        │   │   └── supabase.config.ts       # URL y llave de Supabase (ver sección 4)
        │   ├── models/models.ts
        │   ├── services/
        │   │   ├── supabase.service.ts
        │   │   ├── auth.service.ts
        │   │   ├── casas.service.ts
        │   │   ├── departamentos.service.ts
        │   │   ├── registros.service.ts
        │   │   ├── reporte.service.ts
        │   │   ├── confirmacion.service.ts  # Llama a "confirmar-registro"
        │   │   └── toast.service.ts
        │   └── utils/date-utils.ts
        │
        ├── features/
        │   ├── auth/login/
        │   ├── layout/header/
        │   ├── dashboard/
        │   └── casa-detail/
        │
        └── shared/components/
            ├── toast/
            ├── agregar-casa-modal/
            ├── registro-form-modal/         # Ahora incluye el correo del ocupante
            └── cuarto-panel-modal/
```

Todos los componentes son **standalone** (sin `NgModule`).

## 2. Instalar y correr

```bash
npm install
npm start        # http://localhost:4200
```

Para producción: `npm run build` (genera `dist/tec-viviendas`).

## 3. La conexión a Supabase ya es automática

Ya no hay pantalla donde alguien tenga que pegar la URL ni la llave `anon`: viven en
`src/app/core/config/supabase.config.ts` y la app se conecta sola al arrancar.

**Importante: ese archivo apunta hoy a un proyecto de Supabase de PRUEBA.** Antes de usarlo con datos reales del TEC hay que:

1. Correr `schema.sql` en el proyecto de Supabase que se vaya a usar (SQL Editor → New query → pegar todo el archivo → Run).
2. Ir a **Project Settings → API** de ese proyecto y copiar su **Project URL** y su **anon public key**.
3. Reemplazar los dos valores en `src/app/core/config/supabase.config.ts`.
4. Volver a compilar (`npm run build`) o reiniciar `npm start`.

No hay que tocar nada más del código — toda la app lee la conexión desde ese único archivo.

## 4. Autenticación

- **Authentication → Providers → Email**: por defecto Supabase pide confirmar el correo antes de poder iniciar sesión. Si van a usar correos institucionales reales, dejarlo así. Para pruebas internas rápidas, se puede desactivar "Confirm email" ahí mismo.
- El botón "¿Sos nuevo? Crear cuenta" de la pantalla de login permite que cada persona se registre sola. Si prefieren controlarlo, créenlas manualmente desde **Authentication → Users → Add user** y quiten esa opción del componente de login.

## 5. Correos (reporte y confirmación al ocupante)

Hay dos funciones en `supabase/functions/` que comparten el código de envío (`_shared/`):

- **`enviar-reporte`** (botón "Enviar reporte"): manda a *quien lo pide* un resumen de cuartos ocupados ahora y de los que se desocupan en 7 días.
- **`confirmar-registro`** (automática al crear un registro): manda al *ocupante* su casa, cuarto y fechas. Si responde ese correo, la respuesta le llega a quien hizo el registro (`Reply-To`).

### 5.1 Preparar una cuenta de Gmail (gratis, sin dominio)
1. Usar una cuenta de Gmail dedicada al proyecto (idealmente no una personal).
2. **Gestionar tu cuenta de Google → Seguridad → Verificación en 2 pasos**: activarla.
3. En la misma sección, **Contraseñas de aplicaciones**: crear una llamada "Supabase". Google muestra una clave de 16 letras. Copiarla.

### 5.2 Desplegar las funciones
Instalar la CLI (`npm install -g supabase`), y desde la carpeta del proyecto:
```bash
supabase login
supabase link --project-ref mduvnzgreoemlhnubzgj
supabase secrets set GMAIL_USER=tu_cuenta@gmail.com
supabase secrets set GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
supabase functions deploy enviar-reporte
supabase functions deploy confirmar-registro
```
**Nunca** escribas la contraseña dentro del código ni la subas a GitHub: va únicamente en `supabase secrets set`.

### 5.3 Probar
Iniciar sesión en la app y presionar **"Enviar reporte"**: debe llegar un correo a tu propia cuenta. Si falla, el aviso muestra el motivo real; para más detalle, **Supabase → Edge Functions → (función) → Logs**.

### 5.4 Respaldo con Resend
Si `GMAIL_USER`/`GMAIL_APP_PASSWORD` no están definidos pero sí `RESEND_API_KEY`, las funciones usan Resend automáticamente. Ojo: con el remitente de pruebas (`onboarding@resend.dev`) Resend solo entrega a la cuenta dueña de la clave; para enviar a cualquiera hay que verificar un dominio.

### 5.5 Límites y notas de seguridad
- **Gmail personal: ~500 correos por día.** Sobra para este uso.
- **Supabase bloquea los puertos 25 y 587** en las Edge Functions; por eso se usa el 465 (TLS directo).
- Los correos pueden caer en spam la primera vez; pedir a los destinatarios que los marquen como "no es spam".
- Para producción real, lo ideal es un correo institucional del TEC o un dominio verificado, no una cuenta de Gmail.
- `confirmar-registro` exige sesión iniciada y **solo envía si existe un registro de los últimos 10 minutos con ese correo**, para que nadie pueda usarla como relé de correo.


## 6. Desplegar la página

La app es estática (HTML + JS): se puede publicar gratis. La conexión a Supabase ya va dentro del build, no hay que configurar variables.

### Opción A: GitHub Pages (automática, ya incluida)
1. Crear un repositorio en GitHub y subir el proyecto (`git init`, `git add .`, `git commit`, `git remote add origin ...`, `git push -u origin main`).
2. En el repositorio: **Settings → Pages → Source: "GitHub Actions"**.
3. Cada `git push` a `main` ejecuta `.github/workflows/deploy.yml`, que compila y publica. Queda en `https://<usuario>.github.io/<nombre-del-repo>/`.
4. Seguir el progreso en la pestaña **Actions** del repositorio.

### Opción B: Netlify (la más rápida: arrastrar y soltar)
```bash
npm run build
```
Entrar a [app.netlify.com/drop](https://app.netlify.com/drop) y arrastrar la carpeta `dist/tec-viviendas/browser`. El archivo `public/_redirects` ya está incluido para que las rutas de Angular funcionen al recargar.

### Después de desplegar (importante)
En **Supabase → Authentication → URL Configuration**:
- **Site URL**: la dirección pública de la app (si queda en `localhost`, los enlaces de los correos de confirmación de cuenta apuntarán a tu computadora).
- **Redirect URLs**: agregar la misma dirección.

### Cuentas de usuario y límite de correos de Supabase
Los correos de confirmación de cuenta que envía Supabase por su cuenta están muy limitados (unos pocos por hora). Para una demostración: en **Authentication → Providers → Email** desactivar **"Confirm email"**, o crear los usuarios a mano en **Authentication → Users → Add user** (marcando "Auto Confirm User").

Nota: con el registro abierto, cualquiera que conozca la dirección puede crear una cuenta y editar datos. Para uso real conviene desactivar el registro público (**Authentication → Providers → Email → "Allow new users to sign up"**) y crear las cuentas manualmente.

## 8. Estilo institucional TEC

- Paleta en `tailwind.config.js`, color `tec` (`tec-800` = azul marino principal, `tec-100` = fondo azul claro para "ocupado").
- Fondo gris muy claro, tarjetas blancas con borde gris (`.tec-card`), sin `backdrop-filter` ni degradados.
- Tipografía por defecto de Tailwind (`font-sans`), sin fuente monoespaciada.
- Estados "Libre" / "Ocupado" / "Activo" como etiquetas de texto (`.status-badge`), no puntos de color.

## 9. Qué se conservó de la versión anterior

- Validación de choques: en el cliente (`RegistrosService.buscarChoque`) y como respaldo el `exclusion constraint` de Postgres (`schema.sql`, código `23P01`).
- Máximo 10 cuartos por casa, en el formulario y en la base de datos.
- Registro por día completo o por horas, con "fijo" sin fecha de salida definida.
- Historial de cada cuarto con edición y borrado.

## 10. Editar y eliminar casas (nuevo)

Desde el detalle de una casa (botón **"Editar casa"**, junto al encabezado) ahora se puede:

- **Cambiar el número/identificador** de la casa.
- **Cambiar la cantidad de cuartos.** Si la aumentás, se agregan los cuartos que falten. Si la reducís, el sistema primero revisa si los cuartos que sobrarían tienen registros guardados (pasados o futuros); si tienen, **rechaza el cambio** y te dice cuántos hay, en vez de borrar información sin avisar.
- **Eliminar la casa completa.** Antes de borrar, te avisa cuántos registros de ocupación se van a perder (si hay alguno) y pide confirmación explícita. Al eliminar, sus cuartos y registros se borran automáticamente (así está definido en `schema.sql`, con `on delete cascade`).

## 11. Validación de entradas (nuevo)

Para que ningún dato raro rompa la página, ahora hay reglas explícitas por campo (`src/app/core/utils/validators.ts`):

| Campo | Regla |
|---|---|
| Número de casa | Letras, números, espacios y guiones. 1–20 caracteres. |
| Nombre de la persona | Letras (con acentos/ñ), espacios, apóstrofes y guiones. 2–80 caracteres. |
| Correo | Formato de correo válido. Máx. 120 caracteres. |
| Nombre de departamento | Letras, números y puntuación básica. 2–100 caracteres. |
| Cantidad de cuartos | Entero entre 1 y 10. |

Estas reglas se aplican tanto al crear como al editar, y cada input tiene además un `maxlength` que impide escribir más caracteres de la cuenta.

Como red de seguridad adicional, se agregó un **manejador global de errores** (`core/services/global-error-handler.ts`): si algo inesperado falla en cualquier parte de la app — un dato corrupto, una respuesta rara de Supabase, lo que sea — se muestra un aviso y la aplicación sigue funcionando, en vez de quedar en pantalla en blanco. También se blindaron las funciones de fecha (`date-utils.ts`) para que una fecha inválida se muestre como "—" en vez de romper el cálculo de la línea de tiempo.
