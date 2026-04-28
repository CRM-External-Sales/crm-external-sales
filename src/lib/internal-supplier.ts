import type { PrismaClient } from "@/generated/prisma";

/**
 * Cédula / ID corporativa reservada para “operación interna” (sin proveedor externo).
 * Debe existir en `supplier` (se crea con `ensureInternalSupplierExists`).
 */
export const INTERNAL_SUPPLIER_CORPORATE = 999_999_000_000_001;

const internalAsBigInt = () => BigInt(INTERNAL_SUPPLIER_CORPORATE);

/**
 * Garantiza la fila `supplier` de operación interna para satisfacer el FK
 * de `tour` y `transfer` cuando no se elige un proveedor externo.
 */
export async function ensureInternalSupplierExists(
  db: PrismaClient,
): Promise<void> {
  const corporate = internalAsBigInt();
  await db.supplier.upsert({
    where: { corporate },
    create: {
      corporate,
      company: "Operación interna",
      phone: `+int-${String(INTERNAL_SUPPLIER_CORPORATE).slice(0, 18)}`,
      email: `operacion.interna.${INTERNAL_SUPPLIER_CORPORATE}@local.invalid`,
      service: "General",
    },
    update: {},
  });
}
