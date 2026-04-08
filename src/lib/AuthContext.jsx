import React, { createContext, useContext } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

const AuthContext = createContext();

// Class component avoids React hooks entirely, bypassing the broken
// hook dispatcher caused by the duplicate React instance from @base44/sdk.
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
  }

  componentDidMount() {
    this.checkAppState();
  }

  checkAppState = async () => {
    try {
      this.setState({ isLoadingPublicSettings: true, authError: null });

      try {
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
        this.setState({ appPublicSettings: publicSettings });

        if (appParams.token) {
          await this.checkUserAuth();
        } else {
          this.setState({ isLoadingAuth: false, isAuthenticated: false });
        }
        this.setState({ isLoadingPublicSettings: false });
      } catch (appError) {
        console.error('App state check failed:', appError);

        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          this.setState({
            authError: { type: reason, message: appError.message || reason },
          });
        } else {
          this.setState({
            authError: { type: 'unknown', message: appError.message || 'Failed to load app' },
          });
        }
        this.setState({ isLoadingPublicSettings: false, isLoadingAuth: false });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      this.setState({
        authError: { type: 'unknown', message: error.message || 'An unexpected error occurred' },
        isLoadingPublicSettings: false,
        isLoadingAuth: false,
      });
    }
  };

  checkUserAuth = async () => {
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
  };

  logout = (shouldRedirect = true) => {
    this.setState({ user: null, isAuthenticated: false });
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  render() {
    const value = {
      ...this.state,
      logout: this.logout,
      navigateToLogin: this.navigateToLogin,
      checkAppState: this.checkAppState,
    };

    return (
      <AuthContext.Provider value={value}>
        {this.props.children}
      </AuthContext.Provider>
    );
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};