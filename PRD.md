# Product Requirements Document (PRD)
## CRM External Sales - Sistema de Gestión de Ventas Externas

**Versión:** 1.0  
**Fecha:** Enero 2025  
**Estado:** En Desarrollo

---

## 1. Resumen Ejecutivo

### 1.1 Visión del Producto
CRM External Sales es una plataforma web integral diseñada para gestionar las operaciones de ventas externas de una empresa de turismo. El sistema permite administrar tours, transfers, proveedores, reservas y generar reportes analíticos para optimizar las operaciones comerciales.

### 1.2 Objetivos del Negocio
- **Digitalizar** la gestión de ventas externas de servicios turísticos
- **Automatizar** el cálculo de precios, IVA y descuentos en reservas
- **Centralizar** la información de proveedores, tours y transfers
- **Proporcionar** herramientas analíticas para la toma de decisiones
- **Mejorar** la eficiencia operativa mediante un sistema de roles y permisos

### 1.3 Alcance del Proyecto
El sistema incluye:
- Gestión de usuarios con sistema de autenticación y roles
- CRUD completo de tours, transfers y proveedores
- Sistema de reservas con cálculo automático de precios
- Generación de reportes analíticos
- Gestión de imágenes y horarios para tours
- API RESTful completa con validación y seguridad

---

## 2. Stakeholders y Usuarios

### 2.1 Stakeholders
- **Administradores del Sistema**: Gestión completa de la plataforma
- **Gerentes de Ventas**: Supervisión y análisis de operaciones
- **Equipo de Desarrollo**: Mantenimiento y evolución del sistema

### 2.2 Perfiles de Usuario

#### 2.2.1 Administrador (Admin)
**Permisos:**
- Acceso completo a todos los módulos
- Crear, editar y eliminar usuarios
- Gestionar tours, transfers y proveedores
- Ver todas las reservas
- Generar reportes analíticos
- Subir y gestionar imágenes

**Casos de Uso Principales:**
- Configurar catálogo de servicios (tours y transfers)
- Administrar proveedores
- Supervisar operaciones de agentes
- Analizar métricas de negocio

#### 2.2.2 Agente (Agent)
**Permisos:**
- Crear y gestionar reservas
- Ver tours y transfers disponibles
- Consultar proveedores
- Ver sus propias reservas
- Actualizar perfil personal

**Casos de Uso Principales:**
- Crear reservas para clientes
- Consultar disponibilidad de servicios
- Gestionar reservas propias

#### 2.2.3 Cliente (Customer)
**Permisos:**
- Ver perfil personal
- Actualizar información de contacto (teléfono y email)

**Casos de Uso Principales:**
- Mantener información de contacto actualizada

---

## 3. Requisitos Funcionales

### 3.1 Módulo de Autenticación y Usuarios

#### RF-AU1: Sistema de Autenticación
**Prioridad:** Crítica  
**Descripción:** El sistema debe permitir a los usuarios autenticarse mediante email y contraseña.

**Requisitos:**
- Login con validación de credenciales
- Logout seguro que invalide la sesión
- Tokens JWT para mantener sesiones
- Integración con Supabase Auth

**Criterios de Aceptación:**
- Usuario puede iniciar sesión con email y contraseña válidos
- Usuario no puede iniciar sesión con credenciales inválidas
- Sesión se mantiene activa durante el tiempo configurado
- Logout invalida el token inmediatamente

#### RF-AU2: Gestión de Contraseñas
**Prioridad:** Alta  
**Descripción:** Los usuarios deben poder cambiar y recuperar sus contraseñas.

**Requisitos:**
- Cambio de contraseña autenticado
- Recuperación de contraseña por email
- Validación de contraseñas seguras (mínimo 8 caracteres)
- Tokens de recuperación con expiración

**Criterios de Aceptación:**
- Usuario puede cambiar contraseña desde su perfil
- Usuario puede solicitar recuperación de contraseña
- Email de recuperación se envía correctamente
- Token de recuperación expira después de 1 hora

#### RF-AU3: Gestión de Usuarios
**Prioridad:** Alta  
**Descripción:** Los administradores deben poder gestionar usuarios del sistema.

**Requisitos:**
- Crear nuevos usuarios (solo admin)
- Listar usuarios con paginación
- Obtener usuario por username
- Actualizar información de usuario
- Eliminar usuario (soft delete, mantiene registro en Auth)

