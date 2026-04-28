# CRM External Sales - Sistema de Gestión Completo

> **Actualización (documentación, abril 2026):** se describen los **estados lógicos** de reservas, la **política de cancelación** (plazos 48 h / 24 h, penalidad informativa fuera de plazo y `acknowledge_late_cancellation` en `PUT`), campos `is_within_cancellation_lead` / `late_cancellation_*`, el endpoint **`GET /api/transfers/slot-availability`**, las utilidades `reservation-lifecycle` y `reservation-cancellation-policy`, y el **contrato `PUT` de reservas** (anulación vía `state: "cancelled"`). Incluye notas de **UI/Front** (listado, detalle, crear reserva) y de **formato** del código (Prettier, orden de imports).

## 🚀 Endpoints Implementados

He creado un sistema completo de gestión para tu CRM que incluye usuarios, tours y transfers. Los siguientes endpoints están implementados:

### 🔐 Autenticación

- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/logout` - Cerrar sesión
- `POST /api/auth/change-password` - Cambiar contraseña
- `POST /api/auth/forgot-password` - Solicitar restablecimiento
- `POST /api/auth/reset-password` - Restablecer contraseña

### 👥 Gestión de Usuarios

- `GET /api/users` - Listar usuarios (solo admin)
- `POST /api/users` - Crear nuevo usuario (solo admin)
- `GET /api/users/[username]` - Obtener usuario específico por username
- `PUT /api/users/[username]` - Actualizar usuario por username
- `DELETE /api/users/[username]` - Eliminar usuario por username (solo admin, mantiene registro en Auth para auditorías)

### 👤 Perfil de Usuario

- `GET /api/user` - Obtener perfil actual (información personal)
- `PUT /api/user` - Actualizar perfil actual (solo phone y email)
- `DELETE /api/user` - Eliminación deshabilitada (solo admin puede eliminar)

### 🎯 Gestión de Tours

- `GET /api/tours` - Listar tours disponibles (con filtros: type, name, availability, paginación)
- `GET /api/tours/:id` - Obtener un tour específico por ID (con sus imágenes)
- `POST /api/tours` - Crear nuevo tour con imágenes en un solo request (solo admin, multipart/form-data)
- `PUT /api/tours/:id` - Actualizar tour existente (solo admin)
- `DELETE /api/tours/:id` - Eliminar tour y sus imágenes relacionadas (solo admin)

#### 📸 Gestión de Imágenes de Tours

- `GET /api/tours/:id/images` - Listar todas las imágenes de un tour
- `POST /api/tours/:id/images` - Agregar imagen a un tour (solo admin)
- `PUT /api/tours/:id/images/:imageId` - Actualizar imagen (solo admin)
- `DELETE /api/tours/:id/images/:imageId` - Eliminar imagen (solo admin)

#### 🕒 Gestión de Horarios de Tours (Schedules)

- `GET /api/tours/:id/schedules` - Listar horarios de un tour
- `POST /api/tours/:id/schedules` - Agregar uno o varios horarios (solo admin)
- `PUT /api/tours/:id/schedules/:scheduleId` - Actualizar horario (solo admin)
- `DELETE /api/tours/:id/schedules/:scheduleId` - Eliminar horario (solo admin)

#### 🎫 Cupos por franja (misma fecha y hora de salida)

- `GET /api/tours/:id/slot-availability?date=YYYY-MM-DD&time=HH:MM` — Responde `capacity` (igual a `tour.spots` en el catálogo, **fijo**), `used` (suma de `people` en reservas **no canceladas** con ese `tour_id`, `date` y `time`) y `remaining`. Requiere autenticación. La misma lógica valida el **POST** y el **PUT** de reservas: **no** se modifica `tour.spots` al crear, editar o cancelar.

#### 📤 Subida de Archivos

- `POST /api/upload` - Subir imagen local a Supabase Storage (solo admin)

### 🚗 Gestión de Transfers

- `GET /api/transfers` - Listar transfers disponibles (con filtros: make, category, availability, paginación)
- `POST /api/transfers` - Crear nuevo transfer (solo admin)
- `PUT /api/transfers/:id` - Actualizar transfer existente (solo admin)
- `DELETE /api/transfers/:id` - Eliminar transfer (solo admin)
- `GET /api/transfers/slot-availability?date=YYYY-MM-DD&time=HH:MM&tour_id=…` - Matrículas **no disponibles** para una reserva propuesta: solape temporal con otra reserva activa usando transfer, con ventana de ocupación = **inicio** → **fin del servicio (según `tour.duration`)** + colchón de retorno/movilidad (por defecto **2 h**, `TRANSFER_POST_SERVICE_BUFFER_HOURS`). Misma lógica que al guardar el transfer en **POST/PUT** reservas.

### 🏢 Gestión de Proveedores (Suppliers)

- `POST /api/suppliers` - Crear proveedor (solo admin)
- `GET /api/suppliers` - Listar proveedores (admin y agent; filtros: company, service, paginación)
- `GET /api/suppliers/:corporate` - Obtener proveedor por cédula jurídica (admin y agent)
- `PUT /api/suppliers/:corporate` - Actualizar proveedor (solo admin)
- `DELETE /api/suppliers/:corporate` - Eliminar proveedor (solo admin; bloqueado si hay tours/transfers asociados)

### 📅 Gestión de Reservas

- `POST /api/reservations` - Crear reserva (rol **agent** o **admin**). Calcula `tour_amount`, `transfer_amount`, `subtotal`, `iva`, `total` a partir de `tour` y `transfer`. Cuerpo validado con `CreateReservationSchema` (`tour_id`, `people`, `date` ISO 8601, `time` en `HH:MM`, `hotel_reservation`, `note`, `transfer_id` opcional, `iva_rate` por defecto 0.13, `discount` por defecto 0).
  - **Cupo por franja (fecha + hora de salida):** no se modifica `tour.spots` al guardar. Se exige que la suma de `people` de las reservas **no canceladas** con el mismo `tour_id`, `date` y `time` más la nueva reserva no supere `tour.spots` (errores **400** con mensaje de cupo, p. ej. `SlotCapacityError`).
- `GET /api/reservations` - Listar con filtros (`date`, rango `dateFrom`/`dateTo`, `state`, `transfer_id`, búsqueda `q`, paginación). El **admin** ve todas; los **agentes** solo sus reservas.
- `GET /api/reservations/:id` - Detalle (admin o dueño de la reserva).
- `PUT /api/reservations/:id` - **Admin:** puede modificar `people`, `tour_id`, `transfer_id`, `date`, `time`, `hotel_reservation`, `note` y recalcula montos según corresponda; además **solo** puede fijar `state` a cancelación: `state: "cancelled"` (con `cancellation_reason` obligatorio vía `UpdateReservationSchema`). No se acepta otro `state` en el cuerpo. Valida franja al guardar salvo que se esté **cancelando** (al sumar cupo, excluye la fila actual). **Agente (dueño):** solo anulación con motivo (`state: "cancelled"` + `cancellation_reason`) o `note` (sin tocar `tour_id`, `date`, `people`, etc.).

#### Estados de reserva (respuesta JSON) — cálculo automático

En **todas** las respuestas donde se devuelve una reserva, el campo `state` es el **estado lógico** (no hace falta fijar manual `pending` / `in_progress` / `completed`):

| Valor            | Criterio |
|------------------|----------|
| `cancelled`      | Reserva persistida como cancelada en BD. |
| `pending`        | No cancelada y el instante actual es **anterior** al inicio del turno. |
| `in_progress`    | No cancelada, ya comenzó el turno y aún no termina el intervalo (inicio + duración derivada de `tour.duration`; ver `src/lib/reservation-lifecycle.ts`). |
| `completed`      | No cancelada e instante actual ≥ fin del intervalo del turno. |

**Hora de inicio del turno (importante):** el día sale de `date` (como en API) y la hora del selector (`time` en HH:MM) se interpreta como **hora local de operación**, no como UTC puro. Por defecto se usa **UTC−6** (Costa Rica, sin horario de verano). Variable de entorno opcional: `RESERVATION_UTC_OFFSET_HOURS` (número entero entre -12 y 14; por defecto `-6`). Así “10:25” coincide con la mañana local y el estado **en curso** no pasa a **completada** mientras no termine la ventana (inicio + duración del tour).

En BD el campo almacenado distingue básicamente “cancelada” frente a “no cancelada”; el resto se **calcula** al serializar. Los filtros `?state=pending|in_progress|completed|cancelled` se aplican según esos criterios (para los tres primeros, la capa de listado aplica el cálculo sobre las filas no canceladas).

#### Política de cancelación (anticipación mínima y anulación fuera de plazo)

Se mide el tiempo restante hasta el **inicio del servicio** (mismo `date`+`time` de la reserva) frente al **tour** vigente:

- **Operación externa** (`tour.supplier_corporate` distinto al interno: `INTERNAL_SUPPLIER_CORPORATE` en `src/lib/internal-supplier.ts`): plazo mínimo **48 horas**.
- **Operación interna:** plazo mínimo **24 horas**.

- **Dentro del plazo:** `PUT` con `state: "cancelled"`, `cancellation_reason` y sin requisito extra.
- **Fuera del plazo (interna o externa):** aplica el mismo criterio de penalidad informativa: si faltan menos de **24 h** (tour de operación interna) o menos de **48 h** (operación externa) hasta el inicio, se anula con `acknowledge_late_cancellation: true` y el monto in `late_cancellation_penalty_usd` (default **20** USD, `LATE_CANCELLATION_PENALTY_USD`). Si falta el reconocimiento, **400** con `code: "LATE_CANCELLATION_ACK_REQUIRED"`.

Lógica: `src/lib/reservation-cancellation-policy.ts`.

#### Campos adicionales en respuestas (política de anulación)

En **GET** listado, **GET** por id y en **PUT/POST** de reservas, cada ítem incluye:

- `is_within_cancellation_lead: boolean` — si queda al menos el plazo mínimo (o la fila no aplica, p. ej. sin tour o ya cancelada en BD).
- `is_internal_operation: boolean` — `true` si `tour.supplier_corporate` corresponde al proveedor de operación interna (`INTERNAL_SUPPLIER_CORPORATE` en `internal-supplier.ts`). La comparación en servidor acepta `BigInt` / `number` / `string` para no clasificar mal el tour.
- `cancellation_lead_hours: number` — **24** (interna), **48** (externa) o **0** si no aplica; plazo mínimo de anticipación para anular sin penalidad informativa.
- `late_cancellation_penalty_usd: number` — monto informativo de penalidad (0 si está dentro de plazo).
- `late_cancellation_notice: string | null` — texto informativo si aplica penalidad; la UI lo usa en el flujo de cancelar.
- `cancel_forbidden_reason: null` — reservado para compatibilidad; ya no indica bloqueo de anulación.

#### Cambios recientes documentados (reservas)

- Estados efectivos y duración a partir de `tour.duration` (mapeo por categoría de duración en catálogo).
- Filtro de listado por `in_progress` y coherencia con estados lógicos.
- Restricción de **PUT** a cancelación manifiesta (`state` solo `cancelled`) frente a edición de otros “estados” manuales.
- Reportes: agregación “por estado” y filtros con `estado` usan el mismo criterio de estado efectivo cuando aplica; ver `construirWhereClause` y `agregarReservasPorEstado` en el código.

### 🛠️ Herramientas de Desarrollo

- `GET /api/dev/reset-rate-limit` - Ver estadísticas de rate limiting (solo en desarrollo)
- `POST /api/dev/reset-rate-limit` - Resetear rate limiting (solo en desarrollo)

## 📁 Archivos Creados

### Esquemas de Validación

- `src/app/schemas/user.schema.ts` - Esquemas Zod para validación de usuarios
- `src/app/schemas/tour.schema.ts` - Esquemas Zod para validación de tours
- `src/app/schemas/tour-image.schema.ts` - Esquemas Zod para validación de imágenes de tours
- `src/app/schemas/transfer.schema.ts` - Esquemas Zod para validación de transfers
- `src/app/schemas/supplier.schema.ts` - Esquemas Zod para validación de proveedores
- `src/app/schemas/report.schema.ts` - Esquemas Zod para validación de reportes
- `src/app/schemas/reservation.schema.ts` - Esquemas Zod para validación de reservas

### Endpoints de API

**Autenticación:**
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/change-password/route.ts`
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`

**Usuarios:**
- `src/app/api/users/route.ts` (incluye POST para crear usuarios)
- `src/app/api/users/[username]/route.ts`
- `src/app/api/user/route.ts`

**Tours:**
- `src/app/api/tours/route.ts` (GET y POST)
- `src/app/api/tours/[id]/route.ts` (PUT y DELETE)
- `src/app/api/tours/[id]/images/route.ts` (GET y POST de imágenes)
- `src/app/api/tours/[id]/images/[imageId]/route.ts` (PUT y DELETE de imágenes)
- `src/app/api/tours/[id]/schedules/route.ts` (GET y POST de horarios)
- `src/app/api/tours/[id]/schedules/[scheduleId]/route.ts` (PUT y DELETE de horarios)
- `src/app/api/tours/[id]/slot-availability/route.ts` (GET — cupo usado y libre por `date` + `time`)

**Upload:**
- `src/app/api/upload/route.ts` (POST para subir imágenes)

**Transfers:**
- `src/app/api/transfers/route.ts` (GET y POST)
- `src/app/api/transfers/[id]/route.ts` (PUT y DELETE)
- `src/app/api/transfers/slot-availability/route.ts` (GET — matrículas ocupadas en una franja)

**Proveedores:**
- `src/app/api/suppliers/route.ts` (GET - listar; POST - crear)
- `src/app/api/suppliers/[corporate]/route.ts` (GET - obtener; PUT - actualizar; DELETE - eliminar)

**Reservas:**
- `src/app/api/reservations/route.ts` (GET — listar; POST — crear con montos, `iva_rate`/`discount` y validación de **cupo por franja** sin mutar `tour.spots`)
- `src/app/api/reservations/[id]/route.ts` (GET — por ID; PUT — admin o agente dueño, con reglas de franja y motivo de cancelación)

**Reportes:**
- `src/app/api/reports/route.ts` (GET - generar reportes con métricas; solo admin)

**Desarrollo:**
- `src/app/api/dev/reset-rate-limit/route.ts` (GET/POST - herramientas de rate limit en desarrollo)

### Middleware y Utilidades

- `src/lib/auth-middleware.ts` - Middleware de autenticación mejorado
- `src/lib/reservation-slot-availability.ts` - Suma de personas por franja (tour + fecha + hora) y comprobación frente a `tour.spots`; ventana de ocupación de **transfer** (servicio + colchón de retorno) y solapamiento entre reservas
- `src/lib/reservation-lifecycle.ts` - Inicio de turno, fin aproximado a partir de `tour.duration`, estados lógicos `pending` / `in_progress` / `completed` para API
- `src/lib/reservation-cancellation-policy.ts` - Plazos mínimos 48 h / 24 h, penalidad informativa fuera de plazo, campos en respuestas y validación de `acknowledge_late_cancellation` en `PUT` al cancelar
- `src/lib/internal-supplier.ts` - Cédula corporativa fija de “operación interna” (tours/transfers y política de cancelación)
- `src/lib/api.ts` - Cliente Axios (`tourService.getSlotAvailability`, `reservationService`, etc.)
- `src/hooks/useAuth.ts` - Hooks de React para autenticación

## ⚙️ Configuración Requerida

### 1. Variables de Entorno

Crea un archivo `.env.local` con las siguientes variables:

```env
# Base de datos PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/crm_external_sales"
DIRECT_URL="postgresql://username:password@localhost:5432/crm_external_sales"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# API
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# Reservas (opcional) — penalidad informativa USD al anular fuera del plazo mínimo (default 20)
# LATE_CANCELLATION_PENALTY_USD=20
# Tras el fin lógico del servicio (duración del tour), horas adicionales en que el transfer sigue contando como ocupado (retorno; default 2)
# TRANSFER_POST_SERVICE_BUFFER_HOURS=2
```

### 2. Regenerar Cliente de Prisma

Ejecuta el siguiente comando para regenerar el cliente de Prisma:

```bash
npx prisma generate
```

### 3. Ejecutar Migraciones

Si hay cambios en el esquema, ejecuta:

```bash
npx prisma db push
```

## 🔧 Características Implementadas

### ✅ Autenticación Completa

- Registro con validación de datos
- Login con Supabase Auth
- Logout seguro
- Cambio de contraseña
- Restablecimiento de contraseña por email

### ✅ Gestión de Roles

- **Admin**: Acceso completo a todos los endpoints
- **Agent**: Acceso limitado según permisos
- **Customer**: Acceso básico a su perfil

### ✅ Validación de Datos

- Esquemas Zod para todas las entradas
- Validación de emails únicos
- Validación de usernames únicos
- Validación de contraseñas seguras
- Validación de datos de tours y transfers

### ✅ Gestión de Tours

- CRUD completo de tours
- Filtros dinámicos (type, name, availability)
- Paginación automática
- Validación de proveedores asociados
- Protección de eliminación si hay reservas
- Validación de nombres únicos
- Incluye información del supplier
- **Gestión de múltiples imágenes por tour**
- **Imagen de portada (cover)** por tour
- **Ordenamiento de imágenes** personalizado

### ✅ Gestión de Transfers

- CRUD completo de transfers
- Filtros dinámicos (make, category, availability)
- Paginación automática
- Validación de proveedores asociados
- Protección de eliminación si hay reservas
- Validación de placas únicas
- Incluye información del supplier

### ✅ Gestión de Proveedores

- Listado de proveedores con filtros (company, service)
- Búsqueda por cédula jurídica (corporate)
- Paginación automática
- Ordenamiento por nombre de empresa
- Incluye conteo de tours y transfers asociados
- Acceso restringido a admin y agent
- Validación de longitud mínima en filtros (2 caracteres)

### ✅ Gestión de Reportes

- Generación de reportes por período (trimestral, semestral, anual, personalizado)
- Métricas agregadas (reservas canceladas/no canceladas, ingresos, descuentos, IVA)
- Tours más y menos solicitados
- Clientes recurrentes
- Filtros por fecha, tour, estado, usuario
- Acceso restringido solo a administradores
- Datos en tiempo real desde la base de datos

### ✅ Gestión de Reservas

- Creación con cálculo de precios, IVA y descuento (`iva_rate`, `discount` en el cuerpo del POST)
- **Cupo por franja:** el campo `tour.spots` es el máximo por **turno** (misma fecha y hora); las reservas activas se suman; **no** se descuenta el tour al crear o cancelar
- **Estados lógicos** en JSON (`pending`, `in_progress`, `completed`, `cancelled`) según reloj y duración de catálogo; en BD destaca la cancelación
- **Política de cancelación** 48 h (externa) / 24 h (interna); respuestas con `is_within_cancellation_lead`, `is_internal_operation`, `cancellation_lead_hours`, `late_cancellation_penalty_usd` y `late_cancellation_notice`
- Integración de Tours y Transfers en la misma reserva; comprobación de **transfer** en franja
- Validación de servicios; errores de cupo **400** si el turno se llena; **400** al cancelar fuera de plazo sin `acknowledge_late_cancellation: true`
- Protección por roles; **PUT** con `state` solo para `cancelled`; listado con filtros por estado lógico

### ✅ Seguridad

- Middleware de autenticación con tokens JWT
- Verificación de permisos por roles
- Protección contra ataques comunes

### ✅ Utilidades Frontend

- Cliente Axios configurado; `tourService.getSlotAvailability` y `reservationService` en `api.ts`
- Hooks de React para autenticación
- Manejo automático de tokens
- Utilidades para localStorage

## 📝 Uso en el Frontend

### Hook de Autenticación

```typescript
import { useAuth } from '@/hooks/useAuth';

