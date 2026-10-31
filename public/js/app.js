const API_BASE = '/api';

const page = document.body?.dataset?.page || 'unknown';
const currentUserBadge = document.getElementById('currentUserBadge');

function getToken() {
  return localStorage.getItem('ghana_pos_token');
}

function setToken(token) {
  if (token) {
    localStorage.setItem('ghana_pos_token', token);
  } else {
    localStorage.removeItem('ghana_pos_token');
  }
}

function jsonHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed.');
  }

  return payload;
}

function formatCurrency(value) {
  return `GH₵ ${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function debounce(fn, wait = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function mountUserBadge(user) {
  if (currentUserBadge) {
    currentUserBadge.textContent = `${user.full_name || user.email || 'User'} (${user.role || 'user'})`;
  }
}

function redirectIfUnauthenticated() {
  const isAuthPage = window.location.pathname.endsWith('login.html') || window.location.pathname === '/';
  if (getToken()) {
    if (isAuthPage) {
      window.location.href = '/dashboard.html';
    }
    return;
  }

  if (!isAuthPage) {
    window.location.href = '/login.html';
  }
}

async function loadCurrentUser() {
  try {
    const userResponse = await apiFetch('/auth/me');
    if (userResponse && userResponse.user) {
      mountUserBadge(userResponse.user);
      return userResponse.user;
    }
  } catch (error) {
    setToken(null);
    window.location.href = '/login.html';
  }
  return null;
}

function logout() {
  setToken(null);
  window.location.href = '/login.html';
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.email.value.trim();
  const password = form.password.value;
  const errorBox = document.getElementById('loginError');

  try {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ email, password }),
    });

    setToken(response.token);
    localStorage.setItem('ghana_pos_user', JSON.stringify(response.user));
    window.location.href = '/dashboard.html';
  } catch (error) {
    if (errorBox) {
      errorBox.textContent = error.message;
      errorBox.classList.remove('hidden');
    }
  }
}

async function initDashboard() {
  if (!getToken()) return;
  const user = await loadCurrentUser();
  if (!user) return;

  const [productsResult, salesResult] = await Promise.all([
    apiFetch('/products?include_inactive=true'),
    apiFetch('/sales'),
  ]).catch(() => [{ products: [] }, { sales: [] }]);

  const lowStock = (productsResult.products || []).filter((product) => product.is_low_stock);
  const productCountEl = document.getElementById('productCount');
  const lowStockCountEl = document.getElementById('lowStockCount');
  const todaySalesEl = document.getElementById('todaySales');
  const cashierCountEl = document.getElementById('cashierCount');

  if (productCountEl) productCountEl.textContent = String((productsResult.products || []).length);
  if (lowStockCountEl) lowStockCountEl.textContent = String(lowStock.length);
  if (cashierCountEl) cashierCountEl.textContent = String(new Set((salesResult.sales || []).map((sale) => sale.cashier_id)).size || 0);

  const todayTotal = (salesResult.sales || []).reduce((sum, sale) => {
    const created = new Date(sale.created_at);
    const isToday = created.toDateString() === new Date().toDateString();
    return isToday ? sum + Number(sale.net_amount || sale.total_amount || 0) : sum;
  }, 0);
  if (todaySalesEl) todaySalesEl.textContent = formatCurrency(todayTotal);

  const lowStockList = document.getElementById('lowStockList');
  if (lowStockList) {
    lowStockList.innerHTML = lowStock.length
      ? lowStock.slice(0, 5).map((product) => `
          <div class="list-item">
            <span>${escapeHtml(product.name)}</span>
            <strong>${product.stock} left</strong>
          </div>
        `).join('')
      : '<div class="list-item"><span>No low stock items.</span></div>';
  }

  const recentSalesList = document.getElementById('recentSalesList');
  if (recentSalesList) {
    const recent = (salesResult.sales || []).slice(0, 5);
    recentSalesList.innerHTML = recent.length
      ? recent.map((sale) => `
          <div class="list-item">
            <span>${escapeHtml(sale.sale_number || 'Sale')}</span>
            <strong>${formatCurrency(sale.net_amount || sale.total_amount || 0)}</strong>
          </div>
        `).join('')
      : '<div class="list-item"><span>No sales yet.</span></div>';
  }
}

let cart = [];

function addCartItem(product) {
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      price: Number(product.price),
      quantity: 1,
    });
  }
  renderCart();
}

function renderCart() {
  const cartItemsEl = document.getElementById('cartItems');
  if (!cartItemsEl) return;

  if (!cart.length) {
    cartItemsEl.innerHTML = '<div class="list-item"><span>No items in cart.</span></div>';
    updateSummary();
    return;
  }

  cartItemsEl.innerHTML = cart.map((item) => `
    <div class="cart-item">
      <div class="cart-item-header">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${formatCurrency(item.price * item.quantity)}</span>
      </div>
      <div class="qty-controls">
        <button data-action="decrement" data-id="${item.id}" type="button">-</button>
        <span>${item.quantity}</span>
        <button data-action="increment" data-id="${item.id}" type="button">+</button>
        <button data-action="remove" data-id="${item.id}" type="button" class="secondary-btn">Remove</button>
      </div>
    </div>
  `).join('');

  updateSummary();
}

function updateSummary() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountInput = document.getElementById('discountInput');
  const discount = Number(discountInput?.value || 0);
  const subtotalEl = document.getElementById('subtotalValue');
  const discountEl = document.getElementById('discountValue');
  const vatEl = document.getElementById('vatValue');
  const totalEl = document.getElementById('totalValue');
  const amountTenderedEl = document.getElementById('amountTendered');
  const changeEl = document.getElementById('changeValue');

  const taxable = Math.max(subtotal - discount, 0);
  const vatAmount = taxable * 0.125;
  const total = taxable + vatAmount;
  const tendered = Number(amountTenderedEl?.value || 0);
  const change = Math.max(tendered - total, 0);

  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (discountEl) discountEl.textContent = formatCurrency(discount);
  if (vatEl) vatEl.textContent = formatCurrency(vatAmount);
  if (totalEl) totalEl.textContent = formatCurrency(total);
  if (changeEl) changeEl.textContent = formatCurrency(change);
}

function renderReceipt(receiptSale, tenderedAmount = 0) {
  const receiptCard = document.getElementById('receiptCard');
  if (!receiptCard) return;

  const receiptItems = document.getElementById('receiptItems');
  const saleSubtotal = Number(receiptSale?.total_amount || 0);
  const saleDiscount = Number(receiptSale?.discount_amount || 0);
  const saleVat = Number(receiptSale?.vat_amount || 0);
  const saleTotal = Number(receiptSale?.net_amount || receiptSale?.total_amount || 0);
  const amountTendered = Number(tenderedAmount || 0);
  const change = Math.max(amountTendered - saleTotal, 0);

  if (receiptItems) {
    receiptItems.innerHTML = (receiptSale?.items || []).map((item) => `
      <div class="receipt-row">
        <span>${escapeHtml(item.product_name || 'Item')} x ${item.quantity}</span>
        <span>${formatCurrency(item.total_amount || (Number(item.unit_price || 0) * Number(item.quantity || 0)))}</span>
      </div>
    `).join('');
  }

  const saleNumberEl = document.getElementById('receiptSaleNumber');
  if (saleNumberEl) saleNumberEl.textContent = receiptSale?.sale_number || 'Receipt';

  const receiptSubtotalEl = document.getElementById('receiptSubtotal');
  const receiptDiscountEl = document.getElementById('receiptDiscount');
  const receiptVatEl = document.getElementById('receiptVat');
  const receiptTotalEl = document.getElementById('receiptTotal');
  const receiptCashEl = document.getElementById('receiptCash');
  const receiptChangeEl = document.getElementById('receiptChange');

  if (receiptSubtotalEl) receiptSubtotalEl.textContent = formatCurrency(saleSubtotal);
  if (receiptDiscountEl) receiptDiscountEl.textContent = formatCurrency(saleDiscount);
  if (receiptVatEl) receiptVatEl.textContent = formatCurrency(saleVat);
  if (receiptTotalEl) receiptTotalEl.textContent = formatCurrency(saleTotal);
  if (receiptCashEl) receiptCashEl.textContent = formatCurrency(amountTendered);
  if (receiptChangeEl) receiptChangeEl.textContent = formatCurrency(change);

  receiptCard.classList.remove('hidden');
}

async function initCheckout() {
  if (!getToken()) return;
  await loadCurrentUser();

  const barcodeInput = document.getElementById('barcodeInput');
  const addBtn = document.getElementById('addProductByBarcodeBtn');
  const errorBox = document.getElementById('checkoutError');

  let productsResponse = await apiFetch('/products');
  let products = productsResponse.products || [];
  let activeCheckoutCategory = '';

  function checkoutCategories() {
    const seen = new Map();
    products.forEach((product) => {
      if (!seen.has(product.category_id)) {
        seen.set(product.category_id, product.category_name || `Category ${product.category_id}`);
      }
    });
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }

  function renderCategoryBar() {
    const categoryBar = document.getElementById('categoryBar');
    if (!categoryBar) return;

    const categories = checkoutCategories();
    categoryBar.innerHTML = categories.length <= 1
      ? ''
      : ['All', ...categories].map((category) => {
          const value = category === 'All' ? '' : category.id;
          const label = category === 'All' ? 'All' : escapeHtml(category.name);
          const active = activeCheckoutCategory === value ? ' category-chip active' : ' category-chip';
          return `<button type="button" class="${active}" data-category="${value}">${label}</button>`;
        }).join('');
  }

  function visibleProducts() {
    const term = (barcodeInput?.value || '').trim().toLowerCase();
    return products.filter((product) =>
      (!activeCheckoutCategory || String(product.category_id) === String(activeCheckoutCategory)) &&
      (!term || product.name.toLowerCase().includes(term) || String(product.barcode).includes(term))
    );
  }

  function renderProductTiles() {
    const tiles = document.getElementById('productTiles');
    if (!tiles) return;

    const visible = visibleProducts();

    if (!visible.length) {
      tiles.innerHTML = '<span class="tiles-empty">No matching products.</span>';
      return;
    }

    tiles.innerHTML = visible.map((product) => {
      const outOfStock = Number(product.stock) <= 0;
      const stateClass = outOfStock ? ' product-tile sold-out' : ' product-tile';
      return `
        <button type="button" class="${stateClass}" ${outOfStock ? 'disabled' : ''}
          data-tile-product="${product.id}" title="${escapeHtml(product.name)} — ${formatCurrency(product.price)}">
          <span class="tile-name">${escapeHtml(product.name)}</span>
          <span class="tile-meta">${formatCurrency(product.price)} · ${product.stock} left</span>
        </button>
      `;
    }).join('');
  }

  function refreshTiles() {
    renderCategoryBar();
    renderProductTiles();
  }

  document.getElementById('categoryBar')?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-category]');
    if (!button) return;
    activeCheckoutCategory = button.dataset.category;
    refreshTiles();
  });

  document.getElementById('productTiles')?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-tile-product]');
    if (!button) return;
    const product = products.find((item) => String(item.id) === String(button.dataset.tileProduct));
    if (product) addCartItem(product);
  });

  barcodeInput?.addEventListener('input', debounce(() => renderProductTiles(), 250));

  const addFromBarcode = async () => {
    const value = barcodeInput.value.trim();
    if (!value) return;
    const product = products.find((item) => item.barcode === value || item.name.toLowerCase().includes(value.toLowerCase()));
    if (!product) {
      const errorBox = document.getElementById('checkoutError');
      if (errorBox) {
        errorBox.textContent = 'Product not found.';
        errorBox.classList.remove('hidden');
      }
      return;
    }
    if (product.stock <= 0) {
      const errorBox = document.getElementById('checkoutError');
      if (errorBox) {
        errorBox.textContent = 'Product is out of stock.';
        errorBox.classList.remove('hidden');
      }
      return;
    }
    addCartItem(product);
    barcodeInput.value = '';
    const errorBox = document.getElementById('checkoutError');
    if (errorBox) errorBox.classList.add('hidden');
  };

  if (addBtn) addBtn.addEventListener('click', addFromBarcode);
  if (barcodeInput) {
    barcodeInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addFromBarcode();
      }
    });
  }

  document.getElementById('discountInput')?.addEventListener('input', updateSummary);
  document.getElementById('amountTendered')?.addEventListener('input', updateSummary);

  document.getElementById('cartItems')?.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const id = Number(button.dataset.id);
    const action = button.dataset.action;
    const item = cart.find((entry) => entry.id === id);
    if (!item) return;

    if (action === 'increment') item.quantity += 1;
    if (action === 'decrement') item.quantity = Math.max(1, item.quantity - 1);
    if (action === 'remove') cart = cart.filter((entry) => entry.id !== id);

    renderCart();
  });

  document.getElementById('printReceiptBtn')?.addEventListener('click', () => window.print());
  document.getElementById('closeReceiptBtn')?.addEventListener('click', () => {
    document.getElementById('receiptCard')?.classList.add('hidden');
  });

  document.getElementById('completeSaleBtn')?.addEventListener('click', async () => {
    if (!cart.length) {
      const errorBox = document.getElementById('checkoutError');
      if (errorBox) {
        errorBox.textContent = 'Add at least one product to the sale.';
        errorBox.classList.remove('hidden');
      }
      return;
    }

    const discount = Number(document.getElementById('discountInput').value || 0);
    const paymentMethod = document.getElementById('paymentMethod').value;
    const amountTendered = Number(document.getElementById('amountTendered').value || 0);

    const payload = {
      discount_amount: discount,
      payment_method: paymentMethod,
      payments: [{ method: paymentMethod, amount: amountTendered, reference: `pos-${Date.now()}` }],
      items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })),
    };

    try {
      const result = await apiFetch('/sales', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });

      const receiptSale = result.sale;
      renderReceipt(receiptSale, amountTendered);

      cart = [];
      renderCart();
      document.getElementById('amountTendered').value = 0;
      document.getElementById('discountInput').value = 0;
      updateSummary();
      document.getElementById('checkoutError')?.classList.add('hidden');

      // Refresh product data so tile stock counts stay accurate for the next customer.
      try {
        productsResponse = await apiFetch('/products');
        products = productsResponse.products || [];
        refreshTiles();
      } catch {
        // Keep showing the previous product data if the refresh fails.
      }
    } catch (error) {
      const errorBox = document.getElementById('checkoutError');
      if (errorBox) {
        errorBox.textContent = error.message;
        errorBox.classList.remove('hidden');
      }
    }
  });

  refreshTiles();
  barcodeInput?.focus();

  renderCart();
  updateSummary();
}

async function initProductsPage() {
  if (!getToken()) return;
  await loadCurrentUser();
  await loadCategories();
  await loadProducts();

  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const form = document.getElementById('productForm');
  const resetBtn = document.getElementById('resetProductBtn');

  const searchChanged = debounce(() => loadProducts(searchInput.value.trim(), categoryFilter?.value || ''));
  searchInput?.addEventListener('input', searchChanged);

  categoryFilter?.addEventListener('change', () => {
    loadProducts(searchInput.value.trim(), categoryFilter.value);
  });

  document.getElementById('newCategoryBtn')?.addEventListener('click', async () => {
    const nameInput = document.getElementById('newCategoryName');
    const name = (nameInput?.value || '').trim();
    if (!name) {
      showError('productError', 'Enter a category name first.');
      return;
    }

    try {
      await apiFetch('/products/categories', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ name }),
      });
      if (nameInput) nameInput.value = '';
      await loadCategories();
      const select = document.getElementById('categoryId');
      const options = Array.from(select?.options || []);
      const created = options.find((option) => option.textContent.toLowerCase() === name.toLowerCase());
      if (select && created) select.value = created.value;
    } catch (error) {
      showError('productError', error.message);
    }
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nameInput = document.getElementById('productName');
    const barcodeInput = document.getElementById('productBarcode');
    const priceInput = document.getElementById('productPrice');
    const costInput = document.getElementById('productCostPrice');

    const payload = {
      category_id: Number(document.getElementById('categoryId').value),
      name: nameInput.value,
      // Blank barcode is fine — the server auto-generates a unique one.
      barcode: barcodeInput.value.trim(),
      price: Number(priceInput.value),
      // Blank cost price defaults to the sale price.
      cost_price: costInput.value === '' ? Number(priceInput.value) : Number(costInput.value),
      stock: Number(document.getElementById('productStock').value || 0),
      low_stock_threshold: Number(document.getElementById('productThreshold').value || 5),
      is_active: Number(document.getElementById('productIsActive').value),
    };

    const productId = document.getElementById('productId').value;
    const isEdit = Boolean(productId);

    try {
      if (isEdit) {
        await apiFetch(`/products/${productId}`, { method: 'PUT', headers: jsonHeaders(), body: JSON.stringify(payload) });
      } else {
        await apiFetch('/products', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(payload) });
      }

      if (isEdit) {
        form.reset();
        document.getElementById('productId').value = '';
      } else {
        // Fast add: keep category, threshold and active selected; clear only the item fields.
        nameInput.value = '';
        barcodeInput.value = '';
        priceInput.value = '';
        costInput.value = '';
        document.getElementById('productStock').value = '';
      }
      await loadProducts('', categoryFilter?.value || '');
      // Ready for the next product immediately.
      barcodeInput.focus();
    } catch (error) {
      showError('productError', error.message);
    }
  });

  resetBtn?.addEventListener('click', () => {
    form.reset();
    document.getElementById('productId').value = '';
  });

  document.getElementById('refreshProductsBtn')?.addEventListener('click', () => {
    loadProducts(document.getElementById('searchInput')?.value.trim() || '', categoryFilter?.value || '');
  });

  // Scanner flow: Enter/scan in the barcode field jumps straight to the name.
  document.getElementById('productBarcode')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      document.getElementById('productName')?.focus();
    }
  });

  // Start the fast-add flow with the barcode field ready for scanning.
  document.getElementById('productBarcode')?.focus();
}

async function loadCategories() {
  const categories = await apiFetch('/products/categories');
  const list = categories.categories || [];

  const formSelect = document.getElementById('categoryId');
  if (formSelect) {
    formSelect.innerHTML = list.map((category) => `
      <option value="${category.id}">${escapeHtml(category.name)}</option>
    `).join('');
  }

  const filterSelect = document.getElementById('categoryFilter');
  if (filterSelect) {
    const current = filterSelect.value;
    filterSelect.innerHTML = '<option value="">All categories</option>' + list.map((category) => `
      <option value="${category.id}">${escapeHtml(category.name)}</option>
    `).join('');
    if (current) filterSelect.value = current;
  }

  return list;
}

async function loadProducts(search = '', categoryId = '') {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (categoryId) params.set('category_id', categoryId);
  const response = await apiFetch(`/products?${params.toString()}`);
  const rows = response.products || [];
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  tbody.innerHTML = rows.map((product) => `
    <tr>
      <td>${escapeHtml(product.name)}</td>
      <td>${escapeHtml(product.barcode)}</td>
      <td>${escapeHtml(product.category_name || '')}</td>
      <td>${formatCurrency(product.price)}</td>
      <td>${product.stock}</td>
      <td>
        <button type="button" class="secondary-btn" data-edit-product="${product.id}">Edit</button>
        <button type="button" class="link-btn danger" data-delete-product="${product.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit-product]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.editProduct;
      const product = rows.find((item) => String(item.id) === String(id));
      if (!product) return;
      document.getElementById('productId').value = product.id;
      document.getElementById('categoryId').value = product.category_id;
      document.getElementById('productName').value = product.name;
      document.getElementById('productBarcode').value = product.barcode;
      document.getElementById('productPrice').value = product.price;
      document.getElementById('productCostPrice').value = product.cost_price;
      document.getElementById('productStock').value = product.stock;
      document.getElementById('productThreshold').value = product.low_stock_threshold;
      document.getElementById('productIsActive').value = product.is_active ? '1' : '0';
    });
  });

  tbody.querySelectorAll('[data-delete-product]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.deleteProduct;
      if (!confirm('Delete this product?')) return;
      try {
        await apiFetch(`/products/${id}`, { method: 'DELETE' });
        await loadProducts();
      } catch (error) {
        showError('productError', error.message);
      }
    });
  });
}

