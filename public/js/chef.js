/**
 * LÓGICA DEL ASISTENTE DE COCINA: CHEF HISPANIDAD
 * 
 * Permite generar recetas personalizadas, menús semanales saludables,
 * adaptar el corte de carne al electrodoméstico (airfryer, horno, plancha, etc.)
 * y guiar paso a paso con el "Modo Cocínalo".
 */

let activeRecipe = null;
let selectedMode = 'chef_gourmet';
let selectedAppliances = new Set(['sarten', 'airfryer']);
let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  setupChefUI();
  checkSavedRecipeOnStartup();
});

// 1. Cambio de vistas entre Mostrador y Chef
window.switchView = function(viewName) {
  const catalogView = document.getElementById('view-catalog');
  const chefView = document.getElementById('view-chef');
  const btnCatalog = document.getElementById('tab-btn-catalog');
  const btnChef = document.getElementById('tab-btn-chef');

  if (viewName === 'chef') {
    catalogView.classList.add('hidden');
    chefView.classList.remove('hidden');
    btnChef.className = 'py-2.5 px-3 rounded-xl font-extrabold text-sm transition-all bg-white text-red-700 shadow-sm flex items-center justify-center gap-1.5';
    btnCatalog.className = 'py-2.5 px-3 rounded-xl font-extrabold text-sm transition-all text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1.5';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    chefView.classList.add('hidden');
    catalogView.classList.remove('hidden');
    btnCatalog.className = 'py-2.5 px-3 rounded-xl font-extrabold text-sm transition-all bg-white text-red-700 shadow-sm flex items-center justify-center gap-1.5';
    btnChef.className = 'py-2.5 px-3 rounded-xl font-extrabold text-sm transition-all text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1.5';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// 2. Comprobar si hay receta guardada en este móvil
function checkSavedRecipeOnStartup() {
  try {
    const saved = localStorage.getItem('chef_saved_recipe');
    if (saved) {
      const recipe = JSON.parse(saved);
      showSavedRecipeBanner(recipe);
    }
  } catch (e) {
    console.warn('Error leyendo receta guardada:', e);
  }
}

function showSavedRecipeBanner(recipe) {
  const banner = document.getElementById('saved-recipe-banner');
  const titleEl = document.getElementById('saved-recipe-title');
  if (banner && titleEl && recipe && recipe.recipe_title) {
    titleEl.textContent = recipe.recipe_title;
    banner.classList.remove('hidden');
  }
}

// 3. Configurar interfaz del Chef
function setupChefUI() {
  // Selector de Modo
  const modeCards = document.querySelectorAll('.chef-mode-card');
  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      modeCards.forEach(c => {
        c.classList.remove('ring-4', 'ring-red-600', 'bg-red-50', 'border-red-500');
        c.classList.add('bg-white', 'border-gray-200');
      });
      card.classList.remove('bg-white', 'border-gray-200');
      card.classList.add('ring-4', 'ring-red-600', 'bg-red-50', 'border-red-500');
      selectedMode = card.dataset.mode;

      const inputPlaceholder = document.getElementById('chef-query-input');
      if (selectedMode === 'menu_semanal') {
        inputPlaceholder.placeholder = 'Ej: Cenas ligeras de lunes a jueves para toda la familia...';
      } else if (selectedMode === 'nevera') {
        inputPlaceholder.placeholder = 'Ej: Tengo pimientos, cebolla, patatas y un poco de arroz...';
      } else {
        inputPlaceholder.placeholder = 'Ej: Canelones caseros, estofado meloso, steak tartar...';
      }
    });
  });

  // Selector Multiselección de Electrodomésticos
  const applianceBtns = document.querySelectorAll('.appliance-btn');
  applianceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const app = btn.dataset.appliance;
      const checkIcon = btn.querySelector('.check-icon');
      if (selectedAppliances.has(app)) {
        if (selectedAppliances.size > 1) {
          selectedAppliances.delete(app);
          btn.className = 'appliance-btn p-2.5 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 border-2 border-gray-200 select-none';
          if (checkIcon) checkIcon.classList.add('hidden');
        } else {
          alert('Por favor, mantén seleccionado al menos un electrodoméstico que tengas en casa.');
        }
      } else {
        selectedAppliances.add(app);
        btn.className = 'appliance-btn p-2.5 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 bg-red-700 text-white shadow-md border-2 border-red-700 select-none';
        if (checkIcon) checkIcon.classList.remove('hidden');
      }
    });
  });

  // Selector de comensales (+ / -)
  const dinersEl = document.getElementById('chef-diners-count');
  window.adjustDiners = function(delta) {
    let current = parseInt(dinersEl.textContent) || 4;
    let next = current + delta;
    if (next < 1) next = 1;
    if (next > 12) next = 12;
    dinersEl.textContent = next;
  };

  // Botón Generar Receta
  const generateBtn = document.getElementById('chef-generate-btn');
  generateBtn.addEventListener('click', handleGenerateRecipe);

  // Cerrar modal modo cocínalo
  const closeCookBtn = document.getElementById('close-cook-modal');
  if (closeCookBtn) {
    closeCookBtn.addEventListener('click', () => {
      document.getElementById('cook-modal').classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
      if (timerInterval) clearInterval(timerInterval);
    });
  }
}

