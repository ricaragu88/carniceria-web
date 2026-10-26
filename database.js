const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'carniceria.db');
const db = new DatabaseSync(DB_PATH);

// Configuración inicial de la base de datos
db.exec('PRAGMA foreign_keys = ON;');

// 1. Tabla de configuración del negocio
db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    store_name TEXT NOT NULL,
    store_phone TEXT NOT NULL,
    store_schedule TEXT NOT NULL,
    counter_photo TEXT,
    counter_text TEXT,
    slots_json TEXT NOT NULL,
    admin_pin TEXT NOT NULL
  );
`);

// 2. Tabla de productos
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    step REAL NOT NULL DEFAULT 0.25,
    options_json TEXT NOT NULL DEFAULT '[]',
    image_url TEXT,
    is_available INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 3. Tabla de pedidos
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    pickup_slot TEXT NOT NULL,
    notes TEXT,
    items_json TEXT NOT NULL,
    estimated_total REAL NOT NULL,
    final_amount REAL,
    status TEXT NOT NULL DEFAULT 'RECIBIDO',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Función de inicialización con datos demostrativos si está vacía
function seedDatabase() {
  // Comprobar si ya hay configuración
  const configRow = db.prepare('SELECT id FROM config WHERE id = 1').get();
  if (!configRow) {
    const defaultSlots = JSON.stringify([
      { slot: "13:00", limit: "12:00" },
      { slot: "14:00", limit: "13:00" },
      { slot: "19:00", limit: "18:00" },
      { slot: "20:00", limit: "19:00" }
    ]);

    db.prepare(`
      INSERT INTO config (id, store_name, store_phone, store_schedule, counter_photo, counter_text, slots_json, admin_pin)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "Carnicería Parque Hispanidad",
      "+34600123456",
      "L-V 9:00-14:00 y 17:00-20:00; S 9:00-14:00",
      "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80",
      "¡Hoy Ternasco de Aragón recién llegado y Chuletón de vaca vieja madurado! Reserva tu corte favorito.",
      defaultSlots,
      "1234"
    );
  }

  // Comprobar si hay productos
  const countRow = db.prepare('SELECT COUNT(*) as total FROM products').get();
  if (countRow.total === 0) {
    const sampleProducts = [
      {
        name: "Filetes de Ternera (Babilla 1ª)",
        category: "Ternera",
        price: 15.90,
        unit: "kg",
        step: 0.25,
        options: ["Filetes muy finos (vuelta y vuelta)", "Grosor normal", "Gruesos para plancha", "Empanar con cariño"],
        image: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80"
      },
      {
        name: "Entrecot de Vaca Madurada",
        category: "Ternera",
        price: 24.50,
        unit: "kg",
        step: 0.25,
        options: ["Corte estándar (aprox. 350g)", "Corte grueso (500g)", "Sin hueso", "Para congelar"],
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"
      },
      {
        name: "Carne Picada Mixta (Ternera y Cerdo)",
        category: "Ternera",
        price: 10.95,
        unit: "kg",
        step: 0.25,
        options: ["Picada 1 vez (tradicional)", "Picada 2 veces (más fina para albóndigas)", "Envasado para congelar"],
        image: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&w=600&q=80"
      },
      {
        name: "Pechuga de Pollo de Corral",
        category: "Pollo y aves",
        price: 9.80,
        unit: "kg",
        step: 0.25,
        options: ["Fileteada fina", "Fileteada normal", "Entera limpia", "Tacos para arroz o fajitas"],
        image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=600&q=80"
      },
      {
        name: "Pollo Entero Limpio (Evicerado)",
        category: "Pollo y aves",
        price: 4.95,
        unit: "kg",
        step: 1.0,
        options: ["Entero con cuello y molleja", "Para asar (abierto libro)", "Troceado en 4 partes", "Troceado menudo para guiso"],
        image: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=600&q=80"
      },
      {
        name: "Chuletitas de Ternasco de Aragón IGP",
        category: "Cordero",
        price: 22.80,
        unit: "kg",
        step: 0.25,
        options: ["Palo y riñonada surtidas", "Solo de palo", "Corte fino para plancha", "Para brasa"],
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"
      },
      {
        name: "Paletilla de Ternasco Marcada",
        category: "Cordero",
        price: 19.50,
        unit: "kg",
        step: 0.5,
        options: ["Marcada para horno", "Troceada para caldereta", "Entera"],
        image: "https://images.unsplash.com/photo-1514944298352-f47ec05166a9?auto=format&fit=crop&w=600&q=80"
      },
      {
        name: "Costillar Ibérico de Cerdo",
        category: "Cerdo",
        price: 9.90,
        unit: "kg",
        step: 0.5,
        options: ["Tira entera", "Troceado para guiso", "Churruscado para barbacoa"],
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"
      },
      {
        name: "Secreto Ibérico Fresco",
        category: "Cerdo",
        price: 16.90,
        unit: "kg",
        step: 0.25,
        options: ["Pieza entera", "Fileteado grueso", "Para congelar"],
        image: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=600&q=80"
      },
      {
        name: "Longaniza de Graus Artesana",
        category: "Embutidos y elaborados",
        price: 11.50,
        unit: "kg",
        step: 0.25,
        options: ["Tira entera", "En raciones individuales", "Envasar al vacío"],
        image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80"
      },
      {
        name: "Hamburguesas Caseras de Ternera (Pack 2 uds)",
        category: "Embutidos y elaborados",
        price: 3.50,
        unit: "ud",
        step: 1.0,
        options: ["Tradicionales con sal y pimienta", "Con queso y cebolla caramelizada", "Para congelar individual"],
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80"
      },
      {
        name: "Cachopo Casero Relleno de Jamón y Queso",
        category: "Del día",
        price: 7.90,
        unit: "ud",
        step: 1.0,
        options: ["Listo para freír", "Con queso Idiazábal", "Para congelar"],
        image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80"
      }
    ];

    const insertProduct = db.prepare(`
      INSERT INTO products (name, category, price, unit, step, options_json, image_url, is_available)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    for (const p of sampleProducts) {
      insertProduct.run(
        p.name,
        p.category,
        p.price,
        p.unit,
        p.step,
        JSON.stringify(p.options),
        p.image
      );
    }
  }
}

// Ejecutar el semillero inicial
seedDatabase();

// Métodos de ayuda
const DB = {
  // Configuración
  getConfig() {
    const config = db.prepare('SELECT * FROM config WHERE id = 1').get();
    if (config && config.slots_json) {
      try {
        config.slots = JSON.parse(config.slots_json);
      } catch (e) {
        config.slots = [];
      }
    }
    return config;
  },

  updateConfig(data) {
    db.prepare(`
      UPDATE config SET
        store_name = ?,
        store_phone = ?,
        store_schedule = ?,
        counter_photo = ?,
        counter_text = ?,
        slots_json = ?,
        admin_pin = ?
      WHERE id = 1
    `).run(
      data.store_name,
      data.store_phone,
      data.store_schedule,
      data.counter_photo,
      data.counter_text,
      typeof data.slots === 'string' ? data.slots : JSON.stringify(data.slots || []),
      data.admin_pin || "1234"
    );
    return this.getConfig();
  },

  // Productos
  getProducts(includeUnavailable = false) {
    let sql = 'SELECT * FROM products';
    if (!includeUnavailable) {
      sql += ' WHERE is_available = 1';
    }
    sql += ' ORDER BY category, name ASC';
    const rows = db.prepare(sql).all();
    return rows.map(r => ({
      ...r,
      options: JSON.parse(r.options_json || '[]')
    }));
  },

  getProductById(id) {
    const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      options: JSON.parse(row.options_json || '[]')
    };
  },

  addProduct(product) {
    const stmt = db.prepare(`
      INSERT INTO products (name, category, price, unit, step, options_json, image_url, is_available)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      product.name,
      product.category,
      parseFloat(product.price) || 0,
      product.unit || 'kg',
      parseFloat(product.step) || 0.25,
      typeof product.options === 'string' ? product.options : JSON.stringify(product.options || []),
      product.image_url || '',
      product.is_available === 0 ? 0 : 1
    );
    return this.getProductById(result.lastInsertRowid);
  },

  updateProduct(id, product) {
    db.prepare(`
      UPDATE products SET
        name = ?,
        category = ?,
        price = ?,
        unit = ?,
        step = ?,
        options_json = ?,
        image_url = ?,
        is_available = ?
      WHERE id = ?
    `).run(
      product.name,
      product.category,
      parseFloat(product.price) || 0,
      product.unit || 'kg',
      parseFloat(product.step) || 0.25,
      typeof product.options === 'string' ? product.options : JSON.stringify(product.options || []),
      product.image_url || '',
      product.is_available ? 1 : 0,
      id
    );
    return this.getProductById(id);
  },

  toggleProductAvailability(id, is_available) {
    db.prepare('UPDATE products SET is_available = ? WHERE id = ?').run(is_available ? 1 : 0, id);
    return this.getProductById(id);
  },

  deleteProduct(id) {
    return db.prepare('DELETE FROM products WHERE id = ?').run(id);
  },

  // Generador de código correlativo C-001, C-002...
  getNextOrderCode() {
    const row = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    const nextNum = (row ? row.count : 0) + 1;
    return `C-${String(nextNum).padStart(3, '0')}`;
  },

  // Pedidos
  createOrder(orderData) {
    const code = this.getNextOrderCode();
    const itemsJson = typeof orderData.items === 'string' ? orderData.items : JSON.stringify(orderData.items || []);
    
    const stmt = db.prepare(`
      INSERT INTO orders (code, customer_name, customer_address, customer_phone, pickup_slot, notes, items_json, estimated_total, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'RECIBIDO')
    `);

    const result = stmt.run(
      code,
      orderData.customer_name,
      orderData.customer_address,
      orderData.customer_phone,
      orderData.pickup_slot,
      orderData.notes || '',
      itemsJson,
      parseFloat(orderData.estimated_total) || 0
    );

    return this.getOrderById(result.lastInsertRowid);
  },

  getOrderById(id) {
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      items: JSON.parse(row.items_json || '[]')
    };
  },

  getOrderByCode(code) {
    const row = db.prepare('SELECT * FROM orders WHERE code = ?').get(code);
    if (!row) return null;
    return {
      ...row,
      items: JSON.parse(row.items_json || '[]')
    };
  },

  getOrders(filters = {}) {
    let sql = 'SELECT * FROM orders';
    const params = [];
    const conditions = [];

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters.date) {
      conditions.push('DATE(created_at) = DATE(?)');
      params.push(filters.date);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Ordenar por franja de recogida y por fecha de creación
    sql += ' ORDER BY pickup_slot ASC, created_at ASC';

    const rows = db.prepare(sql).all(...params);
    return rows.map(r => ({
      ...r,
      items: JSON.parse(r.items_json || '[]')
    }));
  },

  updateOrderStatus(id, status, finalAmount = null) {
    if (finalAmount !== null && finalAmount !== undefined) {
      db.prepare(`
        UPDATE orders 
        SET status = ?, final_amount = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, parseFloat(finalAmount), id);
    } else {
      db.prepare(`
        UPDATE orders 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, id);
    }
    return this.getOrderById(id);
  }
};

module.exports = DB;
