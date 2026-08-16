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
aplicacion.use(express.json({ limit: '10mb' }));



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
      CREATE TABLE IF NOT EXISTS productos (
        id_producto SERIAL PRIMARY KEY,
        tipo_articulo VARCHAR(64) NOT NULL,
        marca VARCHAR(255) NOT NULL,
        modelo VARCHAR(255) NOT NULL,
        cantidad_inventario INT NOT NULL,
        precio_unitario DECIMAL(12,2) NOT NULL,
        ruta_imagen TEXT DEFAULT NULL
      );
      CREATE TABLE IF NOT EXISTS armazones (
        id_producto INT PRIMARY KEY,
        color VARCHAR(64),
        material VARCHAR(128),
        medida_puente VARCHAR(64),
        medida_varilla VARCHAR(64),
        FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS lentes_contacto (
        id_producto INT PRIMARY KEY,
        curva_base VARCHAR(64),
        diametro VARCHAR(64),
        poder_esferico VARCHAR(64),
        dias_reemplazo INT,
        fecha_caducidad DATE,
        FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS materiales_cristal (
        id_material SERIAL PRIMARY KEY,
        nombre VARCHAR(128) NOT NULL,
        descripcion TEXT
      );
      CREATE TABLE IF NOT EXISTS cristales (
        id_producto INT PRIMARY KEY,
        id_material INT,
        esfera VARCHAR(64),
        cilindro VARCHAR(64),
        eje VARCHAR(64),
        adicion VARCHAR(64),
        tipo_lente VARCHAR(64),
        FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE,
        FOREIGN KEY (id_material) REFERENCES materiales_cristal(id_material) ON DELETE SET NULL
      );
      CREATE TABLE IF NOT EXISTS tratamientos_cristal (
        id_tratamiento SERIAL PRIMARY KEY,
        nombre VARCHAR(128) NOT NULL,
        descripcion TEXT,
        costo_adicional DECIMAL(12,2) DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS detalle_tratamientos_cristal (
        id_producto INT,
        id_tratamiento INT,
        PRIMARY KEY (id_producto, id_tratamiento),
        FOREIGN KEY (id_producto) REFERENCES cristales(id_producto) ON DELETE CASCADE,
        FOREIGN KEY (id_tratamiento) REFERENCES tratamientos_cristal(id_tratamiento) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS pacientes (
        id BIGINT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        apellidos VARCHAR(255) DEFAULT '',
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
        graduacion TEXT,
        FOREIGN KEY (pacienteId) REFERENCES pacientes(id) ON DELETE SET NULL
      );
    `);
    
    await conexionBd.query(`ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS apellidos VARCHAR(255) DEFAULT '';`);
    await conexionBd.query(`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS graduacion TEXT;`);
    await conexionBd.query(`ALTER TABLE productos ALTER COLUMN ruta_imagen TYPE TEXT;`);
    
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
    const { id, nombre, apellidos, telefono, correo, fechaNacimiento, peso, estatura, historialClinico, direccion } = peticion.body;
    const consulta = `
      INSERT INTO pacientes (id, nombre, apellidos, telefono, correo, fechaNacimiento, peso, estatura, historialClinico, direccion)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const valores = [id, nombre, apellidos, telefono, correo, fechaNacimiento, peso, estatura, historialClinico, direccion];
    const { rows: filas } = await conexionBd.query(consulta, valores);
    respuesta.status(201).json(filas[0]);
  } catch (error) {
    console.error('❌ Error guardando paciente:', error.message);
    respuesta.status(500).json({ error: error.message });
  }
});

// Rutas inventario
aplicacion.get('/api/productos', async (peticion, respuesta) => {
  try {
    const query = `
      SELECT p.*,
        a.color, a.material, a.medida_puente, a.medida_varilla,
        l.curva_base, l.diametro, l.poder_esferico, l.dias_reemplazo, l.fecha_caducidad,
        c.id_material, c.esfera, c.cilindro, c.eje, c.adicion, c.tipo_lente
      FROM productos p
      LEFT JOIN armazones a ON p.id_producto = a.id_producto
      LEFT JOIN lentes_contacto l ON p.id_producto = l.id_producto
      LEFT JOIN cristales c ON p.id_producto = c.id_producto
      ORDER BY p.id_producto DESC
    `;
    const { rows } = await conexionBd.query(query);
    
    const tratQuery = `
      SELECT dt.id_producto, tc.id_tratamiento, tc.nombre, tc.costo_adicional
      FROM detalle_tratamientos_cristal dt
      JOIN tratamientos_cristal tc ON dt.id_tratamiento = tc.id_tratamiento
    `;
    const trats = await conexionBd.query(tratQuery);
    
    const productosMap = rows.map(r => {
      if(r.tipo_articulo === 'cristal') {
        r.tratamientos = trats.rows.filter(t => t.id_producto === r.id_producto);
      }
      return r;
    });
    
    respuesta.json(productosMap);
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.post('/api/productos', async (peticion, respuesta) => {
  const cliente = await conexionBd.connect();
  try {
    await cliente.query('BEGIN');
    const { tipo_articulo, marca, modelo, cantidad_inventario, precio_unitario, ruta_imagen, ...especificos } = peticion.body;
    
    const prodRes = await cliente.query(
      'INSERT INTO productos (tipo_articulo, marca, modelo, cantidad_inventario, precio_unitario, ruta_imagen) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [tipo_articulo, marca, modelo, cantidad_inventario, precio_unitario, ruta_imagen]
    );
    const id_producto = prodRes.rows[0].id_producto;

    if (tipo_articulo === 'armazon') {
      await cliente.query(
        'INSERT INTO armazones (id_producto, color, material, medida_puente, medida_varilla) VALUES ($1, $2, $3, $4, $5)',
        [id_producto, especificos.color, especificos.material, especificos.medida_puente, especificos.medida_varilla]
      );
    } else if (tipo_articulo === 'lente_contacto') {
      await cliente.query(
        'INSERT INTO lentes_contacto (id_producto, curva_base, diametro, poder_esferico, dias_reemplazo, fecha_caducidad) VALUES ($1, $2, $3, $4, $5, $6)',
        [id_producto, especificos.curva_base, especificos.diametro, especificos.poder_esferico, especificos.dias_reemplazo, especificos.fecha_caducidad || null]
      );
    } else if (tipo_articulo === 'cristal') {
      await cliente.query(
        'INSERT INTO cristales (id_producto, id_material, esfera, cilindro, eje, adicion, tipo_lente) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [id_producto, especificos.id_material, especificos.esfera, especificos.cilindro, especificos.eje, especificos.adicion, especificos.tipo_lente]
      );
      if (especificos.tratamientos && especificos.tratamientos.length > 0) {
        for (const tId of especificos.tratamientos) {
          await cliente.query('INSERT INTO detalle_tratamientos_cristal (id_producto, id_tratamiento) VALUES ($1, $2)', [id_producto, tId]);
        }
      }
    }

    await cliente.query('COMMIT');
    respuesta.status(201).json({ ...prodRes.rows[0], ...especificos });
  } catch (error) {
    await cliente.query('ROLLBACK');
    console.error('❌ Error guardando producto:', error.message);
    respuesta.status(500).json({ error: error.message });
  } finally {
    cliente.release();
  }
});

aplicacion.put('/api/productos/:id', async (peticion, respuesta) => {
  const { id } = peticion.params;
  const cliente = await conexionBd.connect();
  try {
    await cliente.query('BEGIN');
    const { tipo_articulo, marca, modelo, cantidad_inventario, precio_unitario, ruta_imagen, ...especificos } = peticion.body;
    
    const prodRes = await cliente.query(
      'UPDATE productos SET tipo_articulo=$1, marca=$2, modelo=$3, cantidad_inventario=$4, precio_unitario=$5, ruta_imagen=$6 WHERE id_producto=$7 RETURNING *',
      [tipo_articulo, marca, modelo, cantidad_inventario, precio_unitario, ruta_imagen, id]
    );

    if (tipo_articulo === 'armazon') {
      await cliente.query(
        'UPDATE armazones SET color=$1, material=$2, medida_puente=$3, medida_varilla=$4 WHERE id_producto=$5',
        [especificos.color, especificos.material, especificos.medida_puente, especificos.medida_varilla, id]
      );
    } else if (tipo_articulo === 'lente_contacto') {
      await cliente.query(
        'UPDATE lentes_contacto SET curva_base=$1, diametro=$2, poder_esferico=$3, dias_reemplazo=$4, fecha_caducidad=$5 WHERE id_producto=$6',
        [especificos.curva_base, especificos.diametro, especificos.poder_esferico, especificos.dias_reemplazo, especificos.fecha_caducidad || null, id]
      );
    } else if (tipo_articulo === 'cristal') {
      await cliente.query(
        'UPDATE cristales SET id_material=$1, esfera=$2, cilindro=$3, eje=$4, adicion=$5, tipo_lente=$6 WHERE id_producto=$7',
        [especificos.id_material, especificos.esfera, especificos.cilindro, especificos.eje, especificos.adicion, especificos.tipo_lente, id]
      );
      await cliente.query('DELETE FROM detalle_tratamientos_cristal WHERE id_producto=$1', [id]);
      if (especificos.tratamientos && especificos.tratamientos.length > 0) {
        for (const tId of especificos.tratamientos) {
          await cliente.query('INSERT INTO detalle_tratamientos_cristal (id_producto, id_tratamiento) VALUES ($1, $2)', [id, tId]);
        }
      }
    }

    await cliente.query('COMMIT');
    respuesta.json({ ...prodRes.rows[0], ...especificos });
  } catch (error) {
    await cliente.query('ROLLBACK');
    console.error('❌ Error actualizando producto:', error.message);
    respuesta.status(500).json({ error: error.message });
  } finally {
    cliente.release();
  }
});

// Catalogos
aplicacion.get('/api/materiales_cristal', async (peticion, respuesta) => {
  try {
    const { rows } = await conexionBd.query('SELECT * FROM materiales_cristal ORDER BY nombre ASC');
    respuesta.json(rows);
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.post('/api/materiales_cristal', async (peticion, respuesta) => {
  try {
    const { nombre, descripcion } = peticion.body;
    const { rows } = await conexionBd.query('INSERT INTO materiales_cristal (nombre, descripcion) VALUES ($1, $2) RETURNING *', [nombre, descripcion]);
    respuesta.status(201).json(rows[0]);
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.get('/api/tratamientos_cristal', async (peticion, respuesta) => {
  try {
    const { rows } = await conexionBd.query('SELECT * FROM tratamientos_cristal ORDER BY nombre ASC');
    respuesta.json(rows);
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.post('/api/tratamientos_cristal', async (peticion, respuesta) => {
  try {
    const { nombre, descripcion, costo_adicional } = peticion.body;
    const { rows } = await conexionBd.query('INSERT INTO tratamientos_cristal (nombre, descripcion, costo_adicional) VALUES ($1, $2, $3) RETURNING *', [nombre, descripcion, costo_adicional || 0]);
    respuesta.status(201).json(rows[0]);
  } catch (error) {
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
    const { id, pacienteId, productos, detallesLentes, subtotalCarrito, total, adelanto, saldoPendiente, estadoPago, lentesTerminados, motivoNoTerminado, examenId, consultaTxt, fecha, graduacion } = peticion.body;
    const consulta = `
      INSERT INTO ventas (id, pacienteId, productos, detallesLentes, subtotalCarrito, total, adelanto, saldoPendiente, estadoPago, lentesTerminados, motivoNoTerminado, examenId, consulta, fecha, graduacion) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
      RETURNING *;
    `;
    const valores = [id, pacienteId, JSON.stringify(productos), JSON.stringify(detallesLentes), subtotalCarrito, total, adelanto, saldoPendiente, estadoPago, lentesTerminados, motivoNoTerminado, examenId, consultaTxt, fecha, graduacion];
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

aplicacion.put('/api/examenes/:id', async (peticion, respuesta) => {
  try {
    const { id } = peticion.params;
    const { pacienteId, od, oi, tipoArmazon, tratamientoLentes } = peticion.body;
    const consulta = `
      UPDATE examenes 
      SET pacienteId = $1, od = $2, oi = $3, tipoArmazon = $4, tratamientoLentes = $5
      WHERE id = $6
      RETURNING *;
    `;
    const valores = [pacienteId, JSON.stringify(od), JSON.stringify(oi), tipoArmazon, tratamientoLentes, id];
    const { rows: filas } = await conexionBd.query(consulta, valores);
    
    if (filas.length === 0) {
      return respuesta.status(404).json({ error: 'Examen no encontrado' });
    }
    
    respuesta.json(filas[0]);
  } catch (error) {
    console.error('❌ Error actualizando examen:', error.message);
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.delete('/api/examenes/:id', async (peticion, respuesta) => {
  try {
    const { id } = peticion.params;
    const consulta = 'DELETE FROM examenes WHERE id = $1 RETURNING *;';
    const { rows: filas } = await conexionBd.query(consulta, [id]);
    
    if (filas.length === 0) {
      return respuesta.status(404).json({ error: 'Examen no encontrado' });
    }
    
    respuesta.json({ mensaje: 'Examen eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error eliminando examen:', error.message);
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
    from: `"Dioptrios" <${process.env.GMAIL_USER}>`,
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

    const itemsHtml = (productos || []).map(item => {
      if (item.isPaquete) {
        const p = item.principal;
        const cant = Number(item.cantidadVenta || 1);
        const precio = Number(item.precio || 0);
        let recetaHtml = '';
        if (item.receta && item.receta.nombre) {
          recetaHtml += `<div style="font-size: 12px; color: #1e293b; margin-top: 4px;"><strong>👤 Para:</strong> ${item.receta.nombre}</div>`;
          if (JSON.stringify(item.receta.od) === JSON.stringify(item.receta.oi)) {
            recetaHtml += `<div style="font-size: 11px; color: #64748b;">Ambos Ojos: Esf ${item.receta.od?.esfera} Cil ${item.receta.od?.cilindro} Eje ${item.receta.od?.eje}</div>`;
          } else {
            recetaHtml += `<div style="font-size: 11px; color: #64748b;">OD: Esf ${item.receta.od?.esfera} Cil ${item.receta.od?.cilindro} Eje ${item.receta.od?.eje}</div>`;
            recetaHtml += `<div style="font-size: 11px; color: #64748b;">OS: Esf ${item.receta.oi?.esfera} Cil ${item.receta.oi?.cilindro} Eje ${item.receta.oi?.eje}</div>`;
          }
        }
        let specsHtml = '';
        if (item.material) specsHtml += `<li style="font-size: 11px; color: #64748b;">Mat: ${item.material.nombre}</li>`;
        if (item.tratamientos) item.tratamientos.forEach(t => specsHtml += `<li style="font-size: 11px; color: #64748b;">Trat: ${t.nombre}</li>`);
        if (item.graduacion !== 'Ninguna') specsHtml += `<li style="font-size: 11px; color: #64748b;">Grad: ${item.graduacion}</li>`;

        return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">
            <div style="font-weight: bold;">[PAQUETE] ${p?.marca || ''} ${p?.modelo || ''}</div>
            ${recetaHtml}
            ${specsHtml ? `<ul style="margin: 4px 0 0 0; padding-left: 15px;">${specsHtml}</ul>` : ''}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; vertical-align: top;">${cant}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; vertical-align: top;">$${precio.toFixed(2)}</td>
        </tr>`;
      } else {
        const cant = Number(item.cantidadVenta || item.cantidad || 1);
        const precio = Number(item.precio || item.precio_unitario || 0);
        return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; vertical-align: top;">${item.marca || ''} ${item.modelo || ''} (${item.tipo || 'Producto'})</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; vertical-align: top;">${cant}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; vertical-align: top;">$${precio.toFixed(2)}</td>
        </tr>`;
      }
    }).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Dioptrios - Confirmación de Pedido</h1>
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
          Dioptrios - Excelente visión a tu alcance
        </div>
      </div>
    `;

    await enviarEmail({
      destinatario: correoDestino,
      asunto: `Confirmación de Venta y Pedido #${pedidoId || ''} - Dioptrios`,
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
          <p>Nos complace informarte que tus productos y/o lentes del pedido <strong>#${pedidoId || ''}</strong> ya se encuentran terminados y listos para pasar a recoger en la sucursal de Dioptrios.</p>
          
          ${itemsList ? `<h3 style="color: #1e293b;">Resumen del Pedido:</h3><ul>${itemsList}</ul>` : ''}

          <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-weight: bold; color: #166534;">📍 Sucursal: Centro</p>
            <p style="margin: 5px 0 0 0; color: #15803d; font-size: 14px;">Puedes pasar por tu producto en nuestros horarios habituales de atención.</p>
          </div>

          <p style="font-size: 14px; color: #64748b;">Recuerda presentar tu ticket de compra o número de pedido al momento de acudir a Dioptrios.</p>
        </div>
        <div style="background-color: #f8fafc; padding: 10px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Dioptrios - Atendiendo con excelencia tu salud visual
        </div>
      </div>
    `;

    await enviarEmail({
      destinatario: correoDestino,
      asunto: `¡Tu pedido #${pedidoId || ''} está listo para recojer! - Dioptrios`,
      html: htmlContent,
    });

    respuesta.json({ status: 'ok', mensaje: 'Notificación enviada correctamente al correo del paciente' });
  } catch (error) {
    console.error('❌ Error notificando pedido listo:', error);
    respuesta.status(500).json({ error: error.message });
  }
});

// Registrar abono a venta pendiente
aplicacion.patch('/api/ventas/:id/abono', async (peticion, respuesta) => {
  try {
    const { id } = peticion.params;
    const { abono } = peticion.body;
    const montoAbono = parseFloat(abono) || 0;

    if (montoAbono <= 0) {
      return respuesta.status(400).json({ error: 'Monto de abono inválido' });
    }

    const { rows } = await conexionBd.query('SELECT * FROM ventas WHERE id = $1', [id]);
    if (rows.length === 0) {
      return respuesta.status(404).json({ error: 'Venta no encontrada' });
    }

    const venta = rows[0];
    const total = parseFloat(venta.total || 0);
    const adelantoActual = parseFloat(venta.adelanto || 0);
    const nuevoAdelanto = adelantoActual + montoAbono;
    const nuevoSaldoPendiente = Math.max(0, total - nuevoAdelanto);
    const nuevoEstado = nuevoSaldoPendiente <= 0 ? 'Pagado' : 'Pendiente';

    const updateQuery = `
      UPDATE ventas
      SET adelanto = $1, saldoPendiente = $2, estadoPago = $3
      WHERE id = $4
      RETURNING *;
    `;
    const { rows: updatedRows } = await conexionBd.query(updateQuery, [nuevoAdelanto, nuevoSaldoPendiente, nuevoEstado, id]);

    respuesta.json(updatedRows[0]);
  } catch (error) {
    console.error('❌ Error registrando abono:', error);
    respuesta.status(500).json({ error: error.message });
  }
});

// Cambiar estado de pago de una venta (Reembolsado, Cancelado, etc.)
aplicacion.patch('/api/ventas/:id/estado', async (peticion, respuesta) => {
  try {
    const { id } = peticion.params;
    const { estadoPago } = peticion.body;

    if (!estadoPago) {
      return respuesta.status(400).json({ error: 'Se requiere estadoPago' });
    }

    const updateQuery = `
      UPDATE ventas
      SET estadoPago = $1
      WHERE id = $2
      RETURNING *;
    `;
    const { rows: updatedRows } = await conexionBd.query(updateQuery, [estadoPago, id]);
    if (updatedRows.length === 0) {
      return respuesta.status(404).json({ error: 'Venta no encontrada' });
    }

    respuesta.json(updatedRows[0]);
  } catch (error) {
    console.error('❌ Error cambiando estado de venta:', error);
    respuesta.status(500).json({ error: error.message });
  }
});

// --- RUTAS MERCADO PAGO INTEGRACION PRESENCIAL / ORDERS ---
aplicacion.post('/api/mercadopago/crear-orden', async (peticion, respuesta) => {
  try {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      return respuesta.status(500).json({ error: 'MERCADOPAGO_ACCESS_TOKEN no configurado en .env' });
    }

    const { external_reference, description, total_amount } = peticion.body;
    
    const extRef = external_reference || `ext-${Date.now()}`;
    const payload = {
      type: 'point',
      external_reference: extRef,
      description: description || 'Compra de Óptica',
      total_amount: String(total_amount || '10.00'),
    };

    const resMp = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Idempotency-Key': extRef
      },
      body: JSON.stringify(payload)
    });

    const dataMp = await resMp.json();
    if (!resMp.ok) {
      console.error('❌ Error creando orden MP:', dataMp);
      return respuesta.status(resMp.status).json(dataMp);
    }

    respuesta.json(dataMp);
  } catch (error) {
    console.error('❌ Error en /api/mercadopago/crear-orden:', error);
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.post('/api/mercadopago/simular-evento', async (peticion, respuesta) => {
  try {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      return respuesta.status(500).json({ error: 'MERCADOPAGO_ACCESS_TOKEN no configurado en .env' });
    }

    const { order_id, status, payment_method_type, installments, payment_method_id, status_detail } = peticion.body;

    if (!order_id) {
      return respuesta.status(400).json({ error: 'Se requiere order_id' });
    }

    let payload;
    if (status === 'refunded') {
      payload = { status: 'refunded' };
    } else if (status === 'canceled') {
      payload = { status: 'canceled' };
    } else if (status === 'expired') {
      payload = { status: 'expired' };
    } else if (status === 'action_required') {
      payload = { status: 'action_required' };
    } else {
      payload = {
        status: status || 'processed',
        payment_method_type: payment_method_type || 'credit_card',
        installments: Number(installments) || 1,
        payment_method_id: payment_method_id || 'visa',
        status_detail: status_detail || 'accredited'
      };
    }

    const resMp = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(order_id)}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const dataMp = await resMp.json();
    if (!resMp.ok) {
      console.error('❌ Error simulando evento MP:', dataMp);
      return respuesta.status(resMp.status).json(dataMp);
    }

    respuesta.json(dataMp);
  } catch (error) {
    console.error('❌ Error en /api/mercadopago/simular-evento:', error);
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.get('/api/mercadopago/obtener-orden/:orderId', async (peticion, respuesta) => {
  try {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      return respuesta.status(500).json({ error: 'MERCADOPAGO_ACCESS_TOKEN no configurado en .env' });
    }

    const { orderId } = peticion.params;

    const resMp = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const dataMp = await resMp.json();
    if (!resMp.ok) {
      console.error('❌ Error obteniendo orden MP:', dataMp);
      return respuesta.status(resMp.status).json(dataMp);
    }

    respuesta.json(dataMp);
  } catch (error) {
    console.error('❌ Error en /api/mercadopago/obtener-orden:', error);
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