async function initInventoryPage() {
  if (!getToken()) return;
  await loadCurrentUser();
  await loadInventoryProducts();

  document.getElementById('stockAdjustmentForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      product_id: Number(document.getElementById('stockProductId').value),
      quantity_change: Number(document.getElementById('stockChange').value),
      reason: document.getElementById('stockReason').value,
      notes: document.getElementById('stockNotes').value,
    };

    try {
      await apiFetch('/inventory/adjustments', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      document.getElementById('stockAdjustmentForm').reset();
      await loadInventoryProducts();
    } catch (error) {
      showError('inventoryError', error.message);
    }
  });
}

async function loadInventoryProducts() {
  const products = await apiFetch('/products');
  const lowStock = await apiFetch('/inventory/low-stock');
  const select = document.getElementById('stockProductId');
  if (select) {
    select.innerHTML = (products.products || []).map((product) => `
      <option value="${product.id}">${escapeHtml(product.name)} (${product.stock})</option>
    `).join('');
  }

  const list = document.getElementById('lowStockInventoryList');
  if (list) {
    const items = lowStock.products || [];
    list.innerHTML = items.length
      ? items.map((product) => `
          <div class="list-item">
            <span>${escapeHtml(product.name)}</span>
            <strong>${product.stock} left</strong>
          </div>
        `).join('')
      : '<div class="list-item"><span>No low stock products.</span></div>';
  }
}

