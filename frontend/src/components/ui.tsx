import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-card rounded-lg border border-nexus-border shadow-red", className)} {...props} />;
}

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-nexus-red px-4 text-sm font-semibold text-white transition hover:bg-nexus-accent focus:outline-none focus:ring-2 focus:ring-nexus-red/60 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function GhostButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "ui-ghost inline-flex h-10 items-center justify-center gap-2 rounded-md border border-nexus-border px-4 text-sm font-medium transition hover:border-nexus-red/60 hover:text-nexus-red",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "red" | "green" | "amber" }) {
  const tones = {
    default: "border-nexus-border bg-slate-50 text-slate-700",
    red: "border-red-200 bg-red-50 text-red-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return <span className={cn("inline-flex rounded-md border px-2 py-1 text-xs font-medium backdrop-blur-sm", tones[tone])}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("ui-skeleton animate-pulse rounded-md", className)} />;
}
