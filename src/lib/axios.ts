import axios from "axios";

export const http = axios.create({
  baseURL: "/api",
  timeout: 60000, // 1 minute
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar el token de autorización
http.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor para manejar respuestas y errores
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_data");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default http;
