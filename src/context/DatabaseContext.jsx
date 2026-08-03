import React, { createContext, useState, useContext, useEffect } from 'react';

const DatabaseContext = createContext();

export const useDatabase = () => useContext(DatabaseContext);

// Conexión directa a tu servidor local de Node.js
const API_BASE = '/api';

export const DatabaseProvider = ({ children }) => {
  const [inventario, setInventario] = useState([]);
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
        const [inventarioRes, pacientesRes, examenesRes, ventasRes, pedidosRes] = await Promise.all([
          fetch(`${API_BASE}/inventario`),
          fetch(`${API_BASE}/pacientes`),
          fetch(`${API_BASE}/examenes`),
          fetch(`${API_BASE}/ventas`),
          fetch(`${API_BASE}/pedidos`).catch(() => null),
        ]);

        const [inventarioData, pacientesData, examenesData, ventasData, pedidosData] = await Promise.all([
          inventarioRes.ok ? inventarioRes.json() : Promise.reject(new Error(`inventario: ${inventarioRes.status}`)),
          pacientesRes.ok ? pacientesRes.json() : Promise.reject(new Error(`pacientes: ${pacientesRes.status}`)),
          examenesRes.ok ? examenesRes.json() : Promise.reject(new Error(`examenes: ${examenesRes.status}`)),
          ventasRes.ok ? ventasRes.json() : Promise.reject(new Error(`ventas: ${ventasRes.status}`)),
          pedidosRes && pedidosRes.ok ? pedidosRes.json() : Promise.resolve([]),
        ]);

        if (cancelled) return;

        setInventario(inventarioData);
        setPacientes(pacientesData);
        setExamenes(examenesData);
        setPedidos(pedidosData || []);
        setVentas(ventasData);
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        console.error('❌ Error cargando datos iniciales desde PostgreSQL:', error);
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

  const agregarProducto = async (producto) => {
    const newProduct = { ...producto, id: Date.now() };
    try {
      const response = await fetch(`${API_BASE}/inventario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });
      
      // Validación estricta para evitar fallos silenciosos
      if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Fallo interno en el servidor');
      }
      
      const created = await response.json();
      setInventario(prev => [created, ...prev]);
      return created;
    } catch (error) {
      console.error('❌ Error creando producto:', error);
      alert('Error en BD al guardar producto: ' + error.message);
    }
  };

  const agregarPaciente = async (paciente) => {
    const alreadyExists = pacientes.some(p => p.telefono === paciente.telefono || p.nombre.toLowerCase() === paciente.nombre.toLowerCase());
    if (alreadyExists) {
        alert('Este paciente ya se encuentra registrado.');
        return false;
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
      return true;
    } catch (error) {
      console.error('❌ Error creando paciente:', error);
      alert('Error en BD al guardar paciente: ' + error.message);
      return false;
    }
  };

  const agregarExamen = async (examen) => {
    const newExamen = { ...examen, id: Date.now(), fecha: new Date().toISOString() };
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
        od: typeof created.od === 'string' ? JSON.parse(created.od) : (created.od || {}),
        oi: typeof created.oi === 'string' ? JSON.parse(created.oi) : (created.oi || {}),
      };
      setExamenes(prev => [examenNormalizado, ...prev]);
      
      // Intentar automatizar el pedido de lentes
      try {
        const productos = [];
        if (created.tipoArmazon) {
          const encontrado = inventario.find(p => p.tipo === 'Armazón' && `${p.marca} ${p.modelo}` === created.tipoArmazon);
          if (encontrado) productos.push({ id: encontrado.id, marca: encontrado.marca, modelo: encontrado.modelo, tipo: encontrado.tipo, precio: encontrado.precio, cantidad: 1 });
          else productos.push({ id: `ar-${created.id}`, marca: created.tipoArmazon, modelo: '', tipo: 'Armazón', precio: 0, cantidad: 1 });
        }
        const tratamientos = Array.isArray(created.tratamientoLentes) ? created.tratamientoLentes : (created.tratamientoLentes ? created.tratamientoLentes.split(', ') : []);
        tratamientos.forEach(t => {
          const invT = inventario.find(p => p.tipo === 'Tratamiento' && p.marca === t);
          if (invT) productos.push({ id: invT.id, marca: invT.marca, modelo: invT.modelo, tipo: invT.tipo, precio: invT.precio, cantidad: 1 });
          else productos.push({ id: `tr-${created.id}-${t}`, marca: t, modelo: '', tipo: 'Tratamiento', precio: 0, cantidad: 1 });
        });
        const total = productos.reduce((s, it) => s + (Number(it.precio) || 0) * (it.cantidad || 1), 0);
        const pedido = { id: Date.now(), examenId: created.id, pacienteId: created.pacienteId, productos, total, estado: 'Pendiente', fecha: new Date().toISOString() };
        
        const pResp = await fetch(`${API_BASE}/pedidos`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedido)
        });
        
        if (pResp.ok) {
            const creadoPedido = await pResp.json();
            const pedidoNormalizado = {
              ...creadoPedido,
              productos: typeof creadoPedido.productos === 'string' ? JSON.parse(creadoPedido.productos) : (creadoPedido.productos || []),
            };
            setPedidos(prev => [pedidoNormalizado, ...prev]);
        }
      } catch (pErr) {
        console.warn('⚠️ No se pudo crear pedido automático:', pErr.message);
      }

      return examenNormalizado;
    } catch (error) {
      console.error('❌ Error creando examen:', error);
      alert('Error en BD al guardar el examen: ' + error.message);
    }
  };

  const registrarVenta = async (venta) => {
    // Emparejamos "consultaTxt" para que Node.js la reciba correctamente
    const newSale = { ...venta, id: Date.now(), consultaTxt: venta.consulta };
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
      console.error('❌ Error registrando venta:', error);
      alert('Error en BD al guardar la venta: ' + error.message);
    }
  };

  
  const descontarStock = (productosVendidos) => {
    setInventario(prev => prev.map(prod => {
      const vendido = productosVendidos.find(p => p.id === prod.id);
      if (vendido) {
        return { ...prod, cantidad: Math.max(0, prod.cantidad - vendido.cantidadVenta) };
      }
      return prod;
    }));
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
      console.error('❌ Error actualizando estado de pedido:', error);
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
      console.error('❌ Error enviando correo de confirmación:', error);
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
      alert(`✅ Notificación enviada a ${paciente.correo} exitosamente. Estado actualizado a 'Listo para Recoger'.`);
    } catch (error) {
      console.error('❌ Error enviando notificación:', error);
      alert('Error enviando notificación: ' + error.message);
    }
  };

  // Funciones de actualización y borrado (Pendientes por implementar rutas PUT/DELETE en Node)
  const editarProducto = async () => { console.warn('Endpoint PUT no implementado en backend'); };
  const eliminarProducto = async () => { console.warn('Endpoint DELETE no implementado en backend'); };
  const editarPaciente = async () => { console.warn('Endpoint PUT no implementado en backend'); };
  const eliminarPaciente = async () => { console.warn('Endpoint DELETE no implementado en backend'); };
  const editarExamen = async () => { console.warn('Endpoint PUT no implementado en backend'); };
  const eliminarExamen = async () => { console.warn('Endpoint DELETE no implementado en backend'); };
  const actualizarPagoVenta = async () => { console.warn('Endpoint PATCH no implementado en backend'); };

  return (
    <DatabaseContext.Provider value={{
      inventario,
      pacientes,
      pedidos,
      examenes,
      ventas,
      loading,
      agregarProducto,
      editarProducto,
      eliminarProducto,
      agregarPaciente,
      editarPaciente,
      eliminarPaciente,
      agregarExamen,
      editarExamen,
      eliminarExamen,
      registrarVenta,
      actualizarPagoVenta,
      actualizarEstadoPedido,
      enviarCorreoConfirmacionPedido,
      notificarPedidoListo,
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};