function LoginComponent() {
  const { login, user, loading, error } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    const result = await login(email, password);
    if (result.success) {
      // Usuario logueado exitosamente
    }
  };

  return (
    // Tu componente de login
  );
}
```

### Servicios de API

```typescript
import { authService, userService } from "@/lib/api";

// Login
const response = await authService.login({ email, password });

// Obtener usuarios (solo admin)
const users = await userService.getUsers({ page: 1, limit: 10 });
```

### Ejemplos de Uso para Tours

```typescript
// GET /api/tours - Obtener todos los tours con filtros
const response = await fetch('/api/tours?type=EcoTour&availability=available&page=1&limit=10', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// POST /api/tours - Crear tour con imágenes (solo admin, multipart/form-data)
const tourData = {
  name: "Tour de Aventura",
  description: "Un tour emocionante por las montañas",
  type: "Adventure",
  availability: "available",
  base_price: 50000,
  day: "Monday",
  time: "09:00",
  spots: 20,
  requirements: "Buena condición física",
  duration: "4 horas",
  difficulty: "Media",
  supplier_corporate: 123
};

const formData = new FormData();
formData.append('tour', JSON.stringify(tourData));
formData.append('images', file1);
formData.append('images', file2);
formData.append('alts[]', 'Vista panorámica');
formData.append('alts[]', 'Senderismo');
formData.append('sort_orders[]', '0');
formData.append('sort_orders[]', '1');
formData.append('is_covers[]', 'true');
formData.append('is_covers[]', 'false');

const createResponse = await fetch('/api/tours', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

// PUT /api/tours/:id - Actualizar un tour
const updateResponse = await fetch('/api/tours/1', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ spots: 25 })
});

