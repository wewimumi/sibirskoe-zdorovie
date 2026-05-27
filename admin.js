const API_URL = 'http://localhost:3000';

function escapeHtml(str){
    if(!str) return '';
    return str.replace(/[&<>]/g, function(m){
        if(m === '&') return '&amp;';
        if(m === '<') return '&lt;';
        if(m === '>') return '&gt;';
        return m;
    });
}

function showToast(message, type='success'){
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = type === 'success' ? '#22c55e' : '#ef4444';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function getCategoryName(category) {
    switch(category) {
        case 'vitamins': return 'Витамины и БАДы';
        case 'tea': return 'Фиточаи';
        case 'cosmetics': return 'Косметика';
        default: return category;
    }
}

function syncLocalProductsToCache() {
    try {
        const localProducts = JSON.parse(localStorage.getItem('local_products') || '[]');
        if (localProducts.length === 0) return;
        
        let cachedProducts = JSON.parse(localStorage.getItem('products_cache') || '[]');
        const allProductsMap = new Map();
        
        cachedProducts.forEach(p => allProductsMap.set(String(p.id), p));
        localProducts.forEach(p => allProductsMap.set(String(p.id), p));
        
        const mergedProducts = Array.from(allProductsMap.values());
        localStorage.setItem('products_cache', JSON.stringify(mergedProducts));
        localStorage.setItem('products_cache_time', Date.now().toString());
        
        console.log('Синхронизировано локальных товаров:', localProducts.length);
    } catch (error) {
        console.error('Ошибка синхронизации кэша:', error);
    }
}

async function updateProduct(productId, stock, isPopular) {
    let localProducts = JSON.parse(localStorage.getItem('local_products') || '[]');
    let updated = false;
    
    localProducts = localProducts.map(p => {
        if (String(p.id) === String(productId)) {
            updated = true;
            return { ...p, stock: stock, isPopular: isPopular === 'true' };
        }
        return p;
    });
    
    if (updated) {
        localStorage.setItem('local_products', JSON.stringify(localProducts));
    }
    
    let cachedProducts = JSON.parse(localStorage.getItem('products_cache') || '[]');
    let cachedUpdated = false;
    
    cachedProducts = cachedProducts.map(p => {
        if (String(p.id) === String(productId)) {
            cachedUpdated = true;
            return { ...p, stock: stock, isPopular: isPopular === 'true' };
        }
        return p;
    });
    
    if (cachedUpdated) {
        localStorage.setItem('products_cache', JSON.stringify(cachedProducts));
        localStorage.setItem('products_cache_time', Date.now().toString());
    }
    
    try {
        await fetch(`${API_URL}/products/${productId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stock: stock, isPopular: isPopular === 'true' })
        });
    } catch (error) {
        console.log('Сервер не доступен');
    }
    
    showToast('Изменения сохранены', 'success');
    loadProducts();
}

function initTabs(){
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab + 'Panel').classList.add('active');
            
            if(tab.dataset.tab === 'orders') loadOrders();
            if(tab.dataset.tab === 'products') loadProducts();
            if(tab.dataset.tab === 'feedback') loadFeedback();
        });
    });
}

async function loadOrders(){
    let orders = [];
    try {
        const response = await fetch(`${API_URL}/orders`);
        if(!response.ok) throw new Error();
        orders = await response.json();
    } catch(error) {
        orders = JSON.parse(localStorage.getItem('local_orders') || '[]');
    }
    renderOrders(orders);
}

function renderOrders(orders){
    const container = document.getElementById('ordersList');
    if(!orders.length){
        container.innerHTML = '<div class="empty-state">Нет заказов</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-wrapper">
            <table class="admin-table">
                <thead>
                    <tr><th>Дата</th><th>Клиент</th><th>Телефон</th><th>Сумма</th><th>Товары</th></tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td>${new Date(order.date).toLocaleString()}</td>
                            <td><strong>${escapeHtml(order.fullname)}</strong>${order.savedLocally ? '<div class="offline-badge">offline</div>' : ''}</td>
                            <td>${escapeHtml(order.phone)}</td>
                            <td>${order.total} ₽</td>
                            <td>${order.items.map(item => `<div>${escapeHtml(item.name)} x${item.quantity}</div>`).join('')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function loadFeedback(){
    let feedback = [];
    try {
        const response = await fetch(`${API_URL}/feedback`);
        if(!response.ok) throw new Error();
        feedback = await response.json();
    } catch(error) {
        feedback = JSON.parse(localStorage.getItem('local_feedbacks') || '[]');
    }
    renderFeedback(feedback);
}

function renderFeedback(feedback){
    const container = document.getElementById('feedbackList');
    if(!feedback.length){
        container.innerHTML = '<div class="empty-state">Нет сообщений</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-wrapper">
            <table class="admin-table">
                <thead>
                    <tr><th>Дата</th><th>Имя</th><th>Email</th><th>Сообщение</th></tr>
                </thead>
                <tbody>
                    ${feedback.map(f => `
                        <tr>
                            <td>${new Date(f.date).toLocaleString()}</td>
                            <td><strong>${escapeHtml(f.name)}</strong>${f.savedLocally ? '<div class="offline-badge">offline</div>' : ''}</td>
                            <td>${escapeHtml(f.email)}</td>
                            <td>${escapeHtml(f.message)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function loadProducts(){
    let products = [];
    try {
        const response = await fetch(`${API_URL}/products`);
        if(!response.ok) throw new Error();
        products = await response.json();
    } catch(error) {
        products = JSON.parse(localStorage.getItem('local_products') || '[]');
    }
    renderProducts(products);
}

function renderProducts(products){
    const container = document.getElementById('productsList');
    if(!products.length){
        container.innerHTML = '<div class="empty-state">Нет товаров</div>';
        return;
    }
    
    const stockOptions = ['В наличии', 'Остаток ограничен', 'Нет в наличии'];
    const popularOptions = [
        { value: 'true', label: 'Да' },
        { value: 'false', label: 'Нет' }
    ];
    
    container.innerHTML = `
        <div class="table-wrapper">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Название</th>
                        <th>Категория</th>
                        <th>Цена</th>
                        <th>Объём</th>
                        <th>Наличие</th>
                        <th>Популярность</th>
                        <th>Действие</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr data-product-id="${p.id}">
                            <td><strong>${escapeHtml(p.name)}</strong></td>
                            <td>${getCategoryName(p.category)}</td>
                            <td>${p.price} ₽</td>
                            <td>${escapeHtml(p.volume || '—')}</td>
                            <td>
                                <select class="stock-select" data-id="${p.id}" style="padding: 6px 10px; border-radius: 8px; border: 1px solid #ddd;">
                                    ${stockOptions.map(opt => `<option value="${opt}" ${p.stock === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                                </select>
                            </td>
                            <td>
                                <select class="popular-select" data-id="${p.id}" style="padding: 6px 10px; border-radius: 8px; border: 1px solid #ddd;">
                                    ${popularOptions.map(opt => `<option value="${opt.value}" ${(p.isPopular === true || p.isPopular === 'true') ? (opt.value === 'true' ? 'selected' : '') : (opt.value === 'false' ? 'selected' : '')}>${opt.label}</option>`).join('')}
                                </select>
                            </td>
                            <td>
                                <button class="btn-save-product" data-id="${p.id}" style="background: #2f7d32; color: white; border: none; padding: 6px 14px; border-radius: 8px; cursor: pointer;">Сохранить</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    document.querySelectorAll('.btn-save-product').forEach(btn => {
        btn.addEventListener('click', async () => {
            const productId = btn.getAttribute('data-id');
            const stockSelect = document.querySelector(`.stock-select[data-id="${productId}"]`);
            const popularSelect = document.querySelector(`.popular-select[data-id="${productId}"]`);
            await updateProduct(productId, stockSelect.value, popularSelect.value);
        });
    });
}

async function addProduct(){
    const product = {
        id: Date.now().toString(),
        name: document.getElementById('newName').value,
        category: document.getElementById('newCategory').value,
        image: document.getElementById('newImage').value || 'img/placeholder.png',
        volume: document.getElementById('newVolume').value,
        price: parseInt(document.getElementById('newPrice').value),
        stock: document.getElementById('newStock').value,
        promoLabel: document.getElementById('newPromo').value || '',
        description: document.getElementById('newDescription').value,
        isPopular: document.getElementById('newPopular').value === 'true',
        isNew: true
    };

    if(!product.name || !product.price){
        showToast('Заполните название и цену', 'error');
        return;
    }

    let serverSuccess = false;
    try {
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        if(response.ok){
            serverSuccess = true;
            showToast('Товар добавлен на сервер');
        }
    } catch(error) {
        console.log('Сервер не доступен');
    }

    const localProducts = JSON.parse(localStorage.getItem('local_products') || '[]');
    localProducts.push({ ...product, savedLocally: true, syncedToServer: serverSuccess });
    localStorage.setItem('local_products', JSON.stringify(localProducts));

    const cachedProducts = JSON.parse(localStorage.getItem('products_cache') || '[]');
    if(!cachedProducts.find(p => String(p.id) === String(product.id))){
        cachedProducts.push(product);
        localStorage.setItem('products_cache', JSON.stringify(cachedProducts));
        localStorage.setItem('products_cache_time', Date.now().toString());
    }

    if(!serverSuccess){
        showToast('Товар сохранён локально и появится на сайте');
    }

    document.getElementById('newName').value = '';
    document.getElementById('newPrice').value = '';
    document.getElementById('newVolume').value = '';
    document.getElementById('newImage').value = '';
    document.getElementById('newDescription').value = '';
    document.getElementById('newPromo').value = '';

    loadProducts();
}

function initSearch(){
    const input = document.getElementById('searchProduct');
    if(!input) return;
    input.addEventListener('input', e => {
        const value = e.target.value.toLowerCase();
        document.querySelectorAll('#productsList tbody tr').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(value) ? '' : 'none';
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initSearch();
    loadOrders();
    syncLocalProductsToCache();
    document.getElementById('addProductBtn').addEventListener('click', addProduct);
});