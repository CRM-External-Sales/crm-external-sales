import { http } from "./axios";

// Tipos para las respuestas de la API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  role: "admin" | "agent" | "customer";
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: User;
}

// Servicios de autenticación
export const authService = {
  // Registro (solo admin) - Usar userService.createUser en su lugar
  register: async (userData: {
    username: string;
    email: string;
    password: string;
    phone?: string;
    role?: "admin" | "agent" | "customer";
  }): Promise<ApiResponse<User>> => {
    // Redirigir a userService.createUser
    return userService.createUser(userData);
  },

  // Inicio de sesión
  login: async (credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: User; session: AuthSession }>> => {
    const response = await http.post("/auth/login", credentials);
    return response.data as ApiResponse<{ user: User; session: AuthSession }>;
  },

  // Cerrar sesión
  logout: async (): Promise<ApiResponse> => {
    const response = await http.post("/auth/logout");
    return response.data as ApiResponse;
  },

  // Obtener usuario actual
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    // En este proyecto el backend expone el "me" como GET /api/auth/logout
    // (no existe /api/auth/me), así evitamos el 404.
    const response = await http.get("/auth/logout");
    return response.data as ApiResponse<User>;
  },

  // Cambiar contraseña
  changePassword: async (passwordData: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse> => {
    const response = await http.post("/auth/change-password", passwordData);
    return response.data as ApiResponse;
  },

  // Solicitar restablecimiento de contraseña
  forgotPassword: async (email: string): Promise<ApiResponse> => {
    const response = await http.post("/auth/forgot-password", { email });
    return response.data as ApiResponse;
  },

  // Restablecer contraseña
  resetPassword: async (resetData: {
    token: string;
    password: string;
  }): Promise<ApiResponse> => {
    const response = await http.post("/auth/reset-password", resetData);
    return response.data as ApiResponse;
  },
};

// Servicios de usuarios
export const userService = {
  // Crear nuevo usuario (solo admin)
  createUser: async (userData: {
    username: string;
    email: string;
    password: string;
    phone?: string;
    role?: "admin" | "agent" | "customer";
  }): Promise<ApiResponse<User>> => {
    const response = await http.post<ApiResponse<User>>("/users", userData);
    return response.data;
  },

  // Obtener todos los usuarios (solo admin)
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    role?: "admin" | "agent" | "customer";
    search?: string;
  }): Promise<ApiResponse<User[]>> => {
    const response = await http.get("/users", { params });
    return response.data as ApiResponse<User[]>;
  },

  // Obtener usuario por ID
  getUserById: async (id: string): Promise<ApiResponse<User>> => {
    const response = await http.get(`/users/${id}`);
    return response.data as ApiResponse<User>;
  },

  // Actualizar usuario
  updateUser: async (
    id: string,
    userData: Partial<{
      username: string;
      email: string;
      phone: string;
      role: "admin" | "agent" | "customer";
      password?: string;
    }>,
  ): Promise<ApiResponse<User>> => {
    const response = await http.put(`/users/${id}`, userData);
    return response.data as ApiResponse<User>;
  },

  // Eliminar usuario (solo admin)
  deleteUser: async (id: string): Promise<ApiResponse> => {
    const response = await http.delete(`/users/${id}`);
    return response.data as ApiResponse;
  },
};

// Utilidades para manejo de tokens
export const tokenUtils = {
  // Guardar token en localStorage
  setToken: (token: string): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  },

  // Obtener token de localStorage
  getToken: (): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_token");
    }
    return null;
  },

  // Eliminar token de localStorage
  removeToken: (): void => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
    }
  },

  // Verificar si hay un token válido
  hasToken: (): boolean => {
    return !!tokenUtils.getToken();
  },
};

