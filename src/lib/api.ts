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
  license_plate: number;
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

// Interfaces para Transfers
export interface Transfer {
  license_plate: number;
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
      supplier_corporate: number;
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
    licensePlate: number,
  ): Promise<ApiResponse<Transfer>> => {
    const response = await http.get(`/transfers/${licensePlate}`);
    return response.data as ApiResponse<Transfer>;
  },

  // Crear transfer (solo admin)
  createTransfer: async (transferData: {
    license_plate: number;
    supplier_corporate: number;
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
    licensePlate: number,
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
    const response = await http.put(`/transfers/${licensePlate}`, transferData);
    return response.data as ApiResponse<Transfer>;
  },

  // Eliminar transfer (solo admin)
  deleteTransfer: async (licensePlate: number): Promise<ApiResponse> => {
    const response = await http.delete(`/transfers/${licensePlate}`);
    return response.data as ApiResponse;
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
