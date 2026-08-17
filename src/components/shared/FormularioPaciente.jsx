import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const FormularioPaciente = ({ onGuardar, onCancelar, datosIniciales }) => {
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
            <input required type="text" value={formPaciente.nombre} onChange={e => setFormPaciente({...formPaciente, nombre: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Apellidos</label>
            <input required type="text" value={formPaciente.apellidos} onChange={e => setFormPaciente({...formPaciente, apellidos: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Teléfono</label>
              <input type="tel" value={formPaciente.telefono} onChange={e => setFormPaciente({...formPaciente, telefono: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Nacimiento</label>
              <input type="date" value={formPaciente.fechaNacimiento} onChange={e => setFormPaciente({...formPaciente, fechaNacimiento: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Correo Electrónico</label>
            <input type="email" value={formPaciente.correo} onChange={e => setFormPaciente({...formPaciente, correo: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
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
