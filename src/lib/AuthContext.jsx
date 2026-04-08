import React, { useContext } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

const AuthContext = React.createContext(null);

export class AuthProvider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      isAuthenticated: false,
      isLoadingAuth: true,
      isLoadingPublicSettings: true,
      authError: null,
      appPublicSettings: null,
    };
    this.checkAppState = this.checkAppState.bind(this);
    this.checkUserAuth = this.checkUserAuth.bind(this);
    this.logout = this.logout.bind(this);
    this.navigateToLogin = this.navigateToLogin.bind(this);
  }

  componentDidMount() {
    this.checkAppState();
  }

  async checkAppState() {
    try {
      this.setState({ isLoadingPublicSettings: true, authError: null });
      const headers = { 'X-App-Id': appParams.appId };
      if (appParams.token) headers['Authorization'] = `Bearer ${appParams.token}`;
      const res = await fetch(
        `${appParams.serverUrl}/api/apps/public/prod/public-settings/by-id/${appParams.appId}`,
        { headers }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data?.message || 'Failed');
        err.status = res.status;
        err.data = data;
        throw err;
      }
      const publicSettings = await res.json();
      this.setState({ appPublicSettings: publicSettings, isLoadingPublicSettings: false });

      if (appParams.token) {
        await this.checkUserAuth();
      } else {
        this.setState({ isLoadingAuth: false, isAuthenticated: false });
      }
    } catch (appError) {
      console.error('App state check failed:', appError);
      if (appError.status === 403 && appError.data?.extra_data?.reason) {
        const reason = appError.data.extra_data.reason;
        this.setState({ authError: { type: reason, message: appError.message || reason } });
      } else {
        this.setState({ authError: { type: 'unknown', message: appError.message || 'Failed to load app' } });
      }
      this.setState({ isLoadingPublicSettings: false, isLoadingAuth: false });
    }
  }

  async checkUserAuth() {
    try {
      this.setState({ isLoadingAuth: true });
      const currentUser = await base44.auth.me();
      this.setState({ user: currentUser, isAuthenticated: true, isLoadingAuth: false });
    } catch (error) {
      console.error('User auth check failed:', error);
      this.setState({ isLoadingAuth: false, isAuthenticated: false });
      if (error.status === 401 || error.status === 403) {
        this.setState({ authError: { type: 'auth_required', message: 'Authentication required' } });
      }
    }
  }

  logout(shouldRedirect = true) {
    this.setState({ user: null, isAuthenticated: false });
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  }

  navigateToLogin() {
    base44.auth.redirectToLogin(window.location.href);
  }

  render() {
    const { user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError, appPublicSettings } = this.state;
    const value = {
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout: this.logout,
      navigateToLogin: this.navigateToLogin,
      checkAppState: this.checkAppState,
    };
    return React.createElement(AuthContext.Provider, { value }, this.props.children);
  }
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}