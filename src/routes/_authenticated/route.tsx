import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Ticket, ScanLine, LayoutDashboard, LogOut, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { isAdmin, isScanner, user } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: isAdmin },
    { to: "/events", label: "Events", icon: Calendar, show: isAdmin },
    { to: "/scan", label: "Scanner", icon: ScanLine, show: isAdmin || isScanner },
  ].filter((n) => n.show);

  // Scanner-only restriction: redirect non-admins away from admin pages
  if (!isAdmin && isScanner && (path.startsWith("/dashboard") || path.startsWith("/events"))) {
    navigate({ to: "/scan", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to={isAdmin ? "/dashboard" : "/scan"} className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Ticket className="h-4 w-4" />
            </div>
            <span className="hidden font-semibold sm:inline">Ticket-Masters</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                activeProps={{ className: "bg-accent text-foreground" }}
              >
                <n.icon className="h-4 w-4" /> <span className="hidden sm:inline">{n.label}</span>
              </Link>
            ))}
            <div className="ml-2 hidden text-xs text-muted-foreground sm:block">{user?.email}</div>
            <Button variant="ghost" size="sm" onClick={signOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
