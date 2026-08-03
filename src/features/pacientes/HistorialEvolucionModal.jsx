import React from 'react';
import { X, Calendar, Activity, Eye } from 'lucide-react';

const HistorialEvolucionModal = ({ paciente, examenes, onClose }) => {
  if (!paciente) return null;

  // Filtrar exámenes pertenecientes a este paciente ordenados cronológicamente
  const examenesPaciente = examenes
    .filter(e => e.pacienteId.toString() === paciente.id.toString())
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justify: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          maxWidth: '850px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity color="#2563eb" /> Historial de Evolución Visual
            </h3>
            <span style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem', display: 'block' }}>
              Paciente: <strong>{paciente.nombre}</strong> (ID #{paciente.id})
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#64748b' }}
          >
            <X size={24} />
          </button>
        </div>

        {examenesPaciente.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            <Eye size={40} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
            <p>El paciente aún no cuenta con exámenes de la vista registrados.</p>
          </div>
        ) : (
          <div>
            <div style={{ backgroundColor: '#eff6ff', borderLeft: '4px solid #2563eb', padding: '0.85rem 1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#1e40af' }}>
              ℹ️ Se muestran <strong>{examenesPaciente.length}</strong> registro(s) históricos. Compara el comportamiento de la graduación (Esfera, Cilindro, Eje, Adición) con el paso del tiempo.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {examenesPaciente.map((ex, index) => {
                const od = typeof ex.od === 'string' ? JSON.parse(ex.od) : (ex.od || {});
                const oi = typeof ex.oi === 'string' ? JSON.parse(ex.oi) : (ex.oi || {});

                return (
                  <div key={ex.id} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: '#1e293b' }}>
                        <Calendar size={16} color="#2563eb" />
                        <span>Consulta #{index + 1} - {new Date(ex.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        Examen #{ex.id}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                      {/* Ojo Derecho */}
                      <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <strong style={{ color: '#2563eb', fontSize: '0.9rem', display: 'block', marginBottom: '0.4rem' }}>👁️ Ojo Derecho (O.D.)</strong>
                        <div style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.25rem' }}>
                          <div><strong>Esfera:</strong> {od.esfera || '0.00'}</div>
                          <div><strong>Cilindro:</strong> {od.cilindro || '0.00'}</div>
                          <div><strong>Eje:</strong> {od.eje || '0'}°</div>
                          <div><strong>Adición:</strong> {od.adicion || '0.00'}</div>
                          <div style={{ gridColumn: 'span 2', marginTop: '0.2rem', color: '#16a34a' }}><strong>Agudeza:</strong> {od.agudeza || '20/20'}</div>
                        </div>
                      </div>

                      {/* Ojo Izquierdo */}
                      <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <strong style={{ color: '#2563eb', fontSize: '0.9rem', display: 'block', marginBottom: '0.4rem' }}>👁️ Ojo Izquierdo (O.I.)</strong>
                        <div style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.25rem' }}>
                          <div><strong>Esfera:</strong> {oi.esfera || '0.00'}</div>
                          <div><strong>Cilindro:</strong> {oi.cilindro || '0.00'}</div>
                          <div><strong>Eje:</strong> {oi.eje || '0'}°</div>
                          <div><strong>Adición:</strong> {oi.adicion || '0.00'}</div>
                          <div style={{ gridColumn: 'span 2', marginTop: '0.2rem', color: '#16a34a' }}><strong>Agudeza:</strong> {oi.agudeza || '20/20'}</div>
                        </div>
                      </div>
                    </div>

                    {(ex.tipoArmazon || ex.tratamientoLentes) && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.85rem', color: '#475569' }}>
                        {ex.tipoArmazon && <div>• <strong>Armazón:</strong> {ex.tipoArmazon}</div>}
                        {ex.tratamientoLentes && <div>• <strong>Tratamientos:</strong> {Array.isArray(ex.tratamientoLentes) ? ex.tratamientoLentes.join(', ') : ex.tratamientoLentes}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{ backgroundColor: '#94a3b8', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistorialEvolucionModal;
