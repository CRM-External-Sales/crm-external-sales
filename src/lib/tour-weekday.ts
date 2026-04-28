/**
 * Mapea nombres de día en español (como en `tour_schedule.weekday`) a índice JS (0=Domingo).
 */
const SPANISH_WEEKDAY_TO_JS: Record<string, number> = {
  Domingo: 0,
  Lunes: 1,
  Martes: 2,
  Miércoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sábado: 6,
};

/**
 * Próxima ocurrencia del día de la semana indicado (desde hoy, inclusive).
 * La hora de la reserva se envía aparte; aquí fijamos el día a mediodía UTC para el campo `date` ISO.
 */
export function getNextISODateForTourWeekday(
  weekday: string,
  reference: Date = new Date(),
): string {
  const key = weekday.trim();
  const targetDow = SPANISH_WEEKDAY_TO_JS[key];
  if (targetDow === undefined) {
    throw new Error(`Día de la semana no reconocido: ${weekday}`);
  }

  const ref = new Date(reference);
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const currentDow = today.getDay();
  const addDays = (targetDow - currentDow + 7) % 7;
  const d = new Date(today);
  d.setDate(today.getDate() + addDays);

  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0),
  ).toISOString();
}
