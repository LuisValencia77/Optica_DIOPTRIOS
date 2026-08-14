export const formatCurrency = (value) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
}).format(Number(value) || 0);

export const getDashboardSummary = (ventas = [], productos = [], pacientes = [], examenes = []) => {
  const ventasList = Array.isArray(ventas) ? ventas : [];
  const productosList = Array.isArray(productos) ? productos : [];
  const pacientesList = Array.isArray(pacientes) ? pacientes : [];
  const examenesList = Array.isArray(examenes) ? examenes : [];

  const totalVentas = ventasList.length;
  const ingresosTotales = ventasList.reduce((sum, venta) => sum + Number(venta.total || 0), 0);
  const ventasPendientes = ventasList.filter((venta) => String(venta.estadoPago || '').toLowerCase() === 'pendiente');
  const saldoPendiente = ventasPendientes.reduce((sum, venta) => sum + Number(venta.saldoPendiente || 0), 0);
  const productosBajoStock = productosList.filter((producto) => Number(producto.cantidad_inventario || 0) <= 5);

  return {
    totalVentas,
    ingresosTotales,
    ventasPendientes: ventasPendientes.length,
    saldoPendiente,
    productosBajoStock: productosBajoStock.length,
    pacientesRegistrados: pacientesList.length,
    examenesRegistrados: examenesList.length,
    productosBajoStockList: productosBajoStock,
    ventasPendientesList: ventasPendientes,
  };
};

export const getPendingSales = (ventas = []) => {
  const ventasList = Array.isArray(ventas) ? ventas : [];
  return ventasList.filter((venta) => String(venta.estadoPago || '').toLowerCase() === 'pendiente');
};

export const buildReceiptText = (venta, pacienteNombre = 'Mostrador') => {
  const items = Array.isArray(venta?.productos) ? venta.productos : [];
  const bodyLines = [];
  items.forEach(item => {
    if (item.isPaquete) {
      const p = item.principal;
      const cant = Number(item.cantidadVenta || 1);
      const precio = Number(item.precio || 0);
      bodyLines.push(`[PAQUETE] ${p.marca || ''} ${p.modelo || ''} x${cant} - ${formatCurrency(precio * cant)}`);
      
      if (item.receta && item.receta.nombre) {
        bodyLines.push(`  Para: ${item.receta.nombre}`);
        if (JSON.stringify(item.receta.od) === JSON.stringify(item.receta.oi)) {
          bodyLines.push(`  Receta Ambos: Esf ${item.receta.od?.esfera} Cil ${item.receta.od?.cilindro} Eje ${item.receta.od?.eje}`);
        } else {
          bodyLines.push(`  OD: Esf ${item.receta.od?.esfera} Cil ${item.receta.od?.cilindro} Eje ${item.receta.od?.eje}`);
          bodyLines.push(`  OS: Esf ${item.receta.oi?.esfera} Cil ${item.receta.oi?.cilindro} Eje ${item.receta.oi?.eje}`);
        }
      }
      
      if (item.material) bodyLines.push(`  + Mat: ${item.material.nombre}`);
      if (item.tratamientos && item.tratamientos.length > 0) {
        item.tratamientos.forEach(t => bodyLines.push(`  + Trat: ${t.nombre}`));
      }
      if (item.graduacion !== 'Ninguna') bodyLines.push(`  + Grad: ${item.graduacion}`);
    } else {
      const cant = Number(item.cantidadVenta || item.cantidad || 1);
      const precio = Number(item.precio || item.precio_unitario || 0);
      bodyLines.push(`${item.marca || 'Producto'} ${item.modelo || ''} x${cant} - ${formatCurrency(precio * cant)}`);
    }
  });

  const body = bodyLines.join('\n');

  return [
    '=== TICKET DE VENTA ===',
    `Cliente: ${pacienteNombre}`,
    `Folio: #${venta?.id || 'N/A'}`,
    `Fecha: ${venta?.fecha ? new Date(venta.fecha).toLocaleString() : 'Sin fecha'}`,
    '',
    body || 'Sin artículos',
    '',
    `Subtotal: ${formatCurrency(venta?.subtotalCarrito || 0)}`,
    `Total: ${formatCurrency(venta?.total || 0)}`,
    `Adelanto: ${formatCurrency(venta?.adelanto || 0)}`,
    `Saldo pendiente: ${formatCurrency(venta?.saldoPendiente || 0)}`,
    'Gracias por su compra',
  ].join('\n');
};
