// ============================================================
// === ПРОВЕРКА СЕРВЕРА И ОФЛАЙН-РЕЖИМ =========================
// ============================================================

async function checkServer() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        await fetch('http://localhost:3000', { signal: controller.signal });
        clearTimeout(timeoutId);
        return true;
    } catch {
        console.warn('JSON Server не запущен');
        return false;
    }
}

// Функция для локального сохранения сообщений
function saveFeedbackLocally(feedbackData) {
    try {
        const savedFeedbacks = localStorage.getItem('local_feedbacks');
        let feedbacks = savedFeedbacks ? JSON.parse(savedFeedbacks) : [];
        
        feedbacks.push({
            ...feedbackData,
            id: Date.now().toString(),
            savedLocally: true,
            syncedToServer: false
        });
        
        localStorage.setItem('local_feedbacks', JSON.stringify(feedbacks));
        console.log('✅ Сообщение сохранено локально:', feedbackData);
    } catch (error) {
        console.error('Ошибка при локальном сохранении:', error);
    }
}

// Функция для синхронизации локальных сообщений с сервером
async function syncLocalFeedbacks() {
    try {
        const savedFeedbacks = localStorage.getItem('local_feedbacks');
        if (!savedFeedbacks) return;
        
        const feedbacks = JSON.parse(savedFeedbacks);
        const unsynced = feedbacks.filter(f => !f.syncedToServer);
        
        if (unsynced.length === 0) return;
        
        console.log(`🔄 Синхронизация ${unsynced.length} сообщений с сервером...`);
        
        let syncedCount = 0;
        for (const feedback of unsynced) {
            try {
                const response = await fetch('http://localhost:3000/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: feedback.name,
                        email: feedback.email,
                        message: feedback.message,
                        date: feedback.date
                    })
                });
                
                if (response.ok) {
                    feedback.syncedToServer = true;
                    syncedCount++;
                    console.log(`✅ Сообщение от ${feedback.name} синхронизировано`);
                }
            } catch (error) {
                console.error(`❌ Ошибка синхронизации сообщения:`, error);
            }
        }
        
        if (syncedCount > 0) {
            localStorage.setItem('local_feedbacks', JSON.stringify(feedbacks));
            
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
            const remainingFeedbacks = feedbacks.filter(f => {
                if (!f.syncedToServer) return true;
                const feedbackDate = new Date(f.date).getTime();
                return feedbackDate > oneDayAgo;
            });
            localStorage.setItem('local_feedbacks', JSON.stringify(remainingFeedbacks));
            
            showToast(`Синхронизировано ${syncedCount} сообщений с сервером`, "success", 3000);
        }
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
    }
}

// Функция для локального сохранения заказов
function saveOrderLocally(orderData) {
    try {
        const savedOrders = localStorage.getItem('local_orders');
        let orders = savedOrders ? JSON.parse(savedOrders) : [];
        
        orders.push({
            ...orderData,
            id: Date.now().toString(),
            savedLocally: true,
            syncedToServer: false
        });
        
        localStorage.setItem('local_orders', JSON.stringify(orders));
        console.log('✅ Заказ сохранен локально:', orderData);
    } catch (error) {
        console.error('Ошибка при локальном сохранении заказа:', error);
    }
}

// Синхронизация локальных заказов
async function syncLocalOrders() {
    try {
        const savedOrders = localStorage.getItem('local_orders');
        if (!savedOrders) return;
        
        const orders = JSON.parse(savedOrders);
        const unsynced = orders.filter(o => !o.syncedToServer);
        
        if (unsynced.length === 0) return;
        
        console.log(`Синхронизация ${unsynced.length} заказов с сервером...`);
        
        let syncedCount = 0;
        for (const order of unsynced) {
            try {
                const response = await fetch('http://localhost:3000/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fullname: order.fullname,
                        phone: order.phone,
                        delivery: order.delivery,
                        address: order.address,
                        items: order.items,
                        subtotal: order.subtotal,
                        discount: order.discount,
                        total: order.total,
                        date: order.date
                    })
                });
                
                if (response.ok) {
                    order.syncedToServer = true;
                    syncedCount++;
                    console.log(`Заказ от ${order.fullname} синхронизирован`);
                }
            } catch (error) {
                console.error(`Ошибка синхронизации заказа:`, error);
            }
        }
        
        if (syncedCount > 0) {
            localStorage.setItem('local_orders', JSON.stringify(orders));
            
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const remainingOrders = orders.filter(o => {
                if (!o.syncedToServer) return true;
                const orderDate = new Date(o.date).getTime();
                return orderDate > sevenDaysAgo;
            });
            localStorage.setItem('local_orders', JSON.stringify(remainingOrders));
        }
    } catch (error) {
        console.error('Ошибка синхронизации заказов:', error);
    }
}

// ============================================================
// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==================================
// ============================================================
let products = [];
let cart = [];
const CART_KEY = "sib_health_cart";
const CERTIFICATE_AMOUNT_KEY = "sib_health_certificate_amount";
const API_URL = 'http://localhost:3000';
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

