/**
 * LÓGICA DEL PANEL DEL CARNICERO
 * Optimizado para mostrador con botones enormes, aviso sonoro y visor de ticket térmico
 */

let ordersList = [];
let knownOrderIds = new Set();
let isFirstLoad = true;
let selectedFilter = 'TODOS';
let currentWeighingOrderId = null;
let currentWeighingCustomerPhone = null;

document.addEventListener('DOMContentLoaded', () => {
  checkAuthAndInit();
});

// 1. Verificación de PIN de acceso
function checkAuthAndInit() {
  const pin = sessionStorage.getItem('carnicero_pin');
  if (pin) {
    showDashboard();
    initPanel();
  } else {
    showPinModal();
  }
}

function showPinModal() {
  document.getElementById('pin-modal').classList.remove('hidden');
  document.getElementById('dashboard-view').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('pin-modal').classList.add('hidden');
  document.getElementById('dashboard-view').classList.remove('hidden');
}

async function verifyPin(enteredPin) {
  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: enteredPin })
    });
    const data = await res.json();
    if (data.success) {
      sessionStorage.setItem('carnicero_pin', enteredPin);
      showDashboard();
      initPanel();
    } else {
      const errorMsg = document.getElementById('pin-error');
      errorMsg.textContent = 'PIN incorrecto. Inténtalo de nuevo.';
      errorMsg.classList.remove('hidden');
    }
  } catch (err) {
    alert('Error al conectar con el servidor.');
  }
}

// 2. Inicialización del Panel
function initPanel() {
  loadOrders();
  setupFilterButtons();
  setupWeighingModal();
  setupTicketModal();

  // Sondeo periódico cada 8 segundos para nuevos pedidos
  setInterval(loadOrders, 8000);
}

// 3. Carga de Pedidos desde la API
async function loadOrders() {
  try {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (data.success) {
      const newOrders = data.orders;
      
      // Comprobar si hay pedidos nuevos para sonar la campana
      if (!isFirstLoad) {
        let hasNew = false;
        newOrders.forEach(o => {
          if (!knownOrderIds.has(o.id) && o.status === 'RECIBIDO') {
            hasNew = true;
          }
        });

        if (hasNew) {
          triggerNewOrderAlert();
        }
      }

      knownOrderIds.clear();
      newOrders.forEach(o => knownOrderIds.add(o.id));
      isFirstLoad = false;

      ordersList = newOrders;
      renderOrders();
      updateBadgeCounts();
    }
  } catch (err) {
    console.error('Error cargando pedidos:', err);
  }
}

function triggerNewOrderAlert() {
  if (window.soundNotifier) {
    window.soundNotifier.playDingDong();
  }
  const alertBanner = document.getElementById('new-order-banner');
  if (alertBanner) {
    alertBanner.classList.remove('hidden');
    setTimeout(() => {
      alertBanner.classList.add('hidden');
    }, 8000);
  }
}

