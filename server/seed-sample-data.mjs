import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || '192.168.1.73';
const DB_USER = process.env.DB_USER || 'admin_dioptrios';
const DB_PASSWORD = process.env.DB_PASSWORD || 'dioptrios12';
const DB_NAME = process.env.DB_NAME || 'dioptrios';
const DB_PORT = process.env.DB_PORT || 5432;

// ... (Mantén tus constantes sampleInventory, samplePatients, sampleExams, samplePedidos, sampleVentas IGUALES) ...

(async () => {
  const client = new Client({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT
  });

  await client.connect();

  console.log('Limpiando base de datos...');
  // En PostgreSQL no usamos FOREIGN_KEY_CHECKS, simplemente borramos en orden inverso
  await client.query('TRUNCATE ventas, pedidos, examenes, pacientes, inventario RESTART IDENTITY CASCADE');

  const insertRow = async (sql, params) => {
    // Reemplaza los ? de tu código original por $1, $2, etc. (ya lo hice en los inserts de abajo)
    await client.query(sql, params);
  };

  console.log('Insertando datos...');
  
  for (const item of sampleInventory) {
    await insertRow('INSERT INTO inventario (id, marca, modelo, tipo, cantidad, precio, imagen) VALUES ($1, $2, $3, $4, $5, $6, $7)', [item.id, item.marca, item.modelo, item.tipo, item.cantidad, item.precio, item.imagen]);
  }

  for (const paciente of samplePatients) {
    await insertRow('INSERT INTO pacientes (id, nombre, telefono, correo, fechaNacimiento, peso, estatura, historialClinico, direccion) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [paciente.id, paciente.nombre, paciente.telefono, paciente.correo, paciente.fechaNacimiento, paciente.peso, paciente.estatura, paciente.historialClinico, paciente.direccion]);
  }

  for (const examen of sampleExams) {
    await insertRow('INSERT INTO examenes (id, pacienteId, od, oi, tipoArmazon, tratamientoLentes, fecha) VALUES ($1, $2, $3, $4, $5, $6, $7)', [examen.id, examen.pacienteId, examen.od, examen.oi, examen.tipoArmazon, examen.tratamientoLentes, examen.fecha]);
  }

  for (const pedido of samplePedidos) {
    await insertRow('INSERT INTO pedidos (id, examenId, pacienteId, productos, total, estado, fecha) VALUES ($1, $2, $3, $4, $5, $6, $7)', [pedido.id, pedido.examenId, pedido.pacienteId, pedido.productos, pedido.total, pedido.estado, pedido.fecha]);
  }

  for (const venta of sampleVentas) {
    await insertRow('INSERT INTO ventas (id, pacienteId, productos, detallesLentes, subtotalCarrito, total, adelanto, saldoPendiente, estadoPago, lentesTerminados, motivoNoTerminado, examenId, consulta, fecha) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)', [venta.id, venta.pacienteId, venta.productos, venta.detallesLentes, venta.subtotalCarrito, venta.total, venta.adelanto, venta.saldoPendiente, venta.estadoPago, venta.lentesTerminados, venta.motivoNoTerminado, venta.examenId, venta.consulta, venta.fecha]);
  }

  console.log('Datos insertados exitosamente.');
  await client.end();
})();
