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
  const [historialClinico, setHistorialClinico] = useState('');
  const [direccion, setDireccion] = useState('');
  
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');


  const resetForm = () => {
    setEditandoId(null);
    setNombre(''); setApellidos(''); setTelefono(''); setCorreo(''); setFechaNacimiento('');
    setHistorialClinico(''); setDireccion('');
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!nombre || !apellidos || !telefono || !correo || !fechaNacimiento) {
      setError('Nombre, apellidos, teléfono, correo y fecha de nacimiento son obligatorios');
      return;
    }
    
    const pacienteData = { nombre, apellidos, telefono, correo, fechaNacimiento, historialClinico, direccion };

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
    setFechaNacimiento(pac.fechaNacimiento || pac.fechanacimiento || '');
    setHistorialClinico(pac.historialClinico || pac.historialclinico || '');
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
      
      
      
      <div>
        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '0.75rem' }}>ID</th>
                <th style={{ padding: '0.75rem' }}>Nombre</th>
                <th style={{ padding: '0.75rem' }}>Contacto</th>
                <th style={{ padding: '0.75rem' }}>Edad</th>
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
                  <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                    {(pac.fechaNacimiento || pac.fechanacimiento) ? (() => {
                      const fechaString = pac.fechaNacimiento || pac.fechanacimiento;
                      const cumple = new Date(fechaString);
                      if (isNaN(cumple.getTime())) return 'N/A';
                      const edad = new Date().getFullYear() - cumple.getFullYear();
                      return `${edad} años`;
                    })() : 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <button
                        onClick={() => setPacienteSeleccionadoEvolucion(pac)}
                        style={{ padding: '0.35rem 0.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        <Activity size={14} /> Historial Visual
                      </button>
                        {isManager && (
                          <button onClick={() => { if(window.confirm('¿Eliminar paciente?')) eliminarPaciente(pac.id); }} style={{ flex: 1, padding: '0.25rem 0.4rem', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Borrar</button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      

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
