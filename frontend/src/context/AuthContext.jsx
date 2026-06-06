import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios.js";

// AuthContext holds the logged-in user and the login/register/logout actions.
// Using the Context API (instead of Redux) lets any component read the current
// user or call logout without passing props down through every level.
const AuthContext = createContext(null);

// A tiny custom hook so components can just call useAuth() instead of importing
// both useContext and the context object every time.
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  // We seed the user from localStorage so a page refresh keeps you logged in.
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  // "loading" covers the first render while we validate any saved session with
  // the server. It avoids a flash of the dashboard (or login) before we know
  // whether the token is actually still good.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On startup: if there's a saved token, confirm it's still valid by asking
    // the server who we are. This catches expired tokens AND accounts that no
    // longer exist (e.g. the database was cleared) - in which case we log out
    // instead of showing a stale, "still logged in" session.
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then(({ data }) => {
        // Token is good - refresh the stored user from the server's answer.
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
      })
      .catch(() => {
        // Token invalid/expired or user gone - clear the stale session.
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Save the token + user from a successful auth response into state + storage.
  const saveSession = ({ token, user: nextUser }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(nextUser));
    setUser(nextUser);
  };

  // Call the backend to create an account, then log the user straight in.
  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    saveSession(data);
    return data;
  };

  // Call the backend to log in and store the returned token.
  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    saveSession(data);
    return data;
  };

  // Clear everything and drop the user back to a logged-out state.
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const value = { user, loading, register, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
