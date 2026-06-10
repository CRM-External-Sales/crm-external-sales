/** Claves estables para borradores en localStorage */
export const formDraftKeys = {
  transfers: {
    create: "transfers/create",
    edit: (licensePlate: string | number) => `transfers/edit:${licensePlate}`,
    filters: "transfers/filters",
  },
  tours: {
    create: "tours/create",
    edit: (tourId: string | number) => `tours/edit:${tourId}`,
  },
  suppliers: {
    create: "suppliers/create",
    edit: (corporate: string | number) => `suppliers/edit:${corporate}`,
    filters: "suppliers/filters",
  },
  reservations: {
    create: "reservations/create",
    note: (reservationId: string | number) => `reservations/note:${reservationId}`,
  },
  users: {
    create: "users/create",
    edit: (username: string) => `users/edit:${username}`,
  },
  reports: {
    filters: "reports/filters",
  },
  clientTour: {
    reservation: (tourId: string | number) => `client-tour/reservation:${tourId}`,
  },
} as const;

/** Campos que nunca deben persistirse */
export const SENSITIVE_DRAFT_FIELDS = ["password", "newPassword"] as const;
