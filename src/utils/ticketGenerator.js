import { formatCurrency } from './metrics';

/**
 * Genera un ticket de venta profesional en una ventana emergente HTML lista para imprimir.
 * Reemplaza el window.alert() anterior.
 */
export const generarTicketVenta = (venta, pacienteNombre = 'Mostrador', carrito = []) => {
  const items = carrito.length > 0 ? carrito : (Array.isArray(venta?.productos) ? venta.productos : []);
  const fechaFormateada = new Date(venta?.fecha || Date.now()).toLocaleString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  let productosHTML = '';
  items.forEach(item => {
    if (item.isPaquete) {
      const p = item.principal;
      const cant = Number(item.cantidadVenta || 1);
      const precio = Number(item.precio || 0);
      productosHTML += `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9;">
            <strong>${p.marca || ''} ${p.modelo || ''}</strong>
            ${item.material ? `<br/><span style="color: #64748b; font-size: 12px;">+ Material: ${item.material.nombre}</span>` : ''}
            ${item.tratamientos && item.tratamientos.length > 0 ? item.tratamientos.map(t => `<br/><span style="color: #64748b; font-size: 12px;">+ ${t.nombre}</span>`).join('') : ''}
            ${item.graduacion && item.graduacion !== 'Ninguna' ? `<br/><span style="color: #6d28d9; font-size: 12px;">◆ ${item.graduacion}</span>` : ''}
            ${item.receta ? `<br/><span style="color: #2563eb; font-size: 12px;">👤 Para: ${item.receta.nombre}</span>` : ''}
          </td>
          <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #f1f5f9;">${cant}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #f1f5f9;">${formatCurrency(precio)}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #f1f5f9; font-weight: bold;">${formatCurrency(precio * cant)}</td>
        </tr>`;
    } else {
      const cant = Number(item.cantidadVenta || item.cantidad || 1);
      const precio = Number(item.precio || item.precio_unitario || 0);
      productosHTML += `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9;">${item.marca || 'Producto'} ${item.modelo || ''}</td>
          <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #f1f5f9;">${cant}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #f1f5f9;">${formatCurrency(precio)}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #f1f5f9; font-weight: bold;">${formatCurrency(precio * cant)}</td>
        </tr>`;
    }
  });

  const descuento = Number(venta?.descuento || 0);
  const metodoPago = venta?.metodoPago || 'Efectivo';

  const ventana = window.open('', '_blank', 'width=700,height=850');
  if (!ventana) {
    alert('Permite las ventanas emergentes para ver el ticket.');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Ticket de Venta #${venta?.id || 'N/A'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Google Sans', 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 30px; background: #fff; }
    .ticket { max-width: 600px; margin: 0 auto; }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 3px double #334155; margin-bottom: 20px; }
    .logo { font-size: 24px; font-weight: 800; color: #1e293b; letter-spacing: 2px; }
    .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; font-size: 13px; }
    .info-grid .label { font-weight: bold; color: #64748b; font-size: 11px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f1f5f9; padding: 10px; font-size: 12px; text-transform: uppercase; color: #475569; font-weight: 700; }
    .totals { border-top: 2px solid #e2e8f0; padding-top: 12px; }
    .totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .totals .total-final { font-size: 18px; font-weight: 900; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 8px; }
    .totals .descuento { color: #dc2626; }
    .totals .pagado { color: #16a34a; }
    .totals .pendiente { color: #d97706; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #94a3b8; }
    .metodo-badge { display: inline-block; background: #eff6ff; color: #1d4ed8; padding: 3px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; }
    .btn-print { background: #2563eb; color: white; border: none; padding: 10px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; margin-bottom: 20px; }
    @media print { .no-print { display: none !important; } body { padding: 10px; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: center; margin-bottom: 16px;">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir Ticket</button>
  </div>
  <div class="ticket">
    <div class="header">
      <div class="logo">👓 DIOPTRIOS</div>
      <div class="subtitle">Salud y Calidad Visual a tu Alcance</div>
    </div>

    <div class="info-grid">
      <div><span class="label">Folio</span><br/>#${venta?.id || 'N/A'}</div>
      <div style="text-align:right"><span class="label">Fecha</span><br/>${fechaFormateada}</div>
      <div><span class="label">Cliente</span><br/><strong>${pacienteNombre}</strong></div>
      <div style="text-align:right"><span class="label">Método de pago</span><br/><span class="metodo-badge">${metodoPago}</span></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align:left">Producto</th>
          <th>Cant.</th>
          <th style="text-align:right">P. Unit.</th>
          <th style="text-align:right">Importe</th>
        </tr>
      </thead>
      <tbody>${productosHTML}</tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal:</span><span>${formatCurrency(venta?.subtotalCarrito || 0)}</span></div>
      ${descuento > 0 ? `<div class="row descuento"><span>Descuento:</span><span>- ${formatCurrency(descuento)}</span></div>` : ''}
      <div class="row total-final"><span>Total:</span><span>${formatCurrency(venta?.total || 0)}</span></div>
      <div class="row pagado"><span>Adelanto / Pagado:</span><span>${formatCurrency(venta?.adelanto || 0)}</span></div>
      ${Number(venta?.saldoPendiente || 0) > 0 ? `<div class="row pendiente"><span>Saldo Pendiente:</span><span>${formatCurrency(venta?.saldoPendiente || 0)}</span></div>` : ''}
    </div>

    <div class="footer">
      <p>¡Gracias por su preferencia!</p>
      <p style="margin-top: 4px;">Conserve este ticket para cualquier aclaración.</p>
    </div>
  </div>
</body>
</html>`;

  ventana.document.write(html);
  ventana.document.close();
};
