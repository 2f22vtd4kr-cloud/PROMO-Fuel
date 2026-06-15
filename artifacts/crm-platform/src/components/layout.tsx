import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Map, 
  Megaphone, 
  Users, 
  Shield,
  FileText,
  Settings,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { useState } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { href: "/", label: "Аналитика", icon: BarChart3 },
    { href: "/journey", label: "Путь клиента", icon: Map },
    { href: "/campaigns", label: "Кампании", icon: Megaphone },
    { href: "/audience", label: "Аудитория", icon: Users },
    { href: "/accounts", label: "Аккаунты", icon: Shield },
    { href: "/templates", label: "Шаблоны", icon: FileText },
    { href: "/settings", label: "Настройки", icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className={`border-r border-border bg-card transition-all duration-300 flex flex-col ${collapsed ? 'w-16' : 'w-64'}`}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          {!collapsed && <span className="font-bold text-lg tracking-tight text-primary">RUProbe CRM</span>}
          {collapsed && <span className="font-bold text-lg text-primary mx-auto">RU</span>}
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  active 
                    ? "bg-primary text-primary-foreground font-medium" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-border flex flex-col gap-2">
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {collapsed ? <PanelLeftOpen size={18} className="mx-auto" /> : <><PanelLeftClose size={18} /><span>Свернуть</span></>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container mx-auto p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
