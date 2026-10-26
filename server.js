require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const DB = require('./database');
const WhatsAppService = require('./services/whatsappService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// RUTAS DE LA API
// ==========================================

// 1. Configuración de la tienda
app.get('/api/config', (req, res) => {
  try {
    const config = DB.getConfig();
    // No enviar admin_pin al público general
    const publicConfig = {
      store_name: config.store_name,
      store_phone: config.store_phone,
      store_schedule: config.store_schedule,
      counter_photo: config.counter_photo,
      counter_text: config.counter_text,
      slots: config.slots
    };
    res.json({ success: true, config: publicConfig });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Comprobar PIN de acceso del carnicero
app.post('/api/auth/verify', (req, res) => {
  const { pin } = req.body;
  const config = DB.getConfig();
  if (pin === config.admin_pin || pin === process.env.ADMIN_PIN) {
    res.json({ success: true, message: 'Acceso autorizado' });
  } else {
    res.status(401).json({ success: false, message: 'PIN incorrecto' });
  }
});

// Actualizar configuración (protegido por PIN)
app.put('/api/config', (req, res) => {
  try {
    const { pin, store_name, store_phone, store_schedule, counter_photo, counter_text, slots, new_pin } = req.body;
    const currentConfig = DB.getConfig();
    if (pin !== currentConfig.admin_pin && pin !== process.env.ADMIN_PIN) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const updated = DB.updateConfig({
      store_name: store_name || currentConfig.store_name,
      store_phone: store_phone || currentConfig.store_phone,
      store_schedule: store_schedule || currentConfig.store_schedule,
      counter_photo: counter_photo !== undefined ? counter_photo : currentConfig.counter_photo,
      counter_text: counter_text !== undefined ? counter_text : currentConfig.counter_text,
      slots: slots || currentConfig.slots,
      admin_pin: new_pin || currentConfig.admin_pin
    });

    res.json({ success: true, config: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Productos
app.get('/api/products', (req, res) => {
  try {
    const includeAll = req.query.all === 'true';
    const products = DB.getProducts(includeAll);
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const { pin, ...productData } = req.body;
    const config = DB.getConfig();
    if (pin !== config.admin_pin && pin !== process.env.ADMIN_PIN) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }
    const newProduct = DB.addProduct(productData);
    res.status(201).json({ success: true, product: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const { pin, ...productData } = req.body;
    const config = DB.getConfig();
    if (pin !== config.admin_pin && pin !== process.env.ADMIN_PIN) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }
    const updated = DB.updateProduct(req.params.id, productData);
    res.json({ success: true, product: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/products/:id/toggle', (req, res) => {
  try {
    const { pin, is_available } = req.body;
    const config = DB.getConfig();
    if (pin !== config.admin_pin && pin !== process.env.ADMIN_PIN) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }
    const updated = DB.toggleProductAvailability(req.params.id, is_available);
    res.json({ success: true, product: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const { pin } = req.body;
    const config = DB.getConfig();
    if (pin !== config.admin_pin && pin !== process.env.ADMIN_PIN) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }
    DB.deleteProduct(req.params.id);
    res.json({ success: true, message: 'Producto eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Pedidos
// Crear pedido desde el catálogo (Vecino)
app.post('/api/orders', (req, res) => {
  try {
    const { customer_name, customer_address, customer_phone, pickup_slot, notes, items, estimated_total } = req.body;

    if (!customer_name || !customer_address || !customer_phone || !pickup_slot || !items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Por favor, rellena todos los campos obligatorios y añade al menos un producto.' 
      });
    }

    const order = DB.createOrder({
      customer_name,
      customer_address,
      customer_phone,
      pickup_slot,
      notes,
      items,
      estimated_total
    });

    const storeConfig = DB.getConfig();
    const whatsappLink = WhatsAppService.getNewOrderLink(storeConfig.store_phone, order);

    res.status(201).json({
      success: true,
      order,
      whatsappLink,
      message: 'Pedido registrado con éxito.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Listar pedidos (Panel del Carnicero)
app.get('/api/orders', (req, res) => {
  try {
    const { status, date } = req.query;
    const orders = DB.getOrders({ status, date });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cambiar estado de un pedido (Carnicero)
app.patch('/api/orders/:id/status', (req, res) => {
  try {
    const { status, final_amount } = req.body;
    const orderId = req.params.id;

    if (!['RECIBIDO', 'CONFIRMADO', 'PREPARANDO', 'LISTO', 'RECOGIDO', 'CANCELADO'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Estado no válido' });
    }

    const updatedOrder = DB.updateOrderStatus(orderId, status, final_amount);

    let customerWhatsappLink = null;
    if (status === 'LISTO') {
      const storeConfig = DB.getConfig();
      customerWhatsappLink = WhatsAppService.getOrderReadyLink(
        updatedOrder.customer_phone, 
        updatedOrder, 
        storeConfig.store_name
      );
    }

    res.json({
      success: true,
      order: updatedOrder,
      customerWhatsappLink
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Redirigir la raíz al catálogo
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🥩 CARNICERÍA DIGITAL - SERVIDOR ACTIVO`);
  console.log(`🌐 Acceso Catálogo Vecinos: http://localhost:${PORT}`);
  console.log(`📋 Panel del Carnicero:     http://localhost:${PORT}/panel.html`);
  console.log(`⚙️  Administración Tienda:   http://localhost:${PORT}/admin.html`);
  console.log(`====================================================`);
});
