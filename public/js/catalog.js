/**
 * LÓGICA DEL CATÁLOGO PARA EL VECINO (Mobile-First)
 */

let allProducts = [];
let currentCategory = 'TODOS';
let cart = [];
let storeConfig = null;

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', async () => {
  await loadStoreConfig();
  await loadProducts();
  setupCategoryButtons();
  setupEventListeners();
});

// 1. Cargar Configuración de la Tienda y Franjas
async function loadStoreConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.success) {
      storeConfig = data.config;
      renderStoreHeader();
      renderTodayCounter();
      renderPickupSlots();
    }
  } catch (err) {
    console.error('Error cargando configuración:', err);
  }
}

function renderStoreHeader() {
  if (!storeConfig) return;
  document.getElementById('store-title').textContent = storeConfig.store_name;
  document.getElementById('store-schedule').textContent = storeConfig.store_schedule;
  document.getElementById('store-phone-display').textContent = storeConfig.store_phone;
  document.title = `${storeConfig.store_name} — Pedidos Online`;
}

function renderTodayCounter() {
  const container = document.getElementById('today-counter-section');
  if (!storeConfig || (!storeConfig.counter_photo && !storeConfig.counter_text)) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');
  const imgEl = document.getElementById('today-counter-img');
  const textEl = document.getElementById('today-counter-text');

  if (storeConfig.counter_photo) {
    imgEl.src = storeConfig.counter_photo;
    imgEl.classList.remove('hidden');
  } else {
    imgEl.classList.add('hidden');
  }

  textEl.textContent = storeConfig.counter_text || '¡Visítanos o haz tu pedido anticipado!';
}

// 2. Franjas de recogida con validación de hora límite
function renderPickupSlots() {
  const select = document.getElementById('order-slot');
  select.innerHTML = '<option value="">Selecciona franja de recogida...</option>';

  if (!storeConfig || !Array.isArray(storeConfig.slots)) return;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let availableCount = 0;

  storeConfig.slots.forEach(s => {
    // Calcular minutos límite
    let isExpired = false;
    if (s.limit) {
      const [limitH, limitM] = s.limit.split(':').map(Number);
      const limitMinutes = limitH * 60 + (limitM || 0);
      if (currentMinutes > limitMinutes) {
        isExpired = true;
      }
    }

    const option = document.createElement('option');
    option.value = s.slot;

    if (isExpired) {
      option.disabled = true;
      option.textContent = `${s.slot} (Cerrada para hoy - límite ${s.limit})`;
      option.classList.add('text-gray-400');
    } else {
      option.textContent = `${s.slot} (Disponible - pedir antes de las ${s.limit})`;
      availableCount++;
    }

    select.appendChild(option);
  });

  // Si todas las franjas de hoy están cerradas, avisar amablemente
  const warningEl = document.getElementById('slots-warning');
  if (availableCount === 0 && storeConfig.slots.length > 0) {
    warningEl.classList.remove('hidden');
    warningEl.innerHTML = `⚠️ Las franjas de hoy han alcanzado su hora límite. Si necesitas un encargo urgente, puedes contactar al carnicero directamente al <a class="underline font-bold" href="tel:${storeConfig.store_phone}">${storeConfig.store_phone}</a>.`;
  } else {
    warningEl.classList.add('hidden');
  }
}

// 3. Cargar y Mostrar Productos
async function loadProducts() {
  const container = document.getElementById('products-container');
  container.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500 font-medium">Cargando carnes y elaborados del día...</div>';

  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (data.success) {
      allProducts = data.products;
      renderProducts();
    }
  } catch (err) {
    container.innerHTML = '<div class="col-span-full text-center py-10 text-red-600">No se pudieron cargar los productos. Por favor recarga la página.</div>';
  }
}