// 4. Llamada al endpoint para generar receta
async function handleGenerateRecipe() {
  const query = document.getElementById('chef-query-input').value.trim();
  const diners = parseInt(document.getElementById('chef-diners-count').textContent) || 4;
  const healthy = document.getElementById('chef-healthy-toggle').checked;
  const generateBtn = document.getElementById('chef-generate-btn');

  generateBtn.disabled = true;
  generateBtn.innerHTML = `
    <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
    </svg>
    El Chef está pensando tu receta...
  `;

  try {
    const res = await fetch('/api/chef/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: selectedMode,
        query: query,
        diners: diners,
        appliances: Array.from(selectedAppliances),
        healthy: healthy
      })
    });

    const data = await res.json();
    if (data.success && data.recipe) {
      activeRecipe = data.recipe;
      renderRecipeResult(data.recipe);
      // Guardar automáticamente en el móvil
      try {
        localStorage.setItem('chef_saved_recipe', JSON.stringify(data.recipe));
        showSavedRecipeBanner(data.recipe);
      } catch (e) {}

      // Scroll suave hacia el resultado
      document.getElementById('chef-result-section').scrollIntoView({ behavior: 'smooth' });
    } else {
      alert(data.error || 'No se pudo generar la receta. Inténtalo de nuevo.');
    }
  } catch (err) {
    alert('Error al conectar con el Chef. Revisa tu conexión.');
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = `<span>✨ Crear Receta y Calcular Carnes</span><span class="text-xl">➔</span>`;
  }
}

// 5. Renderizar Resultado de la Receta
function renderRecipeResult(recipe) {
  const resultSection = document.getElementById('chef-result-section');
  resultSection.classList.remove('hidden');

  document.getElementById('res-recipe-title').textContent = recipe.recipe_title;
  document.getElementById('res-recipe-subtitle').textContent = recipe.subtitle || '';
  document.getElementById('res-recipe-diners').textContent = `${recipe.diners} personas`;
  document.getElementById('res-recipe-time').textContent = `~${recipe.prep_time_minutes || 30} min`;

  // Electrodoméstico recomendado por el Chef
  const icons = { sarten: '🍳 Sartén / Plancha', airfryer: '🍟 Airfryer', horno: '🥘 Horno', olla_guiso: '🍲 Olla / Guiso' };
  const label = recipe.recommended_appliance_label || icons[recipe.recommended_appliance] || icons[recipe.appliance] || 'Cocina libre';
  document.getElementById('res-recipe-appliance').textContent = label;

  // Consejos del Chef
  document.getElementById('res-healthy-tip').textContent = recipe.healthy_tip || 'Equilibrado y nutritivo.';
  document.getElementById('res-appliance-tip').textContent = recipe.appliance_tip || 'Controla la temperatura para sellar bien.';

  // Carnes a comprar en la carnicería
  const meatsContainer = document.getElementById('res-meats-list');
  meatsContainer.innerHTML = '';

  (recipe.ingredients_to_buy || []).forEach(item => {
    const div = document.createElement('div');
    div.className = 'bg-white p-3.5 rounded-2xl border-2 border-red-200 shadow-sm flex items-start justify-between gap-3';
    div.innerHTML = `
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <span class="text-base">🥩</span>
          <h5 class="font-extrabold text-gray-900 text-sm">${item.product_name}</h5>
        </div>
        <p class="text-xs font-black text-red-700 mt-0.5">
          ${item.quantity} ${item.unit} — Preparación: <span class="underline">${item.preparation}</span>
        </p>
        <p class="text-[11px] text-gray-500 italic mt-1 leading-snug">
          💡 ${item.reason || 'Corte idóneo para esta elaboración.'}
        </p>
      </div>
    `;
    meatsContainer.appendChild(div);
  });

  // Ingredientes de despensa
  const pantryContainer = document.getElementById('res-pantry-list');
  pantryContainer.innerHTML = '';
  (recipe.pantry_ingredients || []).forEach(ing => {
    const li = document.createElement('li');
    li.className = 'text-xs text-gray-700 flex items-center gap-1.5 py-0.5';
    li.innerHTML = `<span class="text-gray-400">•</span> <span>${ing}</span>`;
    pantryContainer.appendChild(li);
  });
}