// DELETE /api/tours/:id - Eliminar un tour
const deleteResponse = await fetch('/api/tours/1', {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### Ejemplos de Uso para Imágenes de Tours

```typescript
// GET /api/tours/:id/images - Obtener todas las imágenes de un tour
const imagesResponse = await fetch('/api/tours/1/images', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// POST /api/tours/:id/images - Agregar imagen a un tour (solo admin)
const newImage = {
  path: "https://ejemplo.com/imagen.jpg",
  alt: "Descripción de la imagen",
  is_cover: true,
  sort_order: 0
};

const createImageResponse = await fetch('/api/tours/1/images', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(newImage)
});

// PUT /api/tours/:id/images/:imageId - Actualizar imagen (solo admin)
const updateImageResponse = await fetch('/api/tours/1/images/5', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ alt: "Nueva descripción", is_cover: true })
});

// DELETE /api/tours/:id/images/:imageId - Eliminar imagen (solo admin)
const deleteImageResponse = await fetch('/api/tours/1/images/5', {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### Ejemplos de Uso para Upload de Imágenes

```typescript
// POST /api/upload - Subir una imagen local a Supabase Storage (solo admin)
// Importante: Usar FormData para este endpoint
const formData = new FormData();
const fileInput = document.querySelector('input[type="file"]');
if (fileInput.files && fileInput.files[0]) {
  formData.append('file', fileInput.files[0]);
  
  const uploadResponse = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // NO agregar Content-Type header, el browser lo hace automáticamente con FormData
    },
    body: formData
  });
  
  const uploadData = await uploadResponse.json();
  // uploadData.data.path contiene la URL pública de la imagen
  
  // Ahora puedes usar esa URL para agregar la imagen al tour
  const imageResponse = await fetch('/api/tours/1/images', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      path: uploadData.data.path,
      alt: "Imagen subida",
      is_cover: true
    })
  });
}
```

### Ejemplos de Uso para Transfers

```typescript
// GET /api/transfers - Obtener todos los transfers con filtros
const response = await fetch('/api/transfers?make=Toyota&category=Luxury&page=1&limit=10', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// POST /api/transfers - Crear un nuevo transfer (solo admin)
const newTransfer = {
  license_plate: 12345,
  availability: "available",
  make: "Toyota",
  model: "Hiace",
  category: "Comfort",
  capacity: 12,
  type: "Van",
  base_price: 200000,
  sale_price: 220000,
  supplier_corporate: 123
};

const createResponse = await fetch('/api/transfers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(newTransfer)
});

