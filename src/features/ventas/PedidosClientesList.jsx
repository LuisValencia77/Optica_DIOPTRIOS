import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Search, Filter, Package, Truck, CheckCircle, Factory, CheckCircle2 } from 'lucide-react';

const PedidosClientesList = () => {
  const { ventas, pacientes, examenes, actualizarEstadoPedidoCliente, notificarVentaLista } = useDatabase();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const ESTADOS = ['Ordenado', 'Enviado', 'En laboratorio', 'Listo', 'Entregado'];

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'Ordenado': return '#ef4444'; // Rojo
      case 'Enviado': return '#f97316'; // Naranja
      case 'En laboratorio': return '#eab308'; // Amarillo
      case 'Listo': return '#0ea5e9'; // Azul claro
      case 'Entregado': return '#22c55e'; // Verde
      default: return '#64748b';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'Ordenado': return <Package size={16} />;
      case 'En laboratorio': return <Factory size={16} />;
      case 'Enviado': return <Truck size={16} />;
      case 'Listo': return <CheckCircle size={16} />;
      case 'Entregado': return <CheckCircle2 size={16} />;
      default: return <Package size={16} />;
    }
  };

  const handleEstadoChange = async (ventaId, nuevoEstado) => {
    await actualizarEstadoPedidoCliente(ventaId, nuevoEstado);
    if (nuevoEstado === 'Listo') {
      await notificarVentaLista(ventaId);
    }
  };

  const pedidosFiltrados = useMemo(() => {
    return ventas.filter(venta => {
      let prodsArr = [];
      try { prodsArr = typeof venta.productos === 'string' ? JSON.parse(venta.productos) : (venta.productos || []); } catch(e){}
      
      const tieneLentes = prodsArr.some(p => p.isMica || p.categoria?.toLowerCase().includes('armaz') || p.tipo_articulo === 'armazon' || p.nombre?.toLowerCase().includes('armaz'));
      if (!tieneLentes) return false;

      const paciente = pacientes.find(p => p.id.toString() === venta.pacienteId?.toString());
      const pacienteNombre = paciente ? `${paciente.nombre} ${paciente.apellidos || ''}`.toLowerCase() : 'cliente general';
      const ventaEstado = venta.estado_pedido || 'Ordenado';
      
      const matchesSearch = pacienteNombre.includes(searchTerm.toLowerCase()) || venta.id.toString().includes(searchTerm);
      const matchesFilter = statusFilter === 'Todos' || ventaEstado === statusFilter;
      
      return matchesSearch && matchesFilter;
    }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [ventas, pacientes, searchTerm, statusFilter]);

  return (
    <div style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1e293b', fontSize: '1.875rem' }}>Seguimiento</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>Seguimiento logístico de ventas</p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '6px', flex: '1', minWidth: '250px' }}>
          <Search size={20} color="#64748b" />
          <input 
            type="text" 
            placeholder="Buscar por cliente o folio..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', width: '100%', color: '#334155' }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={20} color="#64748b" />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', cursor: 'pointer', color: '#334155' }}
          >
            <option value="Todos">Todos los Estados</option>
            {ESTADOS.map(est => <option key={est} value={est}>{est}</option>)}
          </select>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {pedidosFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', backgroundColor: 'white', borderRadius: '8px' }}>
            No se encontraron pedidos que coincidan con la búsqueda.
          </div>
        ) : (
          pedidosFiltrados.map(venta => {
            const paciente = pacientes.find(p => p.id.toString() === venta.pacienteId?.toString());
            const nombreCliente = paciente ? `${paciente.nombre} ${paciente.apellidos || ''}` : 'Cliente General';
            const estadoActual = venta.estado_pedido || 'Ordenado';
            
            let prodsPlanos = [];
            try { prodsPlanos = typeof venta.productos === 'string' ? JSON.parse(venta.productos) : venta.productos || []; } catch(e){}
            
            const armazonesYMicas = prodsPlanos.filter(p => p.isMica || p.categoria?.toLowerCase().includes('armaz') || p.tipo_articulo === 'armazon' || p.nombre?.toLowerCase().includes('armaz'));

            const examId = venta.examenId || venta.examenid;
            let graduacion = examId ? examenes.find(e => e.id.toString() === examId.toString()) : null;
            if (!graduacion) {
               try { graduacion = typeof venta.graduacion === 'string' ? JSON.parse(venta.graduacion) : venta.graduacion; } catch(e){}
            }
            if (graduacion) {
               if (typeof graduacion.od === 'string') try { graduacion.od = JSON.parse(graduacion.od); } catch(e){}
               if (typeof graduacion.oi === 'string') try { graduacion.oi = JSON.parse(graduacion.oi); } catch(e){}
            }

            return (
              <div key={venta.id} style={{ 
                backgroundColor: 'white', 
                borderRadius: '8px', 
                padding: '1rem', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                borderLeft: `4px solid ${getEstadoColor(estadoActual)}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>{nombreCliente}</h3>
                      <span style={{ 
                        backgroundColor: `${getEstadoColor(estadoActual)}15`, 
                        color: getEstadoColor(estadoActual),
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        {getEstadoIcon(estadoActual)} {estadoActual}
                      </span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      Folio: #{venta.id} • Fecha: {new Date(venta.fecha).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <select 
                      value={estadoActual}
                      onChange={(e) => handleEstadoChange(venta.id, e.target.value)}
                      style={{ 
                        padding: '0.35rem 0.75rem', 
                        borderRadius: '6px', 
                        border: `1px solid ${getEstadoColor(estadoActual)}`, 
                        backgroundColor: 'white',
                        color: getEstadoColor(estadoActual),
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        outline: 'none',
                        fontSize: '0.85rem'
                      }}
                    >
                      {ESTADOS.map(est => <option key={est} value={est}>{est}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Productos ({armazonesYMicas.length})</div>
                    <ul style={{ margin: '0', paddingLeft: '1.2rem', color: '#334155', fontSize: '0.85rem' }}>
                      {armazonesYMicas.map((p, idx) => (
                        <li key={idx} style={{ marginBottom: p.isMica ? '0.5rem' : '0.25rem' }}>
                          <strong>{p.isMica ? 'Micas:' : 'Armazón:'}</strong> {!p.isMica && `${p.nombre || p.marca || 'Producto'} ${p.modelo || ''}`}
                          {p.isMica && (
                            <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.15rem' }}>
                              {p.nombre && <div>Material: {p.nombre}</div>}
                              {p.tratamiento?.nombre && <div>Protección: {p.tratamiento.nombre}</div>}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {graduacion && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>ESPECIFICACIONES DE LENTES</div>
                      
                      <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '0.5rem', marginBottom: '0.25rem' }}>
                        <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.15rem', fontSize: '0.85rem' }}>Ojo Derecho (OD)</div>
                        <div style={{ color: '#475569', fontSize: '0.8rem' }}>
                          Esfera: {graduacion.od?.esfera || '0'} | Cilindro: {graduacion.od?.cilindro || '0'} | Eje: {graduacion.od?.eje || '0'}°
                        </div>
                      </div>

                      <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '0.5rem', marginBottom: '0.25rem' }}>
                        <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.15rem', fontSize: '0.85rem' }}>Ojo Izquierdo (OI)</div>
                        <div style={{ color: '#475569', fontSize: '0.8rem' }}>
                          Esfera: {graduacion.oi?.esfera || '0'} | Cilindro: {graduacion.oi?.cilindro || '0'} | Eje: {graduacion.oi?.eje || '0'}°
                        </div>
                      </div>

                      <div style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.25rem', marginLeft: '0.25rem' }}>
                        Adición: {graduacion.adicion || '-'} | DP: {graduacion.dp || '-'} | AP: {graduacion.ap || '-'}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PedidosClientesList;
