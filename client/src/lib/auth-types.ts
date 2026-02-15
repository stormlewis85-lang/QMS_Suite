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