// Utilidades para manejo de datos de usuario
export const userUtils = {
  // Guardar datos de usuario en localStorage
  setUserData: (user: User): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem("user_data", JSON.stringify(user));
    }
  },

  // Obtener datos de usuario de localStorage
  getUserData: (): User | null => {
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("user_data");
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  },

  // Eliminar datos de usuario de localStorage
  removeUserData: (): void => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user_data");
    }
  },

  // Verificar si el usuario es admin
  isAdmin: (user?: User): boolean => {
    const currentUser = user || userUtils.getUserData();
    return currentUser?.role === "admin";
  },

  // Verificar si el usuario es agente o admin
  isAgentOrAdmin: (user?: User): boolean => {
    const currentUser = user || userUtils.getUserData();
    return currentUser?.role === "admin" || currentUser?.role === "agent";
  },
};

// Interfaces para Tours
export interface Tour {
  id_tour: string;
  name: string;
  description: string;
  type: string;
  availability: string;
  base_price: number;
  spots: number;
  requirements: string;
  duration: string;
  difficulty: string;
  supplier_corporate: number;
  supplier?: {
    corporate: number;
    company: string;
    email: string;
  };
  tour_image?: TourImage[];
  tour_schedule?: TourSchedule[];
}

export interface TourImage {
  id: string;
  tour_id: string;
  path: string;
  alt?: string;
  is_cover: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  /** Presente en GET /tours/:id/images (URL firmada). */
  publicUrl?: string | null;
}

export interface TourSchedule {
  id: string;
  tour_id: string;
  weekday: string;
  start_time: string; // HH:MM format as returned by API
}

// Interfaces para Suppliers
export interface Supplier {
  corporate: number;
  company: string;
  phone: string;
  email: string;
  service: string;
  created_at: string;
}

// Interfaces para Transfers
export interface Transfer {
  license_plate: string;
  supplier_corporate: number;
  availability: string;
  make: string;
  model: string;
  category: string;
  capacity: number;
  type: string;
  base_price: number;
  sale_price: number;
  supplier?: {
    corporate: number;
    company: string;
    email: string;
  };
}

