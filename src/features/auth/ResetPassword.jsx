import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMensaje('Las contraseñas no coinciden.');
      setError(true);
      return;
    }
    if (password.length < 4) {
      setMensaje('La contraseña debe tener al menos 4 caracteres.');
      setError(true);
      return;
    }

    setCargando(true);
    try {
      const response = await fetch('/api/usuarios/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await response.json();
      if (response.ok) {
        setMensaje('Contraseña restablecida exitosamente.');
        setError(false);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setMensaje(data.error || 'Ocurrió un error.');
        setError(true);
      }
    } catch (err) {
      setMensaje('Error de conexión con el servidor.');
      setError(true);
    }
    setCargando(false);
  };

  if (!token) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: "'Google Sans', sans-serif" }}>
        <p style={{ color: '#dc2626', fontWeight: 'bold' }}>Token no proporcionado.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: "'Google Sans', sans-serif" }}>
      <div style={{ padding: '2.5rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ color: '#1e293b', marginBottom: '1.5rem', textAlign: 'center' }}>Restablecer Contraseña</h2>
        
        {mensaje && (
          <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '4px', backgroundColor: error ? '#fee2e2' : '#dcfce7', color: error ? '#991b1b' : '#166534', textAlign: 'center' }}>
            {mensaje}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontSize: '0.9rem' }}>Nueva Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontSize: '0.9rem' }}>Confirmar Contraseña</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <button 
            type="submit" 
            disabled={cargando}
            style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: cargando ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
            {cargando ? 'Guardando...' : 'Guardar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
