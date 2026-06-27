import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/20 focus-visible:ring-brand-400",
  secondary:
    "bg-surface text-text-primary border border-border hover:border-border-strong hover:bg-surface-sunken focus-visible:ring-brand-400",
  ghost: "bg-transparent text-text-secondary hover:bg-surface-sunken focus-visible:ring-brand-400",
  danger: "bg-danger-600 text-white hover:bg-danger-700 focus-visible:ring-danger-500",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium
          transition-all duration-150 focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-offset-1 focus-visible:ring-offset-surface disabled:opacity-50
          disabled:cursor-not-allowed active:scale-[0.98]
          ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
