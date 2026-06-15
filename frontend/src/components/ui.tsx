import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-nexus-border bg-nexus-card/88 shadow-red backdrop-blur", className)} {...props} />;
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
        "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-nexus-border bg-white/[0.03] px-4 text-sm font-medium text-zinc-200 transition hover:border-nexus-red/60 hover:text-white",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "red" | "green" | "amber" }) {
  const tones = {
    default: "border-nexus-border bg-white/[0.04] text-zinc-300",
    red: "border-red-500/30 bg-red-500/10 text-red-200",
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  };
  return <span className={cn("inline-flex rounded-md border px-2 py-1 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-white/[0.06]", className)} />;
}
