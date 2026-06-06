import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AuthLayout from "../components/AuthLayout.jsx";
import {
  UserIcon,
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  AlertIcon,
} from "../components/icons.jsx";

// Same error reader as the login page: the API returns { message } or
// { errors: [{ msg }] }.
function readError(err) {
  const data = err?.response?.data;
  if (data?.errors?.length) return data.errors[0].msg;
  if (data?.message) return data.message;
  return "Something went wrong. Please try again.";
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setServerError("");
  };

  // Mirror the backend's rules so the user gets instant feedback: name + email
  // required, valid email, password at least 6 characters.
  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "Enter a valid email";
    if (!form.password) next.password = "Password is required";
    else if (form.password.length < 6)
      next.password = "Password must be at least 6 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError("");
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(readError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Create your account</h1>
        <p className="mt-1.5 text-sm text-ink/55">
          Start tracking applications in under a minute.
        </p>

        {serverError && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-coral/30 bg-[#FFE9E3] px-3.5 py-2.5 text-sm text-[#c5523c]">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="label">Full name</label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/35" />
              <input
                id="name"
                type="text"
                autoComplete="name"
                className="input pl-10"
                placeholder="Muzzary Babar"
                value={form.name}
                onChange={update("name")}
              />
            </div>
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="email" className="label">Email</label>
            <div className="relative">
              <MailIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/35" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="input pl-10"
                placeholder="you@example.com"
                value={form.email}
                onChange={update("email")}
              />
            </div>
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <div className="relative">
              <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/35" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="input pl-10 pr-10"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={update("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink/70"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/55">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-ateneo hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
