# CORE-AGENT-UI: Core Platform MVP - UI Layer

## READ FIRST
1. Read `RALPH_PATTERNS.md` for UI conventions
2. Study existing pages: `Equipment.tsx`, `ControlsLibrary.tsx`
3. Ensure CORE-AGENT-DB and CORE-AGENT-API have completed

---

## Mission
Add authentication UI and context to the QMS Suite:
- Login page
- Register page  
- AuthContext for global auth state
- Protected route wrapper
- Update App.tsx to handle auth flow
- Update sidebar to show user info

---

## Phase 1: Auth Types

### 1.1 Create client/src/lib/auth-types.ts

```typescript
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'quality_manager' | 'engineer' | 'viewer';
  orgId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  orgSlug?: string;
}

export interface RegisterData {
  organizationName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}
```

---

## Phase 2: Auth Context

### 2.1 Create client/src/contexts/AuthContext.tsx

```typescript
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import type { AuthUser, AuthState, LoginCredentials, RegisterData } from '@/lib/auth-types';

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const [, setLocation] = useLocation();

  // Check auth status on mount
  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (credentials: LoginCredentials) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setState({
      user: data.user,
      isLoading: false,
      isAuthenticated: true,
    });

    // Redirect to dashboard
    setLocation('/');
  };

  const register = async (data: RegisterData) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const result = await response.json();
    setState({
      user: result.user,
      isLoading: false,
      isAuthenticated: true,
    });

    // Redirect to dashboard
    setLocation('/');
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    // Redirect to login
    setLocation('/login');
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

---

## Phase 3: Protected Route Wrapper

### 3.1 Create client/src/components/ProtectedRoute.tsx

```typescript
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'wouter';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'quality_manager' | 'engineer' | 'viewer')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Check role if specified
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground mt-2">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

---

## Phase 4: Login Page

### 4.1 Create client/src/pages/Login.tsx

```typescript
import { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            QMS Suite
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isSubmitting}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || authLoading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/register" className="text-primary hover:underline">
                Register
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
```

---

## Phase 5: Register Page

### 5.1 Create client/src/pages/Register.tsx

```typescript
import { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

export default function Register() {
  const { register, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    organizationName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        organizationName: formData.organizationName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create Account
          </CardTitle>
          <CardDescription className="text-center">
            Register your organization to get started
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                name="organizationName"
                placeholder="Acme Manufacturing"
                value={formData.organizationName}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || authLoading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
```

---

## Phase 6: Update App.tsx

### 6.1 Modify client/src/App.tsx

Replace entire file:

```typescript
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
import Processes from "@/pages/Processes";
import PFMEA from "@/pages/PFMEA";
import ControlPlans from "@/pages/ControlPlans";
import Equipment from "@/pages/Equipment";
import FailureModes from "@/pages/FailureModes";
import ControlsLibrary from "@/pages/ControlsLibrary";
import Settings from "@/pages/Settings";
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
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Dashboard />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/parts">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Parts />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/processes">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Processes />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/pfmea">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <PFMEA />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/control-plans">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <ControlPlans />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/equipment">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Equipment />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/failure-modes">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <FailureModes />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/controls-library">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <ControlsLibrary />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Settings />
          </AuthenticatedLayout>
        </ProtectedRoute>
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
```

---

## Phase 7: Update Sidebar

### 7.1 Modify client/src/components/AppSidebar.tsx

Add user info and logout button to the sidebar:

```typescript
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
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
  ClipboardCheck,
  Wrench,
  AlertTriangle,
  Shield,
  Settings,
  LogOut,
  ChevronUp,
  Building2,
} from "lucide-react";

const menuItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/parts", label: "Parts", icon: Package },
  { path: "/processes", label: "Processes", icon: GitBranch },
  { path: "/pfmea", label: "PFMEA", icon: FileWarning },
  { path: "/control-plans", label: "Control Plans", icon: ClipboardCheck },
];

const libraryItems = [
  { path: "/equipment", label: "Equipment", icon: Wrench },
  { path: "/failure-modes", label: "Failure Modes", icon: AlertTriangle },
  { path: "/controls-library", label: "Controls", icon: Shield },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

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
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold">QMS Suite</h1>
            {user && (
              <p className="text-xs text-muted-foreground truncate">
                {user.organization.name}
              </p>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={location === item.path}>
                    <Link href={item.path}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Libraries</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {libraryItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={location === item.path}>
                    <Link href={item.path}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/settings"}>
                  <Link href="/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t">
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
      </SidebarFooter>
    </Sidebar>
  );
}
```

---

## Validation Checklist

After completing CORE-AGENT-UI:

- [ ] `/login` renders login form
- [ ] `/register` renders registration form
- [ ] Successful login redirects to `/` (dashboard)
- [ ] Successful registration redirects to `/` (dashboard)
- [ ] Unauthenticated access to protected routes redirects to `/login`
- [ ] Sidebar shows user name, email, org name
- [ ] Logout button works and redirects to `/login`
- [ ] No TypeScript errors
- [ ] UI matches existing design patterns (shadcn/ui components)

---

## Files Created/Modified

| File | Status | Description |
|------|--------|-------------|
| `client/src/lib/auth-types.ts` | NEW | TypeScript types for auth |
| `client/src/contexts/AuthContext.tsx` | NEW | Auth state and methods |
| `client/src/components/ProtectedRoute.tsx` | NEW | Route guard component |
| `client/src/pages/Login.tsx` | NEW | Login page |
| `client/src/pages/Register.tsx` | NEW | Registration page |
| `client/src/App.tsx` | MODIFIED | Add AuthProvider, route structure |
| `client/src/components/AppSidebar.tsx` | MODIFIED | Add user info and logout |

---

## User Flow

```
┌─────────────┐
│  /login     │ ◄─── Unauthenticated users
└─────┬───────┘
      │ Login success
      ▼
┌─────────────┐
│  /          │ ◄─── Dashboard (authenticated)
└─────┬───────┘
      │
      ▼
┌─────────────────────────────────┐
│  Protected Routes               │
│  /parts, /processes, /pfmea,    │
│  /control-plans, /equipment,    │
│  /failure-modes, /controls,     │
│  /settings                      │
└─────────────────────────────────┘
      │
      │ Logout
      ▼
┌─────────────┐
│  /login     │
└─────────────┘
```

---

## Demo Credentials

Use these credentials after seeding:

| Email | Password | Role |
|-------|----------|------|
| admin@acme.com | admin123 | admin |
| quality@acme.com | user123 | quality_manager |
| engineer@acme.com | user123 | engineer |
