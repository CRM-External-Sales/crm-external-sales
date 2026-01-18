# 📊 Guía de Endpoints para Reportes - Postman

## 🔐 Paso 1: Obtener Token de Autenticación

### Request
- **Método**: `POST`
- **URL**: `http://localhost:3000/api/auth/login`
- **Headers**:
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
```json
{
  "email": "admin@ejemplo.com",
  "password": "TuContraseña123!"
}
```

### Response
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "admin",
      "email": "admin@ejemplo.com",
      "role": "admin"
    },
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "...",
      "expires_at": 1234567890
    }
  }
}
```

**⚠️ IMPORTANTE**: Copia el `access_token` de `data.session.access_token` para usarlo en los headers de los reportes.

---

## 📋 Endpoints de Reportes

Todos los endpoints usan el mismo formato base:
- **Método**: `GET`
- **URL Base**: `http://localhost:3000/api/reports`
- **Headers**:
  ```
  Authorization: Bearer {tu-access-token}
  Content-Type: application/json
  ```

---

## 🎯 Tipos de Reporte Disponibles

### A) Reservas en el tiempo (`reservas_tiempo`)
**Pregunta**: ¿Cómo se comportan las reservas a lo largo del tiempo?
- **Granularidades**: semana, mes, trimestre, año
- **Filtros permitidos**: fecha_inicio, fecha_fin, estado, tourId, usuarioId

### B) Reservas por estado (`reservas_estado`)
**Pregunta**: ¿Cómo se distribuyen las reservas según su estado?
- **Filtros permitidos**: fecha_inicio, fecha_fin, tourId, usuarioId
- **Filtros prohibidos**: estado ❌

### C) Reservas por empleado (`reservas_empleado`)
**Pregunta**: ¿Quién gestiona más reservas?
- **Filtros permitidos**: fecha_inicio, fecha_fin, estado, tourId
- **Filtros prohibidos**: usuarioId ❌

### D) Ingresos en el tiempo (`ingresos_tiempo`)
**Pregunta**: ¿Cuándo generan más ingresos?
- **Granularidades**: semana, mes, trimestre, año
- **Filtros permitidos**: fecha_inicio, fecha_fin, estado, tourId, usuarioId

### E) Ingresos por tour (`ingresos_tour`)
**Pregunta**: ¿Qué tours son más rentables?
- **Filtros permitidos**: fecha_inicio, fecha_fin, estado
- **Filtros prohibidos**: tourId ❌

---

## 📅 Ejemplos de Endpoints (Fechas 2025-2026)

### 1️⃣ Reservas en el Tiempo - Mensual (2025)

**Request**:
```
GET http://localhost:3000/api/reports?tipo_reporte=reservas_tiempo&granularidad_temporal=mes&fecha_inicio=2025-01-01&fecha_fin=2025-12-31
```

**Response JSON**:
```json
{
  "success": true,
  "data": {
    "tipo_reporte": "reservas_tiempo",
    "granularidad_temporal": "mes",
    "periodo": {
      "fecha_inicio": "2025-01-01T00:00:00.000Z",
      "fecha_fin": "2025-12-31T23:59:59.999Z"
    },
    "kpis": {
      "total_reservas": 753,
      "reservas_canceladas": 34,
      "reservas_no_canceladas": 719,
      "porcentaje_cancelaciones": 4.52,
      "total_ingresos": 125000.50,
      "total_descuentos": 2500.00,
      "total_iva": 16250.07,
      "promedio_reserva": 166.00
    },
    "datosGrafico": [
      {
        "periodo": "2025-01",
        "cantidad": 58
      },
      {
        "periodo": "2025-02",
        "cantidad": 62
      }
    ],
    "totalReservas": 753
  }
}
```

---

### 2️⃣ Reservas en el Tiempo - Semanal (2025)

**Request**:
```
GET http://localhost:3000/api/reports?tipo_reporte=reservas_tiempo&granularidad_temporal=semana&fecha_inicio=2025-01-01&fecha_fin=2025-01-31
```

---

### 3️⃣ Reservas en el Tiempo - Trimestral (2026)

**Request**:
```
GET http://localhost:3000/api/reports?tipo_reporte=reservas_tiempo&granularidad_temporal=trimestre&fecha_inicio=2026-01-01&fecha_fin=2026-12-31
```

