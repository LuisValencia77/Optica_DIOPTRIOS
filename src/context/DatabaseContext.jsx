import React, { createContext, useState, useContext, useEffect } from 'react';

const DatabaseContext = createContext();

export const useDatabase = () => useContext(DatabaseContext);

// Conexión directa a tu servidor local de Node.js
const API_BASE = '/api';

export const DatabaseProvider = ({ children }) => {
  const [productos, setProductos] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [examenes, setExamenes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carga inicial de datos desde PostgreSQL
  useEffect(() => {
    let cancelled = false;

    const fetchInitialData = async (attempt = 0) => {
      try {
        const [productosRes, matRes, tratRes, pacientesRes, examenesRes, ventasRes, pedidosRes] = await Promise.all([
          fetch(`${API_BASE}/productos`),
          fetch(`${API_BASE}/materiales_cristal`),
          fetch(`${API_BASE}/tratamientos_cristal`),
          fetch(`${API_BASE}/pacientes`),
          fetch(`${API_BASE}/examenes`),
          fetch(`${API_BASE}/ventas`),
          fetch(`${API_BASE}/pedidos`).catch(() => null),
        ]);

        const [productosData, matData, tratData, pacientesData, examenesData, ventasData, pedidosData] = await Promise.all([
          productosRes.ok ? productosRes.json() : Promise.reject(new Error(`productos: ${productosRes.status}`)),
          matRes.ok ? matRes.json() : Promise.reject(new Error(`materiales: ${matRes.status}`)),
          tratRes.ok ? tratRes.json() : Promise.reject(new Error(`tratamientos: ${tratRes.status}`)),
          pacientesRes.ok ? pacientesRes.json() : Promise.reject(new Error(`pacientes: ${pacientesRes.status}`)),
          examenesRes.ok ? examenesRes.json() : Promise.reject(new Error(`examenes: ${examenesRes.status}`)),
          ventasRes.ok ? ventasRes.json() : Promise.reject(new Error(`ventas: ${ventasRes.status}`)),
          pedidosRes && pedidosRes.ok ? pedidosRes.json() : Promise.resolve([]),
        ]);

        if (cancelled) return;

        setProductos(productosData);
        setMateriales(matData);
        setTratamientos(tratData);
        setPacientes(pacientesData);
        setExamenes(examenesData.map(e => ({
          ...e,
          pacienteId: e.pacienteId || e.pacienteid,
          tipoArmazon: e.tipoArmazon || e.tipoarmazon,
          tratamientoLentes: e.tratamientoLentes || e.tratamientolentes,
          od: typeof e.od === 'string' ? JSON.parse(e.od) : (e.od || {}),
          oi: typeof e.oi === 'string' ? JSON.parse(e.oi) : (e.oi || {})
        })));
        setPedidos((pedidosData || []).map(p => ({
          ...p,
          examenId: p.examenId || p.examenid,
          pacienteId: p.pacienteId || p.pacienteid,
          productos: typeof p.productos === 'string' ? JSON.parse(p.productos) : (p.productos || [])
        })));
        setVentas(ventasData.map(v => ({
          ...v,
          pacienteId: v.pacienteId || v.pacienteid,
          subtotalCarrito: v.subtotalCarrito || v.subtotalcarrito,
          saldoPendiente: v.saldoPendiente || v.saldopendiente,
          estadoPago: v.estadoPago || v.estadopago,
          lentesTerminados: v.lentesTerminados !== undefined ? v.lentesTerminados : v.lentesterminados,
          motivoNoTerminado: v.motivoNoTerminado || v.motivonoterminado,
          examenId: v.examenId || v.examenid,
          detallesLentes: typeof (v.detallesLentes || v.detalleslentes) === 'string' ? JSON.parse(v.detallesLentes || v.detalleslentes) : (v.detallesLentes || v.detalleslentes || {}),
          productos: typeof v.productos === 'string' ? JSON.parse(v.productos) : (v.productos || [])
        })));
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        console.error(' Error cargando datos iniciales desde PostgreSQL:', error);
        if (attempt < 5) {
          window.setTimeout(() => fetchInitialData(attempt + 1), 1000 * (attempt + 1));
        } else {
          setLoading(false);
        }
      }
    };

    fetchInitialData();
    const handleFocus = () => fetchInitialData();
    window.addEventListener('focus', handleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // --- SECCIÓN DE INYECCIÓN DE DATOS --- //

  const subirImagen = async (archivo) => {
    if (!archivo) return null;

    const formData = new FormData();
    formData.append('imagen', archivo);

    try {
      const respuesta = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!respuesta.ok) {
        throw new Error('Error en el servidor al subir imagen');
      }

      const datos = await respuesta.json();
      return datos.url; // Retorna la URL pública de la imagen
    } catch (error) {
      console.error('Error subiendo imagen al servidor:', error);
      alert('No se pudo subir la imagen.');
      return null;
    }
  };

  const obtenerMatrizMicas = async (idMaterial, idTratamiento = '') => {
    try {
      let url = `${API_BASE}/matriz-micas?id_material=${idMaterial}`;
      if (idTratamiento) url += `&id_tratamiento=${idTratamiento}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error al obtener la matriz de micas');
      return await response.json();
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const actualizarCeldaMatrizMicas = async (datosCelda) => {
    try {
      const response = await fetch(`${API_BASE}/matriz-micas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosCelda),
      });
      if (!response.ok) throw new Error('Error al actualizar inventario');
      
      // Optcionalmente refrescar lista de productos principal
      obtenerProductos();
      
      return await response.json();
    } catch (error) {
      console.error(error);
      alert('Error guardando en BD: ' + error.message);
      throw error;
    }
  };

  const agregarProducto = async (producto) => {
    try {
      const response = await fetch(`${API_BASE}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(producto),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fallo interno en el servidor');
      }

      const created = await response.json();
      setProductos(prev => [created, ...prev]);
      return created;
    } catch (error) {
      console.error(' Error creando producto:', error);
      alert('Error en BD al guardar producto: ' + error.message);
    }
  };

  const agregarMaterial = async (material) => {
    const response = await fetch(`${API_BASE}/materiales_cristal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(material) });
    if (response.ok) { const created = await response.json(); setMateriales(prev => [...prev, created]); return created; }
  };
  const agregarTratamiento = async (tratamiento) => {
    const response = await fetch(`${API_BASE}/tratamientos_cristal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tratamiento) });
    if (response.ok) { const created = await response.json(); setTratamientos(prev => [...prev, created]); return created; }
  };

  const agregarPaciente = async (paciente) => {
    let duplicatedAlert = null;
    let errorType = null;

    const alreadyExists = pacientes.some(p => {
      const isSameName = p.nombre?.trim().toLowerCase() === paciente.nombre?.trim().toLowerCase() && 
                        (p.apellidos || '').trim().toLowerCase() === (paciente.apellidos || '').trim().toLowerCase();
      const isSameEmail = p.correo && paciente.correo && p.correo.trim().toLowerCase() === paciente.correo.trim().toLowerCase();
      const isSamePhone = p.telefono && paciente.telefono && p.telefono.trim() === paciente.telefono.trim();
      
      if (isSameName) { 
        duplicatedAlert = 'Este paciente ya se encuentra registrado con el mismo nombre y apellidos.'; 
        errorType = 'nombre';
        return true; 
      }
      if (isSameEmail) { 
        duplicatedAlert = 'Este correo pertenece a otro cliente.'; 
        errorType = 'correo';
        return true; 
      }
      if (isSamePhone) { 
        duplicatedAlert = 'Este número pertenece a otro cliente.'; 
        errorType = 'telefono';
        return true; 
      }

      return false;
    });

    if (alreadyExists) {
      throw new Error(JSON.stringify({ type: 'validation', field: errorType, message: duplicatedAlert }));
    }

    const newPaciente = { ...paciente, id: Date.now() };
    try {
      const response = await fetch(`${API_BASE}/pacientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPaciente),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fallo interno en el servidor');
      }

      const created = await response.json();
      setPacientes(prev => [created, ...prev]);
      return created;
    } catch (error) {
      console.error(' Error creando paciente:', error);
      alert('Error en BD al guardar paciente: ' + error.message);
      return false;
    }
  };

  const agregarExamen = async (examen) => {
    const newExamen = { ...examen, id: Date.now(), fecha: new Date().toLocaleString('sv-SE') };
    try {
      const response = await fetch(`${API_BASE}/examenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExamen),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fallo interno en el servidor');
      }

      const created = await response.json();
      const examenNormalizado = {
        ...created,
        pacienteId: created.pacienteId || created.pacienteid,
        tipoArmazon: created.tipoArmazon || created.tipoarmazon,
        tratamientoLentes: created.tratamientoLentes || created.tratamientolentes,
        od: typeof created.od === 'string' ? JSON.parse(created.od) : (created.od || {}),
        oi: typeof created.oi === 'string' ? JSON.parse(created.oi) : (created.oi || {}),
      };
      setExamenes(prev => [examenNormalizado, ...prev]);

      // Intentar automatizar el pedido de lentes
      try {
        const productos = [];
        if (created.tipoArmazon) {
          const encontrado = productos.find(p => p.tipo_articulo === 'armazon' && `${p.marca} ${p.modelo}` === created.tipoArmazon);
          if (encontrado) productos.push({ id: encontrado.id_producto, marca: encontrado.marca, modelo: encontrado.modelo, tipo: encontrado.tipo_articulo, precio: encontrado.precio_unitario, cantidad: 1 });
          else productos.push({ id: `ar-${created.id}`, marca: created.tipoArmazon, modelo: '', tipo: 'armazon', precio: 0, cantidad: 1 });
        }
        const tratamientosAct = Array.isArray(created.tratamientoLentes) ? created.tratamientoLentes : (created.tratamientoLentes ? created.tratamientoLentes.split(', ') : []);
        tratamientosAct.forEach(t => {
          const invT = tratamientos.find(p => p.nombre === t);
          if (invT) productos.push({ id: invT.id_tratamiento, marca: invT.nombre, modelo: '', tipo: 'tratamiento', precio: invT.costo_adicional, cantidad: 1 });
          else productos.push({ id: `tr-${created.id}-${t}`, marca: t, modelo: '', tipo: 'tratamiento', precio: 0, cantidad: 1 });
        });
        const total = productos.reduce((s, it) => s + (Number(it.precio) || 0) * (it.cantidad || 1), 0);
        const pedido = { id: Date.now(), examenId: examenNormalizado.id, pacienteId: examenNormalizado.pacienteId, productos, total, estado: 'Pendiente', fecha: new Date().toLocaleString('sv-SE') };

        const pResp = await fetch(`${API_BASE}/pedidos`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedido)
        });

        if (pResp.ok) {
          const creadoPedido = await pResp.json();
          const pedidoNormalizado = {
            ...creadoPedido,
            pacienteId: creadoPedido.pacienteId || creadoPedido.pacienteid,
            examenId: creadoPedido.examenId || creadoPedido.examenid,
            productos: typeof creadoPedido.productos === 'string' ? JSON.parse(creadoPedido.productos) : (creadoPedido.productos || []),
          };
          setPedidos(prev => [pedidoNormalizado, ...prev]);
        }
      } catch (pErr) {
        console.warn('️ No se pudo crear pedido automático:', pErr.message);
      }

      return examenNormalizado;
    } catch (error) {
      console.error(' Error creando examen:', error);
      alert('Error en BD al guardar el examen: ' + error.message);
    }
  };

  const registrarVenta = async (venta) => {
    // Emparejamos "consultaTxt" para que Node.js la reciba correctamente
    const newSale = { ...venta, id: Date.now(), consultaTxt: venta.consulta, fecha: new Date().toLocaleString('sv-SE') };
    try {
      const response = await fetch(`${API_BASE}/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSale),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fallo interno en el servidor');
      }

      const created = await response.json();
      const ventaNormalizada = {
        ...created,
        productos: typeof created.productos === 'string' ? JSON.parse(created.productos) : (created.productos || []),
        detallesLentes: typeof created.detalleslentes === 'string' ? JSON.parse(created.detalleslentes) : (created.detallesLentes || created.detalleslentes || {}),
      };
      setVentas(prev => [ventaNormalizada, ...prev]);
      descontarStock(ventaNormalizada.productos || []);
      return ventaNormalizada;
    } catch (error) {
      console.error(' Error registrando venta:', error);
      alert('Error en BD al guardar la venta: ' + error.message);
    }
  };


  const descontarStock = (productosVendidos) => {
    setProductos(prev => prev.map(prod => {
      const vendido = productosVendidos.find(p => (p.id_producto || p.id) === prod.id_producto);
      if (vendido) {
        return { ...prod, cantidad_inventario: Math.max(0, prod.cantidad_inventario - vendido.cantidadVenta) };
      }
      return prod;
    }));
  };

  const marcarLentesTerminados = async (ventaId) => {
    try {
      const response = await fetch(`${API_BASE}/ventas/${ventaId}/lentes-terminados`, {
        method: 'PUT',
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al actualizar lentes terminados');
      }
      setVentas(prev => prev.map(v => v.id.toString() === ventaId.toString() ? { ...v, lentesTerminados: true, motivoNoTerminado: '' } : v));
    } catch (error) {
      console.error(' Error marcando lentes como terminados:', error);
      alert('Error: ' + error.message);
    }
  };

  const actualizarEstadoPedidoCliente = async (ventaId, nuevoEstado) => {
    try {
      const response = await fetch(`${API_BASE}/ventas/${ventaId}/estado-pedido`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_pedido: nuevoEstado }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al actualizar estado del pedido');
      }
      const updated = await response.json();
      setVentas(prev => prev.map(v => v.id.toString() === ventaId.toString() ? { ...v, estado_pedido: nuevoEstado } : v));
      return updated;
    } catch (error) {
      console.error(' Error actualizando estado de pedido de cliente:', error);
      alert('Error: ' + error.message);
      return null;
    }
  };

  const actualizarEstadoPedido = async (pedidoId, nuevoEstado) => {
    try {
      const response = await fetch(`${API_BASE}/pedidos/${pedidoId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al actualizar estado');
      }
      const updated = await response.json();
      setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, estado: nuevoEstado } : p));
      return updated;
    } catch (error) {
      console.error(' Error actualizando estado de pedido:', error);
      alert('Error: ' + error.message);
      return null;
    }
  };

  const enviarCorreoConfirmacionPedido = async (datosCorreo) => {
    try {
      const response = await fetch(`${API_BASE}/pedidos/enviar-correo-confirmacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosCorreo),
      });
      return await response.json();
    } catch (error) {
      console.error(' Error enviando correo de confirmación:', error);
    }
  };

  const notificarPedidoListo = async (pedidoId) => {
    const pedido = pedidos.find(p => p.id.toString() === pedidoId.toString());
    if (!pedido) return alert('Pedido no encontrado');

    const paciente = pacientes.find(p => p.id.toString() === (pedido.pacienteId || '').toString());
    if (!paciente || !paciente.correo) {
      return alert('El paciente asociado a este pedido no tiene registrado un correo electrónico.');
    }

    const productosArr = typeof pedido.productos === 'string' ? JSON.parse(pedido.productos) : (pedido.productos || []);

    try {
      const response = await fetch(`${API_BASE}/pedidos/notificar-listo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correoDestino: paciente.correo,
          nombreCliente: paciente.nombre,
          pedidoId: pedido.id,
          productos: productosArr
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Fallo enviando correo');
      }

      await actualizarEstadoPedido(pedido.id, 'Listo para Recoger');
      alert(` Notificación enviada a ${paciente.correo} exitosamente. Estado actualizado a 'Listo para Recoger'.`);
    } catch (error) {
      console.error(' Error enviando notificación:', error);
      alert('Error enviando notificación: ' + error.message);
    }
  };

  const notificarVentaLista = async (ventaId) => {
    const venta = ventas.find(v => v.id.toString() === ventaId.toString());
    if (!venta) return alert('Venta no encontrada');

    const paciente = pacientes.find(p => p.id.toString() === (venta.pacienteId || '').toString());
    if (!paciente || !paciente.correo) {
      console.warn('El paciente no tiene registrado un correo electrónico para notificarle.');
      return;
    }

    const productosArr = typeof venta.productos === 'string' ? JSON.parse(venta.productos) : (venta.productos || []);

    try {
      const response = await fetch(`${API_BASE}/ventas/notificar-listo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correoDestino: paciente.correo,
          nombreCliente: paciente.nombre,
          ventaId: venta.id,
          productos: productosArr
        }),
      });

      if (!response.ok) {
        throw new Error('Fallo enviando correo de venta lista');
      }
    } catch (error) {
      console.error(' Error enviando notificación de venta lista:', error);
    }
  };

  // Funciones de actualización y borrado
  const editarProducto = async (id, actualizacion) => {
    try {
      const response = await fetch(`${API_BASE}/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actualizacion),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al actualizar producto');
      }
      const updated = await response.json();
      setProductos(prev => prev.map(p => p.id_producto === id ? updated : p));
      return updated;
    } catch (error) {
      console.error(' Error editando producto:', error);
      alert('Error: ' + error.message);
      return null;
    }
  };
  const eliminarProducto = async () => { console.warn('Endpoint DELETE no implementado en backend'); };
  const editarPaciente = async () => { console.warn('Endpoint PUT no implementado en backend'); };
  const eliminarPaciente = async () => { console.warn('Endpoint DELETE no implementado en backend'); };
  const editarExamen = async (id, actualizacion) => {
    try {
      const response = await fetch(`${API_BASE}/examenes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actualizacion),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al actualizar examen');
      }
      const updated = await response.json();
      const examenNormalizado = {
        ...updated,
        pacienteId: updated.pacienteId || updated.pacienteid,
        tipoArmazon: updated.tipoArmazon || updated.tipoarmazon,
        tratamientoLentes: updated.tratamientoLentes || updated.tratamientolentes,
        od: typeof updated.od === 'string' ? JSON.parse(updated.od) : (updated.od || {}),
        oi: typeof updated.oi === 'string' ? JSON.parse(updated.oi) : (updated.oi || {}),
      };
      setExamenes(prev => prev.map(e => e.id === id ? examenNormalizado : e));
      return examenNormalizado;
    } catch (error) {
      console.error(' Error editando examen:', error);
      alert('Error: ' + error.message);
      return null;
    }
  };

  const eliminarExamen = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/examenes/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al eliminar examen');
      }
      setExamenes(prev => prev.filter(e => e.id !== id));
      return true;
    } catch (error) {
      console.error(' Error eliminando examen:', error);
      return false;
    }
  };

  const actualizarPagoVenta = async (ventaId, montoAbono) => {
    try {
      const res = await fetch(`${API_BASE}/ventas/${ventaId}/abono`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abono: montoAbono })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando abono');
      
      setVentas(prev => prev.map(v => String(v.id) === String(ventaId) ? {
        ...v,
        adelanto: Number(data.adelanto),
        saldoPendiente: Number(data.saldopendiente !== undefined ? data.saldopendiente : data.saldoPendiente),
        estadoPago: data.estadopago || data.estadoPago
      } : v));
      return data;
    } catch (error) {
      console.error(' Error actualizando abono de venta:', error);
      alert('Error al registrar abono: ' + error.message);
      return null;
    }
  };

  const enviarExamenPorCorreo = async (correoDestino, pacienteNombre, examen) => {
    try {
      const respuesta = await fetch(`${API_BASE}/examenes/enviar-correo-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correoDestino, pacienteNombre, examen })
      });
      if (!respuesta.ok) throw new Error('Error al enviar el examen por correo');
      return await respuesta.json();
    } catch (error) {
      console.error(' Error enviando examen:', error);
      throw error;
    }
  };

  const crearOrdenMercadoPago = async (datosOrden) => {

    try {
      const res = await fetch(`${API_BASE}/mercadopago/crear-orden`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosOrden)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Error al crear orden en Mercado Pago');
      return data;
    } catch (error) {
      console.error(' Error en crearOrdenMercadoPago:', error);
      throw error;
    }
  };

  const simularEventoMercadoPago = async (datosEvento) => {
    try {
      const res = await fetch(`${API_BASE}/mercadopago/simular-evento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosEvento)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Error al simular evento en Mercado Pago');
      return data;
    } catch (error) {
      console.error(' Error en simularEventoMercadoPago:', error);
      throw error;
    }
  };

  const obtenerOrdenMercadoPago = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/mercadopago/obtener-orden/${encodeURIComponent(orderId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Error al obtener orden de Mercado Pago');
      return data;
    } catch (error) {
      console.error(' Error en obtenerOrdenMercadoPago:', error);
      throw error;
    }
  };

  const cambiarEstadoVenta = async (ventaId, nuevoEstado) => {
    try {
      const res = await fetch(`${API_BASE}/ventas/${ventaId}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estadoPago: nuevoEstado })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cambiando estado de venta');

      setVentas(prev => prev.map(v => String(v.id) === String(ventaId) ? {
        ...v,
        estadoPago: data.estadopago || data.estadoPago
      } : v));
      return data;
    } catch (error) {
      console.error(' Error cambiando estado de venta:', error);
      alert('Error: ' + error.message);
      return null;
    }
  };

  return (
    <DatabaseContext.Provider value={{
      productos,
      materiales,
      tratamientos,
      pacientes,
      pedidos,
      examenes,
      ventas,
      loading,
      subirImagen,
      obtenerMatrizMicas,
      actualizarCeldaMatrizMicas,
      agregarProducto,
      editarProducto,
      eliminarProducto,
      agregarMaterial,
      agregarTratamiento,
      agregarPaciente,
      editarPaciente,
      eliminarPaciente,
      agregarExamen,
      editarExamen,
      eliminarExamen,
      registrarVenta,
      actualizarPagoVenta,
      marcarLentesTerminados,
      cambiarEstadoVenta,
      actualizarEstadoPedido,
      enviarCorreoConfirmacionPedido,
      notificarPedidoListo,
      notificarVentaLista,
      actualizarEstadoPedidoCliente,
      crearOrdenMercadoPago,
      simularEventoMercadoPago,
      obtenerOrdenMercadoPago,
      enviarExamenPorCorreo,
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};
