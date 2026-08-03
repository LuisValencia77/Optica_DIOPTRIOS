import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Servidor
const aplicacion = express();
const puerto = process.env.PORT || 4000;

aplicacion.use(cors({ origin: true }));
aplicacion.use(express.json());

// Base de datos
const conexionBd = new Pool({
  host: process.env.DB_HOST || '192.168.1.73',
  user: process.env.DB_USER || 'admin_dioptrios',
  password: process.env.DB_PASSWORD || 'dioptrios12',
  database: process.env.DB_NAME || 'dioptrios',
  port: process.env.DB_PORT || 5432,
});

// Estructura
const inicializarTablas = async () => {
  try {
    await conexionBd.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username VARCHAR(64) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS inventario (
        id BIGINT PRIMARY KEY,
        marca VARCHAR(255) NOT NULL,
        modelo VARCHAR(255) NOT NULL,
        tipo VARCHAR(64) NOT NULL,
        cantidad INT NOT NULL,
        precio DECIMAL(12,2) NOT NULL,
        imagen VARCHAR(512) DEFAULT NULL
      );
      CREATE TABLE IF NOT EXISTS pacientes (
        id BIGINT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        telefono VARCHAR(64) NOT NULL,
        correo VARCHAR(255) NOT NULL,
        fechaNacimiento DATE NOT NULL,
        peso VARCHAR(16),
        estatura VARCHAR(16),
        historialClinico TEXT,
        direccion VARCHAR(512)
      );
      CREATE TABLE IF NOT EXISTS examenes (
        id BIGINT PRIMARY KEY,
        pacienteId BIGINT NOT NULL,
        od TEXT,
        oi TEXT,
        tipoArmazon VARCHAR(255),
        tratamientoLentes VARCHAR(255),
        fecha TIMESTAMP NOT NULL,
        FOREIGN KEY (pacienteId) REFERENCES pacientes(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS pedidos (
        id BIGINT PRIMARY KEY,
        examenId BIGINT,
        pacienteId BIGINT,
        productos TEXT,
        total DECIMAL(12,2) NOT NULL,
        estado VARCHAR(64) NOT NULL DEFAULT 'Pendiente',
        fecha TIMESTAMP NOT NULL,
        FOREIGN KEY (examenId) REFERENCES examenes(id) ON DELETE SET NULL
      );
      CREATE TABLE IF NOT EXISTS ventas (
        id BIGINT PRIMARY KEY,
        pacienteId BIGINT,
        productos TEXT,
        detallesLentes TEXT,
        subtotalCarrito DECIMAL(12,2) NOT NULL,
        total DECIMAL(12,2) NOT NULL,
        adelanto DECIMAL(12,2) NOT NULL,
        saldoPendiente DECIMAL(12,2) NOT NULL,
        estadoPago VARCHAR(64) NOT NULL,
        lentesTerminados BOOLEAN NOT NULL DEFAULT TRUE,
        motivoNoTerminado TEXT,
        examenId BIGINT,
        consulta TEXT,
        fecha TIMESTAMP NOT NULL,
        FOREIGN KEY (pacienteId) REFERENCES pacientes(id) ON DELETE SET NULL
      );
    `);
    console.log('✅ Tablas verificadas en PostgreSQL.');
  } catch (error) {
    console.error('❌ Fallo al construir tablas:', error);
  }
};

// Rutas pacientes
aplicacion.get('/api/pacientes', async (peticion, respuesta) => {
  try {
    const { rows: filas } = await conexionBd.query('SELECT * FROM pacientes ORDER BY id DESC');
    respuesta.json(filas);
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.post('/api/pacientes', async (peticion, respuesta) => {
  try {
    const { id, nombre, telefono, correo, fechaNacimiento, peso, estatura, historialClinico, direccion } = peticion.body;
    const consulta = `
      INSERT INTO pacientes (id, nombre, telefono, correo, fechaNacimiento, peso, estatura, historialClinico, direccion)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const valores = [id, nombre, telefono, correo, fechaNacimiento, peso, estatura, historialClinico, direccion];
    const { rows: filas } = await conexionBd.query(consulta, valores);
    respuesta.status(201).json(filas[0]);
  } catch (error) {
    console.error('❌ Error guardando paciente:', error.message);
    respuesta.status(500).json({ error: error.message });
  }
});

// Rutas inventario
aplicacion.get('/api/inventario', async (peticion, respuesta) => {
  try {
    const { rows: filas } = await conexionBd.query('SELECT * FROM inventario ORDER BY id DESC');
    respuesta.json(filas);
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.post('/api/inventario', async (peticion, respuesta) => {
  try {
    const { id, marca, modelo, tipo, cantidad, precio, imagen } = peticion.body;
    const consulta = `
      INSERT INTO inventario (id, marca, modelo, tipo, cantidad, precio, imagen) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *;
    `;
    const valores = [id, marca, modelo, tipo, cantidad, precio, imagen];
    const { rows: filas } = await conexionBd.query(consulta, valores);
    respuesta.status(201).json(filas[0]);
  } catch (error) {
    console.error('❌ Error guardando inventario:', error.message);
    respuesta.status(500).json({ error: error.message });
  }
});

// Rutas ventas
aplicacion.get('/api/ventas', async (peticion, respuesta) => {
  try {
    const { rows: filas } = await conexionBd.query('SELECT * FROM ventas ORDER BY fecha DESC');
    respuesta.json(filas);
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.post('/api/ventas', async (peticion, respuesta) => {
  try {
    const { id, pacienteId, productos, detallesLentes, subtotalCarrito, total, adelanto, saldoPendiente, estadoPago, lentesTerminados, motivoNoTerminado, examenId, consultaTxt, fecha } = peticion.body;
    const consulta = `
      INSERT INTO ventas (id, pacienteId, productos, detallesLentes, subtotalCarrito, total, adelanto, saldoPendiente, estadoPago, lentesTerminados, motivoNoTerminado, examenId, consulta, fecha) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
      RETURNING *;
    `;
    const valores = [id, pacienteId, JSON.stringify(productos), JSON.stringify(detallesLentes), subtotalCarrito, total, adelanto, saldoPendiente, estadoPago, lentesTerminados, motivoNoTerminado, examenId, consultaTxt, fecha];
    const { rows: filas } = await conexionBd.query(consulta, valores);
    respuesta.status(201).json(filas[0]);
  } catch (error) {
    console.error('❌ Error guardando venta:', error.message);
    respuesta.status(500).json({ error: error.message });
  }
});

// Rutas examenes
aplicacion.get('/api/examenes', async (peticion, respuesta) => {
  try {
    const { rows: filas } = await conexionBd.query('SELECT * FROM examenes ORDER BY fecha DESC');
    respuesta.json(filas);
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.post('/api/examenes', async (peticion, respuesta) => {
  try {
    const { id, pacienteId, od, oi, tipoArmazon, tratamientoLentes, fecha } = peticion.body;
    const consulta = `
      INSERT INTO examenes (id, pacienteId, od, oi, tipoArmazon, tratamientoLentes, fecha) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *;
    `;
    const valores = [id, pacienteId, JSON.stringify(od), JSON.stringify(oi), tipoArmazon, tratamientoLentes, fecha];
    const { rows: filas } = await conexionBd.query(consulta, valores);
    respuesta.status(201).json(filas[0]);
  } catch (error) {
    console.error('❌ Error guardando examen:', error.message);
    respuesta.status(500).json({ error: error.message });
  }
});

import nodemailer from 'nodemailer';

// Configuración de transportador de correo (Gmail API / SMTP)
const crearTransporter = () => {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && !process.env.GMAIL_USER.includes('tu_correo')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER.trim(),
        pass: process.env.GMAIL_APP_PASSWORD.trim().replace(/\s+/g, ''),
      },
    });
  }
  return null;
};

const enviarEmail = async ({ destinatario, asunto, html }) => {
  const transporter = crearTransporter();
  if (!transporter) {
    console.log(`ℹ️ SIMULACIÓN DE CORREO (Configura GMAIL_USER y GMAIL_APP_PASSWORD en el archivo .env para envío real)`);
    console.log(`Para: ${destinatario}\nAsunto: ${asunto}\nContenido HTML:\n${html}`);
    return { simulación: true };
  }
  return await transporter.sendMail({
    from: `"Óptica" <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject: asunto,
    html: html,
  });
};

// Rutas pedidos
aplicacion.get('/api/pedidos', async (peticion, respuesta) => {
  try {
    const { rows: filas } = await conexionBd.query('SELECT * FROM pedidos ORDER BY fecha DESC');
    respuesta.json(filas);
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.post('/api/pedidos', async (peticion, respuesta) => {
  try {
    const { id, examenId, pacienteId, productos, total, estado, fecha } = peticion.body;
    const consulta = `
      INSERT INTO pedidos (id, examenId, pacienteId, productos, total, estado, fecha) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *;
    `;
    const valores = [id, examenId, pacienteId, JSON.stringify(productos), total, estado || 'Pendiente', fecha];
    const { rows: filas } = await conexionBd.query(consulta, valores);
    respuesta.status(201).json(filas[0]);
  } catch (error) {
    console.error('❌ Error guardando pedido:', error.message);
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.put('/api/pedidos/:id/estado', async (peticion, respuesta) => {
  try {
    const { id } = peticion.params;
    const { estado } = peticion.body;
    const { rows: filas } = await conexionBd.query(
      'UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    if (filas.length === 0) {
      return respuesta.status(404).json({ error: 'Pedido no encontrado' });
    }
    respuesta.json(filas[0]);
  } catch (error) {
    console.error('❌ Error actualizando estado de pedido:', error.message);
    respuesta.status(500).json({ error: error.message });
  }
});

// Endpoint para enviar correo al guardar la venta/pedido con todos los detalles
aplicacion.post('/api/pedidos/enviar-correo-confirmacion', async (peticion, respuesta) => {
  try {
    const { correoDestino, nombreCliente, productos, subtotal, total, adelanto, saldoPendiente, pedidoId } = peticion.body;
    
    if (!correoDestino) {
      return respuesta.status(400).json({ error: 'No se proporcionó un correo electrónico de destino.' });
    }

    const itemsHtml = (productos || []).map(prod => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${prod.marca || ''} ${prod.modelo || ''} (${prod.tipo || 'Producto'})</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${prod.cantidadVenta || prod.cantidad || 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(Number(prod.precio) || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Óptica - Confirmación de Pedido</h1>
        </div>
        <div style="padding: 20px;">
          <p>Hola <strong>${nombreCliente || 'Cliente'}</strong>,</p>
          <p>¡Muchas gracias por tu compra! Tu pedido <strong>#${pedidoId || ''}</strong> ha sido registrado exitosamente.</p>
          
          <h3 style="color: #1e293b; border-bottom: 2px solid #2563eb; padding-bottom: 5px;">Detalles de la Compra</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <thead>
              <tr style="background-color: #f8fafc; text-align: left;">
                <th style="padding: 8px; border-bottom: 2px solid #ddd;">Producto/Servicio</th>
                <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: center;">Cantidad</th>
                <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">Precio</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin-top: 15px;">
            <p style="margin: 3px 0; font-size: 14px;"><strong>Subtotal:</strong> $${(Number(subtotal) || 0).toFixed(2)}</p>
            <p style="margin: 3px 0; font-size: 16px; color: #2563eb;"><strong>Total:</strong> $${(Number(total) || 0).toFixed(2)}</p>
            <p style="margin: 3px 0; font-size: 14px; color: #16a34a;"><strong>Adelanto abonado:</strong> $${(Number(adelanto) || 0).toFixed(2)}</p>
            <p style="margin: 3px 0; font-size: 14px; color: ${saldoPendiente > 0 ? '#dc2626' : '#16a34a'};"><strong>Saldo pendiente:</strong> $${(Number(saldoPendiente) || 0).toFixed(2)}</p>
          </div>

          <p style="margin-top: 20px; font-size: 14px; color: #64748b;">Te notificaremos por este mismo medio cuando tus productos / lentes estén listos para ser recogidos en nuestra sucursal.</p>
        </div>
        <div style="background-color: #f8fafc; padding: 10px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Óptica - Excelente visión a tu alcance
        </div>
      </div>
    `;

    await enviarEmail({
      destinatario: correoDestino,
      asunto: `Confirmación de Venta y Pedido #${pedidoId || ''} - Óptica`,
      html: htmlContent,
    });

    respuesta.json({ status: 'ok', mensaje: 'Correo enviado exitosamente' });
  } catch (error) {
    console.error('❌ Error enviando correo de confirmación:', error);
    respuesta.status(500).json({ error: error.message });
  }
});

// Endpoint para notificar que el pedido está listo para ser recogido
aplicacion.post('/api/pedidos/notificar-listo', async (peticion, respuesta) => {
  try {
    const { correoDestino, nombreCliente, pedidoId, productos } = peticion.body;
    
    if (!correoDestino) {
      return respuesta.status(400).json({ error: 'El paciente no cuenta con un correo registrado.' });
    }

    const itemsList = (productos || []).map(p => `<li>${p.marca || ''} ${p.modelo || ''} (${p.tipo || 'Producto'})</li>`).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">¡Tu Pedido está Listo! 🎉</h1>
        </div>
        <div style="padding: 20px;">
          <p>Estimado(a) <strong>${nombreCliente || 'Cliente'}</strong>,</p>
          <p>Nos complace informarte que tus productos y/o lentes del pedido <strong>#${pedidoId || ''}</strong> ya se encuentran terminados y listos para pasar a recoger en la sucursal de la óptica.</p>
          
          ${itemsList ? `<h3 style="color: #1e293b;">Resumen del Pedido:</h3><ul>${itemsList}</ul>` : ''}

          <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-weight: bold; color: #166534;">📍 Sucursal: Centro</p>
            <p style="margin: 5px 0 0 0; color: #15803d; font-size: 14px;">Puedes pasar por tu producto en nuestros horarios habituales de atención.</p>
          </div>

          <p style="font-size: 14px; color: #64748b;">Recuerda presentar tu ticket de compra o número de pedido al momento de acudir a la óptica.</p>
        </div>
        <div style="background-color: #f8fafc; padding: 10px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Óptica - Atendiendo con excelencia tu salud visual
        </div>
      </div>
    `;

    await enviarEmail({
      destinatario: correoDestino,
      asunto: `¡Tu pedido #${pedidoId || ''} está listo para recojer! - Óptica`,
      html: htmlContent,
    });

    respuesta.json({ status: 'ok', mensaje: 'Notificación enviada correctamente al correo del paciente' });
  } catch (error) {
    console.error('❌ Error notificando pedido listo:', error);
    respuesta.status(500).json({ error: error.message });
  }
});

// Servir la página web empaquetada de React
aplicacion.use(express.static(path.join(__dirname, '../dist')));
aplicacion.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});
// Arranque
aplicacion.listen(puerto, async () => {
  await inicializarTablas();
  console.log(`🚀 Backend operativo en el puerto ${puerto}`);
});