---

### 4️⃣ Reservas en el Tiempo - Anual (2025-2026)

**Request**:
```
GET http://localhost:3000/api/reports?tipo_reporte=reservas_tiempo&granularidad_temporal=año&fecha_inicio=2025-01-01&fecha_fin=2026-12-31
```

---

### 5️⃣ Reservas por Estado (2025)

**Request**:
```
GET http://localhost:3000/api/reports?tipo_reporte=reservas_estado&fecha_inicio=2025-01-01&fecha_fin=2025-12-31
```

**Response JSON**:
```json
{
  "success": true,
  "data": {
    "tipo_reporte": "reservas_estado",
    "granularidad_temporal": null,
    "periodo": {
      "fecha_inicio": "2025-01-01T00:00:00.000Z",
      "fecha_fin": "2025-12-31T23:59:59.999Z"
    },
    "kpis": {
      "total_reservas": 753,
      "reservas_canceladas": 34,
      "reservas_no_canceladas": 719,
      "porcentaje_cancelaciones": 4.52,
      "total_ingresos": 125000.50,
      "total_descuentos": 2500.00,
      "total_iva": 16250.07,
      "promedio_reserva": 166.00
    },
    "datosGrafico": [
      {
        "estado": "finalizado",
        "cantidad": 650
      },
      {
        "estado": "pendiente",
        "cantidad": 69
      },
      {
        "estado": "cancelado",
        "cantidad": 34
      }
    ],
    "totalReservas": 753
  }
}
```

---

### 6️⃣ Reservas por Empleado (2025-2026)

**Request**:
```
GET http://localhost:3000/api/reports?tipo_reporte=reservas_empleado&fecha_inicio=2025-01-01&fecha_fin=2026-12-31
```

**Response JSON**:
```json
{
  "success": true,
  "data": {
    "tipo_reporte": "reservas_empleado",
    "granularidad_temporal": null,
    "periodo": {
      "fecha_inicio": "2025-01-01T00:00:00.000Z",
      "fecha_fin": "2026-12-31T23:59:59.999Z"
    },
    "kpis": {
      "total_reservas": 1250,
      "reservas_canceladas": 56,
      "reservas_no_canceladas": 1194,
      "porcentaje_cancelaciones": 4.48,
      "total_ingresos": 207500.75,
      "total_descuentos": 4150.00,
      "total_iva": 26975.10,
      "promedio_reserva": 166.00
    },
    "datosGrafico": [
      {
        "empleado_id": "550e8400-e29b-41d4-a716-446655440001",
        "empleado": "juan_perez",
        "cantidad": 425
      },
      {
        "empleado_id": "550e8400-e29b-41d4-a716-446655440002",
        "empleado": "maria_garcia",
        "cantidad": 398
      }
    ],
    "totalReservas": 1250
  }
}
```

---

### 7️⃣ Ingresos en el Tiempo - Trimestral (2026)

**Request**:
```
GET http://localhost:3000/api/reports?tipo_reporte=ingresos_tiempo&granularidad_temporal=trimestre&fecha_inicio=2026-01-01&fecha_fin=2026-12-31
```

**Response JSON**:
```json
{
  "success": true,
  "data": {
    "tipo_reporte": "ingresos_tiempo",
    "granularidad_temporal": "trimestre",
    "periodo": {
      "fecha_inicio": "2026-01-01T00:00:00.000Z",
      "fecha_fin": "2026-12-31T23:59:59.999Z"
    },
    "kpis": {
      "total_reservas": 497,
      "reservas_canceladas": 22,
      "reservas_no_canceladas": 475,
      "porcentaje_cancelaciones": 4.43,
      "total_ingresos": 82500.25,
      "total_descuentos": 1650.00,
      "total_iva": 10725.03,
      "promedio_reserva": 166.00
    },
    "datosGrafico": [
      {
        "periodo": "2026-T1",
        "ingresos": 18750.50
      },
      {
        "periodo": "2026-T2",
        "ingresos": 21500.75
      },
      {
        "periodo": "2026-T3",
        "ingresos": 23250.00
      },
      {
        "periodo": "2026-T4",
        "ingresos": 19000.00
      }
    ],
    "totalReservas": 497
  }
}
```

