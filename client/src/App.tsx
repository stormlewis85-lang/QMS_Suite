import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import Dashboard from "@/pages/Dashboard";
import Parts from "@/pages/Parts";
import PartDetail from "@/pages/PartDetail";
import Processes from "@/pages/Processes";
import ProcessDetail from "@/pages/ProcessDetail";
import PFMEA from "@/pages/PFMEA";
import PFMEADetail from "@/pages/PFMEADetail";
import ControlPlans from "@/pages/ControlPlans";
import ControlPlanDetail from "@/pages/ControlPlanDetail";
import Equipment from "@/pages/Equipment";
import FailureModes from "@/pages/FailureModes";
import ControlsLibrary from "@/pages/ControlsLibrary";
import Settings from "@/pages/Settings";
import ChangePackagesPage from "@/pages/ChangePackages";
import ChangePackageDetail from "@/pages/ChangePackageDetail";
import NewChangePackage from "@/pages/NewChangePackage";
import FMEATemplateRowEdit from "@/pages/FMEATemplateRowEdit";
import ControlTemplateRowEdit from "@/pages/ControlTemplateRowEdit";
import AutoReview from "@/pages/AutoReview";
import Import from "@/pages/Import";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/parts" component={Parts} />
      <Route path="/parts/:id" component={PartDetail} />
      <Route path="/processes" component={Processes} />
      <Route path="/processes/:processId/fmea/:rowId/edit" component={FMEATemplateRowEdit} />
      <Route path="/processes/:processId/control/:rowId/edit" component={ControlTemplateRowEdit} />
      <Route path="/processes/:id" component={ProcessDetail} />
      <Route path="/pfmea" component={PFMEA} />
      <Route path="/pfmea/:id" component={PFMEADetail} />
      <Route path="/control-plans" component={ControlPlans} />
      <Route path="/control-plans/:id" component={ControlPlanDetail} />
      <Route path="/equipment" component={Equipment} />
      <Route path="/failure-modes" component={FailureModes} />
      <Route path="/controls-library" component={ControlsLibrary} />
      <Route path="/settings" component={Settings} />
      <Route path="/change-packages" component={ChangePackagesPage} />
      <Route path="/change-packages/new" component={NewChangePackage} />
      <Route path="/change-packages/:id" component={ChangePackageDetail} />
      <Route path="/auto-review" component={AutoReview} />
      <Route path="/import" component={Import} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between p-4 border-b bg-background">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-auto p-6 bg-background">
                <div className="max-w-7xl mx-auto">
                  <Router />
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;