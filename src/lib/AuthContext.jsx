import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      await refreshUser();
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      if (error.status === 401 || error.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    }
  };

  const refreshUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    return currentUser;
  };

  // Wraps base44.auth.updateMe and refreshes AuthContext before resolving,
  // so any caller is guaranteed the shared `user` is fresh before navigating
  // or reading currentUser again. Returns the updateMe result unchanged.
  const updateUser = async (data) => {
    const updated = await base44.auth.updateMe(data);
    await refreshUser();
    return updated;
  };

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
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
      setAppPublicSettings(publicSettings);
      setIsLoadingPublicSettings(false);

      if (appParams.token) {
        await checkUserAuth();
      } else {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
      }
    } catch (appError) {
      console.error('App state check failed:', appError);
      if (appError.status === 403 && appError.data?.extra_data?.reason) {
        const reason = appError.data.extra_data.reason;
        setAuthError({ type: reason, message: appError.message || reason });
      } else {
        setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' });
      }
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    checkAppState();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAppState();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      refreshUser,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};