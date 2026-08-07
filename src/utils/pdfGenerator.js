// Generador de documentos PDF / Impresión formateada para Recetas Médicas y Tickets de Dioptrios

export const generarPDFReceta = (examen, paciente) => {
  const od = typeof examen.od === 'string' ? JSON.parse(examen.od) : (examen.od || {});
  const oi = typeof examen.oi === 'string' ? JSON.parse(examen.oi) : (examen.oi || {});
  const tratamientos = Array.isArray(examen.tratamientoLentes)
    ? examen.tratamientoLentes.join(', ')
    : (examen.tratamientoLentes || 'Ninguno');

  const fechaFormateada = new Date(examen.fecha || Date.now()).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const ventana = window.open('', '_blank', 'width=800,height=900');
  if (!ventana) {
    alert('Por favor permite las ventanas emergentes para ver/imprimir la receta médica.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Receta Oftálmica - ${paciente ? `${paciente.nombre} ${paciente.apellidos || ''}`.trim() : 'Paciente'}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; background-color: #fff; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .logo-title { font-size: 28px; font-weight: bold; color: #2563eb; letter-spacing: 1px; }
        .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
        .prescription-date { text-align: right; font-size: 14px; color: #475569; }
        .patient-info { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 15px; }
        .patient-info div { font-size: 14px; }
        .patient-info label { font-weight: bold; color: #64748b; display: block; font-size: 12px; margin-bottom: 2px; }
        .section-title { font-size: 16px; font-weight: bold; color: #1e293b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background-color: #2563eb; color: white; padding: 12px 10px; text-align: center; font-size: 13px; font-weight: 600; }
        td { border: 1px solid #cbd5e1; padding: 12px 10px; text-align: center; font-size: 14px; }
        .eye-label { font-weight: bold; background-color: #f1f5f9; text-align: left; padding-left: 15px; color: #1e293b; }
        .recommendations { background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px 20px; border-radius: 0 8px 8px 0; margin-bottom: 40px; }
        .recommendations p { margin: 5px 0; font-size: 14px; color: #1e40af; }
        .footer { margin-top: 60px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        .signature-line { margin: 60px auto 10px auto; width: 250px; border-top: 1px solid #94a3b8; }
        .signature-title { font-size: 14px; font-weight: bold; color: #334155; }
        .signature-sub { font-size: 12px; color: #64748b; }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="background-color: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">🖨️ Imprimir / Guardar en PDF</button>
      </div>

      <div class="header">
        <div>
          <div class="logo-title">👓 DIOPTRIOS - RECETA OPTOMÉTRICA</div>
          <div class="subtitle">Salud y Calidad Visual a tu Alcance</div>
        </div>
        <div class="prescription-date">
          <strong>Folio Examen:</strong> #${examen.id}<br/>
          <strong>Fecha:</strong> ${fechaFormateada}
        </div>
      </div>

      <div class="patient-info">
        <div>
          <label>PACIENTE</label>
          <strong>${paciente ? `${paciente.nombre} ${paciente.apellidos || ''}`.trim() : 'Paciente General'}</strong>
        </div>
        <div>
          <label>TELÉFONO</label>
          ${paciente?.telefono || 'N/A'}
        </div>
        <div>
          <label>FECHA NACIMIENTO</label>
          ${paciente?.fechaNacimiento ? new Date(paciente.fechaNacimiento).toLocaleDateString() : 'N/A'}
        </div>
      </div>

      <div class="section-title">Graduación Oftálmica</div>
      <table>
        <thead>
          <tr style="background-color: #2563eb; color: white;">
            <th style="width: 15%;">OJO</th>
            <th>ESFERA</th>
            <th>CILINDRO</th>
            <th>EJE (°)</th>
            <th>ADICIÓN</th>
            <th>A.V. (Agudeza)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="eye-label">O.D. (Ojo Derecho)</td>
            <td>${od.esfera || '0.00'}</td>
            <td>${od.cilindro || '0.00'}</td>
            <td>${od.eje || '0'}°</td>
            <td>${od.adicion || '0.00'}</td>
            <td><strong>${od.agudeza || '20/20'}</strong></td>
          </tr>
          <tr>
            <td class="eye-label">O.I. (Ojo Izquierdo)</td>
            <td>${oi.esfera || '0.00'}</td>
            <td>${oi.cilindro || '0.00'}</td>
            <td>${oi.eje || '0'}°</td>
            <td>${oi.adicion || '0.00'}</td>
            <td><strong>${oi.agudeza || '20/20'}</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">Especificaciones del Lente</div>
      <div class="recommendations">
        <p><strong>• Armazón Seleccionado / Recomendado:</strong> ${examen.tipoArmazon || 'Armazón de Armario / Selección del cliente'}</p>
        <p><strong>• Tratamientos / Filtros Aplicados:</strong> ${tratamientos}</p>
      </div>

      <div class="footer">
        <div class="signature-line"></div>
        <div class="signature-title">Firma del Optometrista</div>
        <div class="signature-sub">Cédula Profesional / Sucursal Centro</div>
      </div>
    </body>
    </html>
  `;

  ventana.document.write(html);
  ventana.document.close();
};
