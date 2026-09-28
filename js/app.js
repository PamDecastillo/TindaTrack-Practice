// 0. Shared Data Model — single source of truth for Users, Products & Transactions,
// persisted to localStorage so data survives a page refresh.

const STORAGE_KEY_DB = 'tindaTrackDB';
const STORAGE_KEY_SESSION = 'inv_session_user';

// Hardcoded System Credentials Matrix
const ValidUsers = {
    'AlingBabyStore': { password: '123456', role: 'Administrator' },
    'staff_user': { password: 'staff123', role: 'Staff Member' }
};

// Pages Staff Members are not allowed to open
const adminOnlyPages = ['products.html', 'reports.html'];

const InitialState = {
    products: [
        { id: 'SKU-101', name: 'Lucky Me! Pancit Canton Kalamansi', category: 'Food', stock: 50, minStock: 20, price: 15.00 },
        { id: 'SKU-102', name: 'Coca-Cola 1.5L', category: 'Beverage', stock: 4, minStock: 10, price: 75.00 },
        { id: 'SKU-103', name: 'Safeguard White Soap 130g', category: 'Toiletries', stock: 35, minStock: 15, price: 45.00 }
    ],
    transactions: [
        { date: '2026-09-20', sku: 'SKU-101', type: 'Stock In', qty: 30, user: 'staff_user', remarks: '' },
        { date: '2026-09-22', sku: 'SKU-102', type: 'Stock Out', qty: 2, user: 'AlingBabyStore', remarks: '' }
    ]
};

function saveStorageData(data) {
    try { localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(data)); } catch (e) {}
}

// Falls back to the starting data if storage is empty or unreadable
function getStorageData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_DB);
        if (saved) return JSON.parse(saved);
    } catch (e) {}
    const fresh = JSON.parse(JSON.stringify(InitialState));
    saveStorageData(fresh);
    return fresh;
}

// The session holds a JSON object, so it must be parsed before use
function getSessionUser() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY_SESSION)); } catch (e) { return null; }
}

// 0.5. UI Feedback Helpers — toast notifications used in place of alert()

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Escapes user-typed text before it goes into innerHTML
function escapeHTML(text) {
    return String(text ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

// 1. Authentication & Route Guard
// Returns true when the page may keep loading, false when a redirect started.

function checkAuth() {
    const user = getSessionUser();
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const isLoginPage = page === 'index.html';

    if (!user) {
        if (!isLoginPage) { window.location.replace('index.html'); return false; }
        return true;
    }

    // A logged-in user who opens index.html goes straight to the dashboard
    if (isLoginPage) { window.location.replace('dashboard.html'); return false; }

    // Role Access Guard: Staff cannot open admin pages
    if (user.role === 'Staff Member' && adminOnlyPages.includes(page)) {
        window.location.replace('dashboard.html');
        return false;
    }
    return true;
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('auth-error');
    const user = ValidUsers[username];

    if (user && user.password === password) {
        sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({ username, role: user.role }));
        window.location.href = 'dashboard.html';
    } else {
        errorElement.textContent = 'Invalid credentials. Please check your username and password.';
        errorElement.style.display = 'block';
    }
}

function handleLogout(event) {
    if (event) event.preventDefault();
    sessionStorage.removeItem(STORAGE_KEY_SESSION);
    window.location.href = 'index.html';
}

// 2. Shared Header & Navigation — date, active link, and Staff-hidden links

function renderHeaderDate() {
    const dateElement = document.getElementById('header-date');
    if (!dateElement) return;
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const formattedDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    dateElement.innerHTML = `${formattedDate} <span class="day-bold">${formattedDay}</span>`;
}

function renderNavigation(user) {
    const page = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-links a').forEach(link => {
        if (user.role === 'Staff Member' && link.hasAttribute('data-admin')) {
            link.parentElement.remove();
        } else if (link.getAttribute('href') === page) {
            link.classList.add('active');
        }
    });

    const userDisplay = document.getElementById('user-role-display');
    if (userDisplay) {
        userDisplay.innerHTML = `${escapeHTML(user.username)} (<span class="badge-ok">${escapeHTML(user.role)}</span>)`;
    }
}

// 3. Dashboard Page - metrics and inventory summary from the shared data model

function renderDashboard() {
    const body = document.getElementById('dashboard-table-body');
    if (!body) return;

    const db = getStorageData();
    let totalUnits = 0;
    let lowStockCount = 0;

    body.innerHTML = db.products.map(p => {
        const isLow = p.stock <= p.minStock;
        totalUnits += p.stock;
        if (isLow) lowStockCount++;
        return `<tr>
            <td>${escapeHTML(p.id)}</td>
            <td>${escapeHTML(p.name)}</td>
            <td>${escapeHTML(p.category)}</td>
            <td>${p.stock}</td>
            <td><span class="${isLow ? 'badge-low' : 'badge-ok'}">${isLow ? 'Low Stock Warning' : 'Optimal'}</span></td>
        </tr>`;
    }).join('') || '<tr><td colspan="5" class="empty-state">No products yet.</td></tr>';

    document.getElementById('kpi-total-sku').textContent = db.products.length;
    document.getElementById('kpi-total-units').textContent = totalUnits;
    document.getElementById('kpi-low-stock').textContent = lowStockCount;
}

// 4. Product Page - Render, Add, Remove (data-driven)