---

### 8️⃣ Ingresos por Tour (2025-2026)

**Request**:
```
GET http://localhost:3000/api/reports?tipo_reporte=ingresos_tour&fecha_inicio=2025-01-01&fecha_fin=2026-12-31
```

**Response JSON**:
```json
{
  "success": true,
  "data": {
    "tipo_reporte": "ingresos_tour",
    "granularidad_temporal": null,
    "periodo": {
      "fecha_inicio": "2025-01-01T00:00:00.000Z",
      "fecha_fin": "2026-12-31T23:59:59.999Z"
    },
    "kpis": {
      "total_reservas": 1747,
      "reservas_canceladas": 78,
      "reservas_no_canceladas": 1669,
      "porcentaje_cancelaciones": 4.46,
      "total_ingresos": 290000.25,
      "total_descuentos": 5800.00,
      "total_iva": 37700.03,
      "promedio_reserva": 166.00
    },
    "datosGrafico": [
      {
        "tour_id": "123",
        "tour": "Tour de Aventura",
        "ingresos": 87500.50
      },
      {
        "tour_id": "456",
        "tour": "Tour Histórico",
        "ingresos": 62500.25
      },
      {
        "tour_id": "789",
        "tour": "Tour Naturaleza",
        "ingresos": 51000.00
      }
    ],
    "totalReservas": 1747
  }
}
```

---

## 📋 Ejemplos con Filtros

### 9️⃣ Reservas en el Tiempo - Anual con Filtro de Estado (Canceladas)

**Request**:
```
GET http://localhost:3000/api/reports?tipo_reporte=reservas_tiempo&granularidad_temporal=año&fecha_inicio=2025-01-01&fecha_fin=2026-12-31&estado=cancelada
```

**O si el estado en BD es "cancelado"**:
```
GET http://localhost:3000/api/reports?tipo_reporte=reservas_tiempo&granularidad_temporal=año&fecha_inicio=2025-01-01&fecha_fin=2026-12-31&estado=cancelado
```

---

### 🔟 Reservas con Filtro de Tour

**Request**:
```
GET http://localhost:3000/api/reports?tipo_reporte=reservas_empleado&fecha_inicio=2025-01-01&fecha_fin=2026-12-31&tourId=123
```

---

### 1️⃣1️⃣ Ingresos con Filtro de Empleado

**Request**:
```
GET http://localhost:3000/api/reports?tipo_reporte=ingresos_tiempo&granularidad_temporal=mes&fecha_inicio=2026-01-01&fecha_fin=2026-12-31&usuarioId=550e8400-e29b-41d4-a716-446655440001
```

---

### 1️⃣2️⃣ Ingresos con Filtro de Tipo de Reserva (Con Transfer)

**Request**:
```
GET http://localhost:3000/api/reports?tipo_reporte=ingresos_tour&fecha_inicio=2025-01-01&fecha_fin=2026-12-31&tipo_reserva=con_transfer
```

---

### 1️⃣3️⃣ Múltiples Filtros

**Request**:
```
GET http://localhost:3000/api/reports?tipo_reporte=reservas_tiempo&granularidad_temporal=mes&fecha_inicio=2025-06-01&fecha_fin=2025-12-31&estado=finalizado&tourId=123&usuarioId=550e8400-e29b-41d4-a716-446655440001
```

---

## 📋 Parámetros de Query

| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `tipo_reporte` | string | ✅ Sí | Tipo de reporte | `reservas_tiempo`, `reservas_estado`, `reservas_empleado`, `ingresos_tiempo`, `ingresos_tour` |
| `granularidad_temporal` | string | ⚠️ Condicional | Solo para reportes de tiempo | `semana`, `mes`, `trimestre`, `año` |
| `fecha_inicio` | string (ISO) | ✅ Sí | Fecha de inicio | `2025-01-01` |
| `fecha_fin` | string (ISO) | ✅ Sí | Fecha de fin | `2026-12-31` |
| `estado` | string | ❌ Opcional | Estado de reserva | `pendiente`, `finalizado`, `cancelado`, `cancelada` |
| `tourId` | string (BigInt) | ❌ Opcional | ID del tour | `123` |
| `usuarioId` | string (UUID) | ❌ Opcional | ID del empleado | `550e8400-e29b-41d4-a716-446655440000` |
| `tipo_reserva` | string | ❌ Opcional | Tipo de reserva | `con_transfer`, `sin_transfer` |