**Criterios de Aceptación:**
- Admin puede crear usuarios con roles específicos
- Lista de usuarios muestra información relevante
- Búsqueda por username funciona correctamente
- Eliminación mantiene registro para auditoría

#### RF-AU4: Perfil de Usuario
**Prioridad:** Media  
**Descripción:** Los usuarios deben poder ver y actualizar su perfil.

**Requisitos:**
- Ver información personal
- Actualizar teléfono y email
- Validación de datos únicos (email, teléfono)

**Criterios de Aceptación:**
- Usuario puede ver su perfil completo
- Actualización de datos funciona correctamente
- Validación previene duplicados

---

### 3.2 Módulo de Tours

#### RF-TO1: Gestión de Tours
**Prioridad:** Crítica  
**Descripción:** El sistema debe permitir gestionar el catálogo de tours disponibles.

**Requisitos:**
- Crear tours con información completa (solo admin)
- Listar tours con filtros (tipo, nombre, disponibilidad)
- Obtener tour por ID con imágenes y horarios
- Actualizar información de tours (solo admin)
- Eliminar tours (solo admin, con validación de reservas)

**Campos del Tour:**
- Nombre (único)
- Descripción
- Tipo (ej: EcoTour, Adventure, Cultural)
- Disponibilidad (available, busy, unavailable)
- Precio base
- Cupos disponibles (spots)
- Requisitos
- Duración
- Dificultad
- Proveedor asociado

**Criterios de Aceptación:**
- Admin puede crear tours con todos los campos requeridos
- Listado muestra tours con paginación
- Filtros funcionan correctamente
- Eliminación bloqueada si hay reservas asociadas

#### RF-TO2: Gestión de Imágenes de Tours
**Prioridad:** Alta  
**Descripción:** Cada tour debe poder tener múltiples imágenes con gestión de portada.

**Requisitos:**
- Subir múltiples imágenes por tour
- Designar imagen de portada (cover)
- Ordenar imágenes (sort_order)
- Agregar texto alternativo (alt)
- Actualizar y eliminar imágenes individuales

**Criterios de Aceptación:**
- Se pueden subir múltiples imágenes en un solo request
- Una imagen puede marcarse como portada
- Imágenes se ordenan según sort_order
- Eliminación de imagen funciona correctamente

#### RF-TO3: Gestión de Horarios de Tours
**Prioridad:** Alta  
**Descripción:** Los tours deben tener horarios disponibles por día de la semana.

**Requisitos:**
- Agregar horarios por día de la semana
- Especificar hora de inicio
- Listar horarios de un tour
- Actualizar y eliminar horarios

**Criterios de Aceptación:**
- Se pueden agregar múltiples horarios en un request
- Horarios se asocian correctamente al tour
- Listado muestra todos los horarios disponibles

---

### 3.3 Módulo de Transfers

#### RF-TR1: Gestión de Transfers
**Prioridad:** Crítica  
**Descripción:** El sistema debe permitir gestionar vehículos de transporte (transfers).

**Requisitos:**
- Crear transfers (solo admin)
- Listar transfers con filtros (marca, categoría, disponibilidad)
- Obtener transfer por ID
- Actualizar transfer (solo admin)
- Eliminar transfer (solo admin, con validación de reservas)

**Campos del Transfer:**
- Placa (única, ID)
- Proveedor asociado
- Disponibilidad
- Marca (make)
- Modelo
- Categoría (ej: Luxury, Comfort, Standard)
- Capacidad (pasajeros)
- Tipo (ej: Van, Bus, Car)
- Precio base
- Precio de venta

**Criterios de Aceptación:**
- Admin puede crear transfers con información completa
- Listado con filtros funciona correctamente
- Eliminación bloqueada si hay reservas asociadas

---

### 3.4 Módulo de Proveedores

#### RF-SU1: Gestión de Proveedores
**Prioridad:** Alta  
**Descripción:** El sistema debe permitir gestionar proveedores de servicios.

**Requisitos:**
- Crear proveedores (solo admin)
- Listar proveedores con filtros (empresa, servicio)
- Obtener proveedor por cédula jurídica
- Actualizar proveedor (solo admin)
- Eliminar proveedor (solo admin, bloqueado si hay tours/transfers)

**Campos del Proveedor:**
- Cédula jurídica (única, ID)
- Nombre de empresa
- Teléfono (único)
- Email (único)
- Tipo de servicio

