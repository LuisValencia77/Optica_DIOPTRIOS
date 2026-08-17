import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import HistorialEvolucionModal from './HistorialEvolucionModal';
import { Activity, Plus, Printer, Eye, ClipboardList } from 'lucide-react';
import FormularioExamen from '../../components/shared/FormularioExamen';
import { generarPDFReceta } from '../../utils/pdfGenerator';


const Pacientes = () => {
  const { pacientes, examenes, agregarPaciente, editarPaciente, eliminarPaciente, agregarExamen } = useDatabase();
  const { isManager } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const returnTo = location.state?.returnTo;

  const [editandoId, setEditandoId] = useState(null);
  const [pacienteSeleccionadoEvolucion, setPacienteSeleccionadoEvolucion] = useState(null);
  const [modalExamenPacienteId, setModalExamenPacienteId] = useState(null);
  const [activeTab, setActiveTab] = useState('pacientes'); // 'pacientes' or 'examenes'
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [peso, setPeso] = useState('');
  const [estatura, setEstatura] = useState('');
  const [historialClinico, setHistorialClinico] = useState('');
  const [direccion, setDireccion] = useState('');
  
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');


  const resetForm = () => {
    setEditandoId(null);
    setNombre(''); setApellidos(''); setTelefono(''); setCorreo(''); setFechaNacimiento('');
    setPeso(''); setEstatura(''); setHistorialClinico(''); setDireccion('');
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!nombre || !apellidos || !telefono || !correo || !fechaNacimiento) {
      setError('Nombre, apellidos, teléfono, correo y fecha de nacimiento son obligatorios');
      return;
    }
    
    const pacienteData = { nombre, apellidos, telefono, correo, fechaNacimiento, peso, estatura, historialClinico, direccion };

    if (editandoId) {
      editarPaciente(editandoId, pacienteData);
      setMensaje('Paciente actualizado exitosamente.');
      setError('');
      resetForm();
      setTimeout(() => setMensaje(''), 3000);
    } else {
      const exito = await agregarPaciente(pacienteData);
      if (exito) {
        if (returnTo) {
          navigate(returnTo, { state: { newPacienteId: exito.id } });
          return;
        }
        setMensaje('Paciente registrado exitosamente.');
        setError('');
        resetForm();
        setTimeout(() => setMensaje(''), 3000);
      } else {
        setError('Ya existe un paciente con este nombre o teléfono.');
      }
    }
  };

  const iniciarEdicion = (pac) => {
    setEditandoId(pac.id);
    setNombre(pac.nombre);
    setApellidos(pac.apellidos || '');
    setTelefono(pac.telefono);
    setCorreo(pac.correo);
    setFechaNacimiento(pac.fechaNacimiento);
    setPeso(pac.peso || '');
    setEstatura(pac.estatura || '');
    setHistorialClinico(pac.historialClinico || '');
    setDireccion(pac.direccion || '');
  };

  const searchTerm = (nombre + ' ' + apellidos).toLowerCase().trim();
  const pacientesFiltrados = searchTerm
    ? pacientes.filter(p => {
        const fullName = `${p.nombre} ${p.apellidos || ''}`.toLowerCase();
        return fullName.includes(searchTerm) || p.telefono.includes(searchTerm);
      })
    : pacientes;

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('pacientes')}
          style={{ background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', color: activeTab === 'pacientes' ? '#2563eb' : '#64748b', borderBottom: activeTab === 'pacientes' ? '3px solid #2563eb' : 'none', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Activity size={20} /> Expedientes de Pacientes
        </button>
        <button 
          onClick={() => setActiveTab('examenes')}
          style={{ background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', color: activeTab === 'examenes' ? '#2563eb' : '#64748b', borderBottom: activeTab === 'examenes' ? '3px solid #2563eb' : 'none', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Eye size={20} /> Historial General de Exámenes
        </button>
      </div>
      
      {activeTab === 'pacientes' && (
      <div className="responsive-grid">
        <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: '#334155' }}>
              {editandoId ? 'Editar Paciente' : 'Nuevo Paciente'}
            </h3>
            {returnTo && (
              <button onClick={() => navigate(returnTo)} style={{ padding: '0.4rem 0.8rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                Volver
              </button>
            )}
          </div>
          {mensaje && <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem' }}>{mensaje}</div>}
          {error && <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}
          
          <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Nombre(s) *</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Apellidos *</label>
                <input type="text" value={apellidos} onChange={e => setApellidos(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Teléfono *</label>
                <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Correo *</label>
                <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Fecha de Nacimiento *</label>
              <input type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Dirección de Domicilio</label>
              <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Peso (kg)</label>
                <input type="number" step="0.1" value={peso} onChange={e => setPeso(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Estatura (m)</label>
                <input type="number" step="0.01" value={estatura} onChange={e => setEstatura(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Historial Clínico (Enfermedades)</label>
              <textarea value={historialClinico} onChange={e => setHistorialClinico(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', minHeight: '80px' }} placeholder="Diabetes, hipertensión, alergias, etc." />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', padding: '0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {editandoId ? 'Actualizar' : 'Crear Expediente'}
              </button>
              {editandoId && (
                <button type="button" onClick={resetForm} style={{ flex: 1, backgroundColor: '#94a3b8', color: 'white', padding: '0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '0.75rem' }}>ID</th>
                <th style={{ padding: '0.75rem' }}>Nombre</th>
                <th style={{ padding: '0.75rem' }}>Contacto</th>
                <th style={{ padding: '0.75rem' }}>Detalles Clínicos</th>
                <th style={{ padding: '0.75rem' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pacientesFiltrados.map(pac => (
                <tr key={pac.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>#{pac.id}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{pac.nombre} {pac.apellidos || ''}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <div>{pac.telefono}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{pac.correo}</div>
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                    {pac.peso && <div><strong>Peso:</strong> {pac.peso}kg</div>}
                    {pac.estatura && <div><strong>Estatura:</strong> {pac.estatura}m</div>}
                    {pac.historialClinico && (
                      <div style={{ marginTop: '0.5rem', backgroundColor: '#fef2f2', padding: '0.5rem', borderRadius: '4px', border: '1px solid #fca5a5' }}>
                        <strong style={{ color: '#991b1b', display: 'block', marginBottom: '0.25rem' }}>Historial Clínico:</strong>
                        <span style={{ color: '#7f1d1d', whiteSpace: 'pre-wrap' }}>{pac.historialClinico}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <button
                        onClick={() => setModalExamenPacienteId(pac.id.toString())}
                        style={{ padding: '0.35rem 0.5rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        <Plus size={14} /> Nuevo Examen
                      </button>
                      <button
                        onClick={() => setPacienteSeleccionadoEvolucion(pac)}
                        style={{ padding: '0.35rem 0.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        <Activity size={14} /> Historial Visual
                      </button>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button onClick={() => iniciarEdicion(pac)} style={{ flex: 1, padding: '0.25rem 0.4rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Editar</button>
                        {isManager && (
                          <button onClick={() => { if(window.confirm('¿Eliminar paciente?')) eliminarPaciente(pac.id); }} style={{ flex: 1, padding: '0.25rem 0.4rem', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Borrar</button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {activeTab === 'examenes' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: 0 }}>Todos los Exámenes</h3>
          {examenes.map(ex => {
            const pac = pacientes.find(p => String(p.id) === String(ex.pacienteId));
            return (
              <div key={ex.id} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  <div>
                    <strong style={{ color: '#1e293b', fontSize: '1.1rem' }}>{pac ? `${pac.nombre} ${pac.apellidos || ''}`.trim() : 'Paciente no encontrado'}</strong>
                    <span style={{ color: '#64748b', marginLeft: '1rem' }}>{new Date(ex.fecha).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button onClick={() => generarPDFReceta(ex, pac)} style={{ padding: '0.35rem 0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      <Printer size={16} /> Imprimir Receta
                    </button>
                  </div>
                </div>
                <div className="responsive-flex">
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: '#2563eb' }}>OD:</strong> Esf: {ex.od?.esfera} | Cil: {ex.od?.cilindro} | Eje: {ex.od?.eje}° | Ad: {ex.od?.adicion} | AV: {ex.od?.agudeza}
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: '#2563eb' }}>OI:</strong> Esf: {ex.oi?.esfera} | Cil: {ex.oi?.cilindro} | Eje: {ex.oi?.eje}° | Ad: {ex.oi?.adicion} | AV: {ex.oi?.agudeza}
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
      )}

      {pacienteSeleccionadoEvolucion && (
        <HistorialEvolucionModal
          paciente={pacienteSeleccionadoEvolucion}
          examenes={examenes}
          onClose={() => setPacienteSeleccionadoEvolucion(null)}
        />
      )}

      {modalExamenPacienteId && (
        <FormularioExamen 
          pacienteId={modalExamenPacienteId}
          onGuardar={async (examenData) => {
            await agregarExamen(examenData);
            setModalExamenPacienteId(null);
            setMensaje('Examen registrado exitosamente.');
            setTimeout(() => setMensaje(''), 3000);
          }}
          onCancelar={() => setModalExamenPacienteId(null)}
        />
      )}
    </div>
  );
};

export default Pacientes;
