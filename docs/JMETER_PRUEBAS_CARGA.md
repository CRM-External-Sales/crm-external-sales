# Pruebas de carga con Apache JMeter — CRM Río Perdido v0.1.0

Guía para ejecutar pruebas de performance contra la API del CRM y rellenar la sección **2.8** del documento de resultados de pruebas.

> **Adjunto recomendado:** importar también `docs/jmeter/crm-load-test.properties.example` (renombrar a `crm-load-test.properties` y completar valores) y `docs/jmeter/users.csv.example` si usas varios usuarios.

---

## 1. Requisitos previos

| Requisito | Versión sugerida |
|-----------|------------------|
| Apache JMeter | 5.6+ |
| Java | 17+ |
| Acceso HTTPS al despliegue | URL de Vercel o `http://localhost:3000` en local |

**Usuarios de prueba (no producción real):**

| Variable JMeter | Rol | Uso |
|-----------------|-----|-----|
| `JMETER_AGENT_EMAIL` | `agent` | Flujo reservas, listados |
| `JMETER_ADMIN_EMAIL` | `admin` | Tours, reportes, proveedores |
| `JMETER_PASSWORD` | — | Contraseña común de cuentas de prueba |

**Advertencias importantes**

1. **Rate limit en login (producción):** máximo **20 peticiones / 15 min / IP**. Un plan que haga login en bucle desde muchos hilos puede devolver **429**. Para cargas altas:
   - Usar entorno **local** (`npm run dev`, límite 1000), o
   - Hacer **un solo login por hilo** al inicio (Setup Thread Group) y reutilizar el token.
2. **User-Agent obligatorio:** longitud mínima 10 caracteres. JMeter por defecto cumple; no lo desactives.
3. **No ejecutar POST masivos de reservas** contra producción sin coordinación: llena cupos y ensucia datos. Preferir **staging** o BD de prueba.
4. El endpoint `GET /api/dev/reset-rate-limit` solo funciona fuera de producción.

---

## 2. Variables globales del plan

Crear en el Test Plan → **User Defined Variables** (o archivo `.properties`):

| Nombre | Ejemplo | Descripción |
|--------|---------|-------------|
| `BASE_URL` | `https://tu-app.vercel.app` | Origen sin barra final |
| `API_PREFIX` | `/api` | Prefijo de rutas |
| `JMETER_AGENT_EMAIL` | `agente.prueba@ejemplo.com` | Login agente |
| `JMETER_ADMIN_EMAIL` | `admin_demo@ejemplo.com` | Login admin |
| `JMETER_PASSWORD` | `********` | Contraseña |
| `TOUR_ID` | `1` | ID de tour existente en BD |
| `TOUR_DATE` | `2026-12-15T00:00:00.000Z` | Fecha ISO para reservas de prueba |
| `TOUR_TIME` | `09:00` | Hora HH:MM |
| `HOTEL_RESERVATION` | `1001` | Número habitación/reserva |

---

## 3. Estructura del Test Plan (árbol JMeter)

```
Test Plan: CRM Río Perdido - Carga API
├── User Defined Variables (tabla anterior)
├── HTTP Request Defaults
│     Server: ${BASE_URL}
│     Protocol: https (o http en local)
│     Content-Type: application/json
│     User-Agent: JMeter-CRM-LoadTest/1.0
├── HTTP Header Manager (global)
│     Content-Type: application/json
│     Accept: application/json
├── CSV Data Set Config (opcional) → users.csv
│
├── Thread Group A — Smoke (1 usuario, 10 iteraciones)
├── Thread Group B — Carga media (5 usuarios, ramp 30s, 5 min)
├── Thread Group C — Carga alta (10 usuarios, ramp 60s, 10 min)
│
└── Listeners (ver §8)
```

Cada Thread Group puede contener un **Transaction Controller** por escenario para medir tiempo total del flujo.

---

## 4. Configuración HTTP común

### HTTP Request Defaults