function renderProducts() {
  const container = document.getElementById('products-container');
  container.innerHTML = '';

  const filtered = currentCategory === 'TODOS'
    ? allProducts
    : allProducts.filter(p => p.category.toLowerCase() === currentCategory.toLowerCase());

  if (filtered.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">No hay productos disponibles en esta categoría en este momento.</div>';
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between transition-all hover:shadow-md';
    
    // Opciones de preparación dinámicas
    const optionsHtml = p.options && p.options.length > 0
      ? `
        <div class="mt-3">
          <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">¿Cómo lo prefieres preparado?</label>
          <select id="prep-${p.id}" class="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600">
            ${p.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
          </select>
        </div>
      `
      : '';

    const unitLabel = p.unit === 'kg' ? '€/kg' : '€/ud';
    const stepLabel = p.unit === 'kg' ? '0.25 kg' : '1 ud';
    const defaultQty = p.unit === 'kg' ? 0.5 : 1;

    card.innerHTML = `
      <div>
        <div class="h-44 w-full bg-gray-100 overflow-hidden relative">
          <img src="${p.image_url || 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=600&q=80'}" 
               alt="${p.name}" 
               class="w-full h-full object-cover"
               loading="lazy">
          <span class="absolute top-2 left-2 bg-black/70 backdrop-blur text-white text-xs px-2.5 py-1 rounded-full font-medium">
            ${p.category}
          </span>
        </div>
        <div class="p-4">
          <h3 class="font-bold text-lg text-gray-900 leading-snug">${p.name}</h3>
          <div class="mt-1 flex items-baseline gap-1">
            <span class="text-xl font-extrabold text-red-700">${Number(p.price).toFixed(2)} ${unitLabel}</span>
            <span class="text-xs text-gray-500 font-medium">(orientativo)</span>
          </div>

          ${optionsHtml}
        </div>
      </div>

      <div class="p-4 pt-0">
        <!-- Selector de cantidad grande y ergonómico -->
        <div class="mt-3 bg-gray-100 rounded-xl p-1.5 flex items-center justify-between">
          <button type="button" onclick="adjustCardQty(${p.id}, -${p.step || 0.25})" 
                  class="w-11 h-11 bg-white rounded-lg shadow-sm font-bold text-xl text-gray-800 flex items-center justify-center hover:bg-red-50 hover:text-red-700 active:scale-95 transition-all">
            −
          </button>
          <div class="text-center font-bold text-gray-800">
            <span id="qty-${p.id}" class="text-lg">${defaultQty}</span>
            <span class="text-xs text-gray-500 block">${p.unit}</span>
          </div>
          <button type="button" onclick="adjustCardQty(${p.id}, ${p.step || 0.25})" 
                  class="w-11 h-11 bg-white rounded-lg shadow-sm font-bold text-xl text-gray-800 flex items-center justify-center hover:bg-red-50 hover:text-red-700 active:scale-95 transition-all">
            +
          </button>
        </div>

        <button type="button" onclick="addToCart(${p.id})" 
                class="mt-3 w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 active:scale-98 transition-all">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Añadir al pedido
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

function adjustCardQty(productId, delta) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const qtyEl = document.getElementById(`qty-${productId}`);
  let current = parseFloat(qtyEl.textContent) || (product.unit === 'kg' ? 0.5 : 1);
  let next = current + delta;

  const min = product.step || (product.unit === 'kg' ? 0.25 : 1);
  if (next < min) next = min;

  // Redondear a 2 decimales para evitar artefactos de punto flotante
  next = Math.round(next * 100) / 100;
  qtyEl.textContent = next;
}

// 4. Gestión de Categorías
function setupCategoryButtons() {
  const buttons = document.querySelectorAll('.cat-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => {
        b.classList.remove('bg-red-700', 'text-white', 'shadow-md');
        b.classList.add('bg-white', 'text-gray-700', 'border-gray-200');
      });
      btn.classList.remove('bg-white', 'text-gray-700', 'border-gray-200');
      btn.classList.add('bg-red-700', 'text-white', 'shadow-md');

      currentCategory = btn.dataset.category;
      renderProducts();
    });
  });
}

// 5. Gestión del Carrito
function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const qtyEl = document.getElementById(`qty-${productId}`);
  const quantity = parseFloat(qtyEl.textContent) || (product.unit === 'kg' ? 0.5 : 1);

  const prepEl = document.getElementById(`prep-${productId}`);
  const preparation = prepEl ? prepEl.value : '';

  // Buscar si ya existe el mismo producto con la misma preparación
  const existingIndex = cart.findIndex(item => item.product_id === productId && item.preparation === preparation);

  if (existingIndex > -1) {
    cart[existingIndex].quantity = Math.round((cart[existingIndex].quantity + quantity) * 100) / 100;
  } else {
    cart.push({
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      unit: product.unit,
      quantity: quantity,
      preparation: preparation
    });
  }

  updateCartUI();
  showToastNotification(`✓ Añadido: ${product.name}`);
}

function updateCartUI() {
  const countBadge = document.getElementById('cart-count');
  const floatingBtn = document.getElementById('floating-cart-btn');
  const cartTotalDisplay = document.getElementById('floating-cart-total');

  const totalItems = cart.reduce((acc, item) => acc + (item.unit === 'kg' ? 1 : item.quantity), 0);
  const totalEstimated = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  countBadge.textContent = totalItems;
  cartTotalDisplay.textContent = `${totalEstimated.toFixed(2)} €`;

  if (cart.length > 0) {
    floatingBtn.classList.remove('hidden');
    floatingBtn.classList.add('animate-fade-in');
  } else {
    floatingBtn.classList.add('hidden');
  }

  renderCartModalItems(totalEstimated);
}

function renderCartModalItems(totalEstimated) {
  const container = document.getElementById('cart-items-list');
  const emptyMsg = document.getElementById('cart-empty-message');
  const formSection = document.getElementById('order-form-section');
  const totalModalEl = document.getElementById('cart-modal-total');

  if (cart.length === 0) {
    emptyMsg.classList.remove('hidden');
    formSection.classList.add('hidden');
    container.innerHTML = '';
    totalModalEl.textContent = '0.00 €';
    return;
  }

  emptyMsg.classList.add('hidden');
  formSection.classList.remove('hidden');
  totalModalEl.textContent = `${totalEstimated.toFixed(2)} €`;

  container.innerHTML = '';
  cart.forEach((item, idx) => {
    const itemSubtotal = item.price * item.quantity;
    const unitText = item.unit === 'kg' ? 'kg' : 'ud.';
    const prepText = item.preparation ? `<span class="block text-xs text-gray-500 font-medium">Prep: ${item.preparation}</span>` : '';

    const div = document.createElement('div');
    div.className = 'py-3 border-b border-gray-100 flex items-center justify-between gap-3';
    div.innerHTML = `
      <div class="flex-1">
        <h4 class="font-bold text-gray-900 text-sm leading-snug">${item.product_name}</h4>
        ${prepText}
        <div class="text-xs text-gray-600 mt-0.5">
          ${item.quantity} ${unitText} × ${Number(item.price).toFixed(2)} €/${item.unit} = <strong class="text-gray-900">${itemSubtotal.toFixed(2)} €</strong>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" onclick="removeFromCart(${idx})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Eliminar">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    `;
    container.appendChild(div);
  });
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
}