// 4. Renderizado de Pedidos
function renderOrders() {
  const container = document.getElementById('orders-grid');
  container.innerHTML = '';

  let filtered = ordersList;
  if (selectedFilter !== 'TODOS') {
    filtered = ordersList.filter(o => o.status === selectedFilter);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white rounded-3xl p-12 text-center text-gray-400 font-bold text-lg border-2 border-dashed border-gray-200">
        No hay pedidos en estado "${selectedFilter}"
      </div>
    `;
    return;
  }

  filtered.forEach(order => {
    const card = document.createElement('div');
    const statusBg = getStatusBadge(order.status);
    
    // Lista de productos solicitados
    const itemsHtml = (order.items || []).map(it => {
      const unit = it.unit === 'kg' ? 'kg' : 'ud.';
      const prepBadge = it.preparation 
        ? `<span class="inline-block bg-amber-100 text-amber-900 text-xs px-2 py-0.5 rounded-md font-bold ml-1">${it.preparation}</span>` 
        : '';
      return `
        <li class="py-1.5 flex items-start justify-between border-b border-gray-100 last:border-none text-base">
          <span class="font-bold text-gray-900 leading-snug">
            <span class="text-red-700 font-black text-lg mr-1">${it.quantity} ${unit}</span> 
            ${it.product_name}
            ${prepBadge}
          </span>
          <span class="text-xs text-gray-500 font-semibold ml-2">~${(it.price * it.quantity).toFixed(2)}€</span>
        </li>
      `;
    }).join('');

    const cleanCustomerPhone = order.customer_phone.replace(/[^\d+]/g, '');
    const waDirectLink = `https://wa.me/${cleanCustomerPhone}`;

    // Botones de acción según el estado
    let actionsHtml = '';
    if (order.status === 'RECIBIDO') {
      actionsHtml = `
        <div class="grid grid-cols-2 gap-2 mt-4">
          <button onclick="updateStatus(${order.id}, 'CONFIRMADO')" class="btn-touch-large bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow">
            Confirmar
          </button>
          <button onclick="updateStatus(${order.id}, 'PREPARANDO')" class="btn-touch-large bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow">
            Preparando
          </button>
        </div>
      `;
    } else if (order.status === 'CONFIRMADO') {
      actionsHtml = `
        <div class="mt-4">
          <button onclick="updateStatus(${order.id}, 'PREPARANDO')" class="w-full btn-touch-large bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow">
            Comenzar a Preparar
          </button>
        </div>
      `;
    } else if (order.status === 'PREPARANDO') {
      actionsHtml = `
        <div class="mt-4">
          <button onclick="openWeighingModal(${order.id}, '${order.code}', '${cleanCustomerPhone}', ${order.estimated_total})" 
                  class="w-full btn-touch-large bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg border-2 border-green-500">
            ⚖️ Pesar y Marcar LISTO
          </button>
        </div>
      `;
    } else if (order.status === 'LISTO') {
      actionsHtml = `
        <div class="grid grid-cols-2 gap-2 mt-4">
          <button onclick="openWeighingModal(${order.id}, '${order.code}', '${cleanCustomerPhone}', ${order.final_amount || order.estimated_total})" 
                  class="btn-touch-large bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm">
            📲 Reenviar WhatsApp
          </button>
          <button onclick="updateStatus(${order.id}, 'RECOGIDO')" class="btn-touch-large bg-gray-800 hover:bg-black text-white rounded-xl shadow">
            Entregado / Recogido
          </button>
        </div>
      `;
    } else if (order.status === 'RECOGIDO') {
      actionsHtml = `
        <div class="mt-4 text-center py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-500 uppercase tracking-wider">
          Pedido Completado y Cobrado
        </div>
      `;
    }

    const cancelBtn = order.status !== 'RECOGIDO' && order.status !== 'CANCELADO'
      ? `<button onclick="updateStatus(${order.id}, 'CANCELADO')" class="text-xs text-red-500 hover:text-red-700 font-bold underline py-1">Cancelar pedido</button>`
      : '';

    card.className = `bg-white rounded-3xl p-5 shadow-sm border-2 ${order.status === 'RECIBIDO' ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-100'} flex flex-col justify-between`;

    card.innerHTML = `
      <div>
        <!-- Fila superior: Código, Franja y Botón Ticket Térmico -->
        <div class="flex items-center justify-between border-b pb-3 border-gray-100">
          <div class="flex items-center gap-2">
            <span class="text-2xl font-black text-gray-900 tracking-tight">${order.code}</span>
            <span class="px-3 py-1 rounded-full text-xs font-extrabold ${statusBg}">
              ${order.status}
            </span>
          </div>
          <div class="text-right flex items-center gap-2">
            <div>
              <span class="text-[10px] text-gray-400 font-semibold block uppercase">Recogida</span>
              <span class="text-base font-black text-red-700 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                ${order.pickup_slot}
              </span>
            </div>
            <!-- BOTÓN VISUAL PARA VER EL TICKET DE BOLSA -->
            <button onclick="previewThermalTicket(${order.id})" title="Ver cómo quedaría el ticket físico para grapar a la bolsa"
                    class="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition-all active:scale-95">
              <span>🧾 Ticket</span>
            </button>
          </div>
        </div>

        <!-- Datos del Vecino -->
        <div class="py-3 bg-gray-50 rounded-2xl p-3 my-3 space-y-1">
          <div class="flex items-center justify-between">
            <span class="font-extrabold text-base text-gray-900">${order.customer_name}</span>
            <a href="${waDirectLink}" target="_blank" class="bg-green-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
              <span>WhatsApp</span>
            </a>
          </div>
          <p class="text-sm font-semibold text-gray-700">🏠 ${order.customer_address}</p>
          <p class="text-xs text-gray-500 font-medium">📞 ${order.customer_phone}</p>
          ${order.notes ? `<p class="text-xs font-semibold text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">📝 Notas: ${order.notes}</p>` : ''}
        </div>

        <!-- Lista de Productos -->
        <div class="mt-2">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Productos a cortar:</span>
          <ul class="space-y-1">
            ${itemsHtml}
          </ul>
        </div>
      </div>

      <!-- Resumen Importe y Botones de Acción -->
      <div class="mt-4 pt-3 border-t border-gray-100">
        <div class="flex items-baseline justify-between text-sm mb-1">
          <span class="text-gray-500 font-medium">Total orientativo:</span>
          <span class="font-bold text-gray-700">${Number(order.estimated_total).toFixed(2)} €</span>
        </div>

        ${order.final_amount ? `
          <div class="flex items-baseline justify-between text-base bg-green-50 p-2 rounded-xl border border-green-200 mb-2">
            <span class="font-bold text-green-900">Importe final pesado:</span>
            <span class="font-black text-xl text-green-700">${Number(order.final_amount).toFixed(2)} €</span>
          </div>
        ` : ''}

        <div>
          ${actionsHtml}
          <div class="text-right mt-2">
            ${cancelBtn}
          </div>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

function getStatusBadge(status) {
  switch (status) {
    case 'RECIBIDO': return 'bg-red-600 text-white pulse-alert';
    case 'CONFIRMADO': return 'bg-blue-600 text-white';
    case 'PREPARANDO': return 'bg-amber-500 text-white';
    case 'LISTO': return 'bg-emerald-600 text-white';
    case 'RECOGIDO': return 'bg-gray-700 text-white';
    case 'CANCELADO': return 'bg-gray-300 text-gray-700';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function updateBadgeCounts() {
  const counts = {
    TODOS: ordersList.length,
    RECIBIDO: 0,
    PREPARANDO: 0,
    LISTO: 0,
    RECOGIDO: 0
  };

  ordersList.forEach(o => {
    if (counts[o.status] !== undefined) {
      counts[o.status]++;
    }
  });

  document.getElementById('badge-todos').textContent = counts.TODOS;
  document.getElementById('badge-recibido').textContent = counts.RECIBIDO;
  document.getElementById('badge-preparando').textContent = counts.PREPARANDO;
  document.getElementById('badge-listo').textContent = counts.LISTO;
  document.getElementById('badge-recogido').textContent = counts.RECOGIDO;
}

// 5. Configurar Filtros de Estado
function setupFilterButtons() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('bg-red-700', 'text-white', 'shadow-md');
        b.classList.add('bg-white', 'text-gray-700');
      });
      btn.classList.remove('bg-white', 'text-gray-700');
      btn.classList.add('bg-red-700', 'text-white', 'shadow-md');

      selectedFilter = btn.dataset.status;
      renderOrders();
    });
  });
}

// 6. Cambiar Estado del Pedido
async function updateStatus(orderId, newStatus, finalAmount = null) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, final_amount: finalAmount })
    });
    const data = await res.json();
    if (data.success) {
      if (newStatus === 'LISTO' && data.customerWhatsappLink) {
        window.open(data.customerWhatsappLink, '_blank');
      }
      loadOrders();
    }
  } catch (err) {
    alert('Error al actualizar el estado del pedido.');
  }
}

// 7. Modal de Pesaje (Importe Final)
function setupWeighingModal() {
  const form = document.getElementById('weighing-form');
  const cancelBtn = document.getElementById('cancel-weighing-btn');
  const modal = document.getElementById('weighing-modal');

  cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const finalAmountInput = document.getElementById('weighing-final-amount');
    const finalAmount = parseFloat(finalAmountInput.value);

    if (isNaN(finalAmount) || finalAmount <= 0) {
      alert('Introduce un importe válido pesado en la báscula.');
      return;
    }

    modal.classList.add('hidden');
    updateStatus(currentWeighingOrderId, 'LISTO', finalAmount);
  });
}

function openWeighingModal(orderId, orderCode, customerPhone, estimatedTotal) {
  currentWeighingOrderId = orderId;
  currentWeighingCustomerPhone = customerPhone;

  document.getElementById('weighing-code-label').textContent = orderCode;
  document.getElementById('weighing-estimated-label').textContent = `${Number(estimatedTotal).toFixed(2)} €`;

  const amountInput = document.getElementById('weighing-final-amount');
  amountInput.value = Number(estimatedTotal).toFixed(2);

  document.getElementById('weighing-modal').classList.remove('hidden');
  amountInput.focus();
  amountInput.select();
}

// 8. VISOR DE TICKET TÉRMICO (Para que el carnicero vea cómo saldría impreso)
function setupTicketModal() {
  const closeBtn = document.getElementById('close-ticket-btn');
  const modal = document.getElementById('ticket-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }
}

function previewThermalTicket(orderId) {
  const order = ordersList.find(o => o.id === orderId);
  if (!order) return;

  const modal = document.getElementById('ticket-modal');
  const itemsContainer = document.getElementById('ticket-items-rows');

  document.getElementById('ticket-code').textContent = order.code;
  document.getElementById('ticket-slot').textContent = order.pickup_slot;
  document.getElementById('ticket-date').textContent = new Date().toLocaleDateString('es-ES');
  document.getElementById('ticket-customer-name').textContent = order.customer_name;
  document.getElementById('ticket-customer-address').textContent = order.customer_address;
  document.getElementById('ticket-customer-phone').textContent = order.customer_phone;
  document.getElementById('ticket-estimated-total').textContent = `${Number(order.estimated_total).toFixed(2)} €`;

  const notesRow = document.getElementById('ticket-notes-row');
  if (order.notes && order.notes.trim()) {
    notesRow.classList.remove('hidden');
    document.getElementById('ticket-notes').textContent = order.notes.trim();
  } else {
    notesRow.classList.add('hidden');
  }

  // Lista de productos con formato tipo ticket de caja
  itemsContainer.innerHTML = '';
  (order.items || []).forEach(it => {
    const unit = it.unit === 'kg' ? 'kg' : 'ud';
    const subtotal = (it.price * it.quantity).toFixed(2);
    const div = document.createElement('div');
    div.className = 'py-1 border-b border-dashed border-gray-300';
    div.innerHTML = `
      <div class="flex justify-between font-bold text-xs">
        <span>${it.quantity} ${unit} × ${it.product_name}</span>
        <span>~${subtotal}€</span>
      </div>
      ${it.preparation ? `<div class="text-[11px] text-gray-700 italic font-semibold pl-2">↳ ${it.preparation}</div>` : ''}
    `;
    itemsContainer.appendChild(div);
  });

  modal.classList.remove('hidden');
}
