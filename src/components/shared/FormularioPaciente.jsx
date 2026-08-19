import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const FormularioPaciente = ({ onGuardar, onCancelar, datosIniciales, error }) => {
  const [formPaciente, setFormPaciente] = useState({
    nombre: '', apellidos: '', telefono: '', correo: '', direccion: '', fechaNacimiento: ''
  });

  useEffect(() => {
    if (datosIniciales) {
      setFormPaciente(datosIniciales);
    }
  }, [datosIniciales]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onGuardar(formPaciente);
  };

  const getBorderColor = (field) => error?.field === field ? '#ef4444' : '#cbd5e1';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '500px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>
            {datosIniciales ? 'Editar Paciente' : 'Añadir Nuevo Paciente'}
          </h2>
          <button onClick={onCancelar} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Nombre</label>
            <input required type="text" value={formPaciente.nombre} onChange={e => setFormPaciente({...formPaciente, nombre: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${getBorderColor('nombre')}` }} />
            {error?.field === 'nombre' && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{error.message}</div>}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Apellidos</label>
            <input required type="text" value={formPaciente.apellidos} onChange={e => setFormPaciente({...formPaciente, apellidos: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${getBorderColor('apellidos')}` }} />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Teléfono</label>
              <input type="tel" value={formPaciente.telefono} onChange={e => setFormPaciente({...formPaciente, telefono: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${getBorderColor('telefono')}` }} />
              {error?.field === 'telefono' && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{error.message}</div>}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Nacimiento</label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <select 
                  required
                  value={formPaciente.fechaNacimiento ? formPaciente.fechaNacimiento.split('-')[2] || '' : ''} 
                  onChange={e => {
                    const parts = formPaciente.fechaNacimiento ? formPaciente.fechaNacimiento.split('-') : ['','',''];
                    setFormPaciente({...formPaciente, fechaNacimiento: `${parts[0] || ''}-${parts[1] || ''}-${e.target.value}`});
                  }} 
                  style={{ flex: 1, padding: '0.75rem 0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', minWidth: 0 }}
                >
                  <option value="">Día</option>
                  {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                    <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
                  ))}
                </select>

                <select 
                  required
                  value={formPaciente.fechaNacimiento ? formPaciente.fechaNacimiento.split('-')[1] || '' : ''} 
                  onChange={e => {
                    const parts = formPaciente.fechaNacimiento ? formPaciente.fechaNacimiento.split('-') : ['','',''];
                    setFormPaciente({...formPaciente, fechaNacimiento: `${parts[0] || ''}-${e.target.value}-${parts[2] || ''}`});
                  }} 
                  style={{ flex: 1.2, padding: '0.75rem 0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', minWidth: 0 }}
                >
                  <option value="">Mes</option>
                  {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, i) => (
                    <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
                  ))}
                </select>

                <select 
                  required
                  value={formPaciente.fechaNacimiento ? formPaciente.fechaNacimiento.split('-')[0] || '' : ''} 
                  onChange={e => {
                    const parts = formPaciente.fechaNacimiento ? formPaciente.fechaNacimiento.split('-') : ['','',''];
                    setFormPaciente({...formPaciente, fechaNacimiento: `${e.target.value}-${parts[1] || ''}-${parts[2] || ''}`});
                  }} 
                  style={{ flex: 1.2, padding: '0.75rem 0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', minWidth: 0 }}
                >
                  <option value="">Año</option>
                  {Array.from({length: 100}, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Correo Electrónico</label>
            <input type="email" value={formPaciente.correo} onChange={e => setFormPaciente({...formPaciente, correo: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${getBorderColor('correo')}` }} />
            {error?.field === 'correo' && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{error.message}</div>}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Dirección</label>
            <input type="text" value={formPaciente.direccion} onChange={e => setFormPaciente({...formPaciente, direccion: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          </div>
          
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" onClick={onCancelar} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', border: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#10b981', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
              Guardar Paciente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormularioPaciente;