function showSalesNotice(message, isError = false) {
  const notice = document.getElementById('salesNotice');
  if (!notice) return;
  notice.textContent = message;
  notice.classList.toggle('error', isError);
  notice.classList.remove('hidden');
}

function closeRefundModal() {
  const modal = document.getElementById('refundModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  document.getElementById('refundForm')?.reset();
  document.getElementById('refundSaleId').value = '';
}

function closeSaleDetailModal() {
  const modal = document.getElementById('saleDetailModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  document.getElementById('saleDetailBody').innerHTML = '';
}

function openRefundModal(sale) {
  const modal = document.getElementById('refundModal');
  if (!modal) return;

  const amountInput = document.getElementById('refundAmount');
  const reasonInput = document.getElementById('refundReason');
  const saleIdInput = document.getElementById('refundSaleId');

  if (saleIdInput) saleIdInput.value = sale.id;
  if (amountInput) amountInput.value = Number(sale.net_amount || sale.total_amount || 0).toFixed(2);
  if (reasonInput) reasonInput.value = 'customer_return';

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  amountInput?.focus();
}

async function openSaleDetails(saleId) {
  try {
    const response = await apiFetch(`/sales/${saleId}`);
    const sale = response.sale || {};
    const paymentSummary = (sale.payments || []).map((payment) => `
      <div class="receipt-row">
        <span>${escapeHtml(payment.method || 'Payment')}</span>
        <strong>${formatCurrency(payment.amount || 0)}</strong>
      </div>
    `).join('');
    const itemsSummary = (sale.items || []).map((item) => `
      <div class="receipt-row">
        <span>${escapeHtml(item.product_name || 'Item')} x ${item.quantity}</span>
        <span>${formatCurrency(item.total_amount || 0)}</span>
      </div>
    `).join('');

    const modalBody = document.getElementById('saleDetailBody');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div class="receipt-row"><span>Invoice</span><strong>${escapeHtml(sale.sale_number || '—')}</strong></div>
      <div class="receipt-row"><span>Cashier</span><span>${escapeHtml(sale.cashier_name || '—')}</span></div>
      <div class="receipt-row"><span>Status</span><span>${escapeHtml(sale.status || 'completed')}</span></div>
      <div class="receipt-row"><span>Time</span><span>${new Date(sale.created_at).toLocaleString()}</span></div>

      <div class="receipt-totals">
        <div class="receipt-line"><span>Items</span></div>
        ${itemsSummary || '<div class="receipt-row"><span>No items</span></div>'}
        <div class="receipt-line"><span>Subtotal</span><strong>${formatCurrency(sale.total_amount || 0)}</strong></div>
        <div class="receipt-line"><span>Discount</span><strong>${formatCurrency(sale.discount_amount || 0)}</strong></div>
        <div class="receipt-line"><span>VAT</span><strong>${formatCurrency(sale.vat_amount || 0)}</strong></div>
        <div class="receipt-line total"><span>Total</span><strong>${formatCurrency(sale.net_amount || sale.total_amount || 0)}</strong></div>
      </div>

      <div class="receipt-totals">
        <div class="receipt-line"><span>Payments</span></div>
        ${paymentSummary || '<div class="receipt-row"><span>No payments recorded</span></div>'}
      </div>
    `;

    const modal = document.getElementById('saleDetailModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
    }
  } catch (error) {
    showSalesNotice(error.message, true);
  }
}

function renderSalesTable(rows = []) {
  const tbody = document.getElementById('salesTableBody');
  if (!tbody) return;

  tbody.innerHTML = rows.map((sale) => `
    <tr>
      <td>${escapeHtml(sale.sale_number || '—')}</td>
      <td>${escapeHtml(sale.cashier_name || '—')}</td>
      <td>${formatCurrency(sale.net_amount || sale.total_amount || 0)}</td>
      <td>${escapeHtml(sale.payment_method || '—')}</td>
      <td>${escapeHtml(sale.status || 'completed')}</td>
      <td>${new Date(sale.created_at).toLocaleString()}</td>
      <td>
        <button type="button" class="secondary-btn" data-view-sale="${sale.id}">View</button>
        ${sale.status === 'refunded'
          ? '<span class="badge neutral">Closed</span>'
          : `<button type="button" class="secondary-btn" data-refund-sale="${sale.id}">Refund</button>`}
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-view-sale]').forEach((button) => {
    button.addEventListener('click', () => openSaleDetails(button.dataset.viewSale));
  });

  tbody.querySelectorAll('[data-refund-sale]').forEach((button) => {
    button.addEventListener('click', () => {
      const sale = rows.find((entry) => String(entry.id) === String(button.dataset.refundSale));
      if (sale) openRefundModal(sale);
    });
  });
}