// 6. Añadir todas las carnes de la receta a la cesta de compra
window.addAllMeatsToCart = function() {
  if (!activeRecipe || !Array.isArray(activeRecipe.ingredients_to_buy)) return;

  let addedCount = 0;
  activeRecipe.ingredients_to_buy.forEach(item => {
    // Buscar el producto en allProducts (de catalog.js)
    let product = (window.allProducts || []).find(p => p.id === item.product_id || p.name.toLowerCase() === item.product_name.toLowerCase());

    const cartItem = {
      product_id: product ? product.id : (item.product_id || 999),
      product_name: item.product_name,
      price: product ? product.price : 14.50,
      unit: item.unit || 'kg',
      quantity: item.quantity,
      preparation: item.preparation
    };

    // Añadir al carrito global
    if (window.cart) {
      const existing = window.cart.find(c => c.product_name === cartItem.product_name && c.preparation === cartItem.preparation);
      if (existing) {
        existing.quantity = Math.round((existing.quantity + cartItem.quantity) * 100) / 100;
      } else {
        window.cart.push(cartItem);
      }
      addedCount++;
    }
  });

  if (window.updateCartUI) {
    window.updateCartUI();
  }

  // Notificar al vecino
  if (window.showToastNotification) {
    window.showToastNotification(`✓ Añadidas ${addedCount} carnes a tu pedido`);
  }

  // Abrir la cesta para que vea el pedido
  const floatingBtn = document.getElementById('floating-cart-btn');
  if (floatingBtn) {
    floatingBtn.classList.remove('hidden');
    floatingBtn.click();
  }
};

// 7. MODO COCÍNALO (Paso a Paso interactivo)
window.openCookMode = function() {
  const recipe = activeRecipe || JSON.parse(localStorage.getItem('chef_saved_recipe') || 'null');
  if (!recipe) {
    alert('No hay ninguna receta activa en este momento.');
    return;
  }

  activeRecipe = recipe;
  const modal = document.getElementById('cook-modal');
  document.getElementById('cook-modal-title').textContent = recipe.recipe_title;

  // Lista de chequeo de ingredientes
  const checkList = document.getElementById('cook-ingredients-checklist');
  checkList.innerHTML = '';

  const allIngredients = [
    ...(recipe.ingredients_to_buy || []).map(i => `${i.quantity} ${i.unit} ${i.product_name} (${i.preparation})`),
    ...(recipe.pantry_ingredients || [])
  ];

  allIngredients.forEach((ingText, idx) => {
    const label = document.createElement('label');
    label.className = 'flex items-center gap-2.5 p-2 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer text-xs font-semibold select-none';
    label.innerHTML = `
      <input type="checkbox" class="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500">
      <span class="text-gray-800">${ingText}</span>
    `;
    checkList.appendChild(label);
  });

  // Pasos con temporizadores
  const stepsContainer = document.getElementById('cook-steps-container');
  stepsContainer.innerHTML = '';

  (recipe.steps || []).forEach(st => {
    const stepDiv = document.createElement('div');
    stepDiv.className = 'bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-2';

    const timerHtml = st.timer_minutes ? `
      <div class="flex items-center gap-2 pt-1">
        <button type="button" onclick="startTimer(this, ${st.timer_minutes})" 
                class="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all">
          <span>⏱️ Poner temporizador: ${st.timer_minutes} min</span>
        </button>
        <span class="timer-display text-xs font-mono font-black text-amber-800 hidden"></span>
      </div>
    ` : '';

    stepDiv.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-red-700 text-white flex items-center justify-center text-xs font-black shadow-sm">
          ${st.number}
        </span>
        <h5 class="font-extrabold text-sm text-gray-900">${st.title}</h5>
      </div>
      <p class="text-xs text-gray-700 leading-relaxed pl-8">
        ${st.instruction}
      </p>
      <div class="pl-8">
        ${timerHtml}
      </div>
    `;

    stepsContainer.appendChild(stepDiv);
  });

  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
};

// Temporizador interactivo
window.startTimer = function(btnEl, minutes) {
  const displayEl = btnEl.parentElement.querySelector('.timer-display');
  btnEl.classList.add('hidden');
  displayEl.classList.remove('hidden');

  let remaining = minutes * 60;

  const updateDisplay = () => {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    displayEl.textContent = `⏳ ${m}:${s < 10 ? '0' : ''}${s}`;
  };

  updateDisplay();

  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(timerInterval);
      displayEl.textContent = '🔔 ¡TIEMPO CUMPLIDO!';
      displayEl.classList.add('text-red-600', 'animate-bounce');
      if (window.soundNotifier) {
        window.soundNotifier.playDingDong();
      }
    } else {
      updateDisplay();
    }
  }, 1000);
};
