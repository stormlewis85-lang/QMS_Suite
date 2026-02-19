import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";

// Pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
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
import Actions from "@/pages/Actions";
import Notifications from "@/pages/Notifications";
import Documents from "@/pages/Documents";
import DocumentDetail from "@/pages/DocumentDetail";
import Approvals from "@/pages/Approvals";
import DocumentReviews from "@/pages/DocumentReviews";
import DocumentCompare from "@/pages/DocumentCompare";
import WorkflowBuilder from "@/pages/WorkflowBuilder";
import DistributionLists from "@/pages/DistributionLists";
import DocumentTemplates from "@/pages/DocumentTemplates";
import AuditLog from "@/pages/AuditLog";
import ExternalDocuments from "@/pages/ExternalDocuments";
import CapaDashboard from "@/pages/CapaDashboard";
import CapaList from "@/pages/CapaList";
import CapaCreate from "@/pages/CapaCreate";
import CapaDetail from "@/pages/CapaDetail";
import CapaAnalytics from "@/pages/CapaAnalytics";
import CapaPareto from "@/pages/CapaPareto";
import CapaTrends from "@/pages/CapaTrends";
import CapaTeamPerformance from "@/pages/CapaTeamPerformance";
import CapaReports from "@/pages/CapaReports";
import CapaAnalysisTools from "@/pages/CapaAnalysisTools";
import NotFound from "@/pages/not-found";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
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
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        {children}
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  const { isLoading } = useAuth();

  // Show loading while checking initial auth state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Protected routes */}
      <Route path="/">
        <ProtectedPage><Dashboard /></ProtectedPage>
      </Route>
      <Route path="/parts">
        <ProtectedPage><Parts /></ProtectedPage>
      </Route>
      <Route path="/parts/:id">
        <ProtectedPage><PartDetail /></ProtectedPage>
      </Route>
      <Route path="/processes">
        <ProtectedPage><Processes /></ProtectedPage>
      </Route>
      <Route path="/processes/:processId/fmea/:rowId/edit">
        <ProtectedPage><FMEATemplateRowEdit /></ProtectedPage>
      </Route>
      <Route path="/processes/:processId/control/:rowId/edit">
        <ProtectedPage><ControlTemplateRowEdit /></ProtectedPage>
      </Route>
      <Route path="/processes/:id">
        <ProtectedPage><ProcessDetail /></ProtectedPage>
      </Route>
      <Route path="/pfmea">
        <ProtectedPage><PFMEA /></ProtectedPage>
      </Route>
      <Route path="/pfmea/:id">
        <ProtectedPage><PFMEADetail /></ProtectedPage>
      </Route>
      <Route path="/control-plans">
        <ProtectedPage><ControlPlans /></ProtectedPage>
      </Route>
      <Route path="/control-plans/:id">
        <ProtectedPage><ControlPlanDetail /></ProtectedPage>
      </Route>
      <Route path="/equipment">
        <ProtectedPage><Equipment /></ProtectedPage>
      </Route>
      <Route path="/failure-modes">
        <ProtectedPage><FailureModes /></ProtectedPage>
      </Route>
      <Route path="/controls-library">
        <ProtectedPage><ControlsLibrary /></ProtectedPage>
      </Route>
      <Route path="/settings">
        <ProtectedPage><Settings /></ProtectedPage>
      </Route>
      <Route path="/change-packages">
        <ProtectedPage><ChangePackagesPage /></ProtectedPage>
      </Route>
      <Route path="/change-packages/new">
        <ProtectedPage><NewChangePackage /></ProtectedPage>
      </Route>
      <Route path="/change-packages/:id">
        <ProtectedPage><ChangePackageDetail /></ProtectedPage>
      </Route>
      <Route path="/auto-review">
        <ProtectedPage><AutoReview /></ProtectedPage>
      </Route>
      <Route path="/import">
        <ProtectedPage><Import /></ProtectedPage>
      </Route>
      <Route path="/actions">
        <ProtectedPage><Actions /></ProtectedPage>
      </Route>
      <Route path="/documents">
        <ProtectedPage><Documents /></ProtectedPage>
      </Route>
      <Route path="/documents/:id/compare">
        <ProtectedPage><DocumentCompare /></ProtectedPage>
      </Route>
      <Route path="/documents/:id">
        <ProtectedPage><DocumentDetail /></ProtectedPage>
      </Route>
      <Route path="/approvals">
        <ProtectedPage><Approvals /></ProtectedPage>
      </Route>
      <Route path="/document-reviews">
        <ProtectedPage><DocumentReviews /></ProtectedPage>
      </Route>
      <Route path="/external-documents">
        <ProtectedPage><ExternalDocuments /></ProtectedPage>
      </Route>
      <Route path="/admin/workflows">
        <ProtectedPage><WorkflowBuilder /></ProtectedPage>
      </Route>
      <Route path="/admin/document-templates">
        <ProtectedPage><DocumentTemplates /></ProtectedPage>
      </Route>
      <Route path="/admin/distribution-lists">
        <ProtectedPage><DistributionLists /></ProtectedPage>
      </Route>
      <Route path="/admin/audit-log">
        <ProtectedPage><AuditLog /></ProtectedPage>
      </Route>
      <Route path="/notifications">
        <ProtectedPage><Notifications /></ProtectedPage>
      </Route>

      {/* CAPA routes - specific before parameterized */}
      <Route path="/capa/dashboard">
        <ProtectedPage><CapaDashboard /></ProtectedPage>
      </Route>
      <Route path="/capa/new">
        <ProtectedPage><CapaCreate /></ProtectedPage>
      </Route>
      <Route path="/capa/analytics/pareto">
        <ProtectedPage><CapaPareto /></ProtectedPage>
      </Route>
      <Route path="/capa/analytics/trends">
        <ProtectedPage><CapaTrends /></ProtectedPage>
      </Route>
      <Route path="/capa/analytics/team">
        <ProtectedPage><CapaTeamPerformance /></ProtectedPage>
      </Route>
      <Route path="/capa/analytics">
        <ProtectedPage><CapaAnalytics /></ProtectedPage>
      </Route>
      <Route path="/capa/reports">
        <ProtectedPage><CapaReports /></ProtectedPage>
      </Route>
      <Route path="/capa/:id/tools">
        <ProtectedPage><CapaAnalysisTools /></ProtectedPage>
      </Route>
      <Route path="/capa/:id">
        <ProtectedPage><CapaDetail /></ProtectedPage>
      </Route>
      <Route path="/capa">
        <ProtectedPage><CapaList /></ProtectedPage>
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
