import type { ButtonHTMLAttributes } from "react";

type Variant = "solid" | "ghost" | "quiet";

export function Button({
  variant = "solid",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const look = {
    solid: "bg-maple text-ink hover:bg-[#ff7463]",
    ghost: "border border-cream/20 bg-pine/60 text-cream hover:border-cream/50",
    quiet: "text-cream/80 hover:text-cream",
  }[variant];
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${look} ${className}`}
      {...props}
    />
  );
}
