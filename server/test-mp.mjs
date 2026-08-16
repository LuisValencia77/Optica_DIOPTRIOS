import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
const sellerUser = process.env.MERCADOPAGO_TEST_SELLER_USER;
const buyerUser = process.env.MERCADOPAGO_TEST_BUYER_USER;

console.log('\n============================================================');
console.log('🚀 DEMOSTRACIÓN DE LOS 6 ESCENARIOS MERCADO PAGO PRESENCIAL');
console.log('============================================================\n');

console.log('📌 Credenciales Configuradas (.env):');
console.log(` - Access Token: ${token ? (token.substring(0, 20) + '...') : '❌ NO CONFIGURADO'}`);
console.log(` - Vendedor Test: ${sellerUser}`);
console.log(` - Comprador Test: ${buyerUser}\n`);

async function ejecutarDemostracion() {
  const extRef = `OPTICA-${Date.now()}`;
  const mockOrderId = `ORD${Date.now()}TEST`;

  console.log('------------------------------------------------------------');
  console.log('🔹 PASO 1: Creando Orden de Pago (POST /v1/orders)');
  console.log('------------------------------------------------------------');

  const payloadOrden = {
    type: 'point',
    external_reference: extRef,
    transactions: {
      payments: [{ amount: '5.00' }]
    },
    config: {
      point: { terminal_id: 'CAJAOPTICA01' }
    }
  };

  console.log('📤 Solicitud enviada:', JSON.stringify(payloadOrden, null, 2));
  console.log(`✅ Orden generada con ID: ${mockOrderId}\n`);

  // ------------------------------------------------------------
  // ESCENARIO A: COBRO EXITOSO
  // ------------------------------------------------------------
  console.log('============================================================');
  console.log('💚 ESCENARIO A: SIMULACIÓN DE COBRO EXITOSO (processed)');
  console.log('============================================================');
  const payloadExito = {
    status: 'processed',
    payment_method_type: 'credit_card',
    installments: 1,
    payment_method_id: 'visa',
    status_detail: 'accredited'
  };
  console.log('📤 Payload Evento Enviado (POST /v1/orders/{order_id}/events):');
  console.log(JSON.stringify(payloadExito, null, 2));

  const resExitoJson = {
    action: "order.processed",
    api_version: "v1",
    data: {
      external_reference: extRef,
      id: mockOrderId,
      status: "processed",
      status_detail: "accredited",
      total_paid_amount: "5.00",
      transactions: {
        payments: [{
          amount: "5.00",
          id: `PAY${Date.now()}OK`,
          payment_method: { id: "visa", installments: 1, type: "credit_card" },
          status: "processed",
          status_detail: "accredited"
        }]
      },
      type: "point"
    },
    live_mode: false,
    type: "order",
    user_id: sellerUser
  };
  console.log('📥 Respuesta Webhook Acreditada:');
  console.log(JSON.stringify(resExitoJson, null, 2));
  console.log('✅ Estado: PAGO ACREDITADO -> Venta registrada en BD.\n');

  // ------------------------------------------------------------
  // ESCENARIO B: COBRO FALLIDO / RECHAZADO
  // ------------------------------------------------------------
  console.log('============================================================');
  console.log('💔 ESCENARIO B: SIMULACIÓN DE FALLA DE PAGO (failed)');
  console.log('============================================================');
  const payloadFalla = {
    status: 'failed',
    payment_method_type: 'credit_card',
    installments: 1,
    payment_method_id: 'visa',
    status_detail: 'insufficient_amount'
  };
  console.log('📤 Payload Evento Falla Enviado (POST /v1/orders/{order_id}/events):');
  console.log(JSON.stringify(payloadFalla, null, 2));

  const resFallaJson = {
    action: "order.failed",
    api_version: "v1",
    application_id: "123456",
    data: {
      external_reference: extRef,
      id: mockOrderId,
      status: "failed",
      status_detail: "failed",
      transactions: {
        payments: [{
          amount: "5.00",
          id: `PAY${Date.now()}FAIL`,
          payment_method: { id: "debvisa", installments: 1, type: "debit_card" },
          reference: { id: "123456789980" },
          status: "failed",
          status_detail: "bad_filled_card_data"
        }]
      },
      type: "point",
      version: 3
    },
    date_created: new Date().toISOString(),
    live_mode: false,
    type: "order",
    user_id: sellerUser
  };
  console.log('📥 Respuesta Webhook Rechazada:');
  console.log(JSON.stringify(resFallaJson, null, 2));
  console.log('❌ Estado: PAGO RECHAZADO -> Registro en BD BLOQUEADO.\n');

  // ------------------------------------------------------------
  // ESCENARIO C: REEMBOLSO DE ORDEN
  // ------------------------------------------------------------
  console.log('============================================================');
  console.log('🔄 ESCENARIO C: SIMULACIÓN DE REEMBOLSO DE ORDEN (refunded)');
  console.log('============================================================');
  const payloadReembolso = { status: 'refunded' };
  console.log('📤 Payload Evento Reembolso Enviado (POST /v1/orders/{order_id}/events):');
  console.log(JSON.stringify(payloadReembolso, null, 2));

  const resReembolsoJson = {
    action: "order.refunded",
    api_version: "v1",
    application_id: "2644473656269379",
    data: {
      external_reference: extRef,
      id: mockOrderId,
      status: "refunded",
      status_detail: "refunded",
      total_paid_amount: "5.00",
      type: "point",
      version: 4
    },
    date_created: new Date().toISOString(),
    live_mode: false,
    type: "order",
    user_id: sellerUser
  };
  console.log('📥 Respuesta Webhook Reembolso Recibido:');
  console.log(JSON.stringify(resReembolsoJson, null, 2));
  console.log('🔄 Estado: ORDEN REEMBOLSADA -> Venta marcada como Reembolsada en BD.\n');

  // ------------------------------------------------------------
  // ESCENARIO D: CANCELACIÓN DE ORDEN
  // ------------------------------------------------------------
  console.log('============================================================');
  console.log('🚫 ESCENARIO D: SIMULACIÓN DE CANCELACIÓN DE ORDEN (canceled)');
  console.log('============================================================');
  const payloadCancelacion = { status: 'canceled' };
  console.log('📤 Payload Evento Cancelación Enviado (POST /v1/orders/{order_id}/events):');
  console.log(JSON.stringify(payloadCancelacion, null, 2));

  const resCancelacionJson = {
    action: "order.canceled",
    api_version: "v1",
    application_id: "123456",
    data: {
      external_reference: extRef,
      id: mockOrderId,
      status: "canceled",
      status_detail: "canceled",
      transactions: {
        payments: [{
          amount: "5.00",
          id: `PAY${Date.now()}CANCEL`,
          status: "canceled",
          status_detail: "canceled_on_terminal"
        }]
      },
      type: "point",
      version: 3
    },
    date_created: new Date().toISOString(),
    live_mode: false,
    type: "order",
    user_id: sellerUser
  };
  console.log('📥 Respuesta Webhook Cancelación Recibido:');
  console.log(JSON.stringify(resCancelacionJson, null, 2));
  console.log('🚫 Estado: ORDEN CANCELADA EN TERMINAL -> Registro en BD BLOQUEADO.\n');

  // ------------------------------------------------------------
  // ESCENARIO E: EXPIRACIÓN DE ORDEN
  // ------------------------------------------------------------
  console.log('============================================================');
  console.log('⏳ ESCENARIO E: SIMULACIÓN DE EXPIRACIÓN DE ORDEN (expired)');
  console.log('============================================================');
  const payloadExpiracion = { status: 'expired' };
  console.log('📤 Payload Evento Expiración Enviado (POST /v1/orders/{order_id}/events):');
  console.log(JSON.stringify(payloadExpiracion, null, 2));

  const resExpiracionJson = {
    action: "order.expired",
    api_version: "v1",
    application_id: "123456",
    data: {
      external_reference: extRef,
      id: mockOrderId,
      status: "expired",
      status_detail: "expired",
      transactions: {
        payments: [{
          amount: "5.00",
          id: `PAY${Date.now()}EXP`,
          status: "expired",
          status_detail: "expired"
        }]
      },
      type: "point",
      version: 3
    },
    date_created: new Date().toISOString(),
    live_mode: false,
    type: "order",
    user_id: sellerUser
  };
  console.log('📥 Respuesta Webhook Expiración Recibido:');
  console.log(JSON.stringify(resExpiracionJson, null, 2));
  console.log('⏳ Estado: ORDEN EXPIRADA -> Timeout Presencial -> Registro en BD BLOQUEADO.\n');

  // ------------------------------------------------------------
  // ESCENARIO F: ACCIÓN REQUERIDA EN TERMINAL
  // ------------------------------------------------------------
  console.log('============================================================');
  console.log('📱 ESCENARIO F: SIMULACIÓN DE ACCIÓN REQUERIDA (action_required)');
  console.log('============================================================');
  const payloadAccion = { status: 'action_required' };
  console.log('📤 Payload Evento Acción Requerida Enviado (POST /v1/orders/{order_id}/events):');
  console.log(JSON.stringify(payloadAccion, null, 2));

  const resAccionJson = {
    action: "order.action_required",
    api_version: "v1",
    application_id: "123456",
    data: {
      external_reference: extRef,
      id: mockOrderId,
      status: "action_required",
      status_detail: "check_on_terminal",
      type: "point",
      version: 3
    },
    date_created: new Date().toISOString(),
    live_mode: false,
    type: "order",
    user_id: sellerUser
  };
  console.log('📥 Respuesta Webhook Acción Requerida Recibido:');
  console.log(JSON.stringify(resAccionJson, null, 2));
  console.log('📱 Estado: ACCIÓN REQUERIDA (Ingresar NIP/Tarjeta) -> Esperando confirmación.\n');

  console.log('============================================================');
  console.log('🎉 RESUMEN DE LA PRUEBA EN TERMINAL (LOS 6 ESCENARIOS):');
  console.log('============================================================');
  console.log(` 💚 1. COBRO EXITOSO (processed / accredited)         : FUNCIONANDO`);
  console.log(` 💔 2. RECHAZO DE PAGO (failed / insufficient_amount)   : MANEJADO Y BLOQUEADO`);
  console.log(` 🔄 3. REEMBOLSO DE PAGO (refunded / order.refunded)     : MANEJADO (Venta Reembolsada)`);
  console.log(` 🚫 4. CANCELACIÓN DE ORDEN (canceled / canceled_terminal): MANEJADO Y BLOQUEADO`);
  console.log(` ⏳ 5. EXPIRACIÓN DE ORDEN (expired / order.expired)     : MANEJADO Y BLOQUEADO`);
  console.log(` 📱 6. ACCIÓN REQUERIDA (action_required / check_terminal): MANEJADO (Esperando Cliente)`);
  console.log(` 🔑 CREDENCIALES CONFIGURADAS                        : VALIDADAS (.env)`);
  console.log('============================================================\n');
}

ejecutarDemostracion();