// === СЕЛЕКТОРЫ ==============================================
const productListEl = document.getElementById("productList");
const searchInputEl = document.getElementById("searchInput");
const categoryFilterEl = document.getElementById("categoryFilter");
const cartButtonEl = document.getElementById("cartButton");
const cartCountEl = document.getElementById("cartCount");
const cartPanelEl = document.getElementById("cartPanel");
const cartOverlayEl = document.getElementById("cartOverlay");
const cartCloseEl = document.getElementById("cartClose");
const cartItemsEl = document.getElementById("cartItems");
const cartSubtotalEl = document.getElementById("cartSubtotal");
const cartTotalEl = document.getElementById("cartTotal");
const cartDiscountEl = document.getElementById("cartDiscount");
const cartDiscountRowEl = document.getElementById("cartDiscountRow");
const orderFormEl = document.getElementById("orderForm");
const feedbackFormEl = document.getElementById("feedbackForm");
const promosGridEl = document.querySelector(".promos__grid");
const certificatesCardsEl = document.querySelector(".certificates__cards");
const giftCardsEl = document.querySelector(".gift-cards");

// ============================================================
// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ================================
// ============================================================

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function scrollToSection(id) {
    const section = document.getElementById(id);
    if (section) section.scrollIntoView({ behavior: "smooth" });
}

