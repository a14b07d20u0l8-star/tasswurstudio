import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Particles } from "../components/Particles";
import bgCosmic from "../assets/bg-cosmic.jpg";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="relative z-10 flex min-h-dvh items-center justify-center px-4">
      <div className="glass max-w-md rounded-3xl p-8 text-center animate-scale-in">
        <h1 className="text-7xl font-display text-gradient-gold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Lost in the cosmos</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page does not exist.</p>
        <Link to="/" className="btn-neon btn-neon-hover mt-6 inline-block">Go Home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="relative z-10 flex min-h-dvh items-center justify-center px-4">
      <div className="glass max-w-md rounded-3xl p-8 text-center">
        <h1 className="text-xl font-display">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="btn-neon btn-neon-hover">Retry</button>
          <a href="/" className="rounded-full border border-white/10 px-5 py-2 text-sm">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Tasswur Studio" },
      { name: "description", content: "Tasswur Studio: Pakistan's premium services & talent marketplace. Serving nation-wide since 2024." },
      { name: "theme-color", content: "#0b0b0f" },
      { property: "og:title", content: "Tasswur Studio" },
      { property: "og:description", content: "Tasswur Studio: Pakistan's premium services & talent marketplace. Serving nation-wide since 2024." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Tasswur Studio" },
      { name: "twitter:description", content: "Tasswur Studio: Pakistan's premium services & talent marketplace. Serving nation-wide since 2024." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/62463cad-f632-4d50-a2f1-f87ced61acce" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/62463cad-f632-4d50-a2f1-f87ced61acce" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Orbitron:wght@500;700;900&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      {/* Global cinematic backdrop */}
      <div
        className="pointer-events-none fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgCosmic})`, animation: "bg-pan 60s ease-in-out infinite alternate" }}
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.08_0.02_280/0.55),oklch(0.04_0.01_270/0.85)_70%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.2_0.06_280/0.35),transparent_60%),radial-gradient(ellipse_at_bottom,oklch(0.2_0.1_85/0.2),transparent_60%)]" />
      <Particles />

      <Outlet />
      <Toaster theme="dark" position="top-center" toastOptions={{ style: { background: "oklch(0.12 0.015 270)", color: "oklch(0.96 0.01 90)", border: "1px solid oklch(0.78 0.14 80 / 30%)" } }} />
    </QueryClientProvider>
  );
}
