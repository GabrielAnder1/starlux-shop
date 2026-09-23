// =========================================
// 1. CONFIGURACIÓN Y ESTADO
// =========================================
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRKsdhwWHFDs5ae8EKOJ8eMI1Sti6YiGpx9UEN2llVmLcfV5dOjxtiG69saOM8gbx8hZkByXQXp8oKC/pub?gid=0&single=true&output=csv';
const WHATSAPP_NUMBER = '584121035122';

let products = [];
let cart = JSON.parse(localStorage.getItem('starlux_cart')) || [];
let heroImages = [];
let currentHeroIndex = 0;
let heroInterval;

// =========================================
// 2. PARSER CSV CORREGIDO
// =========================================
// Parsea una línea CSV respetando comillas dobles
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Comilla escapada dentro de comillas
        current += '"';
        i++; // saltar la siguiente comilla
      } else if (char === '"') {
        // Fin de comillas
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  // Añadir el último campo
  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  // Normalizar saltos de línea
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    
    return obj;
  });
}

function mapProductData(row) {
  // Acceso directo por nombre exacto de columna según el Google Sheet
  return {
    id: (row['id de producto'] || '').trim(),
    image: (row['url del producto'] || '').trim(),
    name: (row['nombre del producto'] || '').trim(),
    category: (row['categoría del producto'] || '').trim(),
    size: (row['talla del producto'] || '').trim(),
    price: (row['precio del producto'] || '').trim(),
    status: (row['disponibilidad del producto'] || '').trim().toLowerCase()
  };
}

// =========================================
// 3. LÓGICA DE PRODUCTOS Y CARRUSEL
// =========================================
async function loadProducts() {
  try {
    const response = await fetch(CSV_URL);
    const text = await response.text();
    const rawData = parseCSV(text);
    
    // Debug: mostrar primera fila en consola para verificar
    if (rawData.length > 0) {
      console.log('Primer producto parseado:', rawData[0]);
    }
    
    products = rawData
      .map(mapProductData)
      .filter(p => p.status !== 'fuera de catálogo' && p.id);
      
    renderCategories();
    renderProducts(products);
    initHeroCarousel();
    updateAllProductButtons();
  } catch (error) {
    console.error('Error cargando productos:', error);
    document.getElementById('product-list').innerHTML = '<p>Error al cargar los productos. Intente más tarde.</p>';
  }
}

function initHeroCarousel() {
  heroImages = [...new Set(products.map(p => p.image).filter(img => img && img !== 'null' && img.trim() !== ''))];
  
  if (heroImages.length > 0) {
    updateHeroImage();
    heroInterval = setInterval(() => {
      currentHeroIndex = (currentHeroIndex + 1) % heroImages.length;
      updateHeroImage();
    }, 5000);
  }
}

function updateHeroImage() {
  const heroImg = document.getElementById('hero-img');
  if (heroImg && heroImages.length > 0) {
    heroImg.style.opacity = 0;
    setTimeout(() => {
      heroImg.src = heroImages[currentHeroIndex];
      heroImg.style.opacity = 1;
    }, 300);
  }
}

function renderCategories() {
  const categories = [...new Set(products.map(p => p.category))].filter(Boolean);
  const container = document.getElementById('category-list');
  
  container.innerHTML = `
    <button class="neu-btn category-btn active" data-category="all">Todas</button>
    ${categories.map(cat => `<button class="neu-btn category-btn" data-category="${cat}">${cat}</button>`).join('')}
  `;

  container.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      const category = e.target.dataset.category;
      const filtered = category === 'all' ? products : products.filter(p => p.category === category);
      renderProducts(filtered);
    });
  });

  const scrollContainer = document.getElementById('category-list');
  document.getElementById('scroll-left').addEventListener('click', () => {
    scrollContainer.scrollBy({ left: -200, behavior: 'smooth' });
  });
  document.getElementById('scroll-right').addEventListener('click', () => {
    scrollContainer.scrollBy({ left: 200, behavior: 'smooth' });
  });
}

