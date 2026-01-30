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
} from "lucide-react";
import KeyboardShortcutsHelp from "./KeyboardShortcutsHelp";

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

const settingsNavItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    testId: "nav-settings",
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  const isActive = (url: string) => {
    if (url === "/") {
      return location === "/";
    }
    return location.startsWith(url);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <FileWarning className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">PFMEA Suite</span>
              <span className="text-xs text-muted-foreground">QMS Platform</span>
            </div>
          </div>
        </Link>
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

      <SidebarFooter className="border-t">
        <SidebarMenu>
          {settingsNavItems.map((item) => (
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
        <div className="px-2 pb-2">
          <KeyboardShortcutsHelp />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
