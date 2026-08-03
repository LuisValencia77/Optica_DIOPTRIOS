export const formatCurrency = (value) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
}).format(Number(value) || 0);

export const getDashboardSummary = (ventas = [], inventario = [], pacientes = [], examenes = []) => {
  const ventasList = Array.isArray(ventas) ? ventas : [];
  const inventarioList = Array.isArray(inventario) ? inventario : [];
  const pacientesList = Array.isArray(pacientes) ? pacientes : [];
  const examenesList = Array.isArray(examenes) ? examenes : [];

  const totalVentas = ventasList.length;
  const ingresosTotales = ventasList.reduce((sum, venta) => sum + Number(venta.total || 0), 0);
  const ventasPendientes = ventasList.filter((venta) => String(venta.estadoPago || '').toLowerCase() === 'pendiente');
  const saldoPendiente = ventasPendientes.reduce((sum, venta) => sum + Number(venta.saldoPendiente || 0), 0);
  const productosBajoStock = inventarioList.filter((producto) => Number(producto.cantidad || 0) <= 5);

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
  const body = items
    .map((item) => {
      const cantidad = Number(item.cantidadVenta || item.cantidad || 1);
      const precio = Number(item.precio || 0);
      return `${item.marca || 'Producto'} ${item.modelo || ''} x${cantidad} - ${formatCurrency(precio * cantidad)}`;
    })
    .join('\n');

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
