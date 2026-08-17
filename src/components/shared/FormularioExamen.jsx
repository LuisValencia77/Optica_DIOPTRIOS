import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const FormularioExamen = ({ onGuardar, onCancelar, pacienteId, title = "Registrar Nuevo Examen Visual" }) => {
  const [formExamen, setFormExamen] = useState({
    pacienteId: pacienteId || '',
    od: { esfera: '', cilindro: '', eje: '', adicion: '', agudeza: '' },
    oi: { esfera: '', cilindro: '', eje: '', adicion: '', agudeza: '' },
    tipoArmazon: '', tratamientoLentes: ''
  });

  useEffect(() => {
    if (pacienteId) {
      setFormExamen(prev => ({ ...prev, pacienteId }));
    }
  }, [pacienteId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onGuardar(formExamen);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '800px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>{title}</h2>
          <button onClick={onCancelar} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Contenedor OD / OI */}
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {/* Ojo Derecho */}
            <div style={{ flex: 1, backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#1d4ed8', borderBottom: '2px solid #93c5fd', paddingBottom: '0.5rem' }}>Ojo Derecho (OD)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Esfera</label><input type="number" step="0.25" value={formExamen.od.esfera} onChange={e => setFormExamen({...formExamen, od: {...formExamen.od, esfera: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Cilindro</label><input type="number" step="0.25" value={formExamen.od.cilindro} onChange={e => setFormExamen({...formExamen, od: {...formExamen.od, cilindro: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Eje</label><input type="number" min="0" max="180" value={formExamen.od.eje} onChange={e => setFormExamen({...formExamen, od: {...formExamen.od, eje: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Adición</label><input type="number" step="0.25" value={formExamen.od.adicion} onChange={e => setFormExamen({...formExamen, od: {...formExamen.od, adicion: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                <div style={{ gridColumn: 'span 2' }}><label style={{ display: 'block', fontSize: '0.8rem' }}>Agudeza</label><input type="text" value={formExamen.od.agudeza} onChange={e => setFormExamen({...formExamen, od: {...formExamen.od, agudeza: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
              </div>
            </div>

            {/* Ojo Izquierdo */}
            <div style={{ flex: 1, backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#1d4ed8', borderBottom: '2px solid #93c5fd', paddingBottom: '0.5rem' }}>Ojo Izquierdo (OS)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Esfera</label><input type="number" step="0.25" value={formExamen.oi.esfera} onChange={e => setFormExamen({...formExamen, oi: {...formExamen.oi, esfera: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Cilindro</label><input type="number" step="0.25" value={formExamen.oi.cilindro} onChange={e => setFormExamen({...formExamen, oi: {...formExamen.oi, cilindro: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Eje</label><input type="number" min="0" max="180" value={formExamen.oi.eje} onChange={e => setFormExamen({...formExamen, oi: {...formExamen.oi, eje: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Adición</label><input type="number" step="0.25" value={formExamen.oi.adicion} onChange={e => setFormExamen({...formExamen, oi: {...formExamen.oi, adicion: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                <div style={{ gridColumn: 'span 2' }}><label style={{ display: 'block', fontSize: '0.8rem' }}>Agudeza</label><input type="text" value={formExamen.oi.agudeza} onChange={e => setFormExamen({...formExamen, oi: {...formExamen.oi, agudeza: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onCancelar} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', border: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Examen</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormularioExamen;