function renderProducts(productList) {
  const container = document.getElementById('product-list');
  
  if (productList.length === 0) {
    container.innerHTML = '<p>No hay productos disponibles en esta categoría.</p>';
    return;
  }

  container.innerHTML = productList.map(product => {
    const isAvailable = product.status === 'disponible';
    const statusClass = `status-${product.status.replace(/\s+/g, '-')}`;
    const isInCart = cart.some(item => item.id === product.id);
    
    let btnText, btnClass, btnDisabled;
    
    if (!isAvailable) {
      // Formatear estado con primera letra mayúscula
      btnText = product.status.charAt(0).toUpperCase() + product.status.slice(1);
      btnClass = 'neu-btn';
      btnDisabled = 'disabled';
    } else if (isInCart) {
      btnText = 'Eliminar del carrito';
      btnClass = 'neu-btn remove-btn';
      btnDisabled = '';
    } else {
      btnText = 'Añadir al carrito';
      btnClass = 'neu-btn primary';
      btnDisabled = '';
    }

    const formattedStatus = product.status.charAt(0).toUpperCase() + product.status.slice(1);

    return `
      <article class="product-card neu-card">
        <div class="product-image neu-pressed">
          <img src="${product.image || 'https://via.placeholder.com/400x500/fff0b6/1a1a1a?text=Sin+Imagen'}" alt="${product.name}" loading="lazy">
        </div>
        <div class="product-info">
          <h3 title="${product.name}">${product.name}</h3>
          <div class="product-meta">
            <span>${product.price}</span>
            <span class="product-status ${statusClass}">${formattedStatus}</span>
          </div>
          <p style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 0.5rem;">Talla: ${product.size}</p>
          <button class="${btnClass} add-to-cart-btn" ${btnDisabled} data-id="${product.id}">
            ${btnText}
          </button>
        </div>
      </article>
    `;
  }).join('');

  container.querySelectorAll('.add-to-cart-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const isInCart = cart.some(item => item.id === id);
      
      if (isInCart) {
        removeFromCart(id);
      } else {
        addToCart(id);
      }
    });
  });
}

function updateAllProductButtons() {
  document.querySelectorAll('.add-to-cart-btn:not([disabled])').forEach(btn => {
    const id = btn.dataset.id;
    const isInCart = cart.some(item => item.id === id);
    
    if (isInCart) {
      btn.textContent = 'Eliminar del carrito';
      btn.classList.add('remove-btn');
      btn.classList.remove('primary');
    } else {
      btn.textContent = 'Añadir al carrito';
      btn.classList.remove('remove-btn');
      btn.classList.add('primary');
    }
  });
}

// =========================================
// 4. LÓGICA DEL CARRITO
// =========================================
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  if (!cart.some(item => item.id === productId)) {
    cart.push({ ...product, quantity: 1 });
    saveCart();
    updateCartUI();
    updateAllProductButtons();
  }
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartUI();
  updateAllProductButtons();
}

function saveCart() {
  localStorage.setItem('starlux_cart', JSON.stringify(cart));
}

function updateCartUI() {
  const countEl = document.getElementById('cart-count');
  const itemsEl = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total-amount');
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  countEl.textContent = totalItems;

  if (cart.length === 0) {
    itemsEl.innerHTML = '<p style="text-align:center; padding: 2rem; opacity: 0.7;">Tu carrito está vacío.</p>';
    totalEl.textContent = '$0,00';
    return;
  }

  let total = 0;
  itemsEl.innerHTML = cart.map(item => {
    const numericPrice = parseFloat(item.price.replace('$', '').replace(',', '.'));
    total += numericPrice * item.quantity;

    return `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}">
        <div class="cart-item-info">
          <h4 title="${item.name}">${item.name}</h4>
          <p>${item.price}</p>
          <p style="font-size: 0.85rem; opacity: 0.8; margin-top: 0.25rem;">Talla: ${item.size}</p>
          <button class="cart-item-remove" data-id="${item.id}">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');

  totalEl.textContent = `$${total.toFixed(2).replace('.', ',')}`;

  itemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => removeFromCart(e.target.dataset.id));
  });
}

function openCart() {
  document.getElementById('cart-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// =========================================
// 5. INICIALIZACIÓN Y EVENTOS GLOBALES
// =========================================
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  updateCartUI();

  document.getElementById('cart-btn').addEventListener('click', openCart);
  document.getElementById('close-cart').addEventListener('click', closeCart);
  
  document.getElementById('cart-modal').addEventListener('click', (e) => {
    if (e.target.id === 'cart-modal') closeCart();
  });

  document.getElementById('checkout-btn').addEventListener('click', () => {
    if (cart.length === 0) return;
    
    let message = '¡Hola STARLUX! Quiero realizar el siguiente pedido:%0A%0A';
    let total = 0;
    
    cart.forEach(item => {
      const numericPrice = parseFloat(item.price.replace('$', '').replace(',', '.'));
      total += numericPrice * item.quantity;
      message += `- ${item.name} (Talla: ${item.size}) x${item.quantity} = $${(numericPrice * item.quantity).toFixed(2).replace('.', ',')}%0A`;
    });
    
    message += `%0ATotal: $${total.toFixed(2).replace('.', ',')}`;
    
    window.open(`https://api.whatsapp.com/send/?phone=${WHATSAPP_NUMBER}&text=${message}`, '_blank');
  });
});