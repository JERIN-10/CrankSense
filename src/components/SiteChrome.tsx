import React from "react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/diagnose", label: "Diagnose" },
  { to: "/my-bikes", label: "My Bikes" },
  { to: "/results", label: "Results" },
  { to: "/repair", label: "Repair" },
  { to: "/models", label: "Models" },
] as const;

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary glow-ember" />
          <span className="font-mono text-sm tracking-[0.18em] uppercase">CrankSense</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "text-foreground" }}
              className="hover:text-foreground transition"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          to="/diagnose"
          className="hidden md:inline-flex text-sm font-medium px-4 py-2 rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition"
        >
          Run a diagnosis
        </Link>

        <button
          type="button"
          aria-label="Toggle menu"
          className="md:hidden font-mono text-xs tracking-[0.18em] uppercase border border-border px-3 py-2"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="mx-auto max-w-7xl px-6 py-4 flex flex-col gap-3 text-sm">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                activeProps={{ className: "text-foreground" }}
                className="text-muted-foreground hover:text-foreground transition py-1"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-background border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-12 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 rounded-full bg-primary" />
          <span className="font-mono text-xs tracking-[0.2em] uppercase">CrankSense</span>
        </div>
        <p className="tick">
          AI-Based Predictive Maintenance · Sub-100cc Motorcycles · © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
