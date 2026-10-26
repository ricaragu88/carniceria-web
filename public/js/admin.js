/**
 * LÓGICA DE ADMINISTRACIÓN DE LA TIENDA Y PRODUCTOS
 */

let currentConfig = null;
let allAdminProducts = [];

document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
});

function getStoredPin() {
  return sessionStorage.getItem('carnicero_pin') || '1234';
}

function checkAdminAuth() {
  const pin = getStoredPin();
  if (pin) {
    loadAll();
  } else {
    window.location.href = 'panel.html';
  }
}

async function loadAll() {
  await loadStoreSettings();
  await loadAdminProducts();
  setupConfigForm();
  setupProductModal();
}

// 1. Cargar Ajustes de la Tienda
async function loadStoreSettings() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.success) {
      currentConfig = data.config;
      document.getElementById('cfg-store-name').value = currentConfig.store_name || '';
      document.getElementById('cfg-store-phone').value = currentConfig.store_phone || '';
      document.getElementById('cfg-store-schedule').value = currentConfig.store_schedule || '';
      document.getElementById('cfg-counter-text').value = currentConfig.counter_text || '';
      document.getElementById('cfg-counter-photo').value = currentConfig.counter_photo || '';

      renderSlotsList(currentConfig.slots || []);
    }
  } catch (err) {
    console.error('Error cargando configuración:', err);
  }
}

function renderSlotsList(slots) {
  const container = document.getElementById('slots-container');
  container.innerHTML = '';

  slots.forEach((s, idx) => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200';
    row.innerHTML = `
      <div class="flex-1">
        <label class="block text-[11px] font-bold text-gray-500 uppercase">Hora de Recogida</label>
        <input type="time" value="${s.slot}" class="slot-time-input w-full p-2 border rounded-lg bg-white font-bold" data-idx="${idx}">
      </div>
      <div class="flex-1">
        <label class="block text-[11px] font-bold text-gray-500 uppercase">Hora Límite de Pedido</label>
        <input type="time" value="${s.limit}" class="slot-limit-input w-full p-2 border rounded-lg bg-white font-bold" data-idx="${idx}">
      </div>
      <button type="button" onclick="removeSlotRow(${idx})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg mt-4 font-bold" title="Eliminar franja">
        ✕
      </button>
    `;
    container.appendChild(row);
  });
}

function addSlotRow() {
  const slots = getCurrentSlotsFromInputs();
  slots.push({ slot: '12:00', limit: '11:00' });
  renderSlotsList(slots);
}

function removeSlotRow(idx) {
  const slots = getCurrentSlotsFromInputs();
  slots.splice(idx, 1);
  renderSlotsList(slots);
}

function getCurrentSlotsFromInputs() {
  const timeInputs = document.querySelectorAll('.slot-time-input');
  const limitInputs = document.querySelectorAll('.slot-limit-input');
  const slots = [];

  timeInputs.forEach((inp, idx) => {
    const slot = inp.value;
    const limit = limitInputs[idx] ? limitInputs[idx].value : '';
    if (slot) {
      slots.push({ slot, limit });
    }
  });

  return slots;
}

// 2. Guardar Ajustes de la Tienda
function setupConfigForm() {
  const form = document.getElementById('store-config-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const pin = getStoredPin();
    const payload = {
      pin: pin,
      store_name: document.getElementById('cfg-store-name').value.trim(),
      store_phone: document.getElementById('cfg-store-phone').value.trim(),
      store_schedule: document.getElementById('cfg-store-schedule').value.trim(),
      counter_text: document.getElementById('cfg-counter-text').value.trim(),
      counter_photo: document.getElementById('cfg-counter-photo').value.trim(),
      slots: getCurrentSlotsFromInputs()
    };

    const newPin = document.getElementById('cfg-new-pin').value.trim();
    if (newPin) {
      payload.new_pin = newPin;
    }

    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (newPin) {
          sessionStorage.setItem('carnicero_pin', newPin);
        }
        alert('✓ Ajustes guardados correctamente.');
      } else {
        alert(data.message || 'Error guardando ajustes.');
      }
    } catch (err) {
      alert('Error de conexión.');
    }
  });
}

// 3. Cargar y Gestionar Productos
async function loadAdminProducts() {
  const container = document.getElementById('admin-products-table');
  try {
    const res = await fetch('/api/products?all=true');
    const data = await res.json();
    if (data.success) {
      allAdminProducts = data.products;
      renderAdminProductsTable();
    }
  } catch (err) {
    console.error('Error cargando productos:', err);
  }
}