**Notas importantes:**
- `granularidad_temporal` es **obligatorio** solo para `reservas_tiempo` e `ingresos_tiempo`
- Las fechas deben estar en formato `YYYY-MM-DD`
- `fecha_inicio` debe ser ≤ `fecha_fin`
- Las fechas se procesan en **UTC** para evitar problemas de zona horaria

---

## ⚠️ Reglas de Filtros por Tipo de Reporte

| Tipo de Reporte | Filtros Permitidos | Filtros Prohibidos |
|----------------|-------------------|-------------------|
| `reservas_tiempo` | fecha_inicio, fecha_fin, estado, tourId, usuarioId | - |
| `reservas_estado` | fecha_inicio, fecha_fin, tourId, usuarioId | estado ❌ |
| `reservas_empleado` | fecha_inicio, fecha_fin, estado, tourId | usuarioId ❌ |
| `ingresos_tiempo` | fecha_inicio, fecha_fin, estado, tourId, usuarioId | - |
| `ingresos_tour` | fecha_inicio, fecha_fin, estado | tourId ❌ |

---

## ❌ Ejemplos de Respuestas de Error

### Error: Granularidad faltante
```json
{
  "success": false,
  "error": "granularidad_temporal es requerida para reportes de tiempo"
}
```

### Error: Filtro no permitido
```json
{
  "success": false,
  "error": "El filtro 'estado' no está permitido para el tipo de reporte 'reservas_estado'"
}
```

### Error: Fechas inválidas
```json
{
  "success": false,
  "error": "fecha_inicio debe ser menor o igual a fecha_fin"
}
```

---

## 🔗 URLs Completas para Copiar y Pegar

### Endpoints Básicos (Sin Filtros)

```
# Reservas en el tiempo - Semanal 2025
http://localhost:3000/api/reports?tipo_reporte=reservas_tiempo&granularidad_temporal=semana&fecha_inicio=2025-01-01&fecha_fin=2025-12-31

# Reservas en el tiempo - Mensual 2025
http://localhost:3000/api/reports?tipo_reporte=reservas_tiempo&granularidad_temporal=mes&fecha_inicio=2025-01-01&fecha_fin=2025-12-31

# Reservas en el tiempo - Trimestral 2026
http://localhost:3000/api/reports?tipo_reporte=reservas_tiempo&granularidad_temporal=trimestre&fecha_inicio=2026-01-01&fecha_fin=2026-12-31

# Reservas en el tiempo - Anual 2025-2026
http://localhost:3000/api/reports?tipo_reporte=reservas_tiempo&granularidad_temporal=año&fecha_inicio=2025-01-01&fecha_fin=2026-12-31

# Reservas por estado - 2025
http://localhost:3000/api/reports?tipo_reporte=reservas_estado&fecha_inicio=2025-01-01&fecha_fin=2025-12-31

# Reservas por empleado - 2025-2026
http://localhost:3000/api/reports?tipo_reporte=reservas_empleado&fecha_inicio=2025-01-01&fecha_fin=2026-12-31

# Ingresos en el tiempo - Trimestral 2026
http://localhost:3000/api/reports?tipo_reporte=ingresos_tiempo&granularidad_temporal=trimestre&fecha_inicio=2026-01-01&fecha_fin=2026-12-31

# Ingresos por tour - 2025-2026
http://localhost:3000/api/reports?tipo_reporte=ingresos_tour&fecha_inicio=2025-01-01&fecha_fin=2026-12-31
```

### Endpoints con Filtros

```
# Reservas anual con estado cancelada
http://localhost:3000/api/reports?tipo_reporte=reservas_tiempo&granularidad_temporal=año&fecha_inicio=2025-01-01&fecha_fin=2026-12-31&estado=cancelada

# Reservas con filtro de tour
http://localhost:3000/api/reports?tipo_reporte=reservas_empleado&fecha_inicio=2025-01-01&fecha_fin=2026-12-31&tourId=123

# Ingresos con filtro de tipo de reserva
http://localhost:3000/api/reports?tipo_reporte=ingresos_tour&fecha_inicio=2025-01-01&fecha_fin=2026-12-31&tipo_reserva=con_transfer
```