| Campo | Valor |
|-------|-------|
| Protocol | `https` |
| Server Name | `${BASE_URL}` sin protocolo — o dejar vacío y poner URL completa en cada sampler |
| Path | vacío (cada sampler define path) |

> Si usas URL completa en cada sampler: `https://${__P(BASE_HOST,tu-app.vercel.app)}/api/...`

### HTTP Header Manager (por sampler autenticado)

```
Authorization: Bearer ${ACCESS_TOKEN}
Content-Type: application/json
```

---

## 5. Escenarios y samplers (copiar en JMeter)

### 5.1 Login y extracción de token (Setup — 1 vez por hilo)

**Sampler:** HTTP Request  
**Method:** `POST`  
**Path:** `${API_PREFIX}/auth/login`  
**Body (raw JSON):**

```json
{
  "email": "${JMETER_AGENT_EMAIL}",
  "password": "${JMETER_PASSWORD}"
}
```

**Post-procesador — JSON Extractor:**

| Campo | Valor |
|-------|-------|
| Names of created variables | `ACCESS_TOKEN` |
| JSON Path expressions | `$.data.session.access_token` |
| Match No. | `1` |
| Default Value | `TOKEN_NOT_FOUND` |

**Assertion — Response Assertion:** Response Code = `200`  
**Assertion — JSON Assertion (opcional):** `$.success` = `true`

---

### 5.2 Sesión actual (validar token)

**Method:** `GET`  
**Path:** `${API_PREFIX}/auth/logout`  
**Headers:** `Authorization: Bearer ${ACCESS_TOKEN}`

Respuesta esperada: `200`, cuerpo con `data.role`.

---

### 5.3 Listar tours (lectura)

**Method:** `GET`  
**Path:** `${API_PREFIX}/tours?page=1&limit=20`  
**Headers:** Bearer

Métrica típica para tabla 2.8: tiempo de respuesta &lt; 3 s con 20 registros.

---

### 5.4 Listar reservas (agente/admin)

**Method:** `GET`  
**Path:** `${API_PREFIX}/reservations?page=1&limit=25`  
**Headers:** Bearer

Equivalente a la prueba manual del panel `/reservas`.

---

### 5.5 Disponibilidad de cupo

**Method:** `GET`  
**Path:** `${API_PREFIX}/tours/${TOUR_ID}/slot-availability?date=2026-12-15&time=09:00`  
**Headers:** Bearer

> En query usar fecha `YYYY-MM-DD` (no ISO completo en este endpoint).

---

### 5.6 Listar transfers

**Method:** `GET`  
**Path:** `${API_PREFIX}/transfers?page=1&limit=10`  
**Headers:** Bearer

---

### 5.7 Listar proveedores (agente)

**Method:** `GET`  
**Path:** `${API_PREFIX}/suppliers?page=1&limit=10`  
**Headers:** Bearer

---

### 5.8 Reportes (solo admin — Thread Group separado)

Tras login con `JMETER_ADMIN_EMAIL`:

**Method:** `GET`  
**Path:** `${API_PREFIX}/reports?tipo_reporte=reservas&fecha_inicio=2026-01-01&fecha_fin=2026-12-31`  
**Headers:** Bearer

---

### 5.9 Crear reserva (opcional — solo entorno de prueba)

**Method:** `POST`  
**Path:** `${API_PREFIX}/reservations`  
**Headers:** Bearer  
**Body:**

```json
{
  "tour_id": ${TOUR_ID},
  "people": 1,
  "date": "${TOUR_DATE}",
  "time": "${TOUR_TIME}",
  "hotel_reservation": ${HOTEL_RESERVATION},
  "note": "Reserva generada por JMeter - eliminar en limpieza",
  "iva_rate": 0.13,
  "discount": 0
}
```

Usar **Once Only Controller** o baja frecuencia (1 cada N iteraciones) para no saturar cupo.

---

## 6. Plan de ejecución alineado a la plantilla 2.8

### 6.1 Consumo de recursos (2.8.1)