**Criterios de Aceptación:**
- Admin puede crear proveedores
- Listado muestra proveedores con conteo de servicios asociados
- Eliminación bloqueada si hay servicios asociados
- Agentes pueden consultar proveedores

---

### 3.5 Módulo de Reservas

#### RF-RE1: Creación de Reservas
**Prioridad:** Crítica  
**Descripción:** Los agentes y administradores deben poder crear reservas con cálculo automático de precios.

**Requisitos:**
- Crear reserva asociando tour y transfer opcional
- Cálculo automático de:
  - Monto del tour (precio base × cantidad de personas)
  - Monto del transfer (precio de venta × cantidad de personas)
  - Subtotal
  - IVA (13%)
  - Descuentos
  - Total final
- Validar disponibilidad de tour
- Asociar reserva al agente que la crea

**Campos de la Reserva:**
- Tour (obligatorio)
- Transfer (opcional)
- Fecha y hora
- Cantidad de personas
- Número de reserva de hotel
- Notas
- Estado (pending, confirmed, cancelled, completed)

**Criterios de Aceptación:**
- Reserva se crea con cálculo correcto de todos los montos
- Validación previene reservas en tours no disponibles
- Reserva se asocia correctamente al agente creador

#### RF-RE2: Gestión de Reservas
**Prioridad:** Alta  
**Descripción:** El sistema debe permitir consultar, actualizar y cancelar reservas.

**Requisitos:**
- Listar reservas con filtros (fecha, estado, tour, usuario)
- Obtener reserva por ID
- Actualizar reserva (solo admin):
  - Modificar cantidad de personas (recalcula montos)
  - Cambiar tour o transfer (recalcula montos)
  - Actualizar fecha, hora, notas
  - Cambiar estado
- Cancelar reserva con motivo (solo admin)

**Criterios de Aceptación:**
- Listado muestra reservas según permisos (admin ve todas, agent solo propias)
- Filtros funcionan correctamente
- Actualización recalcula montos cuando corresponde
- Cancelación requiere motivo obligatorio

---

### 3.6 Módulo de Reportes

#### RF-RP1: Generación de Reportes
**Prioridad:** Alta  
**Descripción:** Los administradores deben poder generar reportes analíticos del negocio.

**Requisitos:**
- Generar reportes por período (trimestral, semestral, anual, personalizado)
- Tipos de reporte:
  - Reservas por tiempo (con granularidad: semana, mes, trimestre, año)
  - Reservas por estado
  - Reservas por empleado
  - Ingresos por tiempo
  - Ingresos por tour
- Filtros aplicables:
  - Rango de fechas
  - Estado de reserva
  - Tour específico
  - Usuario específico
- Métricas incluidas:
  - Total de reservas
  - Reservas canceladas vs confirmadas
  - Ingresos totales
  - Descuentos aplicados
  - IVA recaudado
  - Tours más/menos solicitados
  - Clientes recurrentes

**Criterios de Aceptación:**
- Reportes se generan correctamente según tipo seleccionado
- Métricas son precisas y reflejan datos reales
- Filtros se aplican correctamente
- Datos se agregan según granularidad temporal especificada

---

## 4. Requisitos No Funcionales

### 4.1 Seguridad

#### RNF-SE1: Autenticación y Autorización
- Sistema de autenticación basado en JWT
- Tokens con expiración configurable
- Validación de roles en cada endpoint
- Protección contra ataques comunes (XSS, CSRF, SQL Injection)

#### RNF-SE2: Validación de Datos
- Validación de entrada con esquemas Zod
- Sanitización de datos de usuario
- Rate limiting en endpoints críticos
- Validación de tipos de archivo en uploads

### 4.2 Rendimiento

#### RNF-PE1: Tiempos de Respuesta
- Endpoints de consulta: < 500ms
- Endpoints de creación/actualización: < 1s
- Generación de reportes: < 3s

#### RNF-PE2: Escalabilidad
- Paginación en todos los listados
- Índices en base de datos para consultas frecuentes
- Optimización de queries con Prisma

### 4.3 Usabilidad

#### RNF-US1: Interfaz de Usuario
- Diseño responsive (mobile-first)
- Navegación intuitiva
- Feedback visual en todas las acciones
- Mensajes de error claros y accionables

### 4.4 Mantenibilidad

