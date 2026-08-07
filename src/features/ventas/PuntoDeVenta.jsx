import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { buildReceiptText } from '../../utils/metrics';

const PuntoDeVenta = () => {
  const { inventario, pacientes, examenes, ventas, registrarVenta, enviarCorreoConfirmacionPedido } = useDatabase();
  const [carrito, setCarrito] = useState([]);
  const [pacienteId, setPacienteId] = useState('');

  // Pago y extras
  const [gastosExtra, setGastosExtra] = useState('');
  const [adelanto, setAdelanto] = useState('');
  const [consulta, setConsulta] = useState('');
  const [lentesTerminados, setLentesTerminados] = useState(true);
  const [motivoNoTerminado, setMotivoNoTerminado] = useState('');

  const [mensaje, setMensaje] = useState('');
  const [examenSeleccionado, setExamenSeleccionado] = useState('');

  const cargarPedidoDeExamen = (id) => {
    const ex = examenes.find(x => x.id.toString() === id.toString());
    if (!ex) return;

    const nuevoCarrito = [];

    // Armazón desde examen
    if (ex.tipoArmazon) {
      const encontrado = inventario.find(p => p.tipo === 'Armazón' && `${p.marca} ${p.modelo}` === ex.tipoArmazon);
      if (encontrado) {
        nuevoCarrito.push({ ...encontrado, cantidadVenta: 1 });
      } else {
        nuevoCarrito.push({ id: `ar-${ex.id}`, marca: ex.tipoArmazon, modelo: '', tipo: 'Armazón', precio: 0, cantidadVenta: 1 });
      }
    }

    // Tratamientos desde examen
    const tratamientos = Array.isArray(ex.tratamientoLentes) ? ex.tratamientoLentes : (ex.tratamientoLentes ? ex.tratamientoLentes.split(', ') : []);
    tratamientos.forEach(t => {
      const invT = inventario.find(p => p.tipo === 'Tratamiento' && p.marca === t);
      if (invT) {
        nuevoCarrito.push({ ...invT, cantidadVenta: 1 });
      } else {
        nuevoCarrito.push({ id: `tr-${ex.id}-${t}`, marca: t, modelo: '', tipo: 'Tratamiento', precio: 0, cantidadVenta: 1 });
      }
    });

    setCarrito(nuevoCarrito);
    setPacienteId(ex.pacienteId ? ex.pacienteId.toString() : '');
    setExamenSeleccionado(id.toString());
  };

  const quitarDelCarrito = (id) => {
    setCarrito(carrito.filter(p => p.id !== id));
  };

  const subtotalCarrito = carrito.reduce((sum, item) => sum + ((Number(item.precio) || 0) * (item.cantidadVenta || 1)), 0);
  const valGastosExtra = parseFloat(gastosExtra) || 0;
  const valAdelanto = parseFloat(adelanto) || 0;

  const total = subtotalCarrito + valGastosExtra;
  const saldoPendiente = total - valAdelanto;
  const estadoPago = saldoPendiente <= 0 ? 'Pagado' : 'Pendiente';

  const handleProcesar = async () => {
    if (carrito.length === 0 && total === 0) {
      setMensaje('Debe seleccionar un examen de la vista o indicar el trabajo a cobrar.');
      setTimeout(() => setMensaje(''), 3000);
      return;
    }

    if (!lentesTerminados && !motivoNoTerminado.trim()) {
      setMensaje('Especifique el motivo por el cual los lentes no están terminados.');
      setTimeout(() => setMensaje(''), 3500);
      return;
    }

    const pacienteObj = pacientes.find((p) => String(p.id) === String(pacienteId));
    const pacienteNombre = pacienteObj ? `${pacienteObj.nombre} ${pacienteObj.apellidos || ''}`.trim() : 'Mostrador';
    const ventaId = Date.now();

    const venta = {
      id: ventaId,
      pacienteId: pacienteId ? pacienteId.toString() : null,
      examenId: examenSeleccionado ? examenSeleccionado.replace('ex-', '').replace('ve-', '') : null,
      productos: carrito,
      detallesLentes: {
        tratamientos: carrito.filter(i => i.tipo === 'Tratamiento'),
        armazon: carrito.find(i => i.tipo === 'Armazón') || null
      },
      consulta,
      lentesTerminados,
      motivoNoTerminado: lentesTerminados ? '' : motivoNoTerminado,
      subtotalCarrito,
      total,
      adelanto: valAdelanto,
      saldoPendiente: saldoPendiente > 0 ? saldoPendiente : 0,
      estadoPago
    };

    await registrarVenta(venta);

    if (pacienteObj?.correo) {
      enviarCorreoConfirmacionPedido({
        correoDestino: pacienteObj.correo,
        nombreCliente: pacienteNombre,
        productos: carrito,
        subtotal: subtotalCarrito,
        total: total,
        adelanto: valAdelanto,
        saldoPendiente: saldoPendiente > 0 ? saldoPendiente : 0,
        pedidoId: ventaId
      });
    }

    const ticketText = buildReceiptText({ ...venta, fecha: new Date().toISOString() }, pacienteNombre);
    window.alert(ticketText);
    setMensaje(`Venta procesada con éxito. ${pacienteObj?.correo ? 'Se envió comprobante al correo.' : ''}`);
    setCarrito([]);
    setPacienteId('');
    setGastosExtra('');
    setAdelanto('');
    setConsulta('');
    setLentesTerminados(true);
    setMotivoNoTerminado('');
    setTimeout(() => setMensaje(''), 4000);
  };

  return (
    <div>
      <h2 style={{ color: '#1e293b', marginBottom: '1.5rem' }}>Punto de Venta</h2>

      {mensaje && <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', fontWeight: 'bold' }}>{mensaje}</div>}

      <div className="responsive-flex">
        {/* Lentes desde Examen o Ventas con Saldo Pendiente */}
        <div style={{ flex: 2 }}>
          <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '1.1rem' }}>Cargar Lentes de Examen o Liquidar Saldo Pendiente</h3>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}>
              <select
                value={examenSeleccionado}
                onChange={e => setExamenSeleccionado(e.target.value)}
                style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              >
                <option value="">-- Seleccionar Lentes de Examen o Venta Pendiente --</option>
                <optgroup label="📋 Lentes / Trabajos desde Exámenes">
                  {examenes.map(ex => {
                    const pac = pacientes.find(p => String(p.id) === String(ex.pacienteId));
                    const label = `${pac ? `${pac.nombre} ${pac.apellidos || ''}`.trim() : 'Paciente'} - ${new Date(ex.fecha).toLocaleDateString()} (${ex.tipoArmazon || 'Armazón a medida'})`;
                    return <option key={`ex-${ex.id}`} value={`ex-${ex.id}`}>{label}</option>;
                  })}
                </optgroup>
                <optgroup label="⏳ Ventas con Saldo Pendiente por Liquidar">
                  {ventas.filter(v => Number(v.saldoPendiente) > 0).map(v => {
                    const pac = pacientes.find(p => String(p.id) === String(v.pacienteId));
                    const label = `Venta #${v.id} - ${pac ? `${pac.nombre} ${pac.apellidos || ''}`.trim() : 'Cliente'} (Saldo restante: $${(Number(v.saldoPendiente) || 0).toFixed(2)})`;
                    return <option key={`ve-${v.id}`} value={`ve-${v.id}`}>{label}</option>;
                  })}
                </optgroup>
              </select>
              <button
                onClick={() => {
                  if (!examenSeleccionado) return;
                  if (examenSeleccionado.startsWith('ex-')) {
                    cargarPedidoDeExamen(examenSeleccionado.replace('ex-', ''));
                  } else if (examenSeleccionado.startsWith('ve-')) {
                    const ventaId = examenSeleccionado.replace('ve-', '');
                    const v = ventas.find(x => x.id.toString() === ventaId.toString());
                    if (v) {
                      const prods = typeof v.productos === 'string' ? JSON.parse(v.productos) : (v.productos || []);
                      setCarrito(prods);
                      setPacienteId(v.pacienteId ? v.pacienteId.toString() : '');
                      setGastosExtra(v.saldoPendiente.toString());
                      setAdelanto(v.saldoPendiente.toString());
                      setMensaje(`Se cargó el saldo restante por liquidar de $${Number(v.saldoPendiente).toFixed(2)} de la Venta #${v.id}`);
                    }
                  }
                }}
                style={{ padding: '0.6rem 1rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cargar
              </button>
              <button
                onClick={() => { setExamenSeleccionado(''); setCarrito([]); setGastosExtra(''); setAdelanto(''); }}
                style={{ padding: '0.6rem 1rem', backgroundColor: '#94a3b8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Resumen del Lente / Trabajo a Realizar */}
          <div>
            <h3 style={{ color: '#334155' }}>Detalles del Lente y Graduación Seleccionada</h3>
            {carrito.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', border: '2px dashed #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                <p style={{ margin: 0, fontSize: '1rem' }}>Selecciona un examen de la vista o un trabajo pendiente para cargar sus datos y armazón.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {carrito.map(item => (
                  <div key={item.id} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#2563eb', textTransform: 'uppercase', backgroundColor: '#eff6ff', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        {item.tipo || 'Lente / Armazón'}
                      </span>
                      <strong style={{ display: 'block', fontSize: '1.1rem', marginTop: '0.35rem', color: '#1e293b' }}>
                        {item.marca} {item.modelo}
                      </strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1e293b' }}>${(Number(item.precio) || 0).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Carrito y Detalles */}
        <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', height: 'fit-content' }}>
          <h3 style={{ marginTop: 0, color: '#334155', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem' }}>Ticket de Compra</h3>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Asociar a Cliente (Opcional)</label>
            <select value={pacienteId} onChange={e => setPacienteId(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
              <option value="">Venta de mostrador</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{`${p.nombre} ${p.apellidos || ''}`.trim()}</option>)}
            </select>
          </div>

          <div style={{ minHeight: '80px', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>Lentes y Tratamientos</h4>
            {carrito.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No hay lentes seleccionados</div>
            ) : (
              carrito.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px dashed #e2e8f0', paddingBottom: '0.25rem' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{item.marca} - {item.modelo}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.tipo}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '0.85rem' }}>${(Number(item.precio) || 0).toFixed(2)}</strong>
                    <button onClick={() => quitarDelCarrito(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.25rem' }}>×</button>
                  </div>
                </div>
              ))
            )}
            {carrito.length > 0 && <div style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 'bold', marginTop: '0.5rem' }}>Subtotal: ${(Number(subtotalCarrito) || 0).toFixed(2)}</div>}
          </div>

          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: '#64748b', marginTop: 0, marginBottom: '0.5rem' }}>Gastos Extra / Trabajo Especial</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', flex: 1 }}>Costo adicional ($)</label>
              <input type="number" min="0" step="0.01" value={gastosExtra} onChange={e => setGastosExtra(e.target.value)} style={{ width: '120px', padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: '#64748b', marginTop: 0, marginBottom: '0.5rem' }}>Información de Consulta y Estado de Lentes</h4>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Consulta / Observaciones</label>
            <textarea value={consulta} onChange={e => setConsulta(e.target.value)} rows="3" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', resize: 'vertical' }} placeholder="Indicaciones del lente..."></textarea>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Lentes Terminados:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input type="radio" name="lentesTerminados" checked={lentesTerminados === true} onChange={() => setLentesTerminados(true)} /> Sí
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input type="radio" name="lentesTerminados" checked={lentesTerminados === false} onChange={() => setLentesTerminados(false)} /> No
              </label>
            </div>
            {!lentesTerminados && (
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Motivo de No Terminados</label>
                <input value={motivoNoTerminado} onChange={e => setMotivoNoTerminado(e.target.value)} placeholder="Ej. pedido a laboratorio en proceso" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              </div>
            )}
          </div>

          <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              <span>Total:</span>
              <span>${(Number(total) || 0).toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', color: '#16a34a', fontWeight: 'bold' }}>Adelanto / Abono ($)</label>
              <input type="number" min="0" max={total} step="0.01" value={adelanto} onChange={e => setAdelanto(e.target.value)} style={{ width: '100px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #16a34a', fontWeight: 'bold' }} />
            </div>

            {saldoPendiente > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#ef4444', fontWeight: 'bold', marginBottom: '1rem' }}>
                <span>Saldo Pendiente:</span>
                <span>${(Number(saldoPendiente) || 0).toFixed(2)}</span>
              </div>
            )}

            <button
              onClick={handleProcesar}
              disabled={total === 0}
              style={{ width: '100%', padding: '1rem', backgroundColor: total > 0 ? '#2563eb' : '#94a3b8', color: 'white', border: 'none', borderRadius: '4px', cursor: total > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '0.5rem' }}>
              Generar Ticket / Registrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PuntoDeVenta;

