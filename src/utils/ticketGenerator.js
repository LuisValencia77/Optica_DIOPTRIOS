import { formatCurrency } from './metrics';

/**
 * Genera el HTML de un ticket de venta profesional.
 * Retorna el HTML generado para ser usado en la vista o imprimirse.
 */
export const generarTicketVentaHTML = (venta, pacienteNombre = 'Mostrador', carrito = []) => {
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
            ${item.graduacion && item.graduacion !== 'Ninguna' ? `<br/><span style="color: #6d28d9; font-size: 12px;">◆ Micas - ${item.graduacion}</span>` : ''}
            ${item.receta ? `<br/><span style="color: #2563eb; font-size: 12px;"> Para: ${item.receta.nombre}</span>` : ''}
          </td>
          <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #f1f5f9;">${cant}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #f1f5f9;">${formatCurrency(precio)}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #f1f5f9; font-weight: bold;">${formatCurrency(precio * cant)}</td>
        </tr>`;
    } else {
      const cant = Number(item.cantidadVenta || item.cantidad || 1);
      const precio = Number(item.precio || item.precio_unitario || 0);
      
      let nombreStr = '';
      if (item.tipo === 'micas') {
        nombreStr = `Micas ${item.material ? '- ' + item.material.nombre : ''}`;
        if (item.tratamiento) nombreStr += ` - ${item.tratamiento.nombre}`;
      } else if (item.tipo === 'armazon_propio') {
        nombreStr = 'Armazón propio del cliente';
      } else if (item.tipo === 'examen') {
        nombreStr = 'Examen Visual';
      } else if (item.tipo === 'abono' || item.isAbono) {
        nombreStr = item.nombre || 'Saldo Pendiente';
      } else if (item.principal) {
        nombreStr = `${item.principal.marca || ''} ${item.principal.modelo || ''}`.trim() || 'Producto';
      } else {
        nombreStr = `${item.marca || ''} ${item.modelo || ''}`.trim() || 'Producto';
      }

      productosHTML += `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9;">${nombreStr}</td>
          <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #f1f5f9;">${cant}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #f1f5f9;">${formatCurrency(precio)}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #f1f5f9; font-weight: bold;">${formatCurrency(precio * cant)}</td>
        </tr>`;
    }
  });

  const descuento = Number(venta?.descuento || 0);
  const metodoPago = venta?.metodoPago || 'Efectivo';
  const requiereFactura = venta?.requiereFactura ? '<span style="color: #16a34a; font-weight: bold; font-size: 12px;">FACTURA REQUERIDA</span>' : '';

  let examenHTML = '';
  if (venta?.examenData) {
    const ex = venta.examenData;
    examenHTML = `
    <div style="margin-top: 30px; padding-top: 30px; border-top: 2px dashed #cbd5e1; page-break-before: always;">
      <div style="text-align: center; margin-bottom: 15px;">
        <h2 style="margin: 0; font-size: 20px; color: #1e293b;">Examen Visual</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Paciente: ${pacienteNombre} | Folio: #${venta?.id || 'N/A'}</p>
      </div>
      <table style="width: 100%; font-size: 13px; text-align: center; margin-bottom: 15px;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th>Ojo</th><th>Esfera</th><th>Cilindro</th><th>Eje</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Derecho (OD)</strong></td>
            <td>${ex.od?.esfera || '-'}</td><td>${ex.od?.cilindro || '-'}</td><td>${ex.od?.eje || '-'}</td>
          </tr>
          <tr>
            <td><strong>Izquierdo (OS)</strong></td>
            <td>${ex.oi?.esfera || '-'}</td><td>${ex.oi?.cilindro || '-'}</td><td>${ex.oi?.eje || '-'}</td>
          </tr>
        </tbody>
      </table>
      <div style="font-size: 11px; margin-top: 5px; text-align: center;">
        <span><strong>Adición:</strong> ${ex.adicion || '-'}</span> | 
        <span><strong>DP:</strong> ${ex.dp || '-'}</span> | 
        <span><strong>AP:</strong> ${ex.ap || '-'}</span>
      </div>
    </div>`;
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
    @media print { .no-print { display: none !important; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <div class="logo"> DIOPTRIOS</div>
      <div class="subtitle">Salud y Calidad Visual a tu Alcance</div>
    </div>

    <div class="info-grid">
      <div><span class="label">Folio</span><br/>#${venta?.id || 'N/A'}</div>
      <div style="text-align:right"><span class="label">Fecha</span><br/>${fechaFormateada}</div>
      <div><span class="label">Cliente</span><br/><strong>${pacienteNombre}</strong><br/>${requiereFactura}</div>
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

    ${examenHTML}

    <div class="footer">
      <p>¡Gracias por su preferencia!</p>
      <p style="margin-top: 4px;">Conserve este ticket para cualquier aclaración.</p>
    </div>
  </div>
</body>
</html>`;

  return html;
};

