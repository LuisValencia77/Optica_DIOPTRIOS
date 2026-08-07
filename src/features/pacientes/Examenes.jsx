import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const { pacientes, examenes, agregarExamen, editarExamen, eliminarExamen, inventario } = useDatabase();
  const { isManager } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [editandoId, setEditandoId] = useState(null);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState('');
  
  // Advanced search states
  const [busquedaPaciente, setBusquedaPaciente] = useState('');
  const [filtrosBusqueda, setFiltrosBusqueda] = useState({
    nombre: true, apellidos: true, fechaNacimiento: true,
    correo: true, telefono: true, direccion: true
  });
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Auto-seleccionar paciente si venimos de registrar uno nuevo
  useEffect(() => {
    if (location.state?.newPacienteId) {
      setPacienteSeleccionado(location.state.newPacienteId.toString());
      // Limpiamos el state para que no se auto-seleccione de nuevo al refrescar
      window.history.replaceState({}, document.title);
    }
  }, [location]);

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

  const toggleFiltro = (campo) => setFiltrosBusqueda(prev => ({ ...prev, [campo]: !prev[campo] }));
  const limpiarFiltros = () => {
    setFiltrosBusqueda({ nombre: true, apellidos: true, fechaNacimiento: true, correo: true, telefono: true, direccion: true });
    setBusquedaPaciente('');
  };

  const searchLower = busquedaPaciente.toLowerCase().trim();
  const pacientesListFiltrados = !searchLower ? [] : pacientes.filter(p => {
    if (filtrosBusqueda.nombre && (p.nombre || '').toLowerCase().includes(searchLower)) return true;
    if (filtrosBusqueda.apellidos && (p.apellidos || '').toLowerCase().includes(searchLower)) return true;
    if (filtrosBusqueda.fechaNacimiento && (p.fechaNacimiento || '').includes(searchLower)) return true;
    if (filtrosBusqueda.correo && (p.correo || '').toLowerCase().includes(searchLower)) return true;
    if (filtrosBusqueda.telefono && (p.telefono || '').toLowerCase().includes(searchLower)) return true;
    if (filtrosBusqueda.direccion && (p.direccion || '').toLowerCase().includes(searchLower)) return true;
    return false;
  });

  return (
    <div>
      <h2 style={{ color: '#1e293b', marginBottom: '1.5rem' }}>{editandoId ? 'Editar Examen Visual' : 'Registro de Examen Visual'}</h2>

      {mensaje && <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>{mensaje}</div>}

      <form onSubmit={handleGuardar}>
        <div style={{ marginBottom: '1.5rem', zIndex: 10, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontWeight: 'bold' }}>Seleccionar Paciente</label>
            <button type="button" onClick={() => navigate('/pacientes', { state: { returnTo: '/examenes' } })} style={{ padding: '0.4rem 0.8rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>+ Nuevo Paciente</button>
          </div>
          
          {pacienteSeleccionado ? (
            <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', color: '#1e293b', fontSize: '1.1rem' }}>
                  {(() => {
                    const pac = pacientes.find(p => String(p.id) === String(pacienteSeleccionado));
                    return pac ? `${pac.nombre} ${pac.apellidos || ''}`.trim() : 'Desconocido';
                  })()}
                </strong>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Paciente Seleccionado para este examen</span>
              </div>
              <button type="button" onClick={() => { setPacienteSeleccionado(''); setMostrarResultados(false); }} style={{ padding: '0.5rem 1rem', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Elegir Otro</button>
            </div>
          ) : (
            <div>
              <input 
                type="text" 
                value={busquedaPaciente} 
                onChange={e => { setBusquedaPaciente(e.target.value); setMostrarResultados(true); }}
                onFocus={() => setMostrarResultados(true)}
                placeholder="Busca por nombre, teléfono, correo..."
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }}
              />
              
              <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Filtros de Búsqueda:</span>
                {Object.keys(filtrosBusqueda).map(campo => (
                  <label key={campo} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: filtrosBusqueda[campo] ? '#dbeafe' : '#fff', padding: '0.25rem 0.6rem', borderRadius: '20px', border: `1px solid ${filtrosBusqueda[campo] ? '#93c5fd' : '#cbd5e1'}`, transition: 'all 0.2s', userSelect: 'none' }}>
                    <input type="checkbox" checked={filtrosBusqueda[campo]} onChange={() => toggleFiltro(campo)} style={{ margin: 0, display: 'none' }} />
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: filtrosBusqueda[campo] ? '#3b82f6' : '#e2e8f0' }}></div>
                    {campo === 'fechaNacimiento' ? 'Fecha' : campo.charAt(0).toUpperCase() + campo.slice(1).replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                ))}
                <div style={{ flexGrow: 1 }}></div>
                <button type="button" onClick={limpiarFiltros} style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Limpiar</button>
              </div>

              {mostrarResultados && searchLower && (
                <div style={{ marginTop: '0.5rem', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', maxHeight: '350px', overflowY: 'auto' }}>
                  {pacientesListFiltrados.length > 0 ? pacientesListFiltrados.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => { setPacienteSeleccionado(p.id.toString()); setMostrarResultados(false); setBusquedaPaciente(''); }}
                      style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1.05rem' }}>{`${p.nombre} ${p.apellidos || ''}`.trim()}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.4rem' }}>
                        {p.telefono && <span>📞 {p.telefono}</span>}
                        {p.correo && <span>✉️ {p.correo}</span>}
                        {p.fechaNacimiento && <span>🎂 {p.fechaNacimiento}</span>}
                      </div>
                      {p.direccion && <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.4rem' }}>📍 {p.direccion}</div>}
                    </div>
                  )) : (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b' }}>
                      No se encontraron pacientes que coincidan con los filtros seleccionados.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
          const pac = pacientes.find(p => String(p.id) === String(ex.pacienteId));
          return (
            <div key={ex.id} style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <div>
                  <strong style={{ color: '#1e293b', fontSize: '1.1rem' }}>{pac ? `${pac.nombre} ${pac.apellidos || ''}`.trim() : 'Paciente no encontrado'}</strong>
                  <span style={{ color: '#64748b', marginLeft: '1rem' }}>{new Date(ex.fecha).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button onClick={() => generarPDFReceta(ex, pac)} style={{ padding: '0.35rem 0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    <Printer size={16} /> Imprimir Receta
                  </button>
                  <button onClick={() => iniciarEdicion(ex)} style={{ padding: '0.35rem 0.6rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Editar</button>
                  {isManager && (
                    <button onClick={() => { if (window.confirm('¿Eliminar examen?')) eliminarExamen(ex.id); }} style={{ padding: '0.35rem 0.6rem', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Borrar</button>
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