import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Building2, AlertCircle } from "lucide-react";
import { loginRequest } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../../components/ui/Button";
import { ThemeToggle } from "../../components/ui/ThemeToggle";

const loginFormSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const session = await loginRequest(values);
      setSession(session);
      navigate("/");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-sidebar-bg">
      {/* Left panel — brand side */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(109,94,248,0.25), transparent 50%), radial-gradient(circle at 80% 80%, rgba(16,185,129,0.12), transparent 50%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-brand-500 flex items-center justify-center font-display font-bold text-white shadow-sm shadow-brand-500/40">
            R
          </div>
          <span className="text-white font-semibold font-display">RMBS</span>
        </div>

        <div className="relative max-w-md">
          <p className="text-brand-400 text-sm font-semibold mb-3 tracking-wide uppercase">
            Property management, accounted for
          </p>
          <h1 className="text-white text-3xl font-semibold leading-tight mb-4 font-display">
            One ledger for every owner, property, and tenant you manage.
          </h1>
          <p className="text-sidebar-text text-sm leading-relaxed">
            Trust accounting, owner disbursements, and KRA-aligned tax tracking —
            built for Kenyan property management companies handling mixed
            residential and commercial portfolios.
          </p>
        </div>

        <p className="relative text-sidebar-text/60 text-xs">
          © {new Date().getFullYear()} Dun-Star Property Management
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col bg-canvas">
        <div className="flex justify-end p-6">
          <ThemeToggle />
        </div>
        <div className="flex-1 flex items-center justify-center p-6 -mt-16">
          <div className="w-full max-w-sm">
            <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
              <div className="h-9 w-9 rounded-lg bg-brand-500 flex items-center justify-center font-display font-bold text-white">
                R
              </div>
              <span className="text-text-primary font-semibold font-display">RMBS</span>
            </div>

            <div className="bg-surface rounded-2xl shadow-md border border-border p-8">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-brand-500" strokeWidth={2} />
                <span className="text-xs font-semibold text-brand-500 uppercase tracking-wide">
                  Staff & Owner Sign In
                </span>
              </div>
              <h2 className="text-xl font-semibold text-text-primary mb-1 font-display">Welcome back</h2>
              <p className="text-sm text-text-secondary mb-6">
                Sign in to access your portfolio dashboard.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    {...register("email")}
                    className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary
                      placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-500/30
                      focus:border-brand-500 transition-colors"
                    placeholder="you@company.co.ke"
                  />
                  {errors.email && (
                    <p className="text-xs text-danger-600 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    {...register("password")}
                    className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary
                      placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-500/30
                      focus:border-brand-500 transition-colors"
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <p className="text-xs text-danger-600 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.password.message}
                    </p>
                  )}
                </div>

                {serverError && (
                  <div className="flex items-center gap-2 bg-danger-50 text-danger-600 text-sm rounded-lg px-3.5 py-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {serverError}
                  </div>
                )}

                <Button type="submit" disabled={isSubmitting} className="w-full" size="md">
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
