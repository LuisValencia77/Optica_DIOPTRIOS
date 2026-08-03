import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import { generarPDFReceta } from '../../utils/pdfGenerator';
import { Printer } from 'lucide-react';


const FormOjo = ({ titulo, ojo, valores, onChange }) => (
  <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
    <h4 style={{ marginTop: 0, borderBottom: '2px solid #cbd5e1', paddingBottom: '0.5rem', color: '#334155' }}>{titulo}</h4>
    <div className="eye-form-grid">
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem' }}>Esfera</label>
        <input type="number" step="0.25" value={valores.esfera} onChange={e => onChange(ojo, 'esfera', e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem' }}>Cilindro</label>
        <input type="number" step="0.25" value={valores.cilindro} onChange={e => onChange(ojo, 'cilindro', e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem' }}>Eje</label>
        <input type="number" min="0" max="180" value={valores.eje} onChange={e => onChange(ojo, 'eje', e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem' }}>Adición</label>
        <input type="number" step="0.25" value={valores.adicion} onChange={e => onChange(ojo, 'adicion', e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
      </div>
      <div style={{ gridColumn: 'span 2' }}>
        <label style={{ display: 'block', fontSize: '0.85rem' }}>Agudeza Visual</label>
        <input type="text" value={valores.agudeza} onChange={e => onChange(ojo, 'agudeza', e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
      </div>
    </div>
  </div>
);



const Examenes = () => {
  const { inventario, pacientes, examenes, agregarExamen, editarExamen, eliminarExamen } = useDatabase();
  const { isManager } = useAuth();
  
  const [editandoId, setEditandoId] = useState(null);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState('');
  const [mensaje, setMensaje] = useState('');
  
  // Valores iniciales
  const inicial = { esfera: '0.00', cilindro: '0.00', eje: '0', adicion: '0.00', agudeza: '20/20' };
  const [od, setOd] = useState({ ...inicial });
  const [oi, setOi] = useState({ ...inicial });

  // Nuevos campos para armazón y tratamientos
  const [tipoArmazon, setTipoArmazon] = useState('');
  const [tratamientoLentes, setTratamientoLentes] = useState([]);

  const opcionesArmazon = Array.from(
    new Set(
      inventario
        .filter(prod => prod.tipo === 'Armazón')
        .map(prod => `${prod.marca} ${prod.modelo}`)
    )
  );
  const opcionesTratamiento = Array.from(
    new Set(
      inventario
        .filter(prod => prod.tipo === 'Tratamiento')
        .map(prod => prod.marca)
    )
  );

  const resetForm = () => {
    setEditandoId(null);
    setPacienteSeleccionado('');
    setOd({ ...inicial });
    setOi({ ...inicial });
    setTipoArmazon('');
    setTratamientoLentes([]);
  };

  const toggleTratamiento = (opcion) => {
    setTratamientoLentes(prev => prev.includes(opcion)
      ? prev.filter(item => item !== opcion)
      : [...prev, opcion]
    );
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    try {
      if (!pacienteSeleccionado) {
        setMensaje('Seleccione un paciente primero.');
        return;
      }

      const examenData = { 
        pacienteId: parseInt(pacienteSeleccionado), 
        od, 
        oi, 
        tipoArmazon, 
        tratamientoLentes 
      };

      if (editandoId) {
        await editarExamen(editandoId, examenData);
        setMensaje('Examen actualizado correctamente.');
      } else {
        const created = await agregarExamen(examenData);
        if (!created) {
          setMensaje('Error registrando examen (ver consola).');
          return;
        }
        setMensaje('Examen registrado correctamente.');
      }
      
      resetForm();
      setTimeout(() => setMensaje(''), 3000);
    } catch (err) {
      console.error('Error en guardar examen:', err);
      setMensaje('Ocurrió un error al guardar el examen.');
      setTimeout(() => setMensaje(''), 4000);
    }
  };

  const iniciarEdicion = (ex) => {
    setEditandoId(ex.id);
    setPacienteSeleccionado(ex.pacienteId.toString());
    setOd({ ...ex.od });
    setOi({ ...ex.oi });
    setTipoArmazon(ex.tipoArmazon || '');
    setTratamientoLentes(Array.isArray(ex.tratamientoLentes) ? ex.tratamientoLentes : (ex.tratamientoLentes ? ex.tratamientoLentes.split(', ') : []));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChange = (ojo, campo, valor) => {
    if (ojo === 'od') setOd(prev => ({ ...prev, [campo]: valor }));
    if (ojo === 'oi') setOi(prev => ({ ...prev, [campo]: valor }));
  };

  return (
    <div>
      <h2 style={{ color: '#1e293b', marginBottom: '1.5rem' }}>{editandoId ? 'Editar Examen Visual' : 'Registro de Examen Visual'}</h2>

      {mensaje && <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>{mensaje}</div>}

      <form onSubmit={handleGuardar}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Seleccionar Paciente</label>
          <select value={pacienteSeleccionado} onChange={e => setPacienteSeleccionado(e.target.value)} style={{ width: '100%', maxWidth: '400px', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
            <option value="">-- Seleccione un paciente --</option>
            {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>

        <div className="responsive-flex eye-forms-container" style={{ marginBottom: '1.5rem' }}>
          <FormOjo titulo="Ojo Derecho (OD)" ojo="od" valores={od} onChange={handleChange} />
          <FormOjo titulo="Ojo Izquierdo (OI)" ojo="oi" valores={oi} onChange={handleChange} />
        </div>

        <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
          <h4 style={{ marginTop: 0, borderBottom: '2px solid #cbd5e1', paddingBottom: '0.5rem', color: '#334155' }}>Requerimientos de Lentes y Armazón</h4>
          <div className="responsive-flex" style={{ gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Tipo de Armazón</label>
              <select value={tipoArmazon} onChange={e => setTipoArmazon(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                <option value="">-- Seleccione un armazón --</option>
                {opcionesArmazon.map(armazon => (
                  <option key={armazon} value={armazon}>{armazon}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Tratamientos</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.5rem' }}>
                {opcionesTratamiento.length === 0 && <div style={{ color: '#94a3b8' }}>No hay tratamientos registrados en inventario.</div>}
                {opcionesTratamiento.map(option => (
                  <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={tratamientoLentes.includes(option)}
                      onChange={() => toggleTratamiento(option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', padding: '0.75rem 2rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {editandoId ? 'Actualizar Examen' : 'Guardar Examen'}
          </button>
          {editandoId && (
            <button type="button" onClick={resetForm} style={{ backgroundColor: '#94a3b8', color: 'white', padding: '0.75rem 2rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div style={{ marginTop: '3rem' }}>
        <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>Historial de Exámenes</h3>
        {examenes.map(ex => {
          const pac = pacientes.find(p => p.id === ex.pacienteId);
          return (
            <div key={ex.id} style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <div>
                  <strong style={{ color: '#1e293b', fontSize: '1.1rem' }}>{pac?.nombre || 'Paciente no encontrado'}</strong>
                  <span style={{ color: '#64748b', marginLeft: '1rem' }}>{new Date(ex.fecha).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button onClick={() => generarPDFReceta(ex, pac)} style={{ padding: '0.35rem 0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    <Printer size={16} /> Imprimir Receta
                  </button>
                  <button onClick={() => iniciarEdicion(ex)} style={{ padding: '0.35rem 0.6rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Editar</button>
                  {isManager && (
                    <button onClick={() => { if(window.confirm('¿Eliminar examen?')) eliminarExamen(ex.id); }} style={{ padding: '0.35rem 0.6rem', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Borrar</button>
                  )}
                </div>
              </div>
              <div className="responsive-flex">
                <div style={{ flex: 1 }}>
                  <strong style={{ color: '#2563eb' }}>OD:</strong> Esf: {ex.od.esfera} | Cil: {ex.od.cilindro} | Eje: {ex.od.eje}° | Ad: {ex.od.adicion} | AV: {ex.od.agudeza}
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: '#2563eb' }}>OI:</strong> Esf: {ex.oi.esfera} | Cil: {ex.oi.cilindro} | Eje: {ex.oi.eje}° | Ad: {ex.oi.adicion} | AV: {ex.oi.agudeza}
                </div>
              </div>
              {(ex.tipoArmazon || ex.tratamientoLentes) && (
                <div style={{ marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1', display: 'flex', gap: '2rem', fontSize: '0.9rem' }}>
                  {ex.tipoArmazon && <div><strong style={{ color: '#475569' }}>Tipo de Armazón:</strong> {ex.tipoArmazon}</div>}
                  {ex.tratamientoLentes && <div><strong style={{ color: '#475569' }}>Tratamientos:</strong> {ex.tratamientoLentes}</div>}
                </div>
              )}
            </div>
          );
        })}
        {examenes.length === 0 && <p style={{ color: '#64748b' }}>No hay exámenes registrados.</p>}
      </div>
    </div>
  );
};

export default Examenes;