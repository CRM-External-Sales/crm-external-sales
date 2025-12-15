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
    const response = await http.get("/auth/me");
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

// Interfaces para Suppliers
export interface Supplier {
  corporate: number;
  company: string;
  phone: string;
  email: string;
  service: string;
  created_at: string;
}

// Servicios de Tours
export const tourService = {
  // Obtener todos los tours
  getTours: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
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

  // Crear nuevo tour (solo admin)
  createTour: async (tourData: {
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
  }): Promise<ApiResponse<Tour>> => {
    const response = await http.post("/tours", tourData);
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
};

// Servicios de Suppliers
export const supplierService = {
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
