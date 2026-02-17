import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Package,
  GitBranch,
  FileWarning,
  ClipboardList,
  Wrench,
  AlertTriangle,
  Shield,
  ShieldCheck,
  Settings,
  Upload,
  Target,
  FileText,
  LogOut,
  ChevronUp,
  Building2,
  CheckSquare,
  Calendar,
  Globe,
  Workflow,
  FileCog,
  Users,
  ScrollText,
} from "lucide-react";
import KeyboardShortcutsHelp from "./KeyboardShortcutsHelp";
import NotificationBell from "./NotificationBell";

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    testId: "nav-dashboard",
  },
  {
    title: "Parts",
    url: "/parts",
    icon: Package,
    testId: "nav-parts",
  },
  {
    title: "Processes",
    url: "/processes",
    icon: GitBranch,
    testId: "nav-processes",
  },
  {
    title: "PFMEA",
    url: "/pfmea",
    icon: FileWarning,
    testId: "nav-pfmea",
  },
  {
    title: "Control Plans",
    url: "/control-plans",
    icon: ClipboardList,
    testId: "nav-control-plans",
  },
  {
    title: "Change Packages",
    url: "/change-packages",
    icon: GitBranch,
    testId: "nav-change-packages",
  },
];

const qualityNavItems = [
  {
    title: "Documents",
    url: "/documents",
    icon: FileText,
    testId: "nav-documents",
  },
  {
    title: "My Approvals",
    url: "/approvals",
    icon: CheckSquare,
    testId: "nav-approvals",
  },
  {
    title: "Reviews Due",
    url: "/document-reviews",
    icon: Calendar,
    testId: "nav-document-reviews",
  },
  {
    title: "External Docs",
    url: "/external-documents",
    icon: Globe,
    testId: "nav-external-documents",
  },
  {
    title: "Auto-Review",
    url: "/auto-review",
    icon: ShieldCheck,
    testId: "nav-auto-review",
  },
  {
    title: "Import",
    url: "/import",
    icon: Upload,
    testId: "nav-import",
  },
  {
    title: "Actions",
    url: "/actions",
    icon: Target,
    testId: "nav-actions",
  },
];

const adminNavItems = [
  {
    title: "Workflows",
    url: "/admin/workflows",
    icon: Workflow,
    testId: "nav-admin-workflows",
  },
  {
    title: "Templates",
    url: "/admin/document-templates",
    icon: FileCog,
    testId: "nav-admin-templates",
  },
  {
    title: "Distribution Lists",
    url: "/admin/distribution-lists",
    icon: Users,
    testId: "nav-admin-distribution-lists",
  },
  {
    title: "Audit Log",
    url: "/admin/audit-log",
    icon: ScrollText,
    testId: "nav-admin-audit-log",
  },
];

const libraryNavItems = [
  {
    title: "Equipment",
    url: "/equipment",
    icon: Wrench,
    testId: "nav-equipment",
  },
  {
    title: "Failure Modes",
    url: "/failure-modes",
    icon: AlertTriangle,
    testId: "nav-failure-modes",
  },
  {
    title: "Controls Library",
    url: "/controls-library",
    icon: Shield,
    testId: "nav-controls-library",
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isActive = (url: string) => {
    if (url === "/") {
      return location === "/";
    }
    return location.startsWith(url);
  };

  const getInitials = () => {
    if (!user) return '??';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleBadge = () => {
    if (!user) return '';
    const roleLabels: Record<string, string> = {
      admin: 'Admin',
      quality_manager: 'QM',
      engineer: 'Eng',
      viewer: 'View',
    };
    return roleLabels[user.role] || user.role;
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <Building2 className="h-6 w-6 text-primary" />
              <div className="flex flex-col">
                <span className="font-semibold text-sm">QMS Suite</span>
                {user && (
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {user.organization.name}
                  </span>
                )}
              </div>
            </div>
          </Link>
          <NotificationBell />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={item.testId}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quality */}
        <SidebarGroup>
          <SidebarGroupLabel>Quality</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {qualityNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={item.testId}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin */}
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={item.testId}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Libraries */}
        <SidebarGroup>
          <SidebarGroupLabel>Libraries</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {libraryNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={item.testId}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left flex-1 min-w-0">
                <span className="text-sm font-medium truncate w-full">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-xs text-muted-foreground truncate w-full">
                  {user?.email}
                </span>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2">
                <span>{user?.firstName} {user?.lastName}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  {getRoleBadge()}
                </span>
              </div>
              <p className="text-xs font-normal text-muted-foreground mt-1">
                {user?.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="px-2 pb-2">
          <KeyboardShortcutsHelp />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