async function loadSalesTable() {
  const params = new URLSearchParams();
  const status = document.getElementById('salesStatusFilter')?.value || '';
  const startDate = document.getElementById('salesStartDate')?.value || '';
  const endDate = document.getElementById('salesEndDate')?.value || '';

  if (status) params.set('status', status);
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);

  const response = await apiFetch(`/sales${params.toString() ? `?${params.toString()}` : ''}`);
  renderSalesTable(response.sales || []);
  return response.sales || [];
}

async function initSalesPage() {
  if (!getToken()) return;
  await loadCurrentUser();

  const filterForm = document.getElementById('salesFilterForm');
  filterForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await loadSalesTable();
  });

  document.getElementById('salesResetFiltersBtn')?.addEventListener('click', async () => {
    const form = document.getElementById('salesFilterForm');
    form?.reset();
    await loadSalesTable();
  });

  document.getElementById('refundCloseBtn')?.addEventListener('click', closeRefundModal);
  document.getElementById('refundCancelBtn')?.addEventListener('click', closeRefundModal);
  document.getElementById('saleDetailCloseBtn')?.addEventListener('click', closeSaleDetailModal);

  document.getElementById('refundForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saleId = document.getElementById('refundSaleId').value;
    const amount = Number(document.getElementById('refundAmount').value || 0);
    const reason = document.getElementById('refundReason').value.trim() || 'customer_return';

    if (!saleId || !amount || amount <= 0) {
      showSalesNotice('Enter a valid refund amount.', true);
      return;
    }

    try {
      await apiFetch(`/refunds/sales/${saleId}/refund`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ amount, reason }),
      });

      closeRefundModal();
      showSalesNotice('Refund recorded successfully.');
      await loadSalesTable();
    } catch (error) {
      showSalesNotice(error.message, true);
    }
  });

  await loadSalesTable();
}