---

## 💡 Tips para Postman

### 1. Guardar el Token en una Variable
1. Después del login, ve a **Tests** tab
2. Agrega este código:
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set("access_token", jsonData.data.session.access_token);
}
```
3. Luego en tus requests de reportes, usa: `Bearer {{access_token}}`

### 2. Crear una Collection
Crea una collection llamada "Reports" con:
- Login (POST)
- Reservas Tiempo Semanal (GET)
- Reservas Tiempo Mensual (GET)
- Reservas Tiempo Trimestral (GET)
- Reservas Tiempo Anual (GET)
- Reservas por Estado (GET)
- Reservas por Empleado (GET)
- Ingresos Tiempo Trimestral (GET)
- Ingresos por Tour (GET)

### 3. Usar Variables de Entorno
Crea un environment con:
- `base_url`: `http://localhost:3000`
- `access_token`: (se llena automáticamente con el script de Tests)

Luego usa: `{{base_url}}/api/reports?tipo_reporte=reservas_tiempo&granularidad_temporal=mes&fecha_inicio=2025-01-01&fecha_fin=2025-12-31`

---

## 📊 Estructura de Respuesta

Todas las respuestas exitosas tienen esta estructura:

```json
{
  "success": true,
  "data": {
    "tipo_reporte": "...",
    "granularidad_temporal": "..." | null,
    "periodo": {
      "fecha_inicio": "2025-01-01T00:00:00.000Z",
      "fecha_fin": "2026-12-31T23:59:59.999Z"
    },
    "kpis": {
      "total_reservas": 0,
      "reservas_canceladas": 0,
      "reservas_no_canceladas": 0,
      "porcentaje_cancelaciones": 0,
      "total_ingresos": 0,
      "total_descuentos": 0,
      "total_iva": 0,
      "promedio_reserva": 0
    },
    "datosGrafico": [...],
    "totalReservas": 0
  }
}
```

---

## 🔍 Troubleshooting

### Error 401 Unauthorized
- Verifica que el token esté correcto
- Verifica que el header sea: `Authorization: Bearer {token}` (con espacio después de Bearer)
- El token puede haber expirado, haz login nuevamente

### Error 400 Bad Request
- Verifica el formato de las fechas (debe ser ISO: `YYYY-MM-DD`)
- Verifica que `fecha_inicio` ≤ `fecha_fin`
- Verifica que `granularidad_temporal` esté presente para reportes de tiempo

### Error 403 Forbidden
- Solo usuarios con rol `admin` pueden acceder a reportes

### No hay datos en la respuesta
- Verifica que tengas reservas en la base de datos para el período seleccionado
- Verifica que las fechas sean correctas (2025-2026)
- Verifica que el valor del filtro `estado` coincida exactamente con el valor en la BD (puede ser "cancelado" o "cancelada")

---

## 📝 Notas sobre Fechas

- **Formato**: Las fechas se envían como `YYYY-MM-DD` (ej: `2025-01-01`)
- **Procesamiento**: El backend procesa todas las fechas en **UTC** para evitar problemas de zona horaria
- **Respuesta**: Las fechas en la respuesta vienen en formato ISO completo con UTC (ej: `2025-01-01T00:00:00.000Z`)

---

---

## 🏗️ Arquitectura Técnica del Sistema

### 📁 Estructura de Archivos

```
src/
├── app/
│   ├── api/
│   │   └── reports/
│   │       └── route.ts          # Endpoint principal
│   └── schemas/
│       └── report.schema.ts      # Validación Zod de query params
└── lib/
    ├── report-helpers.ts         # Validación y construcción de queries
    └── report-aggregations.ts   # Funciones de agregación de datos
```

### 🔧 Componentes Principales

#### 1. Schema de Validación (`report.schema.ts`)

**Responsabilidades**:
- Validar tipos de reporte permitidos
- Validar granularidades temporales
- Validar formato de fechas
- Validar que `granularidad_temporal` sea requerida para reportes de tiempo

