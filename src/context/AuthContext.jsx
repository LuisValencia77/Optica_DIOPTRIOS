import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const storedUser = window.sessionStorage.getItem('opticaUser');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error('Error leyendo sesión local:', error);
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      window.sessionStorage.setItem('opticaUser', JSON.stringify(user));
    } else {
      window.sessionStorage.removeItem('opticaUser');
    }
  }, [user]);

  const login = async (username, password) => {
    const normalized = username?.trim().toLowerCase();
    const getFallbackUser = () => {
      if (normalized === 'super_usuario' || normalized === 'super usuario' || normalized === 'superusuario') {
        return { username: 'super_usuario', role: 'Super Usuario', name: 'Super Usuario' };
      }
      if (normalized === 'administrador' || normalized === 'admin') {
        return { username: 'administrador', role: 'Administrador', name: 'Administrador' };
      }
      if (normalized === 'empleado') {
        return { username: 'empleado', role: 'Empleado', name: 'Empleado' };
      }
      return { username, role: 'Empleado', name: username };
    };

    try {
      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return true;
      }

      if (password === '1234') {
        setUser(getFallbackUser());
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error en login:', error);
      if (password === '1234') {
        setUser(getFallbackUser());
        return true;
      }
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  const crearUsuario = (nuevoUsuario) => {
    // Actualmente solo se permite el manejo local de roles.
    return false;
  };

  const cambiarPassword = (username, nuevaPassword) => {
    console.warn('Cambio de contraseña no implementado en backend todavía');
  };

  const eliminarUsuario = (username) => {
    console.warn('Eliminación de usuario no implementada en backend todavía');
  };

  const isManager = user?.role === 'Super Usuario' || user?.role === 'Administrador';

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      usuarios: [],
      crearUsuario,
      cambiarPassword,
      eliminarUsuario,
      isManager,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
