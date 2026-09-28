// Hardcoded System Credentials Matrix
const ValidUsers = {
  'AlingBabyStore': { password: '123456', role: 'Administrator' },
  'staff_user': { password: 'staff123', role: 'Staff Member' }
};

// LocalStorage Initialization (Updated to Sari-Sari Store aesthetic)
const InitialState = {
  products: [
    { id: 'SKU-101', name: 'Lucky Me! Pancit Canton Kalamansi', category: 'Food', stock: 50, minStock: 20, price: 15.00 },
    { id: 'SKU-102', name: 'Coca-Cola 1.5L', category: 'Beverage', stock: 4, minStock: 10, price: 75.00 },
    { id: 'SKU-103', name: 'Safeguard White Soap 130g', category: 'Toiletries', stock: 35, minStock: 15, price: 45.00 }
  ],
  transactions: [
    { date: '2026-09-20', sku: 'SKU-101', type: 'Stock In', qty: 30, user: 'Staff Member' },
    { date: '2026-09-22', sku: 'SKU-102', type: 'Stock Out', qty: 2, user: 'Administrator' }
  ]
};

function getStorageData() {
  const data = localStorage.getItem('tindaTrackDB');
  if (!data) {
    localStorage.setItem('tindaTrackDB', JSON.stringify(InitialState));
    return InitialState;
  }
  return JSON.parse(data);
}

function saveStorageData(data) {
  localStorage.setItem('tindaTrackDB', JSON.stringify(data));
}

// Authentication & GUI Route Guard
function checkAuth() {
  const currentUserJson = sessionStorage.getItem('inv_session_user');
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  if (!currentUserJson) {
    if (currentPath !== 'index.html' && currentPath !== '') {
      window.location.href = 'index.html';
    }
    return;
  }

  const currentUser = JSON.parse(currentUserJson);

  // Role Access Guard: Prevent Staff from accessing Admin pages
  if (currentUser.role === 'Staff Member') {
    if (currentPath === 'products.html' || currentPath === 'reports.html') {
      alert('Access Denied: Staff Members do not have privileges to access this page.');
      window.location.href = 'dashboard.html';
    }
  }
}

function handleLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('username').value.trim();
  const passwordInput = document.getElementById('password').value;
  // Fallback for alerts if no auth-error element exists in the new UI
  const errorElement = document.getElementById('auth-error');

  const user = ValidUsers[usernameInput];

  if (user && user.password === passwordInput) {
    sessionStorage.setItem('inv_session_user', JSON.stringify({
      username: usernameInput,
      role: user.role
    }));
    window.location.href = 'dashboard.html';
  } else {
    if (errorElement) {
        errorElement.textContent = 'Invalid credentials. Please check your username and password.';
        errorElement.style.display = 'block';
    } else {
        alert('Invalid credentials. Please check your username and password.');
    }
  }
}

function handleLogout() {
  sessionStorage.removeItem('inv_session_user');
  window.location.href = 'index.html';
}

// Render Navigation GUI Based on User Privileges
function renderNavigationGUI() {
  const currentUserJson = sessionStorage.getItem('inv_session_user');
  if (!currentUserJson) return;

  const currentUser = JSON.parse(currentUserJson);
  const navContainer = document.querySelector('.nav-links'); // Target the new flexbox list

  if (navContainer) {
    if (currentUser.role === 'Staff Member') {
      // Staff GUI: Hide Product List and Online Logbook links
      navContainer.innerHTML = `
        <li><a href="dashboard.html">Dashboard</a></li>
        <li><a href="stock.html">Update Inventory</a></li>
      `;
    } else {
      // Administrator GUI: Full access
      navContainer.innerHTML = `
        <li><a href="dashboard.html">Dashboard</a></li>
        <li><a href="products.html">Product List</a></li>
        <li><a href="stock.html">Update Inventory</a></li>
        <li><a href="reports.html">Online Logbook</a></li>
      `;
    }

    // Set Active Link State (Optional for styling)
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(link => {
      if (link.getAttribute('href') === currentPage) {
        link.style.textDecoration = 'underline'; // Quick visual indicator of current page
      }
    });
  }

  // Render User Context Banner
  const userDisplay = document.getElementById('user-role-display');
  if (userDisplay) {
    userDisplay.innerHTML = `${currentUser.username} (<span class="badge-ok">${currentUser.role}</span>)`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  renderNavigationGUI();
});