function renderAdminProductsTable() {
  const container = document.getElementById('admin-products-table');
  container.innerHTML = '';

  allAdminProducts.forEach(p => {
    const row = document.createElement('tr');
    row.className = 'border-b border-gray-100 hover:bg-gray-50';

    const statusBadge = p.is_available
      ? `<span class="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-bold">Disponible</span>`
      : `<span class="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-bold">Agotado</span>`;

    const toggleText = p.is_available ? 'Marcar Agotado' : 'Activar Producto';
    const toggleClass = p.is_available 
      ? 'bg-amber-100 hover:bg-amber-200 text-amber-800' 
      : 'bg-green-100 hover:bg-green-200 text-green-800';

    row.innerHTML = `
      <td class="p-3">
        <div class="flex items-center gap-3">
          <img src="${p.image_url || 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=150&q=80'}" 
               class="w-12 h-12 object-cover rounded-xl border border-gray-200">
          <div>
            <div class="font-bold text-gray-900">${p.name}</div>
            <div class="text-xs text-gray-500">${p.category}</div>
          </div>
        </div>
      </td>
      <td class="p-3 font-bold text-gray-900">
        ${Number(p.price).toFixed(2)} €/${p.unit}
      </td>
      <td class="p-3 text-xs text-gray-600 max-w-xs truncate">
        ${(p.options || []).join(', ') || 'Sin opciones'}
      </td>
      <td class="p-3">
        ${statusBadge}
      </td>
      <td class="p-3 text-right space-x-2">
        <button onclick="toggleProductAvailability(${p.id}, ${p.is_available ? 0 : 1})" 
                class="text-xs font-bold px-2.5 py-1.5 rounded-lg ${toggleClass} transition-all">
          ${toggleText}
        </button>
        <button onclick="openEditProductModal(${p.id})" 
                class="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 transition-all">
          Editar
        </button>
        <button onclick="deleteProduct(${p.id})" 
                class="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 transition-all">
          Eliminar
        </button>
      </td>
    `;
    container.appendChild(row);
  });
}

// 4. Alternar disponibilidad
async function toggleProductAvailability(id, newStatus) {
  try {
    const res = await fetch(`/api/products/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: getStoredPin(), is_available: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      loadAdminProducts();
    }
  } catch (err) {
    alert('Error al actualizar el estado del producto.');
  }
}

// 5. Eliminar producto
async function deleteProduct(id) {
  if (!confirm('¿Seguro que deseas eliminar este producto del catálogo?')) return;
  try {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: getStoredPin() })
    });
    const data = await res.json();
    if (data.success) {
      loadAdminProducts();
    }
  } catch (err) {
    alert('Error al eliminar producto.');
  }
}

// 6. Modal Crear / Editar Producto
function setupProductModal() {
  const form = document.getElementById('product-form');
  const cancelBtn = document.getElementById('cancel-product-btn');
  const modal = document.getElementById('product-modal');

  cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const productId = document.getElementById('prod-id').value;
    const optionsRaw = document.getElementById('prod-options').value.trim();
    const optionsArray = optionsRaw ? optionsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    const payload = {
      pin: getStoredPin(),
      name: document.getElementById('prod-name').value.trim(),
      category: document.getElementById('prod-category').value,
      price: parseFloat(document.getElementById('prod-price').value),
      unit: document.getElementById('prod-unit').value,
      step: document.getElementById('prod-unit').value === 'kg' ? 0.25 : 1.0,
      image_url: document.getElementById('prod-image').value.trim(),
      options: optionsArray,
      is_available: document.getElementById('prod-available').checked ? 1 : 0
    };

    const isEdit = !!productId;
    const url = isEdit ? `/api/products/${productId}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        modal.classList.add('hidden');
        loadAdminProducts();
      } else {
        alert(data.message || 'Error guardando producto.');
      }
    } catch (err) {
      alert('Error de conexión.');
    }
  });
}

function openCreateProductModal() {
  document.getElementById('product-modal-title').textContent = 'Añadir Nuevo Producto';
  document.getElementById('prod-id').value = '';
  document.getElementById('prod-name').value = '';
  document.getElementById('prod-category').value = 'Ternera';
  document.getElementById('prod-price').value = '';
  document.getElementById('prod-unit').value = 'kg';
  document.getElementById('prod-options').value = 'Filetes finos, Filetes gruesos, Para empanar';
  document.getElementById('prod-image').value = '';
  document.getElementById('prod-available').checked = true;

  document.getElementById('product-modal').classList.remove('hidden');
}

function openEditProductModal(id) {
  const p = allAdminProducts.find(prod => prod.id === id);
  if (!p) return;

  document.getElementById('product-modal-title').textContent = 'Editar Producto';
  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-name').value = p.name;
  document.getElementById('prod-category').value = p.category;
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-unit').value = p.unit;
  document.getElementById('prod-options').value = (p.options || []).join(', ');
  document.getElementById('prod-image').value = p.image_url || '';
  document.getElementById('prod-available').checked = !!p.is_available;

  document.getElementById('product-modal').classList.remove('hidden');
}
