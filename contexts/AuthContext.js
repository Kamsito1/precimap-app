import React, { createContext, useContext, useEffect, useState } from 'react';
import { Auth, setUnauthorizedHandler } from '../utils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Auth.init().then(() => {
      setUser(Auth.user);
      setLoggedIn(Auth.isLoggedIn);
      setLoading(false);
    }).catch(() => {
      // AsyncStorage error — treat as logged out
      setUser(null);
      setLoggedIn(false);
      setLoading(false);
    });
    // Auto-logout cuando el servidor devuelve 401 (token expirado)
    setUnauthorizedHandler(() => {
      Auth.clear();
      setUser(null);
      setLoggedIn(false);
    });
  }, []);

  async function login(token, userData) {
    await Auth.save(token, userData);
    setUser(userData);
    setLoggedIn(true);
  }

  async function logout() {
    await Auth.clear();
    setUser(null);
    setLoggedIn(false);
  }

  function updateUser(patch) {
    const updated = { ...user, ...patch };
    setUser(updated);
    Auth.save(Auth._token, updated).catch(() => {});
  }

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
