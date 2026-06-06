import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Wraps any page that requires a logged-in user. If there's no user, it
// redirects to /login instead of rendering the protected page. This is the
// front-end half of "protected routes" - the backend still independently
// enforces auth on every API call.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // While we're still reading the saved session, show nothing (avoids a flash
  // of the login page before we know the user is actually logged in).
  if (loading) return null;

  // Not logged in -> send them to login. `replace` so the back button doesn't
  // loop them straight back to the protected page.
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
