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
  const { ventas, examenes, pacientes, marcarLentesTerminados, actualizarEstadoPedidoCliente } = useDatabase();
  const [distribuidoresLocal, setDistribuidoresLocal] = useState(() => { try { return JSON.parse(localStorage.getItem('pedidos_dist')) || {}; } catch { return {}; } });
  const [observacionesLocal, setObservacionesLocal] = useState(() => { try { return JSON.parse(localStorage.getItem('pedidos_obs')) || {}; } catch { return {}; } });
  const [extrasLocal, setExtrasLocal] = useState(() => { try { return JSON.parse(localStorage.getItem('pedidos_ext')) || {}; } catch { return {}; } });
  const [activeTab, setActiveTab] = useState('Pedidos');
  const [isClosing, setIsClosing] = useState(false);
  const [collapsedBatches, setCollapsedBatches] = useState({});
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [tempDist, setTempDist] = useState({});
  const [tempObs, setTempObs] = useState({});
  const [tempExt, setTempExt] = useState({});
  const [batches, setBatches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pedidos_batches') || '[]'); } catch { return []; }
  });

  React.useEffect(() => {
    localStorage.setItem('pedidos_batches', JSON.stringify(batches));
  }, [batches]);

  React.useEffect(() => { localStorage.setItem('pedidos_dist', JSON.stringify(distribuidoresLocal)); }, [distribuidoresLocal]);
  React.useEffect(() => { localStorage.setItem('pedidos_obs', JSON.stringify(observacionesLocal)); }, [observacionesLocal]);
  React.useEffect(() => { localStorage.setItem('pedidos_ext', JSON.stringify(extrasLocal)); }, [extrasLocal]);

  const handleTempInputChange = (id, campo, valor) => {
    if (campo === 'distribuidor') setTempDist(prev => ({ ...prev, [id]: valor }));
    if (campo === 'observaciones') setTempObs(prev => ({ ...prev, [id]: valor }));
    if (campo === 'piezasExtra') setTempExt(prev => ({ ...prev, [id]: valor }));
  };

  const handleRecibido = async (batch) => {
    if (isClosing) return;
    setIsClosing(true);
    try {
      await Promise.all(batch.ventasIds.map(id => actualizarEstadoPedidoCliente(id, 'En laboratorio')));
      setBatches(prev => prev.map(b => b.id === batch.id ? { ...b, estado: 'recibido' } : b));
    } finally {
      setIsClosing(false);
    }
  };

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
  const buildFilas = (ventasAProcesar) => {
    const filas = [];
    const ventasOrdenadas = [...ventasAProcesar].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    ventasOrdenadas.forEach(venta => {
      if (venta.lentesTerminados) return; // Ya se entregó o no necesita pedido
      
      let prodsArr = [];
      try { prodsArr = typeof venta.productos === 'string' ? JSON.parse(venta.productos) : (venta.productos || []); } catch(e){}
      
      const micas = prodsArr.filter(p => p.isMica);
      if (micas.length === 0) return; // solo se registran los pedidos que contengan micas

      micas.forEach((mica, pkgIndex) => {
        const materialStr = mica.nombre || '';
        const proteccionStr = mica.tratamiento?.nombre || '';
        
        let receta = examenesPorId[String(venta.examenId)];
        if (!receta) {
          if (venta.examenData) {
            receta = venta.examenData;
          } else if (venta.graduacion && venta.graduacion !== 'Ninguna') {
            try {
              receta = typeof venta.graduacion === 'string' && venta.graduacion.startsWith('{') 
                ? JSON.parse(venta.graduacion) 
                : {};
            } catch (e) { receta = {}; }
          }
        }
        receta = receta || {};
        
        const od = receta.od || { esfera: '', cilindro: '', eje: '' };
        const oi = receta.oi || { esfera: '', cilindro: '', eje: '' };
        const adicion = receta.adicion || '';
        const cant = Number(mica.cantidadVenta || mica.cantidad || 1);
        
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
            observaciones: observacionesLocal[rowId] || '',
            fechaVenta: venta.fecha
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
            observaciones: observacionesLocal[rowIdOd] || '',
            fechaVenta: venta.fecha
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
            observaciones: observacionesLocal[rowIdOi] || '',
            fechaVenta: venta.fecha
          });
        }
      });
    });
    return filas;
  };

  const ventasLibres = useMemo(() => {
    const idsEnBatches = new Set(batches.flatMap(b => b.ventasIds));
    return ventas.filter(v => !idsEnBatches.has(v.id));
  }, [ventas, batches]);

  const filasPedidos = useMemo(() => buildFilas(ventasLibres), [ventasLibres, examenesPorId, pacientesPorId, distribuidoresLocal, observacionesLocal, extrasLocal]);

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
          <h2 style={{ color: '#1e293b', margin: 0 }}>Pedidos</h2>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Listado de cristales y materiales requeridos para ventas pendientes.
          </p>
        </div>
        <button
          onClick={async () => {
            if (filasPedidos.length === 0 || isClosing) return;
            setIsClosing(true);
            try {
              const uniqueVentaIds = [...new Set(filasPedidos.map(f => f.ventaId))];
              
              // Actualizar el estado de todas las ventas incluidas a 'Enviado' antes de mover a lote
              await Promise.all(uniqueVentaIds.map(id => actualizarEstadoPedidoCliente(id, 'Enviado')));

              // Determinar fechas
              const fechas = filasPedidos.map(f => new Date(f.fechaVenta).getTime());
              const minDate = new Date(Math.min(...fechas)).toLocaleDateString();
              const maxDate = new Date().toLocaleDateString();
              
              const newBatch = {
                id: Date.now().toString(),
                fechaApertura: minDate,
                fechaCierre: maxDate,
                ventasIds: uniqueVentaIds,
                estado: 'proceso'
              };
              setBatches(prev => [newBatch, ...prev]);
              setActiveTab('Pedido en Proceso');
            } finally {
              setIsClosing(false);
            }
          }}
          disabled={filasPedidos.length === 0 || isClosing}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: filasPedidos.length === 0 || isClosing ? '#cbd5e1' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: filasPedidos.length === 0 || isClosing ? 'not-allowed' : 'pointer',
            opacity: isClosing ? 0.7 : 1
          }}
        >
          <PackageCheck size={20} />
          {isClosing ? 'Cerrando...' : 'Cerrar Pedido'}
        </button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('Pedidos')}
          style={{ padding: '0.75rem 1.5rem', fontWeight: activeTab === 'Pedidos' ? 'bold' : 'normal', color: activeTab === 'Pedidos' ? '#2563eb' : '#64748b', borderBottom: activeTab === 'Pedidos' ? '2px solid #2563eb' : 'none', backgroundColor: 'transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >Pedidos</button>
        <button 
          onClick={() => setActiveTab('Pedido en Proceso')}
          style={{ padding: '0.75rem 1.5rem', fontWeight: activeTab === 'Pedido en Proceso' ? 'bold' : 'normal', color: activeTab === 'Pedido en Proceso' ? '#2563eb' : '#64748b', borderBottom: activeTab === 'Pedido en Proceso' ? '2px solid #2563eb' : 'none', backgroundColor: 'transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >Pedido en Proceso</button>
        <button 
          onClick={() => setActiveTab('Pedido Recibido')}
          style={{ padding: '0.75rem 1.5rem', fontWeight: activeTab === 'Pedido Recibido' ? 'bold' : 'normal', color: activeTab === 'Pedido Recibido' ? '#2563eb' : '#64748b', borderBottom: activeTab === 'Pedido Recibido' ? '2px solid #2563eb' : 'none', backgroundColor: 'transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >Pedido Recibido</button>
      </div>

      {activeTab === 'Pedidos' && (
        <>
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
              </tr>
            </thead>
            <tbody>
              {filasPedidos.map((f) => (
                <tr key={f.id} style={{ borderBottom: '1px solid #e2e8f0', color: '#1e293b' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div>{f.material || '-'}</div>
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
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}

      {activeTab === 'Pedido en Proceso' && (
        <>
          {batches.filter(b => b.estado === 'proceso').length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <p style={{ fontSize: '1.1rem', margin: 0 }}>No hay pedidos en proceso</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {batches.filter(b => b.estado === 'proceso').map(batch => {
                const filasBatch = buildFilas(ventas.filter(v => batch.ventasIds.includes(v.id)));
                if (filasBatch.length === 0) return null;
                const isEditing = editingBatchId === batch.id;

                return (
                  <div key={batch.id} style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div 
                      style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onClick={() => setCollapsedBatches(prev => ({ ...prev, [batch.id]: !prev[batch.id] }))}
                    >
                      <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>
                        Pedidos del periodo ({batch.fechaApertura} - {batch.fechaCierre})
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {!isEditing && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingBatchId(batch.id);
                                setTempDist({ ...distribuidoresLocal });
                                setTempObs({ ...observacionesLocal });
                                setTempExt({ ...extrasLocal });
                                setCollapsedBatches(prev => ({ ...prev, [batch.id]: false })); // Ensure it's expanded
                              }}
                              style={{ padding: '0.4rem 0.75rem', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRecibido(batch);
                              }}
                              disabled={isClosing}
                              style={{ padding: '0.4rem 0.75rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isClosing ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
                            >
                              {isClosing ? '...' : 'Recibido'}
                            </button>
                          </div>
                        )}
                        <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          {collapsedBatches[batch.id] ? '▼ Mostrar Detalles' : '▲ Ocultar'}
                        </span>
                      </div>
                    </div>
                    {!collapsedBatches[batch.id] && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc', color: '#475569', borderBottom: '2px solid #cbd5e1' }}>
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
                            </tr>
                          </thead>
                          <tbody>
                            {filasBatch.map(f => (
                              <tr key={f.id} style={{ borderBottom: '1px solid #e2e8f0', color: '#1e293b' }}>
                                <td style={{ padding: '0.75rem 1rem' }}><div>{f.material || '-'}</div></td>
                                <td style={{ padding: '0.75rem 1rem' }}>{f.proteccion || '-'}</td>
                                <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{f.esfera}</td>
                                <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{f.cilindro}</td>
                                <td style={{ padding: '0.75rem 1rem' }}>{f.adicion || '-'}</td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{f.pares}</td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'bold', color: '#2563eb' }}>
                                  {isEditing 
                                    ? formatFraction(Number(f.pares.replace(' par','').replace('es','').trim()) + Number(tempExt[f.id] || extrasLocal[f.id] || 0))
                                    : f.paresTotales}
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                  {isEditing ? (
                                    <input 
                                      value={tempDist[f.id] ?? (distribuidoresLocal[f.id] || '')} 
                                      onChange={(e) => handleTempInputChange(f.id, 'distribuidor', e.target.value)}
                                      style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                    />
                                  ) : (f.distribuidor || '-')}
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                  {isEditing ? (
                                    <input 
                                      value={tempObs[f.id] ?? (observacionesLocal[f.id] || '')} 
                                      onChange={(e) => handleTempInputChange(f.id, 'observaciones', e.target.value)}
                                      style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                    />
                                  ) : (f.observaciones || '-')}
                                </td>
                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                  {isEditing ? (
                                    <select
                                      value={tempExt[f.id] ?? (extrasLocal[f.id] || 0)}
                                      onChange={(e) => handleTempInputChange(f.id, 'piezasExtra', e.target.value)}
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
                                  ) : (f.piezasExtra || '-')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        {isEditing && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                            <button 
                              onClick={() => setEditingBatchId(null)}
                              style={{ padding: '0.5rem 1rem', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={() => {
                                setDistribuidoresLocal(tempDist);
                                setObservacionesLocal(tempObs);
                                setExtrasLocal(tempExt);
                                setEditingBatchId(null);
                              }}
                              style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Guardar Cambios
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'Pedido Recibido' && (
        <>
          {batches.filter(b => b.estado === 'recibido').length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <p style={{ fontSize: '1.1rem', margin: 0 }}>No hay pedidos recibidos</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {batches.filter(b => b.estado === 'recibido').map(batch => {
                const filasBatch = buildFilas(ventas.filter(v => batch.ventasIds.includes(v.id)));
                if (filasBatch.length === 0) return null;

                return (
                  <div key={batch.id} style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', opacity: 0.8 }}>
                    <div 
                      style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onClick={() => setCollapsedBatches(prev => ({ ...prev, [batch.id]: !prev[batch.id] }))}
                    >
                      <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>
                        Pedidos del periodo ({batch.fechaApertura} - {batch.fechaCierre})
                      </h3>
                      <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {collapsedBatches[batch.id] ? '▼ Mostrar Detalles' : '▲ Ocultar'}
                      </span>
                    </div>
                    {!collapsedBatches[batch.id] && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc', color: '#475569', borderBottom: '2px solid #cbd5e1' }}>
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
                            </tr>
                          </thead>
                          <tbody>
                            {filasBatch.map(f => (
                              <tr key={f.id} style={{ borderBottom: '1px solid #e2e8f0', color: '#1e293b' }}>
                                <td style={{ padding: '0.75rem 1rem' }}><div>{f.material || '-'}</div></td>
                                <td style={{ padding: '0.75rem 1rem' }}>{f.proteccion || '-'}</td>
                                <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{f.esfera}</td>
                                <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{f.cilindro}</td>
                                <td style={{ padding: '0.75rem 1rem' }}>{f.adicion || '-'}</td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{f.pares}</td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'bold', color: '#2563eb' }}>{f.paresTotales}</td>
                                <td style={{ padding: '0.5rem' }}>{f.distribuidor || '-'}</td>
                                <td style={{ padding: '0.5rem' }}>{f.observaciones || '-'}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>{f.piezasExtra || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PedidosListTab;
