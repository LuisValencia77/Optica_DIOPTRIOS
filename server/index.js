import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import PDFDocument from 'pdfkit';

dotenv.config();

// Servidor
const aplicacion = express();
const puerto = process.env.PORT || 4000;

aplicacion.use(cors({ origin: true }));
aplicacion.use(express.json({ limit: '10mb' }));

// Configuración S3 (Cloudflare R2)
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const upload = multer({ storage: multer.memoryStorage() });

// Memoria para Modo Simulación (Testing UI sin terminal física)
const mockOrderStates = new Map();
// Base de datos
const conexionBd = new Pool(
  process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || '192.168.1.73',
        user: process.env.DB_USER || 'admin_dioptrios',
        password: process.env.DB_PASSWORD || 'dioptrios12',
        database: process.env.DB_NAME || 'dioptrios',
        port: process.env.DB_PORT || 5432,
      }
);

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
    `);
    
    await conexionBd.query(`
      CREATE TABLE IF NOT EXISTS pacientes (
        id BIGINT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        apellidos VARCHAR(255) DEFAULT '',
        telefono VARCHAR(64) NOT NULL,
        correo VARCHAR(255) NOT NULL,
        fechaNacimiento VARCHAR(64),
        historialClinico TEXT,
        direccion VARCHAR(512)
      );
    `);
    
    // Eliminar columnas que ya no se usan (peso y estatura)
    await conexionBd.query(`ALTER TABLE pacientes DROP COLUMN IF EXISTS peso;`);
    await conexionBd.query(`ALTER TABLE pacientes DROP COLUMN IF EXISTS estatura;`);

    await conexionBd.query(`
      CREATE TABLE IF NOT EXISTS examenes (
        id BIGINT PRIMARY KEY,
        pacienteId BIGINT NOT NULL,
        od TEXT,
        oi TEXT,
        adicion VARCHAR(64),
        dp VARCHAR(64),
        ap VARCHAR(64),
        tipoArmazon VARCHAR(255),
        tratamientoLentes VARCHAR(255),
        doctor VARCHAR(255),
        fecha TIMESTAMP NOT NULL,
        FOREIGN KEY (pacienteId) REFERENCES pacientes(id) ON DELETE CASCADE
      );
      
      -- Agregar columna doctor si no existe
      ALTER TABLE examenes ADD COLUMN IF NOT EXISTS doctor VARCHAR(255);

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
    await conexionBd.query(`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS descuento DECIMAL(12,2) DEFAULT 0;`);
    await conexionBd.query(`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS metodoPago VARCHAR(128) DEFAULT 'Efectivo';`);
    await conexionBd.query(`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS estado_pedido VARCHAR(64) DEFAULT 'Ordenado';`);
    
    // Auth columns
    await conexionBd.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);
    await conexionBd.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;`);
    await conexionBd.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);`);
    await conexionBd.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);`);

    console.log(' Tablas verificadas en PostgreSQL.');
  } catch (error) {
    console.error(' Fallo al construir tablas:', error);
  }
};

// Endpoint de subida de imágenes (R2)
aplicacion.post('/api/upload', upload.single('imagen'), async (peticion, respuesta) => {
  if (!peticion.file) {
    return respuesta.status(400).json({ error: 'No se subió ninguna imagen' });
  }

  const file = peticion.file;
  const fileName = `${uuidv4()}-${file.originalname.replace(/\s+/g, '-')}`;
  const bucketName = process.env.R2_BUCKET_NAME;

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    respuesta.json({ url: publicUrl });
  } catch (error) {
    console.error('Error subiendo imagen a R2:', error);
    respuesta.status(500).json({ error: 'Error interno subiendo la imagen' });
  }
});

// Rutas usuarios
aplicacion.get('/api/usuarios', async (peticion, respuesta) => {
  try {
    const { rows: filas } = await conexionBd.query('SELECT id, username, name, role, email, is_verified FROM usuarios ORDER BY id ASC');
    respuesta.json(filas);
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.post('/api/usuarios', async (peticion, respuesta) => {
  try {
    const { username, password, role, name, email } = peticion.body;
    
    // Validar unicidad
    const { rows: existentes } = await conexionBd.query('SELECT id FROM usuarios WHERE username = $1 OR email = $2', [username, email]);
    if (existentes.length > 0) {
      return respuesta.status(400).json({ error: 'El nombre de usuario o correo ya existe.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = uuidv4();

    const consulta = `
      INSERT INTO usuarios (username, password, role, name, email, is_verified, verification_token)
      VALUES ($1, $2, $3, $4, $5, FALSE, $6)
      RETURNING id, username, role, name, email, is_verified;
    `;
    const { rows: filas } = await conexionBd.query(consulta, [username, hashedPassword, role, name, email, verificationToken]);
    
    // Enviar correo de verificación
    const baseUrl = peticion.get('origin') || 'http://localhost:5173';
    const verifyUrl = `${baseUrl}/verificar-correo?token=${verificationToken}`;
    const emailHtml = `
      <div style="font-family: 'Google Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb;">Bienvenido a Dioptrios</h2>
        <p>Hola ${name},</p>
        <p>Has sido registrado como <strong>${role}</strong> en el sistema de Óptica Dioptrios.</p>
        <p>Tu nombre de usuario es: <strong>${username}</strong></p>
        <p>Para activar tu cuenta y poder iniciar sesión, haz clic en el siguiente botón:</p>
        <a href="${verifyUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verificar Cuenta</a>
        <p>Si no puedes hacer clic, copia y pega este enlace en tu navegador:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      </div>
    `;
    await enviarEmail({ destinatario: email, asunto: 'Verifica tu cuenta de Dioptrios', html: emailHtml });

    respuesta.json(filas[0]);
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.get('/api/usuarios/verify/:token', async (peticion, respuesta) => {
  try {
    const { token } = peticion.params;
    const { rows } = await conexionBd.query('SELECT id FROM usuarios WHERE verification_token = $1', [token]);
    if (rows.length === 0) return respuesta.status(400).json({ error: 'Token inválido o expirado' });
    
    await conexionBd.query('UPDATE usuarios SET is_verified = TRUE, verification_token = NULL WHERE id = $1', [rows[0].id]);
    respuesta.json({ success: true, message: 'Cuenta verificada exitosamente.' });
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.post('/api/auth/login', async (peticion, respuesta) => {
  try {
    const { username, password } = peticion.body;
    const { rows } = await conexionBd.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    if (rows.length === 0) return respuesta.status(401).json({ error: 'Credenciales inválidas' });
    
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return respuesta.status(401).json({ error: 'Credenciales inválidas' });
    if (!user.is_verified) return respuesta.status(403).json({ error: 'Debes verificar tu correo electrónico antes de iniciar sesión.' });

    respuesta.json({ id: user.id, username: user.username, role: user.role, name: user.name, email: user.email });
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.delete('/api/usuarios/:id', async (peticion, respuesta) => {
  try {
    const targetId = parseInt(peticion.params.id);
    const callerRole = peticion.headers['x-caller-role'];
    const callerId = parseInt(peticion.headers['x-caller-id']);

    if (callerRole !== 'Super Usuario') return respuesta.status(403).json({ error: 'Solo el Super Usuario puede eliminar usuarios.' });
    if (callerId === targetId) return respuesta.status(400).json({ error: 'No puedes eliminarte a ti mismo.' });

    const { rows } = await conexionBd.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [targetId]);
    if (rows.length === 0) return respuesta.status(404).json({ error: 'Usuario no encontrado' });
    respuesta.json({ success: true });
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.post('/api/usuarios/solicitar-reset', async (peticion, respuesta) => {
  try {
    const { usernameOrEmail } = peticion.body;
    const { rows } = await conexionBd.query('SELECT id, email, name FROM usuarios WHERE username = $1 OR email = $1', [usernameOrEmail]);
    if (rows.length === 0) return respuesta.status(404).json({ error: 'Usuario no encontrado' });
    
    const resetToken = uuidv4();
    await conexionBd.query('UPDATE usuarios SET reset_token = $1 WHERE id = $2', [resetToken, rows[0].id]);
    
    const baseUrl = peticion.get('origin') || 'http://localhost:5173';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    const emailHtml = `
      <div style="font-family: 'Google Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb;">Restablecer Contraseña</h2>
        <p>Hola ${rows[0].name},</p>
        <p>Se ha solicitado un cambio de contraseña para tu cuenta.</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Cambiar Contraseña</a>
        <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
      </div>
    `;
    await enviarEmail({ destinatario: rows[0].email, asunto: 'Cambio de Contraseña - Dioptrios', html: emailHtml });
    respuesta.json({ success: true });
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.post('/api/usuarios/reset-password', async (peticion, respuesta) => {
  try {
    const { token, newPassword } = peticion.body;
    const { rows } = await conexionBd.query('SELECT id FROM usuarios WHERE reset_token = $1', [token]);
    if (rows.length === 0) return respuesta.status(400).json({ error: 'Token inválido o expirado' });
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await conexionBd.query('UPDATE usuarios SET password = $1, reset_token = NULL WHERE id = $2', [hashedPassword, rows[0].id]);
    respuesta.json({ success: true });
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
  }
});


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
    const { id, nombre, apellidos, telefono, correo, fechaNacimiento, historialClinico, direccion } = peticion.body;
    const consulta = `
      INSERT INTO pacientes (id, nombre, apellidos, telefono, correo, fechaNacimiento, historialClinico, direccion)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const valores = [id, nombre, apellidos, telefono, correo, fechaNacimiento, historialClinico, direccion];
    const { rows: filas } = await conexionBd.query(consulta, valores);
    respuesta.status(201).json(filas[0]);
  } catch (error) {
    console.error(' Error guardando paciente:', error.message);
    respuesta.status(500).json({ error: error.message });
  }
});