function showToast(message, type = 'error', duration = 5000) {
    const oldToasts = document.querySelectorAll('.toast-notification');
    oldToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-notification--${type}`;
    
    let icon = '';
    if (type === 'success') icon = '✅';
    if (type === 'info') icon = 'ℹ️';
    if (type === 'error') icon = '❌';
    
    toast.innerHTML = `<div class="toast-notification__icon">${icon}</div><div class="toast-notification__text">${escapeHtml(message)}</div><button class="toast-notification__close" aria-label="Закрыть">×</button>`;
    document.body.appendChild(toast);
    
    const closeBtn = toast.querySelector('.toast-notification__close');
    closeBtn.addEventListener('click', () => {
        toast.classList.add('toast-notification--hide');
        setTimeout(() => toast.remove(), 300);
    });
    
    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.classList.add('toast-notification--hide');
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// ============================================================
// === ЗАГРУЗКА ТОВАРОВ (ГИБРИДНЫЙ РЕЖИМ) =====================
// ============================================================

async function loadProducts() {
    const isCatalogPage = window.location.pathname.includes("catalog.html");
    let serverProducts = null;
    let serverAvailable = false;
    
    // 1. Пробуем загрузить с сервера
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch(`${API_URL}/products`, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
            serverProducts = await response.json();
            serverAvailable = true;
            console.log('Товары загружены с сервера');
            
            localStorage.setItem('products_cache', JSON.stringify(serverProducts));
            localStorage.setItem('products_cache_time', Date.now().toString());
        }
    } catch (error) {
        console.log('Сервер не доступен, используем локальные данные');
    }
    
    // 2. Если сервер недоступен, загружаем из кэша или data.js
    if (!serverAvailable) {
        const cached = localStorage.getItem('products_cache');
        const cacheTime = localStorage.getItem('products_cache_time');
        
        if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < CACHE_DURATION) {
            serverProducts = JSON.parse(cached);
            console.log('Товары загружены из кэша');
        } else if (typeof productsData !== 'undefined') {
            serverProducts = productsData;
            console.log('Товары загружены из data.js');
            localStorage.setItem('products_cache', JSON.stringify(serverProducts));
            localStorage.setItem('products_cache_time', Date.now().toString());
        } else {
            console.error('Нет данных о товарах!');
            serverProducts = [];
        }
    }
    
    // 3. Объединяем с локально добавленными товарами
    const localProducts = JSON.parse(localStorage.getItem('local_products') || '[]');
    const allProductsMap = new Map();
    
    serverProducts.forEach(p => {
        allProductsMap.set(String(p.id), p);
    });
    
    localProducts.forEach(p => {
        allProductsMap.set(String(p.id), p);
    });
    
    products = Array.from(allProductsMap.values());
    
    // Сохраняем объединённый список в кэш
    localStorage.setItem('products_cache', JSON.stringify(products));
    localStorage.setItem('products_cache_time', Date.now().toString());
    
    console.log(`📊 Всего товаров: ${products.length} (серверных: ${serverProducts.length}, локальных: ${localProducts.length})`);
    
    const productsToShow = isCatalogPage ? products : products.filter(p => p.isPopular);
    renderProducts(productsToShow);
    if (isCatalogPage) highlightProductFromUrl();
}

function renderProducts(list) {
    if (!productListEl) return;
    
    if (!list.length) {
        productListEl.innerHTML = "<p></p>";
        const emptyState = document.getElementById("emptyState");
        if (emptyState) emptyState.hidden = false;
        return;
    }
    
    const emptyState = document.getElementById("emptyState");
    if (emptyState) emptyState.hidden = true;
    
    productListEl.innerHTML = list.map((p) => {
        const categoryLabel = p.category === "vitamins" ? "Витамины и БАДы" : p.category === "tea" ? "Фиточаи" : "Косметика";
        const badge = p.promoLabel ? `<span class="product-card__badge product-card__badge--promo">${escapeHtml(p.promoLabel)}</span>` : p.isNew ? `<span class="product-card__badge">Новинка</span>` : "";
        
        let stockClass = "product-card__stock--in";
        if (p.stock === "Остаток ограничен") stockClass = "product-card__stock--low";
        if (p.stock === "Нет в наличии") stockClass = "product-card__stock--out";
        
        const isOutOfStock = p.stock === "Нет в наличии";
        
        return `
            <article class="product-card" data-product-id="${p.id}" data-category="${p.category}" style="display: flex; flex-direction: column; height: 100%; min-height: 420px;">
                <div style="position: relative; width: 100%; height: 180px; overflow: hidden; border-radius: 8px; background: #e8f0ea;">
                    <img src="${p.image}" alt="${escapeHtml(p.name)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://placehold.co/200x170?text=Нет+фото'">
                    ${badge}
                </div>
                <div class="product-card__category" style="margin-top: 12px;">${categoryLabel}</div>
                <h3 class="product-card__title" style="font-size: 16px; font-weight: 600; margin: 8px 0 0; line-height: 1.35; min-height: 44px;">${escapeHtml(p.name)}</h3>
                <p class="product-card__desc" style="font-size: 13px; color: #4a4f5a; line-height: 1.45; margin: 8px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(p.description)}</p>
                <div style="margin-top: auto; padding-top: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                        <div class="product-card__price" style="font-weight: 700; color: #205523; font-size: 20px;">${p.price.toLocaleString("ru-RU")} ₽</div>
                        <div class="product-card__volume" style="font-size: 12px; color: #4a4f5a;">${escapeHtml(p.volume)}</div>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <span class="product-card__stock ${stockClass}" style="font-size: 11px; padding: 4px 10px; border-radius: 20px; display: inline-block;">${escapeHtml(p.stock)}</span>
                    </div>
                    ${isOutOfStock 
                        ? `<button class="btn btn--secondary product-card__btn" disabled style="width: 100%; margin-top: 4px; padding: 10px; font-size: 14px; opacity: 0.5; cursor: not-allowed;">Нет в наличии</button>`
                        : `<button class="btn btn--secondary product-card__btn" data-add-to-cart="${p.id}" style="width: 100%; margin-top: 4px; padding: 10px; font-size: 14px; background: #fff; color: #205523; border: 1px solid rgba(148,133,97,0.3); border-radius: 999px; cursor: pointer;">В корзину</button>`
                    }
                </div>
            </article>
        `;
    }).join("");
}

function applyFilters() {
    if (!productListEl) return;
    
    const searchValue = searchInputEl ? searchInputEl.value.trim().toLowerCase() : "";
    const categoryValue = categoryFilterEl ? categoryFilterEl.value : "all";
    const sortValue = document.getElementById("sortSelect")?.value || "default";
    
    let filtered = products.filter((p) => {
        const matchesCategory = categoryValue === "all" || p.category === categoryValue;
        const matchesSearch = p.name.toLowerCase().includes(searchValue);
        return matchesCategory && matchesSearch;
    });
    
    if (sortValue === "price-asc") filtered.sort((a, b) => a.price - b.price);
    else if (sortValue === "price-desc") filtered.sort((a, b) => b.price - a.price);
    else if (sortValue === "name-asc") filtered.sort((a, b) => a.name.localeCompare(b.name));
    
    renderProducts(filtered);
    
    const emptyState = document.getElementById("emptyState");
    if (emptyState) emptyState.hidden = filtered.length > 0;
}

// ============================================================
// === КОРЗИНА ================================================
// ============================================================

function loadCart() {
    try {
        const stored = localStorage.getItem(CART_KEY);
        if (stored) cart = JSON.parse(stored);
        else cart = [];
    } catch { cart = []; }
}

function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
}

function updateCartCount() {
    if (!cartCountEl) return;
    cartCountEl.textContent = String(cart.reduce((sum, item) => sum + item.quantity, 0));
}

function updateCartTotal() {
    if (!cartSubtotalEl || !cartTotalEl) return;
    
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discount = 0;
    
    const immunityItem = cart.find((item) => String(item.id) === "1");
    if (immunityItem) {
        discount += Math.round(immunityItem.price * immunityItem.quantity * 0.15);
    }
    
    const teaPromoSum = cart
        .filter((item) => item.category === "tea" && item.promoLabel)
        .reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (teaPromoSum > 0) discount += Math.round(teaPromoSum * 0.1);
    
    const total = Math.max(subtotal - discount, 0);
    
    cartSubtotalEl.textContent = `${subtotal.toLocaleString("ru-RU")} ₽`;
    cartTotalEl.textContent = `${total.toLocaleString("ru-RU")} ₽`;
    
    if (cartDiscountEl && cartDiscountRowEl) {
        if (discount > 0) {
            cartDiscountEl.textContent = `‑${discount.toLocaleString("ru-RU")} ₽`;
            cartDiscountRowEl.hidden = false;
        } else {
            cartDiscountRowEl.hidden = true;
        }
    }
}

function renderCart() {
    if (!cartItemsEl) return;
    
    if (!cart.length) {
        cartItemsEl.innerHTML = "<p>Ваша корзина пуста. Добавьте товары из каталога.</p>";
    } else {
        cartItemsEl.innerHTML = cart.map(item => 
            `<div class="cart-item">
                <div class="cart-item__title">${escapeHtml(item.name)}</div>
                <div class="cart-item__price">${item.price.toLocaleString("ru-RU")} ₽</div>
                <div class="cart-item__qty">
                    <button type="button" class="cart-item__btn" data-cart-dec="${item.id}">−</button>
                    <span>${item.quantity}</span>
                    <button type="button" class="cart-item__btn" data-cart-inc="${item.id}">+</button>
                </div>
                <button type="button" class="cart-item__remove" data-cart-remove="${item.id}" title="Удалить товар">✕</button>
            </div>`
        ).join("");
    }
    
    updateCartCount();
    updateCartTotal();
}

function addToCart(productId) {
    const product = products.find((p) => String(p.id) === String(productId));
    if (!product) {
        console.error('Товар не найден! ID:', productId);
        return;
    }
    
    // Проверка наличия товара
    if (product.stock === "Нет в наличии") {
        showToast("❌ Этот товар временно отсутствует в наличии", "error", 3000);
        return;
    }
    
    const existing = cart.find((item) => String(item.id) === String(productId));
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    
    saveCart();
    renderCart();
    showToast("Товар добавлен в корзину", "success", 2000);
    
    if (cartButtonEl) {
        cartButtonEl.style.transform = 'scale(1.05)';
        setTimeout(() => { if(cartButtonEl) cartButtonEl.style.transform = ''; }, 200);
    }
}

function changeCartQty(productId, delta) {
    const index = cart.findIndex((item) => String(item.id) === String(productId));
    if (index === -1) return;
    
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    
    saveCart();
    renderCart();
}

// Удаление товара из корзины с подтверждением
function removeFromCart(productId) {
    const product = cart.find(item => String(item.id) === String(productId));
    if (!product) return;
    
    // Подтверждение удаления
    const confirmed = confirm(`Удалить "${product.name}" из корзины?`);
    if (!confirmed) return;
    
    cart = cart.filter((item) => String(item.id) !== String(productId));
    saveCart();
    renderCart();
    showToast("Товар удалён из корзины", "success", 2000);
}

function openCart() {
    if (cartPanelEl) {
        cartPanelEl.classList.add("cart--open");
        cartPanelEl.setAttribute("aria-hidden", "false");
    }
}

function closeCart() {
    if (cartPanelEl) {
        cartPanelEl.classList.remove("cart--open");
        cartPanelEl.setAttribute("aria-hidden", "true");
    }
}
// Очистка всей корзины с подтверждением
function clearCart() {
    if (cart.length === 0) {
        showToast("Корзина уже пуста", "info", 2000);
        return;
    }
    
    // Подтверждение удаления
    const confirmed = confirm("Вы уверены, что хотите очистить всю корзину?");
    if (!confirmed) return;
    
    cart = [];
    saveCart();
    renderCart();
    showToast("Корзина очищена", "success", 2000);
}

// ============================================================
// === ОБРАТНАЯ СВЯЗЬ (с офлайн-режимом) ======================
// ============================================================

async function handleFeedbackSubmit(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!feedbackFormEl) return;
    
    const formData = new FormData(feedbackFormEl);
    const name = formData.get('name')?.trim() || '';
    const email = formData.get('email')?.trim() || '';
    const message = formData.get('message')?.trim() || '';
    
    if (name.length < 2) {
        showToast("Введите корректное имя (минимум 2 буквы)", "error");
        return;
    }
    
    if (!isValidEmail(email)) {
        showToast("Введите корректный email (например: name@mail.com)", "error");
        return;
    }
    
    if (message.length < 5) {
        showToast("Сообщение слишком короткое (минимум 5 символов)", "error");
        return;
    }
    
    const feedbackData = {
        name: name,
        email: email,
        message: message,
        date: new Date().toISOString()
    };
    
    console.log("Отправка сообщения на сервер:", feedbackData);
    
    const isServerRunning = await checkServer();
    
    if (!isServerRunning) {
        showToast("Сервер не доступен. Сообщение сохранено локально и будет отправлено позже.", "info", 5000);
        saveFeedbackLocally(feedbackData);
        feedbackFormEl.reset();
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(feedbackData)
        });
        
        if (response.ok) {
            console.log("✅ Сообщение сохранено на сервере");
            showToast("Сообщение успешно отправлено! Мы свяжемся с вами.", "success", 6000);
            feedbackFormEl.reset();
            await syncLocalFeedbacks();
        } else {
            showToast(`Ошибка при отправке. Сообщение сохранено локально.`, "error");
            saveFeedbackLocally(feedbackData);
            feedbackFormEl.reset();
        }
    } catch (error) {
        console.error("Ошибка сети:", error);
        showToast("Не удалось соединиться с сервером. Сообщение сохранено локально.", "error");
        saveFeedbackLocally(feedbackData);
        feedbackFormEl.reset();
    }
}

// ============================================================
// === ОБРАБОТКА ФОРМЫ ЗАКАЗА (с офлайн-режимом) ==============
// ============================================================

async function handleOrderSubmit(event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log("=== НАЧАЛО ОФОРМЛЕНИЯ ЗАКАЗА ===");
    
    if (!cart.length) {
        showToast("Корзина пуста. Добавьте товары.", "error");
        return;
    }
    
    if (!orderFormEl) return;
    
    // Проверка согласия на обработку ПД
const consentCheckbox = document.getElementById('consentCheckbox');
if (consentCheckbox && !consentCheckbox.checked) {
    showToast("Необходимо согласие на обработку персональных данных", "error");
    return;
}
    const formData = new FormData(orderFormEl);
    const fullname = String(formData.get('name') || '').trim();
    const phone = formData.get('phone')?.trim() || '';
    const delivery = formData.get('delivery');
    const address = delivery === 'courier' ? (formData.get('address') || '') : '';
    
    if (fullname === "") {
        showToast("Введите имя и фамилию", "error");
        return;
    }
    
    if (!fullname.includes(" ")) {
        showToast("Введите имя и фамилию через пробел", "error");
        return;
    }
    
    const nameParts = fullname.split(" ").filter(part => part.length > 0);
    
    if (nameParts.length < 2) {
        showToast("Введите и имя, и фамилию (например: Иван Иванов)", "error");
        return;
    }
    
    const firstName = nameParts[0];
    const lastName = nameParts[1];
    
    if (firstName.length < 2) {
        showToast(`Имя "${firstName}" слишком короткое (минимум 2 буквы)`, "error");
        return;
    }
    
    if (lastName.length < 2) {
        showToast(`Фамилия "${lastName}" слишком короткая (минимум 2 буквы)`, "error");
        return;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 0) {
        showToast("Введите номер телефона", "error");
        return;
    }
    
    if (cleanPhone.length !== 11) {
        showToast(`Номер телефона должен содержать 11 цифр (сейчас ${cleanPhone.length})`, "error");
        return;
    }
    
    if (!cleanPhone.startsWith('7') && !cleanPhone.startsWith('8')) {
        showToast("Номер телефона должен начинаться с 7 или 8", "error");
        return;
    }
    
    if (!delivery) {
        showToast("Выберите способ доставки", "error");
        return;
    }
    
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discount = 0;
    
    const immunityItem = cart.find((item) => String(item.id) === "1");
    if (immunityItem) {
        discount += Math.round(immunityItem.price * immunityItem.quantity * 0.15);
    }
    
    const teaPromoSum = cart
        .filter((item) => item.category === "tea" && item.promoLabel)
        .reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (teaPromoSum > 0) discount += Math.round(teaPromoSum * 0.1);
    
    const orderData = {
        fullname: fullname,
        phone: phone,
        delivery: delivery,
        address: address,
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            category: item.category
        })),
        subtotal: subtotal,
        discount: discount,
        total: Math.max(subtotal - discount, 0),
        date: new Date().toISOString()
    };
    
    console.log("Отправка заказа на сервер:", orderData);
    
    const isServerRunning = await checkServer();
    
    if (!isServerRunning) {
        showToast("Сервер не доступен. Заказ сохранен локально и будет обработан позже.", "info", 5000);
        saveOrderLocally(orderData);
        
        cart = [];
        saveCart();
        renderCart();
        orderFormEl.reset();
        setTimeout(() => closeCart(), 2000);
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
            console.log("✅ Заказ сохранён на сервере");
            showToast("Заказ успешно оформлен! Спасибо за покупку!", "success", 6000);
            
            cart = [];
            saveCart();
            renderCart();
            orderFormEl.reset();
            setTimeout(() => closeCart(), 2000);
            await syncLocalOrders();
        } else {
            showToast(`Ошибка при оформлении заказа. Заказ сохранен локально.`, "error");
            saveOrderLocally(orderData);
            
            cart = [];
            saveCart();
            renderCart();
            orderFormEl.reset();
            setTimeout(() => closeCart(), 2000);
        }
    } catch (error) {
        console.error("Ошибка сети:", error);
        showToast("Не удалось соединиться с сервером. Заказ сохранен локально.", "error");
        saveOrderLocally(orderData);
        
        cart = [];
        saveCart();
        renderCart();
        orderFormEl.reset();
        setTimeout(() => closeCart(), 2000);
    }
}

// ============================================================
// === СЕРТИФИКАТЫ И АКЦИИ ====================================
// ============================================================

function handleGiftCardClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    
    const card = target.closest(".gift-card");
    if (!card) return;
    
    const amount = card.getAttribute("data-amount");
    
    document.querySelectorAll(".gift-card--selected").forEach(el => el.classList.remove("gift-card--selected"));
    card.classList.add("gift-card--selected");
    
    if (amount) sessionStorage.setItem(CERTIFICATE_AMOUNT_KEY, amount);
    
    const amountDisplay = amount === "custom" ? "индивидуальный" : amount + " ₽";
    showToast(`Выбран номинал: ${amountDisplay}`, "info", 3000);
    
    const form = document.getElementById("feedbackForm");
    if (form) {
        const messageField = form.querySelector('textarea[name="message"]');
        if (messageField) {
            const amountText = amount !== "custom" ? `Номинал: ${amount} ₽.` : "Номинал: индивидуальная сумма. ";
            messageField.value = `Здравствуйте! Интересует приобретение подарочного сертификата на продукцию «Сибирское здоровье». ${amountText} Пожалуйста, уточните доступные номиналы и способы оплаты.`;
        }
    }
    
    const feedbackSection = document.getElementById("feedback");
    if (feedbackSection) {
        feedbackSection.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
            const messageField = document.getElementById("feedbackForm")?.querySelector('textarea[name="message"]');
            if (messageField) messageField.focus();
        }, 500);
    }
}

function handleCertificateRedirect() {
    const savedAmount = sessionStorage.getItem(CERTIFICATE_AMOUNT_KEY);
    if (!savedAmount) return;
    
    const form = document.getElementById("feedbackForm");
    if (!form) return;
    
    const messageField = form.querySelector('textarea[name="message"]');
    if (!messageField) return;
    
    const amountText = savedAmount !== "custom" ? `Номинал: ${savedAmount} ₽.` : "Номинал: индивидуальная сумма. ";
    messageField.value = `Здравствуйте! Интересует приобретение подарочного сертификата на продукцию «Сибирское здоровье». ${amountText} Пожалуйста, уточните доступные номиналы и способы оплаты.`;
    
    setTimeout(() => {
        messageField.scrollIntoView({ behavior: "smooth", block: "center" });
        messageField.focus();
    }, 300);
    
    sessionStorage.removeItem(CERTIFICATE_AMOUNT_KEY);
}

function handlePromoClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    
    const card = target.closest(".promo-card");
    if (!card) return;
    
    const promoType = card.getAttribute("data-promo");
    if (promoType === "immunity") window.location.href = "catalog.html?highlight=1";
    else if (promoType === "tea") window.location.href = "catalog.html?highlight=2,4";
    else if (promoType === "gift") window.location.href = "certificates.html";
}

function handleCertificateClick(type) {
    if (!feedbackFormEl) return scrollToSection("feedback");
    
    const messageField = feedbackFormEl.querySelector('textarea[name="message"]');
    if (!messageField) return scrollToSection("feedback");
    
    let text = "Здравствуйте! Прошу выслать сертификаты на продукцию «Сибирское здоровье». ";
    if (type === "gost") text = "Здравствуйте! Прошу выслать копии деклараций о соответствии и сертификатов (ГОСТ, ТР ТС) на основные позиции каталога. ";
    else if (type === "lab") text = "Здравствуйте! Интересуют результаты лабораторных испытаний по безопасности и содержанию активных веществ для представленной продукции. ";
    else if (type === "client") text = "Здравствуйте! Хотел(а) бы получить копии сертификатов и деклараций на конкретные товары. Пожалуйста, свяжитесь со мной для уточнения перечня. ";
    
    messageField.value = text;
    scrollToSection("feedback");
    messageField.focus();
}

function highlightProductFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const highlightParam = urlParams.get("highlight");
    if (!highlightParam || !productListEl) return;
    
    document.querySelectorAll(".product-card--highlighted").forEach(el => el.classList.remove("product-card--highlighted"));
    
    const productIds = highlightParam.split(",").map(id => String(id.trim()));
    productIds.forEach(id => {
        const card = productListEl.querySelector(`[data-product-id="${id}"]`);
        if (card) card.classList.add("product-card--highlighted");
    });
    
    const first = productListEl.querySelector(".product-card--highlighted");
    if (first) setTimeout(() => first.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    setTimeout(() => document.querySelectorAll(".product-card--highlighted").forEach(el => el.classList.remove("product-card--highlighted")), 5000);
}

// ============================================================
// === ПОДСВЕТКА АКТИВНОЙ ССЫЛКИ В ШАПКЕ =======================
// ============================================================

function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;
    const currentPage = currentPath.split('/').pop() || 'index.html';
    
    const navLinks = document.querySelectorAll('.nav__link');
    
    navLinks.forEach(link => {
        link.style.color = '';
        link.style.fontWeight = '';
        link.style.backgroundColor = '';
        link.classList.remove('active');
    });
    
    let activeFound = false;
    
    navLinks.forEach(link => {
        if (activeFound) return;
        
        const href = link.getAttribute('href');
        
        if (currentPage === 'catalog.html' && (href === 'catalog.html' || href === '#catalog')) {
            highlightNavLink(link);
            activeFound = true;
            return;
        }
        
        if (currentPage === 'certificates.html' && href === 'certificates.html') {
            highlightNavLink(link);
            activeFound = true;
            return;
        }
        
        if (currentPage === 'index.html' || currentPage === '') {
            if (currentHash === '#promos' && (href === '#promos' || href === 'index.html#promos')) {
                highlightNavLink(link);
                activeFound = true;
                return;
            }
            
            if (currentHash === '#about' && (href === '#about' || href === 'index.html#about')) {
                highlightNavLink(link);
                activeFound = true;
                return;
            }
            
            if (currentHash === '#hero' && (href === '#hero' || href === 'index.html#hero')) {
                highlightNavLink(link);
                activeFound = true;
                return;
            }
            
            if (!activeFound && (href === '#hero' || href === 'index.html#hero' || href === 'index.html')) {
                highlightNavLink(link);
                activeFound = true;
                return;
            }
        }
    });
}

function highlightNavLink(link) {
    link.style.color = 'var(--color-primary-dark)';
    link.style.fontWeight = '600';
    link.style.backgroundColor = 'rgba(47, 125, 50, 0.1)';
    link.classList.add('active');
}

function initNavLinks() {
    const navLinks = document.querySelectorAll('.nav__link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            this.style.outline = 'none';
            setTimeout(() => setActiveNavLink(), 50);
        });
        
        link.addEventListener('blur', function() {
            this.style.outline = '';
        });
    });
}

let scrollTimeout;
function initScrollSpy() {
    window.addEventListener('scroll', function() {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function() {
            const sections = ['hero', 'promos', 'about'];
            const scrollPosition = window.scrollY + 150;
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            
            if (currentPage === 'index.html' || currentPage === '') {
                for (const section of sections) {
                    const element = document.getElementById(section);
                    if (element) {
                        const offsetTop = element.offsetTop;
                        const offsetBottom = offsetTop + element.offsetHeight;
                        
                        if (scrollPosition >= offsetTop && scrollPosition < offsetBottom) {
                            if (window.location.hash !== `#${section}`) {
                                window.location.hash = section;
                            }
                            setActiveNavLink();
                            break;
                        }
                    }
                }
            }
        }, 100);
    });
}

