# CRM External Sales - Sistema de Gestión Completo

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

#### 📤 Subida de Archivos

- `POST /api/upload` - Subir imagen local a Supabase Storage (solo admin)

### 🚗 Gestión de Transfers

- `GET /api/transfers` - Listar transfers disponibles (con filtros: make, category, availability, paginación)
- `POST /api/transfers` - Crear nuevo transfer (solo admin)
- `PUT /api/transfers/:id` - Actualizar transfer existente (solo admin)
- `DELETE /api/transfers/:id` - Eliminar transfer (solo admin)

### 🏢 Gestión de Proveedores (Suppliers)

- `POST /api/suppliers` - Crear proveedor (solo admin)
- `GET /api/suppliers` - Listar proveedores (admin y agent; filtros: company, service, paginación)
- `GET /api/suppliers/:corporate` - Obtener proveedor por cédula jurídica (admin y agent)
- `PUT /api/suppliers/:corporate` - Actualizar proveedor (solo admin)
- `DELETE /api/suppliers/:corporate` - Eliminar proveedor (solo admin; bloqueado si hay tours/transfers asociados)

### 📅 Gestión de Reservas

- `POST /api/reservations` - Crear nueva reserva (Agent y Admin). Calcula automáticamente totales del tour y del transfer.
- `GET /api/reservations` - Listar reservas con filtros:
  - `date`: Fecha específica (ISO o YYYY-MM-DD)
  - `state`: Estado de la reserva (e.g. pending, confirmed)
  - Nota: Admin ve todas; agentes solo las propias.
- `GET /api/reservations/:id` - Obtener reserva por ID (Admin o propietario)
- `PUT /api/reservations/:id` - Actualizar/Cancelar reserva (Solo Admin):
  - Permite modificar: `people`, `tour_id`, `transfer_id`, `date`, `time`, `hotel_reservation`, `note`, `state`.
  - Recalcula montos si cambian `tour_id`, `people` o `transfer_id`.
  - Al cancelar (`state: "cancelled"`), se requiere `cancellation_reason`.

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

**Upload:**
- `src/app/api/upload/route.ts` (POST para subir imágenes)

**Transfers:**
- `src/app/api/transfers/route.ts` (GET y POST)
- `src/app/api/transfers/[id]/route.ts` (PUT y DELETE)

**Proveedores:**
- `src/app/api/suppliers/route.ts` (GET - listar; POST - crear)
- `src/app/api/suppliers/[corporate]/route.ts` (GET - obtener; PUT - actualizar; DELETE - eliminar)

**Reservas:**
- `src/app/api/reservations/route.ts` (GET - listar; POST - crear con cálculo automático)
- `src/app/api/reservations/[id]/route.ts` (GET - obtener por ID; PUT - actualizar/cancelar)

**Reportes:**
- `src/app/api/reports/route.ts` (GET - generar reportes con métricas; solo admin)

**Desarrollo:**
- `src/app/api/dev/reset-rate-limit/route.ts` (GET/POST - herramientas de rate limit en desarrollo)

### Middleware y Utilidades

- `src/lib/auth-middleware.ts` - Middleware de autenticación mejorado
- `src/lib/api.ts` - Cliente Axios con servicios de API
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

- Creación de reservas con cálculo automático de precios
- Integración de Tours y Transfers en una sola reserva
- Validación de disponibilidad y existencia de servicios
- Cálculo automático de IVA y totales
- Protección por roles (Agent/Admin)

### ✅ Seguridad

- Middleware de autenticación con tokens JWT
- Verificación de permisos por roles
- Protección contra ataques comunes

### ✅ Utilidades Frontend

- Cliente Axios configurado
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

### Ejemplos de Uso para Reservas

```typescript
// POST /api/reservations - Crear una nueva reserva
const reservationData = {
  tour_id: 1,
  people: 2,
  date: "2023-12-25T00:00:00.000Z", // Fecha en formato ISO
  time: "09:30", // Hora en formato HH:MM
  hotel_reservation: 101, // Número de habitación
  note: "Cliente VIP, requiere silla de bebé",
  transfer_id: 12345 // Opcional
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
  // data incluye: tour_amount, transfer_amount, subtotal, iva, total
}

// GET /api/reservations - Buscar con filtros
const searchResponse = await fetch('/api/reservations?date=2023-12-25&state=pending', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// GET /api/reservations/:id - Obtener una reserva por ID
const getById = await fetch('/api/reservations/1', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// PUT /api/reservations/[id] - Actualizar/Cancelar reserva
const updateResponse = await fetch('/api/reservations/1', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    people: 3, // Actualiza cantidad (recalcula totales)
    note: "Cliente agregó una persona más"
  })
});

// Cancelar reserva
const cancelResponse = await fetch('/api/reservations/1', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    state: "cancelled",
    cancellation_reason: "Cliente canceló por clima"
  })
});
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