#### RNF-MA1: Código
- TypeScript para type safety
- Esquemas de validación centralizados
- Separación de responsabilidades (helpers, middleware, servicios)
- Documentación de código

#### RNF-MA2: Base de Datos
- Migraciones versionadas con Prisma
- Relaciones bien definidas
- Constraints de integridad referencial

### 4.5 Compatibilidad

#### RNF-CO1: Navegadores
- Chrome (últimas 2 versiones)
- Firefox (últimas 2 versiones)
- Safari (últimas 2 versiones)
- Edge (últimas 2 versiones)

#### RNF-CO2: Dispositivos
- Desktop (1920x1080 y superiores)
- Tablet (768px y superiores)
- Mobile (375px y superiores)

---

## 5. Arquitectura Técnica

### 5.1 Stack Tecnológico

**Frontend:**
- Next.js 15.5.2 (React 19)
- TypeScript
- Tailwind CSS 4
- Radix UI (componentes)
- React Hook Form + Zod
- TanStack Query (React Query)

**Backend:**
- Next.js API Routes
- Prisma ORM
- PostgreSQL (Supabase)
- Supabase Auth
- Axios

**Herramientas:**
- ESLint
- Prisma Migrations
- Supabase Storage (imágenes)

### 5.2 Estructura del Proyecto

```
src/
├── app/
│   ├── api/              # API Routes
│   │   ├── auth/         # Autenticación
│   │   ├── users/        # Gestión de usuarios
│   │   ├── tours/        # Gestión de tours
│   │   ├── transfers/    # Gestión de transfers
│   │   ├── suppliers/   # Gestión de proveedores
│   │   ├── reservations/ # Gestión de reservas
│   │   ├── reports/      # Reportes
│   │   └── upload/       # Subida de archivos
│   ├── schemas/          # Esquemas de validación Zod
│   └── [pages]/          # Páginas de la aplicación
├── components/           # Componentes React
├── features/             # Features organizados por módulo
├── hooks/                # Custom hooks
├── lib/                  # Utilidades y servicios
│   ├── prisma.ts         # Cliente Prisma
│   ├── auth-middleware.ts # Middleware de autenticación
│   ├── api.ts            # Cliente Axios
│   └── [helpers]         # Funciones auxiliares
└── types/                # Tipos TypeScript
```

### 5.3 Base de Datos

**Modelos Principales:**
- `app_user`: Usuarios de la aplicación
- `supplier`: Proveedores
- `tour`: Tours con relaciones a supplier, images, schedules
- `tour_image`: Imágenes de tours
- `tour_schedule`: Horarios de tours
- `transfer`: Vehículos de transporte
- `reservation`: Reservas con cálculos de precios

**Relaciones:**
- Supplier → Tours (1:N)
- Supplier → Transfers (1:N)
- Tour → Tour Images (1:N)
- Tour → Tour Schedules (1:N)
- Tour → Reservations (1:N)
- Transfer → Reservations (1:N)
- User → Reservations (1:N)

### 5.4 Autenticación

- **Proveedor:** Supabase Auth
- **Método:** JWT tokens
- **Sesiones:** Tokens almacenados en localStorage
- **Refresh:** Implementado mediante Supabase SDK

---

## 6. Flujos de Usuario Principales

### 6.1 Flujo: Crear Reserva (Agente)

1. Agente inicia sesión
2. Navega a "Reservas" → "Crear Reserva"
3. Selecciona tour de la lista
4. (Opcional) Selecciona transfer
5. Ingresa:
   - Fecha y hora
   - Cantidad de personas
   - Número de reserva de hotel
   - Notas
6. Sistema calcula automáticamente:
   - Monto del tour
   - Monto del transfer (si aplica)
   - Subtotal
   - IVA
   - Total
7. Agente confirma y crea la reserva
8. Sistema muestra confirmación con detalles

### 6.2 Flujo: Gestionar Tour (Admin)

1. Admin inicia sesión
2. Navega a "Tours" → "Crear Tour"
3. Completa formulario:
   - Información básica
   - Selecciona proveedor
   - Sube imágenes (múltiples)
   - Define horarios
4. Sistema valida:
   - Nombre único
   - Proveedor existe
   - Imágenes válidas
5. Admin guarda
6. Sistema crea tour con imágenes y horarios
7. Tour aparece en catálogo

### 6.3 Flujo: Generar Reporte (Admin)

