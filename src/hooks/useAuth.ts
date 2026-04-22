import { useState, useEffect, useCallback } from "react";
import {
  authService,
  userService,
  tokenUtils,
  userUtils,
  type User,
  type ApiResponse,
} from "@/lib/api";
import { clearClientHomeGate } from "@/features/client-home/clientCatalogAccess";

// Hook para autenticación
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar usuario al inicializar
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = tokenUtils.getToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await authService.getCurrentUser();
        if (response.success && response.data) {
          setUser(response.data);
          userUtils.setUserData(response.data);
        } else {
          tokenUtils.removeToken();
          userUtils.removeUserData();
        }
      } catch (err) {
        console.error("Error cargando usuario:", err);
        tokenUtils.removeToken();
        userUtils.removeUserData();
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Función de login
  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.login({ email, password });

      if (response.success && response.data) {
        const { user: userData, session } = response.data;
        tokenUtils.setToken(session.access_token);
        userUtils.setUserData(userData);
        setUser(userData);
        return { success: true, user: userData };
      } else {
        setError(response.error || "Error en el login");
        return { success: false, error: response.error };
      }
    } catch (err: unknown) {
      let errorMessage = "Error en el login";
      
      if (err && typeof err === "object" && "response" in err) {
        const response = err.response as { data?: { error?: string } };
        errorMessage = response?.data?.error || errorMessage;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Función de registro
  const register = useCallback(
    async (userData: {
      username: string;
      email: string;
      password: string;
      phone?: string;
      role?: "admin" | "agent" | "customer";
    }) => {
      try {
        setLoading(true);
        setError(null);

        const response = await authService.register(userData);

        if (response.success && response.data) {
          const newUser = response.data;
          // Nota: register devuelve solo el usuario, no la sesión
          // En un flujo real, deberías obtener la sesión después del registro
          userUtils.setUserData(newUser);
          setUser(newUser);
          return { success: true, user: newUser };
        } else {
          setError(response.error || "Error en el registro");
          return { success: false, error: response.error };
        }
      } catch (err: unknown) {
        let errorMessage = "Error en el registro";
        
        if (err && typeof err === "object" && "response" in err) {
          const response = err.response as { data?: { error?: string } };
          errorMessage = response?.data?.error || errorMessage;
        }
        
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Función de logout
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error("Error en logout:", err);
    } finally {
      tokenUtils.removeToken();
      userUtils.removeUserData();
      setUser(null);
      setError(null);
      clearClientHomeGate();
    }
  }, []);

  // Función para cambiar contraseña
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        setLoading(true);
        setError(null);

        const response = await authService.changePassword({
          currentPassword,
          newPassword,
        });

        if (response.success) {
          return { success: true };
        } else {
          setError(response.error || "Error al cambiar contraseña");
          return { success: false, error: response.error };
        }
      } catch (err: unknown) {
        let errorMessage = "Error al cambiar contraseña";
        
        if (err && typeof err === "object" && "response" in err) {
          const response = err.response as { data?: { error?: string } };
          errorMessage = response?.data?.error || errorMessage;
        }
        
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Función para solicitar restablecimiento de contraseña
  const forgotPassword = useCallback(async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.forgotPassword(email);

      if (response.success) {
        return { success: true };
      } else {
        setError(response.error || "Error al solicitar restablecimiento");
        return { success: false, error: response.error };
      }
    } catch (err: unknown) {
      let errorMessage = "Error al solicitar restablecimiento";
      
      if (err && typeof err === "object" && "response" in err) {
        const response = err.response as { data?: { error?: string } };
        errorMessage = response?.data?.error || errorMessage;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    changePassword,
    forgotPassword,
    isAuthenticated: !!user,
    isAdmin: userUtils.isAdmin(user || undefined),
    isAgentOrAdmin: userUtils.isAgentOrAdmin(user || undefined),
  };
};

// Hook para gestión de usuarios (solo admin)
export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Obtener usuarios
  const fetchUsers = useCallback(
    async (params?: {
      page?: number;
      limit?: number;
      role?: "admin" | "agent" | "customer";
      search?: string;
    }) => {
      try {
        setLoading(true);
        setError(null);

        const response = await userService.getUsers(params);

        if (response.success && response.data) {
          setUsers(response.data);
          if (response.pagination) {
            setPagination(response.pagination);
          }
          return { success: true, users: response.data };
        } else {
          setError(response.error || "Error al obtener usuarios");
          return { success: false, error: response.error };
        }
      } catch (err: unknown) {
        let errorMessage = "Error al obtener usuarios";
        
        if (err && typeof err === "object" && "response" in err) {
          const response = err.response as { data?: { error?: string } };
          errorMessage = response?.data?.error || errorMessage;
        }
        
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Obtener usuario por ID
  const fetchUserById = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await userService.getUserById(id);

      if (response.success && response.data) {
        return { success: true, user: response.data };
      } else {
        setError(response.error || "Error al obtener usuario");
        return { success: false, error: response.error };
      }
    } catch (err: unknown) {
      let errorMessage = "Error al obtener usuario";
      
      if (err && typeof err === "object" && "response" in err) {
        const response = err.response as { data?: { error?: string } };
        errorMessage = response?.data?.error || errorMessage;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Actualizar usuario
  const updateUser = useCallback(
    async (
      id: string,
      userData: Partial<{
        username: string;
        email: string;
        phone: string;
        role: "admin" | "agent" | "customer";
      }>,
    ) => {
      try {
        setLoading(true);
        setError(null);

        const response = await userService.updateUser(id, userData);

        if (response.success && response.data) {
          // Actualizar la lista de usuarios
          setUsers((prev) =>
            prev.map((user) => (user.id === id ? response.data! : user)),
          );
          return { success: true, user: response.data };
        } else {
          setError(response.error || "Error al actualizar usuario");
          return { success: false, error: response.error };
        }
      } catch (err: unknown) {
        let errorMessage = "Error al actualizar usuario";
        
        if (err && typeof err === "object" && "response" in err) {
          const response = err.response as { data?: { error?: string } };
          errorMessage = response?.data?.error || errorMessage;
        }
        
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Eliminar usuario
  const deleteUser = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await userService.deleteUser(id);

      if (response.success) {
        // Remover usuario de la lista
        setUsers((prev) => prev.filter((user) => user.id !== id));
        return { success: true };
      } else {
        setError(response.error || "Error al eliminar usuario");
        return { success: false, error: response.error };
      }
    } catch (err: unknown) {
      let errorMessage = "Error al eliminar usuario";
      
      if (err && typeof err === "object" && "response" in err) {
        const response = err.response as { data?: { error?: string } };
        errorMessage = response?.data?.error || errorMessage;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    users,
    loading,
    error,
    pagination,
    fetchUsers,
    fetchUserById,
    updateUser,
    deleteUser,
  };
};

// Hook para manejo de formularios de autenticación
export const useAuthForm = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (type: "login" | "register" | "changePassword") => {
    const errors: Record<string, string> = {};

    if (type === "register") {
      if (!formData.username.trim()) {
        errors.username = "El nombre de usuario es requerido";
      } else if (formData.username.length < 3) {
        errors.username =
          "El nombre de usuario debe tener al menos 3 caracteres";
      }

      if (!formData.email.trim()) {
        errors.email = "El email es requerido";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errors.email = "El email no es válido";
      }

      if (!formData.password) {
        errors.password = "La contraseña es requerida";
      } else if (formData.password.length < 8) {
        errors.password = "La contraseña debe tener al menos 8 caracteres";
      }

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Las contraseñas no coinciden";
      }
    } else if (type === "login") {
      if (!formData.email.trim()) {
        errors.email = "El email es requerido";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errors.email = "El email no es válido";
      }

      if (!formData.password) {
        errors.password = "La contraseña es requerida";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
    });
    setFormErrors({});
  };

  return {
    formData,
    formErrors,
    updateField,
    validateForm,
    resetForm,
  };
};
