import axios from "axios";

// A single axios instance the whole app uses to talk to the backend.
// Centralising it here means the base URL, the JWT header, and error handling
// live in one place instead of being repeated in every component.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// REQUEST interceptor: before every request goes out, attach the saved JWT (if
// the user is logged in) as a Bearer token. The backend's auth middleware reads
// this header to know who is making the request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// RESPONSE interceptor: if the backend ever replies 401 (token missing/expired),
// the saved session is no longer valid. We clear it and bounce the user to the
// login page so they can sign in again. We skip this on the auth routes
// themselves, where a 401 just means "wrong password" and should be shown inline.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const isAuthCall = url.includes("/auth/");

    if (status === 401 && !isAuthCall) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Hard redirect (we're outside React here) - only if not already on login.
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    // Pass the error on so the calling component can also react (show a message).
    return Promise.reject(error);
  }
);

export default api;
