# Control de Acceso - Backend

API en NestJS (TypeScript) para gestionar el control de acceso de multiples unidades residenciales con aislamiento por tenant.

## Stack principal
- NestJS + TypeScript
- TypeORM con PostgreSQL (modo `synchronize` solo en desarrollo)
- Autenticacion JWT + bcrypt

## Configuracion rapida
1. Instalar dependencias
   ```bash
   npm install
   ```
2. Variables de entorno (`backend/.env`)
   ```env
   DATABASE_URL=postgresql://usuario:password@host:puerto/base
   DB_SSL=true # o false si usas Postgres local
   JWT_SECRET=cualquier_clave_segura
   PORT=3000
   # Notificaciones (opcional, Twilio WhatsApp sandbox)
   TWILIO_ACCOUNT_SID=tu_sid
   TWILIO_AUTH_TOKEN=tu_token
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886 # número sandbox de Twilio
   TWILIO_WHATSAPP_DEFAULT_TO=whatsapp:+573001112233 # fallback destino
   ```
3. Levantar el backend
   ```bash
   npm run start:dev
   ```

> Puedes usar Neon, Supabase, Railway o Render para obtener un Postgres gratuito. Ajusta `DATABASE_URL` y `DB_SSL` segun el proveedor.

## Flujo multi-tenant y autenticacion
- Cada unidad residencial es un `tenant` con `name` y `slug`.
- Los porteros/administradores se registran y autentican por tenant.
- Toda peticion protegida debe incluir:
  - Cabecera `x-tenant-id: <uuid del tenant>`
  - Cabecera `Authorization: Bearer <token>`

### Endpoints disponibles
1. **Tenants**
   - `POST /api/tenants` - crea una unidad residencial (`name`, `slug`).
   - `GET /api/tenants` - lista los tenants.
2. **Auth**
   - `POST /api/auth/register` - registrar portero/admin (body: `tenantId`, `fullName`, `email`, `password`, `role?`). Ideal para crear el primer usuario de cada tenant.
   - `POST /api/auth/login` - iniciar sesion (`tenantSlug`, `email`, `password`). Devuelve `accessToken` + datos del usuario.
3. **Usuarios**
   - `GET /api/users/me` - devuelve el perfil del usuario autenticado.
4. **Residentes** *(requiere `x-tenant-id` + JWT)*
   - `POST /api/residents` - crear residente (`fullName`, `documentId`, `unitNumber`, etc.).
   - `GET /api/residents` - lista los residentes del tenant actual.
5. **Visitantes** *(requiere `x-tenant-id` + JWT)*
   - `POST /api/visitors` - registra una visita (nombre, documento, residente anfitrión opcional, motivo, etc.).
   - `GET /api/visitors?status=IN|OUT|PENDING|DENIED` - lista las visitas filtradas por estado.
   - `PATCH /api/visitors/:id/check-in` - marca ingreso y registra al usuario que autorizó.
   - `PATCH /api/visitors/:id/check-out` - registra la salida del visitante.
   - `PATCH /api/visitors/:id/deny` - rechaza la visita (opcionalmente con nota).

### Notificaciones por WhatsApp (opcional)
- Usa Twilio (WhatsApp sandbox) si configuras `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` y `TWILIO_WHATSAPP_FROM`.
- Envía un mensaje al registrar una visita. Destinatario:
  - `resident.phone` cuando la visita está asociada a un residente y tiene teléfono.
  - `TWILIO_WHATSAPP_DEFAULT_TO` como fallback para pruebas.
- Los números deben ir en formato `whatsapp:+<código_pais><numero>` y estar autorizados en el sandbox de Twilio.

## Procedimiento recomendado
1. Crear tenant (`POST /api/tenants`).
2. Registrar al primer administrador via `POST /api/auth/register`.
3. Iniciar sesion (`/api/auth/login`) para obtener `accessToken` y `tenantId`.
4. En cada request protegida, enviar `Authorization: Bearer <accessToken>` y `x-tenant-id: <tenantId>`.

## Proximos pasos
- Modulo de vehiculos y bitacora de eventos.
- Roles avanzados y permisos granulares.
- Migraciones y despliegues automatizados (Railway/Render/Fly).
- Dashboard frontend en React/Vite consumiendo estos endpoints.

Con esta base puedes operar multiples conjuntos residenciales con usuarios autenticados y datos aislados.