// Servicios de Tours
export const tourService = {
  // Obtener todos los tours
  getTours: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    difficulty?: string;
    name?: string;
    availability?: string;
  }): Promise<ApiResponse<Tour[]>> => {
    const response = await http.get("/tours", { params });
    return response.data as ApiResponse<Tour[]>;
  },

  // Obtener tour por ID
  getTourById: async (id: string): Promise<ApiResponse<Tour>> => {
    const response = await http.get(`/tours/${id}`);
    return response.data as ApiResponse<Tour>;
  },

  /** Cupo del turno (misma fecha + hora): `tour.spots` fijo; usado = reservas activas en ese slot. */
  getSlotAvailability: async (
    tourId: string,
    params: { date: string; time: string },
  ): Promise<
    ApiResponse<{ capacity: number; used: number; remaining: number }>
  > => {
    const response = await http.get<ApiResponse<{
      capacity: number;
      used: number;
      remaining: number;
    }>>(`/tours/${tourId}/slot-availability`, { params });
    return response.data;
  },

  // Crear nuevo tour (admin/agent)
  createTour: async (
    tourData: {
      name: string;
      description: string;
      type: string;
      availability: string;
      base_price: number;
      spots: number;
      requirements: string;
      duration: string;
      difficulty: string;
      /** Si se omite, el servidor asume operación interna. */
      supplier_corporate?: number;
    },
    schedules: Array<{ weekday: string; start_time: string }>,
    images: Array<{ file: File; alt?: string; is_cover?: boolean; sort_order?: number }>
  ): Promise<ApiResponse<Tour>> => {
    const formData = new FormData();
    
    // 1. Agregar datos del tour como JSON string
    formData.append("tour", JSON.stringify(tourData));
    
    // 2. Agregar schedules como JSON string array
    if (schedules && schedules.length > 0) {
      formData.append("schedules", JSON.stringify(schedules));
    }
    
    // 3. Agregar imágenes y sus metadatos
    if (images && images.length > 0) {
      images.forEach((img) => {
        formData.append("images", img.file);
        formData.append("alts[]", img.alt || "");
        formData.append("sort_orders[]", (img.sort_order ?? 0).toString());
        formData.append("is_covers[]", (img.is_cover ?? false).toString());
      });
    }

    const response = await http.post("/tours", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data as ApiResponse<Tour>;
  },

  // Actualizar tour (solo admin)
  updateTour: async (
    id: string,
    tourData: Partial<{
      name: string;
      description: string;
      photo?: string;
      type: string;
      availability: string;
      base_price: number;
      day: string;
      time: string;
      spots: number;
      requirements: string;
      duration: string;
      difficulty: string;
      supplier_corporate: number;
    }>,
  ): Promise<ApiResponse<Tour>> => {
    const response = await http.put(`/tours/${id}`, tourData);
    return response.data as ApiResponse<Tour>;
  },

  // Eliminar tour (solo admin)
  deleteTour: async (id: string): Promise<ApiResponse> => {
    const response = await http.delete(`/tours/${id}`);
    return response.data as ApiResponse;
  },

  // Obtener imágenes de un tour
  getTourImages: async (tourId: string): Promise<ApiResponse<TourImage[]>> => {
    const response = await http.get(`/tours/${tourId}/images`);
    return response.data as ApiResponse<TourImage[]>;
  },

  // Agregar imagen a un tour (solo admin)
  addTourImage: async (
    tourId: string,
    imageData: {
      path: string;
      alt?: string;
      is_cover?: boolean;
      sort_order?: number;
    },
  ): Promise<ApiResponse<TourImage>> => {
    const response = await http.post(`/tours/${tourId}/images`, imageData);
    return response.data as ApiResponse<TourImage>;
  },

  // Actualizar imagen de tour (solo admin)
  updateTourImage: async (
    tourId: string,
    imageId: string,
    imageData: Partial<{
      path: string;
      alt?: string;
      is_cover?: boolean;
      sort_order?: number;
    }>,
  ): Promise<ApiResponse<TourImage>> => {
    const response = await http.put(
      `/tours/${tourId}/images/${imageId}`,
      imageData,
    );
    return response.data as ApiResponse<TourImage>;
  },

  // Eliminar imagen de tour (solo admin)
  deleteTourImage: async (
    tourId: string,
    imageId: string,
  ): Promise<ApiResponse> => {
    const response = await http.delete(`/tours/${tourId}/images/${imageId}`);
    return response.data as ApiResponse;
  },

  // Obtener horarios de un tour
  getTourSchedules: async (tourId: string): Promise<ApiResponse<TourSchedule[]>> => {
    const response = await http.get(`/tours/${tourId}/schedules`);
    return response.data as ApiResponse<TourSchedule[]>;
  },

  // Agregar horarios a un tour (solo admin)
  addTourSchedules: async (
    tourId: string,
    schedules: Array<{ weekday: string; start_time: string }>,
  ): Promise<ApiResponse<TourSchedule[]>> => {
    const response = await http.post(`/tours/${tourId}/schedules`, schedules);
    return response.data as ApiResponse<TourSchedule[]>;
  },

  // Eliminar un horario de tour (solo admin)
  deleteTourSchedule: async (tourId: string, scheduleId: string): Promise<ApiResponse> => {
    const response = await http.delete(`/tours/${tourId}/schedules/${scheduleId}`);
    return response.data as ApiResponse;
  },

  // Subir nueva imagen a un tour (multipart)
  uploadTourImage: async (
    tourId: string,
    file: File,
    alt: string,
    isCover: boolean,
    sortOrder: number,
  ): Promise<ApiResponse<TourImage>> => {
    const formData = new FormData();
    formData.append("images", file);
    formData.append("alts[]", alt);
    formData.append("sort_orders[]", sortOrder.toString());
    formData.append("is_covers[]", isCover.toString());
    const response = await http.post(`/tours/${tourId}/images/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data as ApiResponse<TourImage>;
  },
};

// Servicios de Suppliers
export const supplierService = {
  // Obtener todos los suppliers (admin/agent)
  getSuppliers: async (params?: {
    page?: number;
    limit?: number;
    company?: string;
    service?: string;
  }): Promise<ApiResponse<Supplier[]>> => {
    const response = await http.get("/suppliers", { params });
    return response.data as ApiResponse<Supplier[]>;
  },

  // Obtener supplier por corporate (admin/agent)
  getSupplierByCorporate: async (
    corporate: number,
  ): Promise<ApiResponse<Supplier>> => {
    const response = await http.get(`/suppliers/${corporate}`);
    return response.data as ApiResponse<Supplier>;
  },

  // Crear supplier (solo admin)
  createSupplier: async (supplierData: {
    corporate: number;
    company: string;
    phone: string;
    email: string;
    service: string;
  }): Promise<ApiResponse<Supplier>> => {
    const response = await http.post("/suppliers", supplierData);
    return response.data as ApiResponse<Supplier>;
  },

  // Actualizar supplier (solo admin)
  updateSupplier: async (
    corporate: number,
    supplierData: Partial<{
      company: string;
      phone: string;
      email: string;
      service: string;
    }>,
  ): Promise<ApiResponse<Supplier>> => {
    const response = await http.put(`/suppliers/${corporate}`, supplierData);
    return response.data as ApiResponse<Supplier>;
  },

  // Eliminar supplier (solo admin)
  deleteSupplier: async (corporate: number): Promise<ApiResponse> => {
    const response = await http.delete(`/suppliers/${corporate}`);
    return response.data as ApiResponse;
  },
};

// Reservas
export interface Reservation {
  reservation_id: number;
  employee_user: string;
  tour_id: number;
  hotel_reservation: number;
  date: string;
  time: string;
  people: number;
  state: "pending" | "in_progress" | "completed" | "cancelled";
  note: string;
  cancellation_reason?: string | null;
  tour_amount: number;
  transfer_amount: number;
  subtotal: number;
  iva: number;
  discount: number;
  total: number;
  transfer_id?: string | null;
  tour?: {
    name: string;
    type: string;
    duration?: string;
    /** Ayuda a depurar política 24/48 h; coincide con el tour en BD. */
    supplier_corporate?: number;
  };
  transfer?: { license_plate: string; make: string; model: string } | null;
  app_user?: { username: string };
  /** Reservado para compatibilidad; siempre `null` (la anulación fuera de plazo usa reconocimiento explícito). */
  cancel_forbidden_reason?: null;
  is_within_cancellation_lead: boolean;
  late_cancellation_penalty_usd: number;
  /** Texto informativo si aplica penalidad por anular fuera del plazo mínimo. */
  late_cancellation_notice?: string | null;
  /** `true` si el tour usa el proveedor de operación interna (plazo 24 h). */
  is_internal_operation: boolean;
  /** 24, 48 o 0 (sin tour / cancelada) — horas mínimas de anticipación para anular sin penalidad. */
  cancellation_lead_hours: number;
}

export const reservationService = {
  createReservation: async (payload: {
    tour_id: number;
    transfer_id?: string;
    /** Monto de transfer en la reserva; si no se envía con transfer, el servidor usa el precio de venta del vehículo. */
    transfer_amount?: number;
    hotel_reservation: number;
    date: string;
    time: string;
    people: number;
    note?: string;
    iva_rate?: number;
    discount?: number;
  }): Promise<ApiResponse<Reservation>> => {
    const response = await http.post<ApiResponse<Reservation>>(
      "/reservations",
      payload,
    );
    return response.data;
  },

  getReservations: async (params?: {
    page?: number;
    limit?: number;
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    state?: string;
    transfer_id?: string;
    q?: string;
  }): Promise<ApiResponse<Reservation[]>> => {
    const response = await http.get("/reservations", { params });
    return response.data as ApiResponse<Reservation[]>;
  },

  getReservationById: async (
    id: number,
  ): Promise<ApiResponse<Reservation>> => {
    const response = await http.get(`/reservations/${id}`);
    return response.data as ApiResponse<Reservation>;
  },

  updateReservation: async (
    id: number,
    payload: {
      state?: "cancelled";
      cancellation_reason?: string | null;
      note?: string;
      acknowledge_late_cancellation?: boolean;
    },
  ): Promise<ApiResponse<Reservation>> => {
    const response = await http.put<ApiResponse<Reservation>>(
      `/reservations/${id}`,
      payload,
    );
    return response.data;
  },
};

// Servicios de Transfers
export const transferService = {
  // Obtener todos los transfers (admin/agent)
  getTransfers: async (params?: {
    page?: number;
    limit?: number;
    make?: string;
    category?: string;
    availability?: string;
    type?: string;
  }): Promise<ApiResponse<Transfer[]>> => {
    const response = await http.get("/transfers", { params });
    return response.data as ApiResponse<Transfer[]>;
  },

  // Obtener transfer por placa (admin/agent)
  getTransferByLicensePlate: async (
    licensePlate: string,
  ): Promise<ApiResponse<Transfer>> => {
    const response = await http.get(
      `/transfers/${encodeURIComponent(licensePlate)}`,
    );
    return response.data as ApiResponse<Transfer>;
  },

  // Crear transfer (solo admin)
  createTransfer: async (transferData: {
    license_plate: string;
    /** Si se omite, el servidor asume operación interna. */
    supplier_corporate?: number;
    availability: string;
    make: string;
    model: string;
    category: string;
    capacity: number;
    type: string;
    base_price: number;
    sale_price: number;
  }): Promise<ApiResponse<Transfer>> => {
    const response = await http.post("/transfers", transferData);
    return response.data as ApiResponse<Transfer>;
  },

  // Actualizar transfer (solo admin)
  updateTransfer: async (
    licensePlate: string,
    transferData: Partial<{
      availability: string;
      make: string;
      model: string;
      category: string;
      capacity: number;
      type: string;
      base_price: number;
      sale_price: number;
      supplier_corporate: number;
    }>,
  ): Promise<ApiResponse<Transfer>> => {
    const response = await http.put(
      `/transfers/${encodeURIComponent(licensePlate)}`,
      transferData,
    );
    return response.data as ApiResponse<Transfer>;
  },

  // Eliminar transfer (solo admin)
  deleteTransfer: async (licensePlate: string): Promise<ApiResponse> => {
    const response = await http.delete(
      `/transfers/${encodeURIComponent(licensePlate)}`,
    );
    return response.data as ApiResponse;
  },

  /**
   * Matrículas con reserva activa (no cancelada) en esta fecha y hora.
   * Un transfer no puede duplicarse en el mismo franja.
   */
  getSlotBusyPlates: async (params: {
    date: string;
    time: string;
    /** Tour de la reserva: define duración y ventana de ocupación (servicio + colchón de retorno). */
    tour_id: number;
  }): Promise<ApiResponse<{ busy_license_plates: string[] }>> => {
    const response = await http.get(
      "/transfers/slot-availability",
      { params },
    );
    return response.data as ApiResponse<{ busy_license_plates: string[] }>;
  },
};

// Servicio de Upload
export const uploadService = {
  // Subir imagen a Supabase Storage
  uploadImage: async (file: File): Promise<ApiResponse<{
    path: string;
    fileName: string;
    size: number;
    type: string;
  }>> => {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await http.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data as ApiResponse<{
      path: string;
      fileName: string;
      size: number;
      type: string;
    }>;
  },
};

export default http;