// 6. Toast Notification
function showToastNotification(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');

  setTimeout(() => {
    toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
    toast.classList.remove('opacity-100', 'translate-y-0');
  }, 2200);
}

// 7. Configuración de Eventos y Envío de Pedido
function setupEventListeners() {
  const openCartBtn = document.getElementById('floating-cart-btn');
  const closeCartBtn = document.getElementById('close-cart-btn');
  const cartModal = document.getElementById('cart-modal');
  const orderForm = document.getElementById('order-form');

  openCartBtn.addEventListener('click', () => {
    cartModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  });

  closeCartBtn.addEventListener('click', () => {
    cartModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  });

  // Envío del Formulario
  orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('Tu cesta está vacía.');
      return;
    }

    const name = document.getElementById('order-name').value.trim();
    const address = document.getElementById('order-address').value.trim();
    const phone = document.getElementById('order-phone').value.trim();
    const slot = document.getElementById('order-slot').value;
    const notes = document.getElementById('order-notes').value.trim();

    if (!name || !address || !phone || !slot) {
      alert('Por favor, completa los campos obligatorios: Nombre, Vivienda, Teléfono y Franja de recogida.');
      return;
    }

    const submitBtn = document.getElementById('submit-order-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
      </svg>
      Registrando pedido...
    `;

    const totalEstimated = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const payload = {
      customer_name: name,
      customer_address: address,
      customer_phone: phone,
      pickup_slot: slot,
      notes: notes,
      items: cart,
      estimated_total: totalEstimated
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        // Limpiar cesta
        cart = [];
        updateCartUI();
        cartModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');

        // Mostrar pantalla de confirmación y botón WhatsApp
        showConfirmationModal(data.order, data.whatsappLink);
      } else {
        alert(data.message || 'Error al procesar el pedido.');
      }
    } catch (err) {
      alert('No se pudo conectar con la carnicería. Revisa tu conexión.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Confirmar Pedido y Abrir WhatsApp';
    }
  });
}

function showConfirmationModal(order, whatsappLink) {
  const modal = document.getElementById('confirmation-modal');
  document.getElementById('conf-order-code').textContent = order.code;
  document.getElementById('conf-pickup-slot').textContent = order.pickup_slot;
  document.getElementById('conf-estimated-total').textContent = `${Number(order.estimated_total).toFixed(2)} €`;

  const waBtn = document.getElementById('conf-whatsapp-btn');
  waBtn.href = whatsappLink;

  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}
