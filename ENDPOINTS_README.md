# CRM External Sales - Sistema de Gestión de Usuarios

## 🚀 Endpoints Implementados

He creado un sistema completo de gestión de usuarios para tu CRM con los siguientes endpoints:

### 🔐 Autenticación

- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener usuario actual
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

## 📁 Archivos Creados

### Esquemas de Validación

- `src/app/schemas/user.schema.ts` - Esquemas Zod para validación

### Endpoints de API

- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/change-password/route.ts`
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/api/users/route.ts` (incluye POST para crear usuarios)
- `src/app/api/users/[username]/route.ts`
- `src/app/api/user/route.ts`

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

## 🚨 Notas Importantes

1. **Regenerar Prisma**: Es crucial ejecutar `npx prisma generate` después de estos cambios
2. **Variables de Entorno**: Configura todas las variables de Supabase correctamente
3. **Permisos**: Los endpoints de gestión de usuarios requieren rol de admin
4. **Validación**: Todos los datos de entrada están validados con Zod
5. **Seguridad**: Los tokens se manejan automáticamente en el frontend

## 🔄 Próximos Pasos

1. Ejecutar `npx prisma generate`
2. Configurar variables de entorno
3. Probar los endpoints con Postman o similar
4. Integrar con tu frontend usando los hooks proporcionados

¿Necesitas ayuda con algún aspecto específico de la implementación?