// Rutas inventario

aplicacion.get('/api/matriz-micas', async (peticion, respuesta) => {
  const { id_material, id_tratamiento } = peticion.query;
  try {
    let query = `
      SELECT p.id_producto, p.cantidad_inventario, c.esfera, c.cilindro
      FROM productos p
      JOIN cristales c ON p.id_producto = c.id_producto
      WHERE c.id_material = $1
    `;
    const params = [id_material];
    
    if (id_tratamiento) {
      query += ` AND EXISTS (SELECT 1 FROM detalle_tratamientos_cristal dt WHERE dt.id_producto = p.id_producto AND dt.id_tratamiento = $2)`;
      params.push(id_tratamiento);
    } else {
      query += ` AND NOT EXISTS (SELECT 1 FROM detalle_tratamientos_cristal dt WHERE dt.id_producto = p.id_producto)`;
    }
    
    const { rows } = await conexionBd.query(query, params);
    respuesta.json(rows);
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.post('/api/matriz-micas', async (peticion, respuesta) => {
  const cliente = await conexionBd.connect();
  try {
    await cliente.query('BEGIN');
    const { id_material, id_tratamiento, esfera, cilindro, cantidad, precio_unitario } = peticion.body;
    
    let findQuery = `
      SELECT p.id_producto 
      FROM productos p
      JOIN cristales c ON p.id_producto = c.id_producto
      WHERE c.id_material = $1 AND c.esfera = $2 AND c.cilindro = $3
    `;
    const findParams = [id_material, esfera, cilindro];
    
    if (id_tratamiento) {
      findQuery += ` AND EXISTS (SELECT 1 FROM detalle_tratamientos_cristal dt WHERE dt.id_producto = p.id_producto AND dt.id_tratamiento = $4)`;
      findParams.push(id_tratamiento);
    } else {
      findQuery += ` AND NOT EXISTS (SELECT 1 FROM detalle_tratamientos_cristal dt WHERE dt.id_producto = p.id_producto)`;
    }
    
    const { rows } = await cliente.query(findQuery, findParams);
    
    if (rows.length > 0) {
      const id_producto = rows[0].id_producto;
      await cliente.query(`UPDATE productos SET cantidad_inventario = $1 WHERE id_producto = $2`, [cantidad, id_producto]);
      await cliente.query('COMMIT');
      respuesta.json({ id_producto, cantidad });
    } else {
      const prodRes = await cliente.query(
        'INSERT INTO productos (tipo_articulo, marca, modelo, cantidad_inventario, precio_unitario, ruta_imagen) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        ['cristal', 'Genérico', 'Mica', cantidad, precio_unitario || 0, '']
      );
      const id_producto = prodRes.rows[0].id_producto;
      
      await cliente.query(
        'INSERT INTO cristales (id_producto, id_material, esfera, cilindro, eje, adicion, tipo_lente) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [id_producto, id_material, esfera, cilindro, '', '', 'monofocal']
      );
      
      if (id_tratamiento) {
        await cliente.query('INSERT INTO detalle_tratamientos_cristal (id_producto, id_tratamiento) VALUES ($1, $2)', [id_producto, id_tratamiento]);
      }
      
      await cliente.query('COMMIT');
      respuesta.status(201).json({ id_producto, cantidad });
    }
  } catch (error) {
    await cliente.query('ROLLBACK');
    respuesta.status(500).json({ error: error.message });
  } finally {
    cliente.release();
  }
});

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
    console.error(' Error guardando producto:', error.message);
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
    console.error(' Error actualizando producto:', error.message);
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
    const { id, pacienteId, productos, detallesLentes, subtotalCarrito, total, adelanto, saldoPendiente, estadoPago, lentesTerminados, motivoNoTerminado, examenId, consultaTxt, fecha, graduacion, descuento, metodoPago } = peticion.body;
    const consulta = `
      INSERT INTO ventas (id, pacienteId, productos, detallesLentes, subtotalCarrito, total, adelanto, saldoPendiente, estadoPago, lentesTerminados, motivoNoTerminado, examenId, consulta, fecha, graduacion, descuento, metodoPago) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
      RETURNING *;
    `;
    const valores = [id, pacienteId, JSON.stringify(productos), JSON.stringify(detallesLentes), subtotalCarrito, total, adelanto, saldoPendiente, estadoPago, lentesTerminados, motivoNoTerminado, examenId, consultaTxt, fecha, graduacion, descuento || 0, metodoPago || 'Efectivo'];
    const { rows: filas } = await conexionBd.query(consulta, valores);
    respuesta.status(201).json(filas[0]);
  } catch (error) {
    console.error(' Error guardando venta:', error.message);
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.put('/api/ventas/:id/estado-pedido', async (peticion, respuesta) => {
  try {
    const targetId = parseInt(peticion.params.id);
    const { estado_pedido } = peticion.body;
    const { rows } = await conexionBd.query(
      'UPDATE ventas SET estado_pedido = $1 WHERE id = $2 RETURNING *',
      [estado_pedido, targetId]
    );
    if (rows.length === 0) return respuesta.status(404).json({ error: 'Venta no encontrada' });
    respuesta.json(rows[0]);
  } catch (error) {
    console.error(' Error actualizando estado_pedido:', error);
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.post('/api/ventas/notificar-listo', async (peticion, respuesta) => {
  try {
    const { correoDestino, nombreCliente, ventaId, productos } = peticion.body;
    
    let productosHtml = '';
    if (productos && productos.length > 0) {
      productosHtml = '<ul>' + productos.map(p => `<li>${p.cantidad}x ${p.tipo_articulo || ''} ${p.marca || ''} ${p.modelo || ''}</li>`).join('') + '</ul>';
    }

    const emailHtml = `
      <div style="font-family: 'Google Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981;">¡Tu pedido está listo!</h2>
        <p>Hola <strong>${nombreCliente || 'Cliente'}</strong>,</p>
        <p>Te informamos que tu pedido con folio <strong>#${ventaId}</strong> ya está terminado y listo para ser entregado o recogido.</p>
        <p>Detalle de tu pedido:</p>
        ${productosHtml}
        <p style="margin-top: 20px;">Te esperamos pronto. ¡Gracias por tu preferencia!</p>
      </div>
    `;

    await enviarEmail({
      destinatario: correoDestino,
      asunto: `Tu pedido #${ventaId} está listo - Dioptrios`,
      html: emailHtml
    });

    respuesta.json({ success: true, message: 'Correo enviado correctamente' });
  } catch (error) {
    console.error('Error enviando notificación de venta lista:', error);
    respuesta.status(500).json({ error: error.message });
  }
});

// Corte de caja
aplicacion.get('/api/ventas/corte-caja', async (peticion, respuesta) => {
  try {
    const { fecha } = peticion.query;
    const targetDate = fecha || new Date().toISOString().split('T')[0];
    const { rows } = await conexionBd.query(
      `SELECT * FROM ventas WHERE DATE(fecha) = $1 ORDER BY fecha DESC`, [targetDate]
    );
    const ventasDelDia = rows;
    const totalVentas = ventasDelDia.length;
    const totalCobrado = ventasDelDia.reduce((s, v) => s + Number(v.adelanto || 0), 0);
    const totalPendiente = ventasDelDia.reduce((s, v) => s + Number(v.saldopendiente || 0), 0);
    const totalDescuentos = ventasDelDia.reduce((s, v) => s + Number(v.descuento || 0), 0);
    const totalBruto = ventasDelDia.reduce((s, v) => s + Number(v.total || 0), 0);
    
    // Desglose por método de pago
    const porMetodo = {};
    ventasDelDia.forEach(v => {
      const metodo = v.metodopago || 'Efectivo';
      if (!porMetodo[metodo]) porMetodo[metodo] = { cantidad: 0, monto: 0 };
      porMetodo[metodo].cantidad++;
      porMetodo[metodo].monto += Number(v.adelanto || 0);
    });
    
    respuesta.json({ fecha: targetDate, totalVentas, totalBruto, totalCobrado, totalPendiente, totalDescuentos, porMetodo, ventas: ventasDelDia });
  } catch (error) {
    console.error(' Error en corte de caja:', error);
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
    const { id, pacienteId, od, oi, adicion, dp, ap, tipoArmazon, tratamientoLentes, doctor, fecha } = peticion.body;
    const consulta = `
      INSERT INTO examenes (id, pacienteId, od, oi, adicion, dp, ap, tipoArmazon, tratamientoLentes, doctor, fecha) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *;
    `;
    const valores = [id, pacienteId, JSON.stringify(od), JSON.stringify(oi), adicion, dp, ap, tipoArmazon, tratamientoLentes, doctor, fecha];
    const { rows: filas } = await conexionBd.query(consulta, valores);
    respuesta.status(201).json(filas[0]);
  } catch (error) {
    console.error(' Error guardando examen:', error.message);
    respuesta.status(500).json({ error: error.message });
  }
});

aplicacion.put('/api/examenes/:id', async (peticion, respuesta) => {
  try {
    const { id } = peticion.params;
    const { od, oi, adicion, dp, ap, tipoArmazon, tratamientoLentes, doctor } = peticion.body;
    const consulta = `
      UPDATE examenes 
      SET od = $1, oi = $2, adicion = $3, dp = $4, ap = $5, tipoArmazon = $6, tratamientoLentes = $7, doctor = $8
      WHERE id = $9 RETURNING *;
    `;
    const valores = [JSON.stringify(od), JSON.stringify(oi), adicion, dp, ap, tipoArmazon, tratamientoLentes, doctor, id];
    const { rows: filas } = await conexionBd.query(consulta, valores);
    
    if (filas.length === 0) {
      return respuesta.status(404).json({ error: 'Examen no encontrado' });
    }
    
    respuesta.json(filas[0]);
  } catch (error) {
    console.error(' Error actualizando examen:', error.message);
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
    console.error(' Error eliminando examen:', error.message);
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
    console.error(' Error guardando pedido:', error.message);
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
    console.error(' Error actualizando estado de pedido:', error.message);
    respuesta.status(500).json({ error: error.message });
  }
});

// Endpoint para enviar examen visual en PDF
aplicacion.post('/api/examenes/enviar-correo-pdf', async (peticion, respuesta) => {
  try {
    const { correoDestino, pacienteNombre, examen } = peticion.body;
    if (!correoDestino) {
      return respuesta.status(400).json({ error: 'No se proporcionó correo destino.' });
    }

    // Generar PDF en memoria
    const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margin: 40 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    
    // Contenido del PDF
    doc.fontSize(24).fillColor('#1e293b').text('DIOPTRIOS', { align: 'center', characterSpacing: 2 });
    doc.fontSize(10).fillColor('#64748b').text('Salud y Calidad Visual a tu Alcance', { align: 'center' });
    doc.moveDown(2);
    
    doc.fontSize(16).fillColor('#1d4ed8').text('Examen Visual', { align: 'center' });
    doc.moveDown(1);
    
    doc.fontSize(12).fillColor('#334155').text(`Paciente: ${pacienteNombre || 'Mostrador'}`);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`);
    doc.moveDown(1.5);
    
    // Tabla OD / OS
    doc.fontSize(11).fillColor('#000000');
    doc.text('Ojo Derecho (OD):', { underline: true }).moveDown(0.5);
    doc.text(`Esfera: ${examen.od?.esfera || '0'}   Cilindro: ${examen.od?.cilindro || '0'}   Eje: ${examen.od?.eje || '0'}°`);
    doc.moveDown(1);
    
    doc.text('Ojo Izquierdo (OS):', { underline: true }).moveDown(0.5);
    doc.text(`Esfera: ${examen.oi?.esfera || '0'}   Cilindro: ${examen.oi?.cilindro || '0'}   Eje: ${examen.oi?.eje || '0'}°`);
    doc.moveDown(1.5);
    
    // Globales
    doc.text('Datos Adicionales:', { underline: true }).moveDown(0.5);
    doc.text(`Adición: ${examen.adicion || '-'}   DP: ${examen.dp || '-'}   AP: ${examen.ap || '-'}`);
    
    doc.moveDown(3);
    doc.fontSize(10).fillColor('#94a3b8').text('Gracias por confiar en DIOPTRIOS para tu salud visual.', { align: 'center' });
    
    doc.end();

    const pdfBuffer = await new Promise(resolve => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });

    // Enviar correo
    const mailOptions = {
      from: `"Dioptrios" <${process.env.GMAIL_USER}>`,
      to: correoDestino,
      subject: 'Tu Examen Visual - Óptica Dioptrios',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; text-align: center;">Tu Examen Visual</h2>
          <p>Hola <strong>${pacienteNombre}</strong>,</p>
          <p>Adjunto a este correo encontrarás el documento PDF con los resultados de tu examen visual reciente.</p>
          <p>Si tienes alguna duda, no dudes en contactarnos.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="text-align: center; font-size: 12px; color: #888;">Óptica Dioptrios</p>
        </div>
      `,
      attachments: [{
        filename: `Examen_Visual_${(pacienteNombre || 'Paciente').replace(/ /g, '_')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    };

    const transporter = crearTransporter();
    if (!transporter) {
      console.log('SIMULACIÓN PDF: Correo no configurado. PDF generado con éxito.');
      return respuesta.json({ success: true, message: 'Correo simulado (PDF generado)' });
    }

    await transporter.sendMail(mailOptions);
    respuesta.json({ success: true, message: 'Correo enviado con PDF adjunto' });

  } catch (error) {
    console.error(' Error enviando PDF por correo:', error.message);
    respuesta.status(500).json({ error: error.message });
  }
});

// Endpoint para enviar correo al guardar la venta/pedido con todos los detalles
aplicacion.post('/api/pedidos/enviar-correo-confirmacion', async (peticion, respuesta) => {
  try {
    const { correoDestino, nombreCliente, productos, subtotal, total, adelanto, saldoPendiente, pedidoId, examenData } = peticion.body;
    
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
          recetaHtml += `<div style="font-size: 12px; color: #1e293b; margin-top: 4px;"><strong> Para:</strong> ${item.receta.nombre}</div>`;
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

        return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; vertical-align: top;">${nombreStr}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; vertical-align: top;">${cant}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; vertical-align: top;">$${precio.toFixed(2)}</td>
        </tr>`;
      }
    }).join('');

    let examenHtml = '';
    if (examenData) {
      const ex = examenData;
      examenHtml = `
      <div style="margin-top: 20px; padding: 15px; border: 1px solid #cbd5e1; border-radius: 8px; background-color: #f8fafc;">
        <h3 style="margin-top: 0; color: #1e293b; text-align: center; font-size: 16px;">Resultados de Examen Visual</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: center;">
          <thead>
            <tr style="background-color: #e2e8f0;">
              <th style="padding: 8px;">Ojo</th>
              <th style="padding: 8px;">Esfera</th>
              <th style="padding: 8px;">Cilindro</th>
              <th style="padding: 8px;">Eje</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;"><strong>Derecho (OD)</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">${ex.od?.esfera || '-'}</td>
              <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">${ex.od?.cilindro || '-'}</td>
              <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">${ex.od?.eje || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;"><strong>Izquierdo (OS)</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">${ex.oi?.esfera || '-'}</td>
              <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">${ex.oi?.cilindro || '-'}</td>
              <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">${ex.oi?.eje || '-'}</td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top: 10px; font-size: 13px; text-align: center; color: #475569;">
          <strong>Adición:</strong> ${ex.adicion || '-'} | 
          <strong>DP:</strong> ${ex.dp || '-'} | 
          <strong>AP:</strong> ${ex.ap || '-'}
        </div>
      </div>`;
    }

    const isAbonoOnly = (productos || []).length > 0 && (productos || []).every(p => p.isAbono || p.tipo === 'abono');
    const headerTitle = isAbonoOnly ? 'Comprobante de Pago' : 'Confirmación de Pedido';
    const introText = isAbonoOnly
      ? `<p>Hola <strong>${nombreCliente || 'Cliente'}</strong>,</p>
         <p>Hemos registrado tu pago exitosamente. A continuación te compartimos los detalles de los saldos que has liquidado.</p>`
      : `<p>Hola <strong>${nombreCliente || 'Cliente'}</strong>,</p>
         <p>¡Muchas gracias por tu compra! Tu pedido <strong>#${pedidoId || ''}</strong> ha sido registrado exitosamente.</p>`;
    const footerText = isAbonoOnly
      ? `<p style="margin-top: 20px; font-size: 14px; color: #64748b;">Gracias por tu pago. Seguimos a tu entera disposición para cualquier duda.</p>`
      : `<p style="margin-top: 20px; font-size: 14px; color: #64748b;">Te notificaremos por este mismo medio cuando tus productos / lentes estén listos para ser recogidos en nuestra sucursal.</p>`;

    const htmlContent = `
      <style>@import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&display=swap');</style>
      <div style="font-family: 'Google Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Dioptrios - ${headerTitle}</h1>
        </div>
        <div style="padding: 20px;">
          ${introText}
          
          <h3 style="color: #1e293b; border-bottom: 2px solid #2563eb; padding-bottom: 5px;">Detalles ${isAbonoOnly ? 'del Pago' : 'de la Compra'}</h3>
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

          ${examenHtml}

          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin-top: 15px;">
            <p style="margin: 3px 0; font-size: 14px;"><strong>Subtotal:</strong> $${(Number(subtotal) || 0).toFixed(2)}</p>
            <p style="margin: 3px 0; font-size: 16px; color: #2563eb;"><strong>Total:</strong> $${(Number(total) || 0).toFixed(2)}</p>
            <p style="margin: 3px 0; font-size: 14px; color: #16a34a;"><strong>Adelanto abonado:</strong> $${(Number(adelanto) || 0).toFixed(2)}</p>
            <p style="margin: 3px 0; font-size: 14px; color: ${saldoPendiente > 0 ? '#dc2626' : '#16a34a'};"><strong>Saldo pendiente:</strong> $${(Number(saldoPendiente) || 0).toFixed(2)}</p>
          </div>

          ${footerText}
        </div>
        <div style="background-color: #f8fafc; padding: 10px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Dioptrios - Excelente visión a tu alcance
        </div>
      </div>
    `;

    await enviarEmail({
      destinatario: correoDestino,
      asunto: isAbonoOnly ? `Comprobante de Pago de Saldos - Dioptrios` : `Confirmación de Venta y Pedido #${pedidoId || ''} - Dioptrios`,
      html: htmlContent,
    });

    respuesta.json({ status: 'ok', mensaje: 'Correo enviado exitosamente' });
  } catch (error) {
    console.error(' Error enviando correo de confirmación:', error);
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
      <style>@import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&display=swap');</style>
      <div style="font-family: 'Google Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">¡Tu Pedido está Listo! </h1>
        </div>
        <div style="padding: 20px;">
          <p>Estimado(a) <strong>${nombreCliente || 'Cliente'}</strong>,</p>
          <p>Nos complace informarte que tus productos y/o lentes del pedido <strong>#${pedidoId || ''}</strong> ya se encuentran terminados y listos para pasar a recoger en la sucursal de Dioptrios.</p>
          
          ${itemsList ? `<h3 style="color: #1e293b;">Resumen del Pedido:</h3><ul>${itemsList}</ul>` : ''}

          <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-weight: bold; color: #166534;"> Sucursal: Centro</p>
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
    console.error(' Error notificando pedido listo:', error);
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
    console.error(' Error registrando abono:', error);
    respuesta.status(500).json({ error: error.message });
  }
});

// Marcar lentes terminados
aplicacion.put('/api/ventas/:id/lentes-terminados', async (peticion, respuesta) => {
  try {
    const { id } = peticion.params;

    const updateQuery = `
      UPDATE ventas
      SET lentesTerminados = true, motivoNoTerminado = ''
      WHERE id = $1
      RETURNING *;
    `;
    const { rows: updatedRows } = await conexionBd.query(updateQuery, [id]);
    if (updatedRows.length === 0) {
      return respuesta.status(404).json({ error: 'Venta no encontrada' });
    }

    respuesta.json(updatedRows[0]);
  } catch (error) {
    console.error(' Error marcando lentes como terminados:', error);
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
    console.error(' Error cambiando estado de venta:', error);
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
    const montoStr = String(total_amount || '10.00');
    
    // MODO SIMULACIÓN PARA UI SIN TERMINAL FÍSICA
    if (true) {
      console.log(' [MOCK] Creando orden simulada para UI');
      const mockId = `ORD${Date.now()}TEST`;
      mockOrderStates.set(mockId, { status: 'opened', status_detail: 'opened' });
      return respuesta.json({
        id: mockId,
        external_reference: extRef,
        status: 'opened',
        type: 'point',
        transactions: { payments: [{ amount: montoStr }] }
      });
    }

    const payload = {
      type: 'point',
      external_reference: extRef,
      transactions: {
        payments: [{ amount: montoStr }]
      },
      config: {
        point: { terminal_id: 'CAJAOPTICA01' }
      }
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
      console.error(' Error creando orden MP:', dataMp);
      return respuesta.status(resMp.status).json(dataMp);
    }

    respuesta.json(dataMp);
  } catch (error) {
    console.error(' Error en /api/mercadopago/crear-orden:', error);
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

    // MODO SIMULACIÓN PARA UI SIN TERMINAL FÍSICA
    if (order_id.includes('TEST')) {
      console.log(` [MOCK] Simulando evento ${payload.status} para orden ${order_id}`);
      mockOrderStates.set(order_id, { status: payload.status, status_detail: payload.status_detail || payload.status });
      return respuesta.json({
        action: `order.${payload.status}`,
        data: {
          id: order_id,
          status: payload.status,
          status_detail: payload.status_detail || payload.status
        }
      });
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
      console.error(' Error simulando evento MP:', dataMp);
      return respuesta.status(resMp.status).json(dataMp);
    }

    respuesta.json(dataMp);
  } catch (error) {
    console.error(' Error en /api/mercadopago/simular-evento:', error);
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

    // MODO SIMULACIÓN PARA UI SIN TERMINAL FÍSICA
    if (orderId.includes('TEST')) {
      console.log(` [MOCK] Consultando estado simulado de orden ${orderId}`);
      const mockState = mockOrderStates.get(orderId) || { status: 'processed', status_detail: 'accredited' };
      return respuesta.json({
        id: orderId,
        status: mockState.status,
        status_detail: mockState.status_detail,
        type: 'point'
      });
    }

    const resMp = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const dataMp = await resMp.json();
    if (!resMp.ok) {
      console.error(' Error obteniendo orden MP:', dataMp);
      return respuesta.status(resMp.status).json(dataMp);
    }

    respuesta.json(dataMp);
  } catch (error) {
    console.error(' Error en /api/mercadopago/obtener-orden:', error);
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
  console.log(` Backend operativo en el puerto ${puerto}`);
});