import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Download, PackageCheck } from 'lucide-react';
import { generarPDFPedidos } from '../../utils/pdfGeneratorPedidos';

const formatFraction = (num) => {
  if (num === 0) return '0';
  const integerPart = Math.floor(num);
  const decimalPart = num - integerPart;
  
  if (decimalPart === 0) return String(integerPart);
  
  const fractionStr = '1/2';
  if (integerPart === 0) return fractionStr;
  return `${integerPart} ${fractionStr}`;
};

const PedidosListTab = () => {
  const { ventas, examenes, pacientes, marcarLentesTerminados } = useDatabase();
  const [distribuidoresLocal, setDistribuidoresLocal] = useState({});
  const [observacionesLocal, setObservacionesLocal] = useState({});
  const [extrasLocal, setExtrasLocal] = useState({});

  const examenesPorId = useMemo(() => {
    const map = {};
    (examenes || []).forEach(ex => {
      map[String(ex.id)] = ex;
    });
    return map;
  }, [examenes]);

  const pacientesPorId = useMemo(() => {
    const map = {};
    (pacientes || []).forEach(p => {
      map[String(p.id)] = `${p.nombre} ${p.apellidos}`;
    });
    return map;
  }, [pacientes]);

  // Filtrar y procesar datos
  const filasPedidos = useMemo(() => {
    const filas = [];
    // Recorremos las ventas que tienen lentes pendientes
    ventas.forEach(venta => {
      if (venta.lentesTerminados) return; // Ya se entregó o no necesita pedido
      
      const config = venta.detallesLentes?.config || [];
      config.forEach((paquete, pkgIndex) => {
        const materialStr = paquete.material?.nombre || '';
        const proteccionStr = paquete.tratamiento?.nombre || '';
        const receta = examenesPorId[String(venta.examenId)] || {};
        
        const od = receta.od || { esfera: '', cilindro: '', eje: '' };
        const oi = receta.oi || { esfera: '', cilindro: '', eje: '' };
        const adicion = receta.adicion || '';
        const cant = Number(paquete.cantidadVenta || 1);
        
        // Identificador único para el input de estado
        const rowIdBase = `${venta.id}-${pkgIndex}`;

        // Verificamos si ambos ojos son iguales para agrupar
        const sonIguales = (od.esfera === oi.esfera && od.cilindro === oi.cilindro && od.eje === oi.eje);
        const pacienteNombre = pacientesPorId[String(venta.pacienteId)] || 'Desconocido';

        if (sonIguales) {
          const rowId = `${rowIdBase}-ambos`;
          const extraPares = Number(extrasLocal[rowId] || 0);
          filas.push({
            id: rowId,
            ventaId: venta.id,
            paciente: pacienteNombre,
            ojo: 'Ambos Ojos',
            material: materialStr,
            proteccion: proteccionStr,
            esfera: od.esfera || 'Plano',
            cilindro: od.cilindro || '0.00',
            adicion: adicion || '',
            pares: formatFraction(cant),
            base: '',
            piezasExtra: extraPares > 0 ? formatFraction(extraPares) : '',
            paresTotales: formatFraction(cant + extraPares), // 1 par = 2 micas
            distribuidor: distribuidoresLocal[rowId] || '',
            observaciones: observacionesLocal[rowId] || ''
          });
        } else {
          // Si son distintos, se dividen
          const rowIdOd = `${rowIdBase}-od`;
          const extraParesOd = Number(extrasLocal[rowIdOd] || 0);
          filas.push({
            id: rowIdOd,
            ventaId: venta.id,
            paciente: pacienteNombre,
            ojo: 'OD (Derecho)',
            material: materialStr,
            proteccion: proteccionStr,
            esfera: od.esfera || 'Plano',
            cilindro: od.cilindro || '0.00',
            adicion: adicion || '',
            pares: formatFraction(cant * 0.5),
            base: '',
            piezasExtra: extraParesOd > 0 ? formatFraction(extraParesOd) : '',
            paresTotales: formatFraction((cant * 0.5) + extraParesOd),
            distribuidor: distribuidoresLocal[rowIdOd] || '',
            observaciones: observacionesLocal[rowIdOd] || ''
          });
          
          const rowIdOi = `${rowIdBase}-oi`;
          const extraParesOi = Number(extrasLocal[rowIdOi] || 0);
          filas.push({
            id: rowIdOi,
            ventaId: venta.id,
            paciente: pacienteNombre,
            ojo: 'OI (Izquierdo)',
            material: materialStr,
            proteccion: proteccionStr,
            esfera: oi.esfera || 'Plano',
            cilindro: oi.cilindro || '0.00',
            adicion: adicion || '',
            pares: formatFraction(cant * 0.5),
            base: '',
            piezasExtra: extraParesOi > 0 ? formatFraction(extraParesOi) : '',
            paresTotales: formatFraction((cant * 0.5) + extraParesOi),
            distribuidor: distribuidoresLocal[rowIdOi] || '',
            observaciones: observacionesLocal[rowIdOi] || ''
          });
        }
      });
    });
    return filas;
  }, [ventas, examenesPorId, pacientesPorId, distribuidoresLocal, observacionesLocal, extrasLocal]);

  const filasPorPaciente = useMemo(() => {
    const grupos = {};
    filasPedidos.forEach(f => {
      if (!grupos[f.paciente]) grupos[f.paciente] = [];
      grupos[f.paciente].push(f);
    });
    return grupos;
  }, [filasPedidos]);

  const handleExportarPDF = () => {
    // Usar la función importada pasándole las filas procesadas
    generarPDFPedidos(filasPedidos);
  };

  const handleInputChange = (id, campo, valor) => {
    if (campo === 'distribuidor') {
      setDistribuidoresLocal(prev => ({ ...prev, [id]: valor }));
    } else if (campo === 'observaciones') {
      setObservacionesLocal(prev => ({ ...prev, [id]: valor }));
    } else if (campo === 'piezasExtra') {
      setExtrasLocal(prev => ({ ...prev, [id]: valor }));
    }
  };

  return (
    <div style={{ padding: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ color: '#1e293b', margin: 0 }}>Pedidos a Distribuidores</h2>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Listado de cristales y materiales requeridos para ventas pendientes.
          </p>
        </div>
        <button
          onClick={handleExportarPDF}
          disabled={filasPedidos.length === 0}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: filasPedidos.length === 0 ? '#cbd5e1' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: filasPedidos.length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          <Download size={20} />
          Exportar a PDF
        </button>
      </div>

      {filasPedidos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <PackageCheck size={48} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
          <p style={{ fontSize: '1.1rem', margin: 0 }}>No hay cristales pendientes por pedir.</p>
          <span style={{ fontSize: '0.85rem' }}>Las ventas marcadas como "Lentes Terminados" no aparecen aquí.</span>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '0.75rem 1rem' }}>MATERIAL</th>
                <th style={{ padding: '0.75rem 1rem' }}>PROTECCIÓN</th>
                <th style={{ padding: '0.75rem 1rem' }}>ESFERA</th>
                <th style={{ padding: '0.75rem 1rem' }}>CILINDRO</th>
                <th style={{ padding: '0.75rem 1rem' }}>ADICIÓN</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>PARES</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>PARES TOT.</th>
                <th style={{ padding: '0.75rem 1rem', width: '15%' }}>DISTRIBUIDOR</th>
                <th style={{ padding: '0.75rem 1rem', width: '20%' }}>OBSERVACIONES</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>EXTRA</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(filasPorPaciente).map(([pacienteNombre, filas]) => (
                <React.Fragment key={pacienteNombre}>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <td colSpan="11" style={{ padding: '0.5rem 1rem', fontWeight: 'bold', color: '#0f172a', fontSize: '0.9rem' }}>
                      👤 Paciente: {pacienteNombre}
                    </td>
                  </tr>
                  {filas.map((f) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #e2e8f0', color: '#1e293b' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div>{f.material || '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', marginTop: '0.25rem' }}>{f.ojo}</div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>{f.proteccion || '-'}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{f.esfera}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{f.cilindro}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{f.adicion || '-'}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{f.pares}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'bold', color: '#2563eb' }}>{f.paresTotales}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="text" 
                          value={f.distribuidor} 
                          onChange={(e) => handleInputChange(f.id, 'distribuidor', e.target.value)}
                          placeholder="Ej. Lab Visión"
                          style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="text" 
                          value={f.observaciones} 
                          onChange={(e) => handleInputChange(f.id, 'observaciones', e.target.value)}
                          placeholder="Notas..."
                          style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <select
                          value={extrasLocal[f.id] || 0}
                          onChange={(e) => handleInputChange(f.id, 'piezasExtra', e.target.value)}
                          style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                        >
                          <option value={0}>0</option>
                          <option value={0.5}>1/2 par</option>
                          <option value={1}>1 par</option>
                          <option value={1.5}>1 1/2 pares</option>
                          <option value={2}>2 pares</option>
                          <option value={2.5}>2 1/2 pares</option>
                          <option value={3}>3 pares</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            if (window.confirm('¿Marcar todos los cristales de esta venta como terminados?')) {
                              marcarLentesTerminados(f.ventaId);
                            }
                          }}
                          style={{
                            padding: '0.4rem 0.8rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                          title="Marcar Lentes Recibidos (Esto los quitará de esta lista)"
                        >
                          ✓ Recibidos
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PedidosListTab;
