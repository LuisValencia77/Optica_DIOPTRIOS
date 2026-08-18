import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const VerificarCorreo = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [mensaje, setMensaje] = useState('Verificando...');
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const verificar = async () => {
      if (!token) {
        setMensaje('No se proporcionó ningún token de verificación.');
        setError(true);
        return;
      }
      try {
        const response = await fetch(`/api/usuarios/verify/${token}`);
        const data = await response.json();
        if (response.ok) {
          setMensaje('¡Cuenta verificada exitosamente! Ya puedes iniciar sesión.');
          setError(false);
        } else {
          setMensaje(data.error || 'Ocurrió un error al verificar.');
          setError(true);
        }
      } catch (err) {
        setMensaje('Error de conexión con el servidor.');
        setError(true);
      }
    };
    verificar();
  }, [token]);

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: "'Google Sans', sans-serif" }}>
      <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', textAlign: 'center', maxWidth: '400px' }}>
        <h2 style={{ color: error ? '#dc2626' : '#16a34a', marginBottom: '1rem' }}>
          {error ? 'Error de Verificación' : 'Verificación Completa'}
        </h2>
        <p style={{ color: '#475569', marginBottom: '2rem' }}>{mensaje}</p>
        <button 
          onClick={() => navigate('/login')}
          style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%', fontSize: '1rem', fontWeight: 'bold' }}>
          Ir al Inicio de Sesión
        </button>
      </div>
    </div>
  );
};

export default VerificarCorreo;