1. Admin inicia sesión
2. Navega a "Reportes"
3. Selecciona tipo de reporte
4. Configura filtros:
   - Período (si aplica)
   - Granularidad temporal (si aplica)
   - Filtros adicionales
5. Sistema genera reporte con:
   - KPIs generales
   - Datos para gráficos
   - Lista de reservas
6. Admin puede exportar o visualizar

---

## 7. Casos de Uso Especiales

### 7.1 Validaciones de Negocio

**Caso:** Eliminar tour con reservas
- **Comportamiento:** Sistema bloquea eliminación
- **Mensaje:** "No se puede eliminar el tour porque tiene reservas asociadas"

**Caso:** Cancelar reserva
- **Comportamiento:** Requiere motivo de cancelación
- **Validación:** Campo `cancellation_reason` obligatorio cuando `state = "cancelled"`

**Caso:** Actualizar reserva con cambio de tour
- **Comportamiento:** Sistema recalcula todos los montos automáticamente

### 7.2 Cálculos Automáticos

**Fórmula de Reserva:**
```
tour_amount = tour.base_price × people
transfer_amount = transfer.sale_price × people (si aplica)
subtotal = tour_amount + transfer_amount
iva = subtotal × 0.13
total = subtotal + iva - discount
```

---

## 8. Métricas de Éxito

### 8.1 Métricas Técnicas
- **Uptime:** > 99.5%
- **Tiempo de respuesta promedio:** < 500ms
- **Tasa de error:** < 0.1%
- **Cobertura de tests:** > 80%

### 8.2 Métricas de Negocio
- **Reservas procesadas por día:** Objetivo medible
- **Tiempo promedio de creación de reserva:** < 2 minutos
- **Satisfacción del usuario:** Encuestas periódicas
- **Adopción de reportes:** % de admins que usan reportes semanalmente

---

## 9. Roadmap y Fases

### Fase 1: MVP (Completada)
- ✅ Autenticación y usuarios
- ✅ CRUD de tours, transfers, proveedores
- ✅ Sistema de reservas básico
- ✅ Reportes básicos

### Fase 2: Mejoras (En Progreso)
- 🔄 Optimización de rendimiento
- 🔄 Mejoras de UI/UX
- 🔄 Exportación de reportes (PDF, Excel)
- 🔄 Notificaciones por email

### Fase 3: Funcionalidades Avanzadas (Futuro)
- ⏳ Dashboard con métricas en tiempo real
- ⏳ Integración con sistemas de pago
- ⏳ App móvil
- ⏳ Sistema de notificaciones push
- ⏳ Integración con sistemas de hoteles

---

## 10. Riesgos y Mitigaciones

### 10.1 Riesgos Técnicos

**Riesgo:** Problemas de rendimiento con grandes volúmenes de datos
- **Mitigación:** Implementar paginación, índices en BD, caching

**Riesgo:** Vulnerabilidades de seguridad
- **Mitigación:** Auditorías de seguridad regulares, validación estricta, rate limiting

### 10.2 Riesgos de Negocio

**Riesgo:** Resistencia al cambio de usuarios
- **Mitigación:** Capacitación, documentación clara, soporte continuo

**Riesgo:** Pérdida de datos
- **Mitigación:** Backups automáticos, versionado de base de datos

---

## 11. Glosario

- **Tour:** Servicio turístico ofrecido a clientes
- **Transfer:** Vehículo de transporte para traslados
- **Supplier:** Proveedor de servicios (tours o transfers)
- **Reservation:** Reserva de un tour (y opcionalmente transfer) para una fecha específica
- **Agent:** Usuario con permisos para crear reservas
- **Admin:** Usuario con permisos completos del sistema
- **IVA:** Impuesto al Valor Agregado (13% en Costa Rica)

---

## 12. Anexos

### 12.1 Referencias Técnicas
- [Documentación Next.js](https://nextjs.org/docs)
- [Documentación Prisma](https://www.prisma.io/docs)
- [Documentación Supabase](https://supabase.com/docs)
- [Documentación Zod](https://zod.dev/)

### 12.2 Contactos
- **Product Owner:** [Por definir]
- **Tech Lead:** [Por definir]
- **Equipo de Desarrollo:** [Por definir]

---

**Documento creado:** Enero 2025  
**Última actualización:** Enero 2025  
**Próxima revisión:** Febrero 2025