**Tipos TypeScript**:
```typescript
type TipoReporte = 
  | "reservas_tiempo"
  | "reservas_estado"
  | "reservas_empleado"
  | "ingresos_tiempo"
  | "ingresos_tour"

type GranularidadTemporal = "semana" | "mes" | "trimestre" | "año"
```

#### 2. Helpers de Reportes (`report-helpers.ts`)

**Funciones principales**:

- **`validarFiltrosParaTipoReporte()`**: Valida que los filtros sean válidos según el tipo de reporte
  - Verifica fechas obligatorias
  - Rechaza filtros prohibidos
  - Acepta solo filtros permitidos

- **`construirWhereClause()`**: Construye la cláusula WHERE de Prisma
  - Aplica filtros de fecha en UTC
  - Aplica filtros opcionales según tipo de reporte
  - Maneja filtro de `tipo_reserva`

- **`calcularKPIsGenerales()`**: Calcula KPIs (total reservas, cancelaciones, ingresos, etc.)

**Configuración de filtros**:
```typescript
const FILTROS_PERMITIDOS: Record<TipoReporte, (keyof FiltrosReporte)[]> = {
  reservas_tiempo: ["fecha_inicio", "fecha_fin", "estado", "tourId", "usuarioId"],
  reservas_estado: ["fecha_inicio", "fecha_fin", "tourId", "usuarioId"],
  reservas_empleado: ["fecha_inicio", "fecha_fin", "estado", "tourId"],
  ingresos_tiempo: ["fecha_inicio", "fecha_fin", "estado", "tourId", "usuarioId"],
  ingresos_tour: ["fecha_inicio", "fecha_fin", "estado"],
};

const FILTROS_PROHIBIDOS: Record<TipoReporte, (keyof FiltrosReporte)[]> = {
  reservas_tiempo: [],
  reservas_estado: ["estado"],
  reservas_empleado: ["usuarioId"],
  ingresos_tiempo: [],
  ingresos_tour: ["tourId"],
};
```

#### 3. Agregaciones (`report-aggregations.ts`)

Funciones especializadas para generar datos del gráfico:

- **`agregarReservasPorTiempo()`**: Agrupa por período temporal (semana/mes/trimestre/año)
  - Formato de períodos: `2025-W01`, `2025-01`, `2025-T1`, `2025`
- **`agregarReservasPorEstado()`**: Agrupa por estado y cuenta
- **`agregarReservasPorEmpleado()`**: Agrupa por empleado y cuenta
- **`agregarIngresosPorTiempo()`**: Agrupa ingresos por período temporal
- **`agregarIngresosPorTour()`**: Agrupa ingresos por tour

#### 4. Endpoint Principal (`route.ts`)

**Flujo de ejecución**:

```
Request (Query Params)
    ↓
Schema Validation (Zod)
    ↓
Filter Validation (report-helpers)
    ↓
Build WHERE Clause (report-helpers)
    ↓
Query Database (Prisma)
    ↓
Calculate KPIs (report-helpers)
    ↓
Aggregate Data (report-aggregations)
    ↓
Response (JSON)
```

### 🚀 Ventajas de la Arquitectura

1. **Separación de responsabilidades**: Validación, construcción de queries y agregación están separadas
2. **Validación estricta**: Los filtros se validan según el tipo de reporte
3. **Extensibilidad**: Fácil agregar nuevos tipos de reporte
4. **Mantenibilidad**: Código modular y bien documentado
5. **Eficiencia**: Consultas optimizadas con Prisma

### 📝 Notas Técnicas

- **Base de datos**: PostgreSQL con Prisma ORM
- **Agregaciones**: Se realizan en memoria después de obtener los datos (puede optimizarse con GROUP BY en SQL si es necesario)
- **BigInt**: Los IDs de tour se manejan como BigInt y se convierten a string en la respuesta
- **Serialización**: Se usa `serializeForJSON` para manejar BigInt y otros tipos especiales
- **Fechas UTC**: Todas las fechas se procesan en UTC para evitar problemas de zona horaria

---

## 📚 Referencias

- Ver `ENDPOINTS_README.md` para documentación general de todos los endpoints del sistema