JMeter **no mide CPU/RAM del servidor** por defecto. Opciones:

| Opción | Cómo |
|--------|------|
| Solo cliente | Monitor de recursos en la máquina donde corre JMeter (Task Manager / `perfmon`) |
| Servidor Vercel | Métricas del dashboard Vercel (funciones, duración) durante la prueba |
| BD Supabase | Panel de conexiones y CPU en Supabase |

Rellenar la tabla del documento con lo observado en el panel del proveedor, no inventar cifras.

### 6.2 Matriz de concurrencia sugerida

| Procesos concurrentes (hilos) | TXN por hilo (iteraciones) | Escenario JMeter |
|------------------------------|----------------------------|------------------|
| 1 | 10 | Thread Group Smoke |
| 1 | 100 | 1 hilo × 100 loops (solo GET) |
| 1 | 1000 | Solo si entorno local — riesgo 429/timeout |
| 5 | 10 | 5 hilos, 10 loops, ramp-up 30 s |
| 5 | 100 | 5 hilos, 100 loops, ramp-up 60 s |
| 10 | 10 | 10 hilos, 10 loops |
| 10 | 100 | 10 hilos, 100 loops — **no recomendado en prod** |

**TXN** = cada HTTP Request cuenta como 1 transacción (o agrupar con Transaction Controller).

### 6.3 Tiempo de respuesta (2.8.1.1)

Tras cada ejecución, en **Summary Report** o **Aggregate Report**:

| Métrica JMeter | Columna plantilla |
|----------------|-------------------|
| `# Samples` | Cantidad de TXN |
| `Start` / `End` (del listener) | Hora inicio / fin |
| `Elapsed` total del grupo | Tiempo total |
| `Throughput` | **TXN por segundo** |

Fórmula manual: `TXN por segundo = (# Samples) / (tiempo total en segundos)`

---

## 7. Flujo recomendado por Thread Group

### Grupo «Lectura CRM» (agente)

Orden dentro de **Loop Controller** (1 iteración = 1 TXN de cada paso o usar Transaction Controller):

1. POST login → extraer `ACCESS_TOKEN`
2. GET `/api/auth/logout` (me)
3. GET `/api/tours`
4. GET `/api/reservations`
5. GET `/api/tours/{id}/slot-availability`
6. GET `/api/transfers`

**Timer:** Uniform Random Timer 500–1500 ms entre pasos (simula usuario real).

### Grupo «Admin reportes»

1. POST login (admin)
2. GET `/api/reports?...`

---

## 8. Listeners y exportación

Añadir al final del plan (solo para análisis; desactivar en ejecuciones masivas):

| Listener | Uso |
|----------|-----|
| View Results Tree | Depuración (máx. 1–2 hilos) |
| Summary Report | Medias y throughput |
| Aggregate Report | Percentiles p90, p95 |
| Simple Data Writer | Exportar `.jtl` para Excel |

**Exportar CSV:** clic derecho en Summary Report → Save Table Data.

Campos útiles para el informe:

- `Average` (ms) → tiempo medio por TXN
- `Throughput` → TXN/s
- `Error %` → debe ser 0 % en prueba exitosa
- `Min` / `Max` → rango

---

## 9. Ejecución por línea de comandos

Desde la carpeta donde guardes el `.jmx`:

```bash
jmeter -n -t crm-load-test.jmx -l results/run-001.jtl -e -o results/report-001 -JBASE_URL=https://tu-app.vercel.app -JJMETER_AGENT_EMAIL=agente@prueba.com -JJMETER_PASSWORD=TuPasswordSegura
```

Genera reporte HTML en `results/report-001/index.html`.

**Propiedades** (`crm-load-test.properties`):

```properties
BASE_URL=https://tu-app.vercel.app
JMETER_AGENT_EMAIL=agente.prueba@ejemplo.com
JMETER_ADMIN_EMAIL=admin_demo@ejemplo.com
JMETER_PASSWORD=cambiar
TOUR_ID=1
```

