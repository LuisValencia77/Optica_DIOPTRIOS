import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      navigate('/');
    } else {
      setError('Usuario o contraseña incorrectos.');
    }
  };

  const handleDemoLogin = async (demoUsername) => {
    const success = await login(demoUsername, '1234');
    if (success) {
      navigate('/');
    } else {
      setError('No se pudo iniciar sesión con el usuario de demo.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
      <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#1e293b' }}>Sistema Óptica</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="username" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Usuario</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej: administrador"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>
          {error && <p style={{ color: '#ef4444', margin: 0, fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>}
          <button type="submit" style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
            Ingresar
          </button>
        </form>
        <div style={{ marginTop: '2rem', fontSize: '0.85rem', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
          <p style={{ margin: '0 0 0.5rem 0' }}>Datos de prueba (Contraseña por defecto: <strong>1234</strong>):</p>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li><code>super_usuario</code> (o <code>super usuario</code>)</li>
            <li><code>administrador</code></li>
            <li><code>empleado</code></li>
          </ul>
          <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => handleDemoLogin('super_usuario')}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Iniciar sesión como super usuario
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('administrador')}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Iniciar sesión como administrador
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('empleado')}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#38bdf8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Iniciar sesión como empleado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