// ============================================================
// === ИНТЕРАКТИВНАЯ КАРТА ДЛЯ ВЫБОРА АДРЕСА ДОСТАВКИ =========
// ============================================================

let addressMap = null;
let addressPlacemark = null;
let selectedAddress = '';

function initAddressMap() {
    const mapContainer = document.getElementById('addressMap');
    if (!mapContainer) return;
    
    if (typeof ymaps === 'undefined') {
        console.error('Яндекс.Карты не загружены');
        return;
    }
    
    ymaps.ready(() => {
        addressMap = new ymaps.Map('addressMap', {
            center: [55.414977, 55.531048],
            zoom: 14,
            controls: ['zoomControl', 'fullscreenControl', 'geolocationControl']
        });
        
        addressMap.events.add('click', function(e) {
            const coords = e.get('coords');
            setAddressFromCoords(coords);
        });
        
        const geolocationControl = addressMap.controls.get('geolocationControl');
        if (geolocationControl) {
            geolocationControl.events.add('locationfound', function(e) {
                const coords = e.get('position');
                setAddressFromCoords(coords);
            });
        }
    });
}

async function setAddressFromCoords(coords) {
    if (addressPlacemark) {
        addressMap.geoObjects.remove(addressPlacemark);
    }
    
    addressPlacemark = new ymaps.Placemark(coords, {}, {
        preset: 'islands#redDotIcon'
    });
    addressMap.geoObjects.add(addressPlacemark);
    addressMap.setCenter(coords);
    
    try {
        const response = await fetch(`https://geocode-maps.yandex.ru/1.x/?apikey=f0835711-6c91-4292-918c-6f9670282bd4&geocode=${coords[1]},${coords[0]}&format=json`);
        const data = await response.json();
        const addressObj = data.response.GeoObjectCollection.featureMember[0]?.GeoObject;
        const fullAddress = addressObj?.metaDataProperty?.GeocoderMetaData?.text || '';
        
        if (fullAddress) {
            selectedAddress = fullAddress;
            const addressInput = document.getElementById('addressInput');
            if (addressInput) {
                addressInput.value = fullAddress;
                addressInput.style.backgroundColor = '#e8f5e9';
                setTimeout(() => {
                    if (addressInput) addressInput.style.backgroundColor = '';
                }, 1000);
            }
            showToast('Адрес выбран!', 'success', 2000);
            
            const modal = document.getElementById('addressMapModal');
            if (modal) modal.style.display = 'none';
            
            setTimeout(() => {
                const scrollableContainer = document.querySelector('.cart__scrollable');
                if (scrollableContainer) {
                    scrollableContainer.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 300);
        }
    } catch (error) {
        console.error('Ошибка геокодирования:', error);
        selectedAddress = `${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}`;
        const addressInput = document.getElementById('addressInput');
        if (addressInput) {
            addressInput.value = selectedAddress;
            addressInput.style.backgroundColor = '#e8f5e9';
            setTimeout(() => {
                if (addressInput) addressInput.style.backgroundColor = '';
            }, 1000);
        }
        showToast('Адрес выбран (координаты)', 'info', 2000);
        
        const modal = document.getElementById('addressMapModal');
        if (modal) modal.style.display = 'none';
        
        setTimeout(() => {
            const scrollableContainer = document.querySelector('.cart__scrollable');
            if (scrollableContainer) {
                scrollableContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 300);
    }
}

function showAddressMap() {
    const modal = document.getElementById('addressMapModal');
    if (modal) {
        modal.style.display = 'flex';
        if (!addressMap) {
            initAddressMap();
        } else if (addressMap) {
            addressMap.container.fitToViewport();
        }
    }
}

function initAddressField() {
    const deliverySelect = document.getElementById('deliverySelect');
    const addressField = document.getElementById('addressField');
    const openMapBtn = document.getElementById('openAddressMapBtn');
    
    if (deliverySelect && addressField) {
        deliverySelect.addEventListener('change', function() {
            if (this.value === 'courier') {
                addressField.style.display = 'block';
            } else {
                addressField.style.display = 'none';
                const addressInput = document.getElementById('addressInput');
                if (addressInput) addressInput.value = '';
            }
        });
    }
    
    if (openMapBtn) {
        openMapBtn.addEventListener('click', showAddressMap);
    }
    
    const closeBtn = document.getElementById('closeAddressMapBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const modal = document.getElementById('addressMapModal');
            if (modal) modal.style.display = 'none';
        });
    }
    
    const confirmBtn = document.getElementById('confirmAddressBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (selectedAddress) {
                const addressInput = document.getElementById('addressInput');
                if (addressInput) addressInput.value = selectedAddress;
            }
            const modal = document.getElementById('addressMapModal');
            if (modal) modal.style.display = 'none';
        });
    }
    
    const modal = document.getElementById('addressMapModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

// ============================================================
// === ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ ==================================
// ============================================================

function initEvents() {
    if (searchInputEl) searchInputEl.addEventListener("input", applyFilters);
    if (categoryFilterEl) categoryFilterEl.addEventListener("change", applyFilters);
    
    // Кнопка очистки корзины
const clearCartBtn = document.getElementById('clearCartBtn');
if (clearCartBtn) {
    clearCartBtn.addEventListener('click', clearCart);
}
    const sortSelect = document.getElementById("sortSelect");
    if (sortSelect) sortSelect.addEventListener("change", applyFilters);
    
    const resetBtn = document.getElementById("resetFiltersBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (searchInputEl) searchInputEl.value = "";
            if (categoryFilterEl) categoryFilterEl.value = "all";
            if (sortSelect) sortSelect.value = "default";
            applyFilters();
        });
    }
    
    if (productListEl) {
        productListEl.addEventListener("click", (e) => {
            const t = e.target;
            if (!(t instanceof HTMLElement)) return;
            const addId = t.getAttribute("data-add-to-cart");
            if (addId) addToCart(addId);
        });
    }
    
    if (cartButtonEl) cartButtonEl.addEventListener("click", openCart);
    if (cartCloseEl) cartCloseEl.addEventListener("click", closeCart);
    if (cartOverlayEl) cartOverlayEl.addEventListener("click", closeCart);
    
    if (cartItemsEl) {
        cartItemsEl.addEventListener("click", (e) => {
            const t = e.target;
            if (!(t instanceof HTMLElement)) return;
            const incBtn = t.closest('[data-cart-inc]');
            const decBtn = t.closest('[data-cart-dec]');
            const removeBtn = t.closest('[data-cart-remove]');
            if (incBtn) changeCartQty(incBtn.getAttribute('data-cart-inc'), 1);
            else if (decBtn) changeCartQty(decBtn.getAttribute('data-cart-dec'), -1);
            else if (removeBtn) removeFromCart(removeBtn.getAttribute('data-cart-remove'));
        });
    }
    
    if (feedbackFormEl) feedbackFormEl.addEventListener("submit", handleFeedbackSubmit);
    if (orderFormEl) orderFormEl.addEventListener("submit", handleOrderSubmit);
    if (promosGridEl) promosGridEl.addEventListener("click", handlePromoClick);
    
    if (certificatesCardsEl) {
        certificatesCardsEl.addEventListener("click", (e) => {
            const t = e.target;
            if (!(t instanceof HTMLElement)) return;
            const card = t.closest(".certificate-card");
            if (card) handleCertificateClick(card.getAttribute("data-certificate") || "");
        });
    }
    
    if (giftCardsEl) giftCardsEl.addEventListener("click", handleGiftCardClick);
    
    initAddressField();
}

// ============================================================
// === ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ===========================
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    loadCart();
    renderCart();
    initEvents();
    initNavLinks();
    initScrollSpy();
    handleCertificateRedirect();
    loadProducts();
    setActiveNavLink();
    
    setTimeout(() => {
        syncLocalFeedbacks();
        syncLocalOrders();
    }, 3000);
    
    setInterval(() => {
        syncLocalFeedbacks();
        syncLocalOrders();
    }, 5 * 60 * 1000);
});

window.addEventListener('hashchange', function() {
    setActiveNavLink();
});