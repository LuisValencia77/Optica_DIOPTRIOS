export const generarPDFPedidos = (filasPedidos) => {
  const ventana = window.open('', '_blank', 'width=1000,height=800');
  if (!ventana) {
    alert('Por favor permite las ventanas emergentes para ver/imprimir la lista de pedidos.');
    return;
  }

  const filasHtml = filasPedidos.map(f => `
    <tr>
      <td>${f.material || '-'}</td>
      <td>${f.proteccion || '-'}</td>
      <td>${f.esfera || '-'}</td>
      <td>${f.cilindro || '-'}</td>
      <td>${f.adicion || '-'}</td>
      <td>${f.pares || '-'}</td>
      <td>${f.base || '-'}</td>
      <td>${f.piezasExtra || '-'}</td>
      <td style="font-weight: bold; color: #2563eb;">${f.paresTotales || '-'}</td>
      <td>${f.distribuidor || '-'}</td>
      <td style="font-size: 11px; text-align: left;">${f.observaciones || '-'}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Lista de Pedidos</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&display=swap');
        body { font-family: 'Google Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 30px; background-color: #fff; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
        .logo-title { font-size: 26px; font-weight: bold; color: #10b981; letter-spacing: 1px; }
        .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
        .print-date { text-align: right; font-size: 14px; color: #475569; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background-color: #f1f5f9; color: #475569; padding: 10px 8px; text-align: center; font-size: 11px; font-weight: bold; border-bottom: 2px solid #cbd5e1; }
        td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: center; font-size: 12px; color: #334155; }
        tr:nth-child(even) { background-color: #fafafa; }
        .no-print { margin-bottom: 20px; text-align: right; }
        @media print {
          body { padding: 10px; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print">
        <button onclick="window.print()" style="background-color: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;"> Imprimir / Guardar en PDF</button>
      </div>

      <div class="header">
        <div>
          <div class="logo-title">Óptica Dioptrios</div>
          <div class="subtitle">Lista de Pedidos de Cristales</div>
        </div>
        <div class="print-date">
          <strong>Fecha de Emisión:</strong><br/>
          ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>MATERIAL</th>
            <th>PROTECCIÓN</th>
            <th>ESFERA</th>
            <th>CILINDRO</th>
            <th>ADICIÓN</th>
            <th>PARES</th>
            <th>BASE</th>
            <th>PIEZAS EX.</th>
            <th>PARES TOT.</th>
            <th>DISTRIBUIDOR</th>
            <th style="width: 25%;">OBSERVACIONES</th>
          </tr>
        </thead>
        <tbody>
          ${filasHtml}
        </tbody>
      </table>

    </body>
    </html>
  `;

  ventana.document.write(html);
  ventana.document.close();
};
