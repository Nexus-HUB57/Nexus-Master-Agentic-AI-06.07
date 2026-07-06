import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, BrainCircuit, ListTodo, Route, Settings, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/agents", label: "Agent Registry", icon: BrainCircuit },
  { href: "/tasks", label: "Task Board", icon: ListTodo },
  { href: "/workflows", label: "Workflows", icon: Route },
  { href: "/knowledge", label: "Knowledge Base", icon: Activity },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-4 py-4">
      <div className="px-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-none border border-primary bg-primary/10 flex items-center justify-center">
          <BrainCircuit className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-widest text-primary uppercase leading-none">NEXUS</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-1">Agentic Hub</p>
        </div>
      </div>
      <div className="px-4 py-2 mt-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start rounded-none h-10 ${isActive ? 'border-l-2 border-primary bg-primary/10 hover:bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
              >
                <item.icon className="mr-3 h-4 w-4" />
                <span className="font-mono text-sm tracking-wider uppercase">{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
      <div className="mt-auto px-4">
        <div className="border border-border bg-black/20 p-4 rounded-none">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-muted-foreground uppercase">System Status</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </div>
          <p className="text-[10px] font-mono text-primary">All subsystems nominal</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <header className="md:hidden flex h-14 items-center gap-4 border-b border-border bg-background px-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 border-r border-border bg-background">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <div className="font-bold tracking-widest text-primary uppercase flex items-center gap-2">
          <BrainCircuit className="w-4 h-4" />
          NEXUS
        </div>
      </header>

      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-background/50 backdrop-blur-sm z-10 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      <main className="flex-1 overflow-x-hidden min-h-[calc(100vh-3.5rem)] md:min-h-screen">
        <div className="h-full p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