async function initReportsPage() {
  if (!getToken()) return;
  await loadCurrentUser();

  const reportForm = document.getElementById('reportForm');
  reportForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    const response = await apiFetch(`/reports/sales?${params.toString()}`);
    const { summary = {}, rows = [] } = response;
    document.getElementById('reportSalesCount').textContent = String(summary.salesCount || 0);
    document.getElementById('reportRevenue').textContent = formatCurrency(summary.totalRevenue || 0);
    document.getElementById('reportProfit').textContent = formatCurrency(summary.totalProfit || 0);

    const cashierTbody = document.getElementById('reportCashierTableBody');
    if (cashierTbody) {
      cashierTbody.innerHTML = (summary.byCashier || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.cashier_name || 'Unknown')}</td>
          <td>${row.salesCount || 0}</td>
          <td>${formatCurrency(row.totalRevenue || 0)}</td>
        </tr>
      `).join('') || '<tr><td colspan="3">No cashier data</td></tr>';
    }

    const statusTbody = document.getElementById('reportStatusTableBody');
    if (statusTbody) {
      statusTbody.innerHTML = (summary.byStatus || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.status || 'Unknown')}</td>
          <td>${row.salesCount || 0}</td>
          <td>${formatCurrency(row.totalRevenue || 0)}</td>
        </tr>
      `).join('') || '<tr><td colspan="3">No status data</td></tr>';
    }

    const tbody = document.getElementById('reportsTableBody');
    if (tbody) {
      tbody.innerHTML = rows.map((row) => `
        <tr>
          <td>${escapeHtml(row.sale_number || '—')}</td>
          <td>${formatCurrency(row.net_amount || row.total_amount || 0)}</td>
          <td>${escapeHtml(row.cashier_name || '—')}</td>
          <td>${escapeHtml(row.status || 'completed')}</td>
          <td>${new Date(row.created_at).toLocaleString()}</td>
        </tr>
      `).join('');
    }
  });

  await reportForm?.dispatchEvent(new Event('submit', { cancelable: true }));
}

