import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { ThemeToggle } from "./ui/ThemeToggle";
import { SearchBar } from "./ui/SearchBar";
import {
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  Monitor as MonitorIcon,
  GitBranch,
  LayoutDashboard,
  Users,
  AlertTriangle
} from "lucide-react";

export function AppLayout() {
  const { logout, user } = useAuth();
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId, createWorkspace } = useWorkspace();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Command+K listener to focus search (visual polish)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search..."]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const to = `/${pathSegments.slice(0, index + 1).join("/")}`;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    return { label, to };
  });

  const simulatedNotifications = [
    { id: 1, message: "System Monitor went UP", time: "5m ago", type: "up" },
    { id: 2, message: "Checkout API response slow", time: "1h ago", type: "slow" },
    { id: 3, message: "Workflow 'Down Email Alert' triggered", time: "2h ago", type: "workflow" },
  ];

  const sidebarLinks = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/monitors", label: "Monitors", icon: MonitorIcon },
    { to: "/workflows", label: "Workflows", icon: GitBranch },
    { to: "/incidents", label: "Incidents", icon: AlertTriangle },
    { to: "/team", label: "Team Settings", icon: Users },
  ];

  return (
    <div className="h-screen overflow-hidden flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-200">
      
      {/* Background Overlay for Mobile Sidebar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop and Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-45 flex flex-col h-full border-r border-slate-200/80 dark:border-slate-850 bg-white dark:bg-slate-900 transition-all duration-300 lg:static lg:translate-x-0 ${
          collapsed ? "w-20" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Brand Block */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100 dark:border-slate-850">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500 text-white shadow-sm shadow-brand-500/20">
              <Activity className="w-5 h-5 animate-pulse-indicator" />
            </div>
            {!collapsed && (
              <span className="font-bold tracking-tight text-slate-900 dark:text-slate-50 text-sm">
                Control Room
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center p-1 rounded-md text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
                    isActive
                      ? "bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850/60"
                  }`
                }
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                {!collapsed && <span>{link.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User Info / Profile Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-850">
          {!collapsed ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8.5 h-8.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-350">
                  {user?.name?.slice(0, 2).toUpperCase() || "AM"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {user?.name}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center justify-center gap-2 w-full px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-500 hover:text-danger-600 dark:text-slate-400 dark:hover:text-danger-400 transition-all duration-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                title={`${user?.name} (${user?.email})`}
              >
                {user?.name?.slice(0, 1).toUpperCase()}
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg text-slate-400 hover:text-danger-600 dark:text-slate-500 dark:hover:text-danger-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Navbar */}
        <header className="flex items-center justify-between h-16 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-850 shrink-0">
          
          {/* Mobile Sidebar Trigger & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumbs */}
            <nav className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
              <Link to="/dashboard" className="hover:text-slate-600 dark:hover:text-slate-350 transition-colors">
                Console
              </Link>
              {breadcrumbs.map((breadcrumb, idx) => (
                <span key={idx} className="flex items-center gap-1.5">
                  <span className="text-slate-300 dark:text-slate-700">/</span>
                  <Link
                    to={breadcrumb.to}
                    className={`hover:text-slate-600 dark:hover:text-slate-350 transition-colors ${
                      idx === breadcrumbs.length - 1 ? "text-slate-650 dark:text-slate-300 font-semibold" : ""
                    }`}
                  >
                    {breadcrumb.label}
                  </Link>
                </span>
              ))}
            </nav>
          </div>

          {/* Right Header: Search, Notifications, Theme, Profile */}
          <div className="flex items-center gap-3">
            {/* Mock Search Bar */}
            <SearchBar value={searchQuery} onChange={setSearchQuery} />

            {/* Notifications Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500" />
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-45" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Notifications</span>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-[10px] font-semibold text-brand-500 hover:text-brand-600"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-72 overflow-y-auto">
                      {simulatedNotifications.map((notif) => (
                        <div key={notif.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-colors">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{notif.message}</p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">{notif.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Theme Switcher */}
            <ThemeToggle />
          </div>
        </header>

        {/* Content Outlet Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7.5xl w-full mx-auto space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
