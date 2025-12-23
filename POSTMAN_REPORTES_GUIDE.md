# 📊 Guía para Probar Reportes en Postman

## Paso 1: Obtener Token de Autenticación

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

### Response Esperada
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "user": {
      "id": "uuid-del-usuario",
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

**⚠️ IMPORTANTE**: Copia el `access_token` de `data.session.access_token`

---

## Paso 2: Probar Endpoint de Reportes

### Ejemplo 1: Reporte Trimestral (últimos 3 meses)

**Request**:
- **Método**: `GET`
- **URL**: `http://localhost:3000/api/reports?tipo_reporte=trimestral`
- **Headers**:
  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json
  ```

**Response Esperada**:
```json
{
  "success": true,
  "data": {
    "periodo": {
      "fecha_inicio": "2024-10-01T00:00:00.000Z",
      "fecha_fin": "2024-12-31T23:59:59.999Z",
      "tipo_reporte": "trimestral"
    },
    "metricas": {
      "total_reservas": 150,
      "reservas_canceladas": 10,
      "reservas_no_canceladas": 140,
      "total_ingresos": 5000000.00,
      "total_descuentos": 50000.00,
      "total_iva": 950000.00,
      "promedio_reserva": 33333.33
    },
    "tours_mas_solicitados": [
      {
        "tour_id": "123",
        "nombre_tour": "Tour de Aventura",
        "tipo_tour": "Adventure",
        "cantidad_reservas": 45,
        "ingresos_totales": 2250000.00
      }
    ],
    "tours_menos_solicitados": [...],
    "clientes_recurrentes": [
      {
        "usuario_id": "uuid",
        "username": "cliente1",
        "email": "cliente1@ejemplo.com",
        "cantidad_reservas": 5,
        "total_gastado": 250000.00
      }
    ],
    "reservas_detalladas": [...]
  }
}
```

---

### Ejemplo 2: Reporte Semestral (últimos 6 meses)

**Request**:
- **Método**: `GET`
- **URL**: `http://localhost:3000/api/reports?tipo_reporte=semestral`
- **Headers**:
  ```
  Authorization: Bearer {tu-access-token}
  ```

---

### Ejemplo 3: Reporte Anual (último año)

**Request**:
- **Método**: `GET`
- **URL**: `http://localhost:3000/api/reports?tipo_reporte=anual`
- **Headers**:
  ```
  Authorization: Bearer {tu-access-token}
  ```

---

### Ejemplo 4: Reporte Personalizado con Fechas Específicas

**Request**:
- **Método**: `GET`
- **URL**: `http://localhost:3000/api/reports?fecha_inicio=2024-01-01&fecha_fin=2024-12-31&tipo_reporte=personalizado`
- **Headers**:
  ```
  Authorization: Bearer {tu-access-token}
  ```

**Nota**: Las fechas deben estar en formato ISO: `YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ss.sssZ`

---

### Ejemplo 5: Reporte con Filtro por Estado

**Request**:
- **Método**: `GET`
- **URL**: `http://localhost:3000/api/reports?tipo_reporte=trimestral&estado=confirmada`
- **Headers**:
  ```
  Authorization: Bearer {tu-access-token}
  ```

**Estados posibles**: `cancelada`, `confirmada`, `pendiente`, etc. (depende de los valores en tu BD)

---

### Ejemplo 6: Reporte Filtrado por Tour Específico

**Request**:
- **Método**: `GET`
- **URL**: `http://localhost:3000/api/reports?tipo_reporte=anual&tourId=123`
- **Headers**:
  ```
  Authorization: Bearer {tu-access-token}
  ```

**Nota**: `tourId` debe ser el ID numérico del tour (BigInt)

---

### Ejemplo 7: Reporte con Límite de Registros

**Request**:
- **Método**: `GET`
- **URL**: `http://localhost:3000/api/reports?tipo_reporte=trimestral&limit=100`
- **Headers**:
  ```
  Authorization: Bearer {tu-access-token}
  ```

**Nota**: El límite máximo es 1000 registros

---

### Ejemplo 8: Reporte Completo con Múltiples Filtros

**Request**:
- **Método**: `GET`
- **URL**: `http://localhost:3000/api/reports?fecha_inicio=2024-06-01&fecha_fin=2024-12-31&estado=confirmada&limit=500`
- **Headers**:
  ```
  Authorization: Bearer {tu-access-token}
  ```

---

## Parámetros de Query Disponibles

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `tipo_reporte` | string | Tipo de reporte: `trimestral`, `semestral`, `anual`, `personalizado` | `trimestral` |
| `fecha_inicio` | string (ISO) | Fecha de inicio del período | `2024-01-01` |
| `fecha_fin` | string (ISO) | Fecha de fin del período | `2024-12-31` |
| `tourId` | string (BigInt) | ID del tour para filtrar | `123` |
| `usuarioId` | string (UUID) | ID del usuario para filtrar (solo admin/agent) | `uuid-del-usuario` |
| `estado` | string | Estado de la reserva | `confirmada`, `cancelada` |
| `limit` | number | Límite de registros (1-1000) | `500` |
| `page` | number | Página para paginación | `1` |

---

## Códigos de Respuesta

- **200 OK**: Reporte generado exitosamente
- **400 Bad Request**: Parámetros inválidos (fechas malformadas, límites incorrectos)
- **401 Unauthorized**: Token ausente o inválido
- **403 Forbidden**: Usuario sin permisos (ej: customer intentando ver reportes de otros usuarios)
- **404 Not Found**: No se encontraron reservas para el período (pero retorna estructura vacía)
- **500 Internal Server Error**: Error inesperado del servidor

---

## Tips para Postman

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
- Reporte Trimestral (GET)
- Reporte Semestral (GET)
- Reporte Anual (GET)
- Reporte Personalizado (GET)

### 3. Usar Variables de Entorno
Crea un environment con:
- `base_url`: `http://localhost:3000`
- `access_token`: (se llena automáticamente con el script de Tests)

Luego usa: `{{base_url}}/api/reports?tipo_reporte=trimestral`

---

## Ejemplo de Respuesta cuando NO hay Datos

Si no hay reservas para el período seleccionado:

```json
{
  "success": true,
  "data": {
    "periodo": {
      "fecha_inicio": "2024-01-01T00:00:00.000Z",
      "fecha_fin": "2024-12-31T23:59:59.999Z",
      "tipo_reporte": "anual"
    },
    "metricas": {
      "total_reservas": 0,
      "reservas_canceladas": 0,
      "reservas_no_canceladas": 0,
      "total_ingresos": 0,
      "total_descuentos": 0,
      "total_iva": 0,
      "promedio_reserva": 0
    },
    "tours_mas_solicitados": [],
    "tours_menos_solicitados": [],
    "clientes_recurrentes": [],
    "reservas_detalladas": []
  },
  "message": "No se encontraron reservas para el período seleccionado"
}
```

---

## Verificar que el Servidor esté Corriendo

Antes de probar, asegúrate de que tu servidor Next.js esté corriendo:

```bash
npm run dev
```

El servidor debería estar en `http://localhost:3000`

---

## Troubleshooting

### Error 401 Unauthorized
- Verifica que el token esté correcto
- Verifica que el header sea: `Authorization: Bearer {token}` (con espacio después de Bearer)
- El token puede haber expirado, haz login nuevamente

### Error 400 Bad Request
- Verifica el formato de las fechas (debe ser ISO: `YYYY-MM-DD`)
- Verifica que `fecha_inicio` ≤ `fecha_fin`
- Verifica que `limit` esté entre 1 y 1000

### Error 403 Forbidden
- Si eres `customer`, solo puedes ver tus propias reservas
- Si intentas filtrar por `usuarioId` de otro usuario siendo `customer`, recibirás este error

### No hay datos en la respuesta
- Verifica que tengas reservas en la base de datos para el período seleccionado
- Verifica que las fechas sean correctas
- Verifica que el usuario tenga reservas (si es customer)