```bash
jmeter -n -t crm-load-test.jmx -q docs/jmeter/crm-load-test.properties -l results/run-001.jtl
```

---

## 10. Criterios de aceptación (sugeridos para el informe)

| Escenario | Umbral orientativo (ajustar con el cliente) |
|---------|---------------------------------------------|
| GET tours / reservas (1 usuario) | &lt; 3000 ms promedio |
| GET con 5 usuarios concurrentes | &lt; 5000 ms p95, error 0 % |
| Login | &lt; 2000 ms; sin 429 en smoke |
| POST reserva | &lt; 4000 ms; 400 solo si cupo agotado (caso esperado) |

Documentar en el informe si el umbral no se cumple y si la causa fue red, cold start de Vercel o límites de Supabase.

---

## 11. Errores frecuentes y solución

| Código | Causa | Acción |
|--------|-------|--------|
| 401 | Token ausente o expirado | Repetir login; verificar JSON Path del extractor |
| 403 | Rol incorrecto | Usar admin para reportes/tours POST |
| 429 | Rate limit login | Menos hilos de login; entorno dev; reset rate limit (solo dev) |
| 400 | Body inválido | Revisar `date` ISO y `time` HH:MM |
| 400 cupo | Slot lleno | Cambiar fecha/hora o usar otro `TOUR_ID` |
| Timeout | Cold start / red | Aumentar Timeout en HTTP Request (ej. 60000 ms) |

---

## 12. Plantilla para pegar en documento 2.8 (ejemplo)

Tras ejecutar **5 hilos × 100 iteraciones** solo GET (sin POST reservas), el 27/05/2026:

| Nº procesos | Cantidad TXN | Memoria (Kb) | CPU (%) | Disco (Mb) | Duración (min) |
|-------------|--------------|--------------|---------|------------|----------------|
| 5 | 2500 (5×5 endpoints×100) | [panel Supabase] | [panel Vercel] | N/A | [duración real] |

**Tiempo de respuesta — prueba individual (Summary Report):**

| Cantidad TXN | Hora inicio | Hora fin | Tiempo total | TXN/seg |
|--------------|-------------|----------|--------------|---------|
| 500 | 14:00 | 14:08 | 8 min | 1.04 |

*(Sustituir por valores exportados del `.jtl`.)*

---

## 13. Checklist antes de entregar resultados

- [ ] Entorno y URL documentados
- [ ] Usuarios de prueba dedicados (no cuentas reales de operación)
- [ ] Plan sin login masivo en producción (o token reutilizado)
- [ ] Archivo `.jtl` y captura de Summary Report adjuntos
- [ ] Datos creados por POST reserva eliminados o marcados en BD de prueba
- [ ] Sección 2.8 indica si la prueba fue cualitativa o con herramienta (JMeter 5.x)

---

## 14. Referencias del proyecto

| Recurso | Ruta |
|---------|------|
| Endpoints | `ENDPOINTS_README.md` |
| Login API | `src/app/api/auth/login/route.ts` |
| Esquema reserva | `src/app/schemas/reservation.schema.ts` |
| Rate limit / seguridad | `src/lib/security-middleware.ts` |
| Guía reportes Postman | `POSTMAN_REPORTES_GUIDE.md` |

---

## 15. Crear el `.jmx` rápido en GUI (resumen)

1. Abrir JMeter → **Test Plan** → nombre `CRM Rio Perdido`.
2. Añadir **HTTP Request Defaults** + **HTTP Header Manager** (User-Agent).
3. **Thread Group** → Number of Threads = 5, Ramp-up = 30, Loop = 20.
4. Dentro: **HTTP Request** login + **JSON Extractor** + **HTTP Request** GET tours (Header Authorization).
5. **Listener** → Summary Report.
6. **File → Save** como `docs/jmeter/crm-load-test.jmx`.
7. Ejecutar y exportar resultados.

Si necesitas un archivo `.jmx` pregenerado en el repositorio, solicítalo en el equipo de desarrollo para versionarlo junto a esta guía.
