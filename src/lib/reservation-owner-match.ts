/**
 * Compara el `employee_user` de una reserva con el `user.id` de la sesión.
 * Reduce falsos rechazos por diferencias triviales de mayúsculas/espacios.
 */
export function isReservationCreatedByCurrentUser(
  reservationEmployeeUuid: string,
  sessionUserId: string | undefined | null,
): boolean {
  if (sessionUserId == null || sessionUserId === "") return false;
  return (
    String(reservationEmployeeUuid).trim().toLowerCase() ===
    String(sessionUserId).trim().toLowerCase()
  );
}
