import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const roleOptions = [
  { value: 'Administrador', label: 'Administrador' },
  { value: 'Empleado', label: 'Empleado' },
];

const GestionUsuarios = () => {
  const { usuarios, crearUsuario, cambiarPassword, eliminarUsuario, user } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Empleado');
  const [mensaje, setMensaje] = useState('');

  const [editandoUsername, setEditandoUsername] = useState(null);
  const [nuevaPassword, setNuevaPassword] = useState('');

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!username || !password || !name || !email) return;
    
    const exito = await crearUsuario({ username, password, name, role, email });
    if (exito) {
      setMensaje('Usuario creado exitosamente. Se ha enviado un correo de verificación.');
      setUsername(''); setPassword(''); setName(''); setRole('Empleado'); setEmail('');
      setTimeout(() => setMensaje(''), 3000);
    } else {
      alert('El nombre de usuario ya existe o hubo un error.');
    }
  };

  const handleCambiarPassword = async (uname) => {
    const exito = await cambiarPassword(uname);
    if (exito) {
      setMensaje(`Se ha enviado un correo a ${uname} para restablecer la contraseña.`);
    } else {
      alert(`Error al solicitar el cambio de contraseña para ${uname}.`);
    }
    setTimeout(() => setMensaje(''), 5000);
  };

  return (
    <div>
      <h2 style={{ color: '#1e293b', marginBottom: '1.5rem' }}>Gestión de Usuarios</h2>
      
      {mensaje && <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>{mensaje}</div>}

      <div className="responsive-grid">
        <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#334155' }}>Crear Nuevo Usuario</h3>
          <form onSubmit={handleCrear} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Nombre Completo</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Correo Electrónico</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Nombre de Usuario (Login)</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Contraseña Temporal</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Rol en el Sistema</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', padding: '0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Crear Usuario</button>
          </form>
        </div>

        <div>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#334155' }}>Usuarios Registrados</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '0.75rem' }}>Nombre</th>
                <th style={{ padding: '0.75rem' }}>Usuario</th>
                <th style={{ padding: '0.75rem' }}>Correo</th>
                <th style={{ padding: '0.75rem' }}>Rol</th>
                <th style={{ padding: '0.75rem' }}>Estado</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id || u.username} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem' }}>{u.name}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{u.username}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: '#64748b' }}>{u.email}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: u.role.includes('Super') ? '#fef08a' : u.role === 'Administrador' ? '#bae6fd' : '#e0f2fe' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: u.is_verified ? '#dcfce7' : '#fee2e2', color: u.is_verified ? '#166534' : '#991b1b' }}>
                      {u.is_verified ? 'Verificado' : 'Pendiente'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      {(user?.role === 'Super Usuario' || u.id === user?.id) && (
                        <button onClick={() => handleCambiarPassword(u.username)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>🔑 Restablecer Clave</button>
                      )}
                      
                      {user?.role === 'Super Usuario' && u.id !== user.id && (
                        <button onClick={() => { if(window.confirm('¿Seguro que desea eliminar a este usuario?')) eliminarUsuario(u.id); }} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Borrar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GestionUsuarios;