/**
 * Genera un documento HTML con el examen visual listo para imprimir.
 */
export const generarExamenVisualHTML = (examen, pacienteNombre) => {
  const ventana = window.open('', '_blank', 'width=700,height=850');
  if (!ventana) {
    alert('Permite las ventanas emergentes para imprimir el examen.');
    return;
  }

  const fechaFormateada = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Examen Visual - ${pacienteNombre}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; background: #fff; }
    .container { max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 12px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #cbd5e1; padding-bottom: 20px; }
    .logo { font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: 2px; }
    .subtitle { font-size: 13px; color: #64748b; margin-top: 5px; }
    .patient-info { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; background: #f8fafc; padding: 15px; border-radius: 8px; }
    .patient-info div span { color: #64748b; font-size: 12px; display: block; margin-bottom: 2px; text-transform: uppercase; }
    .patient-info div strong { font-size: 16px; color: #0f172a; }
    .title { font-size: 18px; color: #2563eb; text-align: center; margin-bottom: 20px; font-weight: 600; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f1f5f9; padding: 12px; font-size: 13px; color: #475569; text-transform: uppercase; border: 1px solid #e2e8f0; }
    td { padding: 12px; text-align: center; border: 1px solid #e2e8f0; font-size: 14px; }
    .row-title { font-weight: 600; background: #f8fafc; text-align: left; color: #334155; }
    .footer { text-align: center; margin-top: 50px; padding-top: 20px; font-size: 12px; color: #94a3b8; }
    .btn-print { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; margin-bottom: 20px; display: block; margin: 0 auto 20px auto; }
    @media print { .no-print { display: none !important; } .container { border: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir Examen</button>
  </div>
  <div class="container">
    <div class="header">
      <div class="logo">DIOPTRIOS</div>
      <div class="subtitle">Salud y Calidad Visual a tu Alcance</div>
    </div>
    
    <div class="patient-info">
      <div><span>Paciente</span><strong>${pacienteNombre || 'Mostrador'}</strong></div>
      <div style="text-align: right;"><span>Fecha de Examen</span><strong>${fechaFormateada}</strong></div>
    </div>

    <div class="title">Receta Óptica</div>

    <table>
      <thead>
        <tr>
          <th>Ojo</th>
          <th>Esfera (ESF)</th>
          <th>Cilindro (CIL)</th>
          <th>Eje</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="row-title">Derecho (OD)</td>
          <td>${examen.od?.esfera || '0.00'}</td>
          <td>${examen.od?.cilindro || '0.00'}</td>
          <td>${examen.od?.eje || '0'}°</td>
        </tr>
        <tr>
          <td class="row-title">Izquierdo (OS)</td>
          <td>${examen.oi?.esfera || '0.00'}</td>
          <td>${examen.oi?.cilindro || '0.00'}</td>
          <td>${examen.oi?.eje || '0'}°</td>
        </tr>
      </tbody>
    </table>

    <table>
      <thead>
        <tr>
          <th>Adición</th>
          <th>Distancia Interpupilar (DP)</th>
          <th>Altura Pupilar (AP)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${examen.adicion || 'N/A'}</td>
          <td>${examen.dp || 'N/A'}</td>
          <td>${examen.ap || 'N/A'}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <p>Este documento tiene validez informativa. Gracias por confiar en DIOPTRIOS.</p>
    </div>
  </div>
</body>
</html>`;

  ventana.document.write(html);
  ventana.document.close();
};
