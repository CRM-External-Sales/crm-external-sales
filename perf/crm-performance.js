/**
 * Pruebas de performance — CRM (Vercel u otro host)
 *
 * Variables de entorno:
 *   BASE_URL   — ej. https://tu-proyecto.vercel.app (sin barra final)
 *   K6_EMAIL   — usuario de prueba (agent o admin)
 *   K6_PASSWORD
 *
 * Ejemplos:
 *   k6 run -e BASE_URL=https://tu-app.vercel.app -e K6_EMAIL=... -e K6_PASSWORD=... --vus 1 --iterations 100 perf/crm-performance.js
 *   k6 run -e BASE_URL=... -e K6_EMAIL=... -e K6_PASSWORD=... --vus 10 --duration 1m perf/crm-performance.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const EMAIL = __ENV.K6_EMAIL;
const PASSWORD = __ENV.K6_PASSWORD;

export function setup() {
  if (!EMAIL || !PASSWORD) {
    throw new Error("Define K6_EMAIL y K6_PASSWORD (usuario de prueba en Supabase/BD).");
  }

  const loginRes = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { "Content-Type": "application/json" }, tags: { name: "login" } },
  );

  const ok = check(loginRes, {
    "login status 200": (r) => r.status === 200,
  });

  if (!ok) {
    console.error(`Login falló: ${loginRes.status} ${loginRes.body}`);
    return { token: null };
  }

  const body = loginRes.json();
  const token = body?.data?.session?.access_token;
  if (!token) {
    throw new Error("Login OK pero sin access_token en la respuesta.");
  }

  // Calentamiento (no cuenta en métricas del escenario principal)
  http.get(`${BASE}/api/tours?page=1&limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name: "warmup" },
  });

  return { token };
}

export default function (data) {
  if (!data.token) return;

  const res = http.get(`${BASE}/api/tours?page=1&limit=10`, {
    headers: { Authorization: `Bearer ${data.token}` },
    tags: { name: "list_tours" },
  });

  check(res, {
    "tours status 200": (r) => r.status === 200,
  });

  sleep(0.2);
}