function renderProducts() {
    const body = document.getElementById('product-catalog-body');
    if (!body) return;

    const db = getStorageData();
    body.innerHTML = db.products.map(p => `<tr>
        <td>${escapeHTML(p.id)}</td>
        <td>${escapeHTML(p.name)}</td>
        <td>${escapeHTML(p.category)}</td>
        <td>₱${Number(p.price).toFixed(2)}</td>
        <td>${p.stock}</td>
        <td><button type="button" class="btn-danger" data-sku="${escapeHTML(p.id)}">Remove</button></td>
    </tr>`).join('') || '<tr><td colspan="6" class="empty-state">No products found.</td></tr>';
}

function handleAddProduct(event) {
    event.preventDefault();
    const db = getStorageData();

    const id = document.getElementById('prod-sku').value.trim();
    const name = document.getElementById('prod-name').value.trim();
    const category = document.getElementById('prod-cat').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value);
    const stock = parseInt(document.getElementById('prod-stock').value, 10);
    const minStock = parseInt(document.getElementById('prod-min').value, 10);

    if (!id || !name || !category) { showToast('Please fill in every field.', 'error'); return; }
    if (isNaN(price) || price <= 0) { showToast('Unit price must be greater than 0.', 'error'); return; }
    if (isNaN(stock) || stock < 0 || isNaN(minStock) || minStock < 0) {
        showToast('Quantity and threshold cannot be negative.', 'error');
        return;
    }
    if (db.products.some(p => p.id.toLowerCase() === id.toLowerCase())) {
        showToast(`SKU ${id} already exists.`, 'error');
        return;
    }

    db.products.push({ id, name, category, price, stock, minStock });
    saveStorageData(db);
    event.target.reset();
    renderProducts();
    showToast(`${name} registered.`);
}

// Remove uses the SKU (not the row position) so the right product is always deleted
function handleRemoveProduct(event) {
    const button = event.target.closest('button[data-sku]');
    if (!button) return;
    if (!confirm(`Remove ${button.dataset.sku} from the catalog?`)) return;

    const db = getStorageData();
    db.products = db.products.filter(p => p.id !== button.dataset.sku);
    saveStorageData(db);
    renderProducts();
    showToast('Product removed.');
}

// 5. Update Inventory Page - Stock In / Stock Out (updates product quantity too)

function populateSkus() {
    const select = document.getElementById('trans-sku');
    if (!select) return;
    const db = getStorageData();
    select.innerHTML = db.products
        .map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.id)} - ${escapeHTML(p.name)} (Current: ${p.stock})</option>`)
        .join('');
}

function processTransaction(event) {
    event.preventDefault();
    const db = getStorageData();
    const user = getSessionUser();
    const type = document.getElementById('trans-type').value;
    const sku = document.getElementById('trans-sku').value;
    const qty = parseInt(document.getElementById('trans-qty').value, 10);
    const remarks = document.getElementById('trans-notes').value.trim();
    const product = db.products.find(p => p.id === sku);

    if (!product || isNaN(qty) || qty < 1) { showToast('Choose a product and a quantity of at least 1.', 'error'); return; }

    // Stock Out cannot exceed what is on the shelf
    if (type === 'Stock Out' && qty > product.stock) {
        showToast(`Only ${product.stock} of ${product.name} in stock.`, 'error');
        return;
    }

    product.stock += (type === 'Stock In' ? qty : -qty);
    db.transactions.unshift({
        date: new Date().toISOString().split('T')[0],
        sku, type, qty,
        user: user ? user.username : 'Unknown',
        remarks
    });

    saveStorageData(db);
    event.target.reset();
    populateSkus();
    showToast(`${type} recorded for ${product.name}.`);
}

// 6. Online Logbook Page - full transaction history with totals

function renderLogbook() {
    const body = document.getElementById('logbook-body');
    if (!body) return;

    const db = getStorageData();
    const nameOf = sku => {
        const product = db.products.find(p => p.id === sku);
        return product ? product.name : '(removed product)';
    };
    const sorted = db.transactions.slice().sort((a, b) => b.date.localeCompare(a.date));

    body.innerHTML = sorted.map(t => `<tr>
        <td>${escapeHTML(t.date)}</td>
        <td>${escapeHTML(t.sku)}</td>
        <td>${escapeHTML(nameOf(t.sku))}</td>
        <td><span class="${t.type === 'Stock In' ? 'badge-ok' : 'badge-low'}">${escapeHTML(t.type)}</span></td>
        <td>${t.type === 'Stock In' ? '+' : '-'}${t.qty}</td>
        <td>${escapeHTML(t.user)}</td>
        <td>${escapeHTML(t.remarks) || '—'}</td>
    </tr>`).join('') || '<tr><td colspan="7" class="empty-state">No transactions yet.</td></tr>';

    const sum = type => db.transactions.filter(t => t.type === type).reduce((total, t) => total + t.qty, 0);
    document.getElementById('kpi-total-in').textContent = sum('Stock In');
    document.getElementById('kpi-total-out').textContent = sum('Stock Out');
}

// 7. Page Startup — each page only runs the parts whose elements exist on it

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const user = getSessionUser();
    if (user) renderNavigation(user);
    renderHeaderDate();

    const signOut = document.getElementById('sign-out');
    if (signOut) signOut.addEventListener('click', handleLogout);

    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) addProductForm.addEventListener('submit', handleAddProduct);

    const catalogBody = document.getElementById('product-catalog-body');
    if (catalogBody) catalogBody.addEventListener('click', handleRemoveProduct);

    const stockForm = document.getElementById('stock-form');
    if (stockForm) stockForm.addEventListener('submit', processTransaction);

    renderDashboard();
    renderProducts();
    populateSkus();
    renderLogbook();
});