async function initUsersPage() {
  if (!getToken()) return;
  await loadCurrentUser();
  await loadUsers();

  const form = document.getElementById('userForm');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      full_name: document.getElementById('userFullName').value,
      email: document.getElementById('userEmail').value,
      role: document.getElementById('userRole').value,
    };

    const password = document.getElementById('userPassword').value;
    if (password) payload.password = password;

    const id = document.getElementById('userId').value;
    try {
      if (id) {
        await apiFetch(`/users/${id}`, { method: 'PUT', headers: jsonHeaders(), body: JSON.stringify(payload) });
      } else {
        await apiFetch('/users', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(payload) });
      }
      form.reset();
      document.getElementById('userId').value = '';
      await loadUsers();
    } catch (error) {
      showError('userError', error.message);
    }
  });

  document.getElementById('resetUserBtn')?.addEventListener('click', () => {
    form.reset();
    document.getElementById('userId').value = '';
  });
}

async function loadUsers() {
  const response = await apiFetch('/users');
  const rows = response.users || [];
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  tbody.innerHTML = rows.map((user) => `
    <tr>
      <td>${escapeHtml(user.full_name)}</td>
      <td>${escapeHtml(user.email)}</td>
      <td>${escapeHtml(user.role)}</td>
      <td>${user.is_active ? 'Active' : 'Inactive'}</td>
      <td>
        <button type="button" class="secondary-btn" data-edit-user="${user.id}">Edit</button>
        <button type="button" class="link-btn danger" data-delete-user="${user.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit-user]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.editUser;
      const user = rows.find((entry) => String(entry.id) === String(id));
      if (!user) return;
      document.getElementById('userId').value = user.id;
      document.getElementById('userFullName').value = user.full_name;
      document.getElementById('userEmail').value = user.email;
      document.getElementById('userRole').value = user.role;
    });
  });

  tbody.querySelectorAll('[data-delete-user]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.deleteUser;
      if (!confirm('Delete this user?')) return;
      try {
        await apiFetch(`/users/${id}`, { method: 'DELETE' });
        await loadUsers();
      } catch (error) {
        showError('userError', error.message);
      }
    });
  });
}

function showError(elementId, message) {
  const node = document.getElementById(elementId);
  if (!node) return;
  node.textContent = message;
  node.classList.remove('hidden');
}

function initCommon() {
  redirectIfUnauthenticated();

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
  }
}

async function boot() {
  initCommon();

  if (page === 'dashboard') await initDashboard();
  if (page === 'checkout') await initCheckout();
  if (page === 'products') await initProductsPage();
  if (page === 'inventory') await initInventoryPage();
  if (page === 'sales') await initSalesPage();
  if (page === 'reports') await initReportsPage();
  if (page === 'users') await initUsersPage();
}

boot();