// PUT /api/transfers/:id - Actualizar un transfer
const updateResponse = await fetch('/api/transfers/12345', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ availability: "busy" })
});

// DELETE /api/transfers/:id - Eliminar un transfer
const deleteResponse = await fetch('/api/transfers/12345', {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Ejemplos de Uso para Reservas

```typescript
// POST /api/reservations - Crear una nueva reserva
const reservationData = {
  tour_id: 1,
  people: 2,
  date: "2023-12-25T12:00:00.000Z", // ISO (misma convención que el formulario: mediodía UTC del día)
  time: "09:30", // HH:MM (hora de salida del turno)
  hotel_reservation: 101,
  note: "Cliente VIP, requiere silla de bebé",
  transfer_id: 12345, // Opcional
  iva_rate: 0.13,
  discount: 0,
};

const createReservationResponse = await fetch('/api/reservations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(reservationData)
});

const result = await createReservationResponse.json();
if (result.success) {
  console.log("Reserva creada:", result.data);
  // data: tour_amount, transfer_amount, subtotal, iva, total, state (lógico), is_within_cancellation_lead, late_cancellation_*, etc.
}

// GET /api/tours/:id/slot-availability — cupo del turno antes de enviar personas
const slot = await fetch(
  "/api/tours/1/slot-availability?date=2023-12-25&time=09%3A30",
  { headers: { Authorization: `Bearer ${token}` } }
);
// { success, data: { capacity, used, remaining } } — capacity = tour.spots (fijo)

// GET /api/reservations - Buscar con filtros (state: pending | in_progress | completed | cancelled)
const searchResponse = await fetch('/api/reservations?date=2023-12-25&state=pending', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// GET /api/reservations/:id - Obtener una reserva por ID
const getById = await fetch('/api/reservations/1', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// PUT /api/reservations/[id] - Admin: actualizar datos o cancelar. Agente: solo nota o cancelar.
// Edición de montos / tour / fechas (solo admin):
const updateResponse = await fetch('/api/reservations/1', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    people: 3,
    note: "Cliente agregó una persona más"
  })
});

// Cancelar (admin o agente dueño; motivo obligatorio). Fuera del plazo 48h/24h, añadir acknowledge:
const cancelResponse = await fetch('/api/reservations/1', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    state: "cancelled",
    cancellation_reason: "Cliente canceló por clima",
    // acknowledge_late_cancellation: true  // si GET indica is_within_cancellation_lead: false
  })
});
// Respuesta: data.state "cancelled"; is_within_cancellation_lead en futuras lecturas según corresponda
```
### Ejemplos de Uso para Proveedores

```typescript
// GET /api/suppliers - Obtener todos los proveedores con filtros (solo admin y agent)
const response = await fetch('/api/suppliers?company=Tour&service=Transport&page=1&limit=10', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// GET /api/suppliers/:corporate - Obtener un proveedor específico por cédula jurídica
const supplierResponse = await fetch('/api/suppliers/123456789', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// POST /api/suppliers - Crear proveedor (solo admin)
const createSupplier = await fetch('/api/suppliers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    corporate: 123456789,
    company: "Proveedor X",
    phone: "8888-8888",
    email: "contacto@proveedorx.com",
    service: "Transport"
  })
});

// PUT /api/suppliers/:corporate - Actualizar proveedor (solo admin)
const updateSupplier = await fetch('/api/suppliers/123456789', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ phone: "2222-2222" })
});

// DELETE /api/suppliers/:corporate - Eliminar proveedor (solo admin)
const deleteSupplier = await fetch('/api/suppliers/123456789', {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Ejemplos de Uso para Reportes

```typescript
// GET /api/reports - Reporte trimestral (solo admin)
const reportResponse = await fetch('/api/reports?tipo_reporte=trimestral', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// GET /api/reports - Reporte personalizado con filtros
const customReport = await fetch('/api/reports?fecha_inicio=2024-01-01&fecha_fin=2024-12-31&estado=confirmada&limit=500', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// GET /api/reports - Reporte por tour específico
const tourReport = await fetch('/api/reports?tipo_reporte=anual&tourId=123', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Ejemplos de Uso para Schedules de Tours

```typescript
// GET /api/tours/:id/schedules - Listar horarios del tour
const schedules = await fetch('/api/tours/1/schedules', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// POST /api/tours/:id/schedules - Agregar horarios (solo admin)
const addSchedules = await fetch('/api/tours/1/schedules', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify([
    { weekday: "Monday", start_time: "09:00" },
    { weekday: "Wednesday", start_time: "14:00" }
  ])
});
```

## 🚨 Notas Importantes

1. **Regenerar Prisma**: Es crucial ejecutar `npx prisma generate` después de estos cambios
2. **Variables de Entorno**: Configura todas las variables de Supabase correctamente
3. **Permisos**: 
   - Los endpoints de gestión de usuarios requieren rol de admin
   - Los endpoints de Tours y Transfers requieren rol de admin
   - Los endpoints de Proveedores requieren rol de admin o agent
   - Los endpoints de Reportes requieren rol de admin (RF-RP5)
   - **Nota**: Si necesitas agregar un rol "supplier" específico, deberás modificar el enum `user_role` en el schema de Prisma
4. **Validación**: Todos los datos de entrada están validados con Zod
5. **Seguridad**: Los tokens se manejan automáticamente en el frontend
6. **Tours y Transfers**: Todos los endpoints están protegidos con autenticación JWT
7. **Relaciones**: Tours y Transfers están asociados a Suppliers mediante `supplier_corporate`

## 📸 Guía para Subir Imágenes en Postman

### Opción 1: Base64 Directo

1. **Convertir imagen a Base64**:
   - Usa una herramienta online como: https://www.base64-image.de/
   - O usa PowerShell:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("ruta\a\tu\imagen.jpg"))
   ```

2. **En Postman**:
   ```json
   {
     "name": "Tour de Aventura",
     "description": "Un tour emocionante",
     "photo": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
     "type": "Adventure",
     "availability": "available",
     "base_price": 50000,
     "day": "Monday",
     "time": "09:00",
     "spots": 20,
     "requirements": "Buena condición física",
     "duration": "4 horas",
     "difficulty": "Media",
     "supplier_corporate": 123
   }
   ```

### Opción 2: Upload Primero, Luego Agregar

1. **Sube la imagen primero**:
   - POST `http://localhost:3000/api/upload`
   - Body: `form-data`
   - Key: `file`, Value: [Selecciona archivo]
   - Headers: `Authorization: Bearer {token}`

2. **Copia la URL de la respuesta** y úsala en el campo `photo`:
   ```json
   {
     "name": "Tour de Aventura",
     "photo": "https://tu-proyecto.supabase.co/storage/v1/object/public/tour-images/tour_123.jpg",
     ...
   }
   ```

## 🔄 Próximos Pasos

1. Ejecutar `npx prisma generate`
2. Configurar variables de entorno
3. Probar los endpoints con Postman o similar
4. Integrar con tu frontend usando los hooks proporcionados

¿Necesitas ayuda con algún aspecto específico de la implementación?

---

## 🖥️ Frontend — Vistas y Gestión de Formularios

Esta sección documenta los componentes de interfaz de usuario implementados para la gestión de tours, incluyendo la estrategia de validación y manejo de formularios.

### 📁 Estructura de Archivos

```
src/
├── app/
│   └── tours/
│       ├── page.tsx           → Ruta: /tours         (Listado de tours)
│       └── crear/
│           └── page.tsx       → Ruta: /tours/crear   (Crear tour)
├── features/
│   └── tours/
│       ├── Create.tsx         → Formulario de creación
│       ├── View.tsx           → Tabla de listado con filtros y acciones
│       └── Edit.tsx           → Formulario de edición (All-in-One)
└── hooks/
    └── useTours.ts            → Hook para fetching y paginación de tours
```

---

### 📋 Vista de Listado (`View.tsx`)

Muestra todos los tours en una tabla paginada. Permite buscar, filtrar, editar y eliminar.

**Características:**
- **Búsqueda debounced** por nombre del tour
- **Filtros** por Tipo, Dificultad y Disponibilidad (selectores desplegables)
- **Paginación** controlada por el hook `useTours`
- **Badge de disponibilidad** — verde para "Disponible", gris para "No disponible"
- **Menú de acciones** (`...`) por fila: acciones de **Editar** y **Eliminar**
- **Diálogo de confirmación** antes de eliminar un tour
- Al seleccionar "Editar", renderiza el componente `EditTourView` en lugar de la tabla

**Hook asociado — `useTours`:**

```typescript
import { useTours } from "@/hooks/useTours";

const { tours, loading, error, pagination, refetch } = useTours({
  page: 1,
  limit: 5,
  name: "Catarata",       // búsqueda por nombre
  type: "Aventura",       // filtro por tipo
  difficulty: "Baja",     // filtro por dificultad
  availability: "Disponible", // filtro por disponibilidad
});
```

---

### 📝 Formularios — Zod + React Hook Form

Tanto el formulario de **Crear** (`Create.tsx`) como el de **Editar** (`Edit.tsx`) utilizan la misma estrategia de validación y manejo de estado.

#### ¿Qué es Zod?

[Zod](https://zod.dev) es una librería de validación de esquemas con inferencia de tipos TypeScript. Permite definir la forma y restricciones de los datos **una sola vez** y reutilizarla tanto para validación en tiempo de ejecución como para tipado estático.

```typescript
import * as z from "zod";

const tourFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  base_price: z.coerce.number().positive("El precio debe ser mayor a 0"),
  spots: z.coerce.number().int().positive("Debe ser un entero positivo"),
  type: z.string().min(1, "Seleccione un tipo de tour"),
  // ... resto de campos
});

// TypeScript infiere el tipo automáticamente:
type TourFormValues = z.infer<typeof tourFormSchema>;
```

**Ventajas de usar Zod:**
- Los mensajes de error se definen junto a las reglas, en español
- `z.coerce` convierte automáticamente los valores de inputs HTML (siempre `string`) al tipo correcto (ej. `number`)
- El esquema es la única fuente de verdad — sin duplicar validaciones entre frontend y backend

#### ¿Qué es React Hook Form?

[React Hook Form](https://react-hook-form.com) es una librería para gestionar el estado de formularios en React. A diferencia de manejar cada campo con `useState`, RHF registra los inputs con una referencia y solo re-renderiza cuando es necesario.

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const {
  register,       // conecta un input al formulario
  handleSubmit,   // wrappea el onSubmit y valida antes de llamarlo
  watch,          // observa el valor actual de un campo
  reset,          // resetea todos los campos a defaultValues
  formState: { errors, isSubmitting }, // estado del formulario
} = useForm({
  resolver: zodResolver(tourFormSchema), // integra Zod como validador
  defaultValues: {
    name: "",
    base_price: "" as unknown as number,
    // ...
  },
});
```

**Integración con los inputs:**

```tsx
{/* Campo de texto */}
<Input id="name" {...register("name")} />
{errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}

{/* Select con color tenue en placeholder */}
<select
  {...register("type")}
  className={!watch("type") ? "text-muted-foreground" : "text-foreground"}
>
  <option value="">Seleccionar tipo</option>
  <option value="Aventura">Aventura</option>
</select>
```

---

### ✏️ Vista de Edición (`Edit.tsx`) — All-in-One

El formulario de edición integra en una sola pantalla:

| Sección | Comportamiento |
|---|---|
| **Datos base** | React Hook Form + Zod, precargados con los valores actuales del tour |
| **Horarios** | Carga horarios existentes via `GET /api/tours/:id/schedules`. Agregar/eliminar en tiempo real via API |
| **Imágenes** | Carga imágenes existentes via `GET /api/tours/:id/images`. Eliminar existentes en tiempo real. Nuevas imágenes se suben al hacer clic en "Guardar Cambios" via `POST /api/tours/:id/images` (multipart) |

**Flujo de guardado:**
1. Valida el formulario con Zod
2. Llama a `PUT /api/tours/:id` con los datos base
3. Si hay imágenes pendientes, las sube con `POST /api/tours/:id/images`
4. Muestra alerta de éxito y vuelve al listado

---

## 📅 Reservas — notas de UI (actualizado)

- **Crear (`/reservas/crear`, `Create.tsx`):** selección de tour, **fecha** (`YYYY-MM-DD`) y **hora** alineadas con `tour_schedule` (no se usa un único `schedule_id` fijo: la API recibe `date` ISO + `time` `HH:MM`). Antes de fijar personas, el front puede consultar `GET /api/tours/:id/slot-availability?date=…&time=…` o usar `tourService.getSlotAvailability` para mostrar *espacios restantes* y acotar `people`. `tour.spots` en catálogo = cupo por turno, sin cambiar al reservar. Texto de cupo bajo el input de personas; sin pie duplicado de precio en esa sección.
- **Listado (`/reservas`, `View.tsx`):** filtro de estado con **Pendiente / En curso / Completada / Cancelada** (coherente con el `state` devuelto por la API). Menú *Cancelar* deshabilitado en estado final; si aplica penalidad por plazo, aviso y casilla de confirmación antes del motivo. `PUT` con `acknowledge_late_cancellation` cuando el servicio inicia en menos de 48/24 h.
- **Detalle (`/reservas/[id]`, `Detail.tsx`):** el **estado** mostrado es el calculado por la API; se edita **nota** y la **anulación** va por flujo dedicado. Política 48/24 h; aviso informativo de penalidad y confirmación en el flujo. Formato de código: imports ordenados, Prettier (`.prettierrc` en el repo) en módulos de reservas/tours.

## 📝 Documentación y formato (cambios recientes en el repo)

- `ENDPOINTS_README.md` (este archivo) actualizado con estados lógicos, anulación con reconocimiento de penalidad, política 48/24 h y `GET /api/transfers/slot-availability`.
- Módulos de ayuda: `reservation-lifecycle.ts`, `reservation-cancellation-policy.ts`.
- **Tours/Reservas (front):** formateo Prettier y orden de imports en `src/features/tours/*`, `src/features/reservations/*` y páginas bajo `src/app/tours` y `src/app/reservas`.
