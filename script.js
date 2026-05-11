const CONFIG = {
    phone: "44998542446",
    sheetID: "1LnFf7VKaV4CLedmpiLsWtgt_Z9bZJKuyLrPfevybQc0",
    minQty: 25
};

const DOM = {
    menu: document.getElementById('menu-container'),
    cartItems: document.getElementById('cart-items'),
    cartTotal: document.getElementById('cart-total'),
    checkoutBtn: document.getElementById('checkout-btn'),
    mobileCount: document.getElementById('mobile-cart-count'),
    mobileBtn: document.getElementById('mobile-cart-btn'),
    sidebar: document.getElementById('cart-sidebar'),
    overlay: document.getElementById('cart-overlay'),
    toast: document.getElementById('toast')
};

let cart = {};
let catalog = [];

const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function showNotification(msg, type = 'success') {
    DOM.toast.innerText = msg;
    DOM.toast.className = `toast show ${type}`;
    setTimeout(() => DOM.toast.classList.remove('show'), 3000);
}

async function loadCatalog() {
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetID}/gviz/tq?tqx=out:csv`;
    
    try {
        const response = await fetch(url);
        const csvText = await response.text();
        const rows = csvText.split('\n').slice(1);
        const grouped = {};

        rows.forEach((row, index) => {
            const cols = row.split('","').map(col => col.replace(/^"|"$/g, '').trim());
            if (cols.length >= 2 && cols[1] !== "") {
                const [category, name, priceCentoRaw, unitPriceRaw, img] = cols;
                const priceCento = parseFloat(priceCentoRaw.replace(',', '.')) || null;
                const unitPrice = parseFloat(unitPriceRaw.replace(',', '.')) || null;

                if (!grouped[category]) grouped[category] = [];
                grouped[category].push({ id: index, name, priceCento, unitPrice, img: img || "https://via.placeholder.com/250x150" });
            }
        });

        catalog = grouped;
        renderMenu();
    } catch (e) {
        DOM.menu.innerHTML = "<p style='color:red; text-align:center;'>Erro ao carregar cardápio. Verifique sua conexão.</p>";
    }
}

function renderMenu() {
    let html = '';
    
    for (const category in catalog) {
        html += `<h2 class="category-title">${category}</h2><div class="product-grid">`;
        
        catalog[category].forEach(item => {
            const isConsult = !item.priceCento && !item.unitPrice;
            const unitValue = item.unitPrice || (item.priceCento ? item.priceCento / 100 : 0);
            const priceLabel = isConsult ? 'À Consultar' : 
                                (item.unitPrice && !item.priceCento ? `${formatCurrency(item.unitPrice)} / Un` : `${formatCurrency(item.priceCento || 0)} / Cento`);

            html += `
                <div class="product-card">
                    <img src="${item.img}" alt="${item.name}" loading="lazy">
                    <div class="product-name">${item.name}</div>
                    <div class="product-price">${priceLabel}</div>
                    ${isConsult ? 
                        `<button class="btn btn-consultar" onclick="consult('${item.name}')">Consultar</button>` : 
                        `<button class="btn" onclick="addToCart(${item.id}, '${item.name}', ${unitValue}, ${!!item.unitPrice && !item.priceCento})">Adicionar</button>`
                    }
                </div>`;
        });
        html += `</div>`;
    }
    DOM.menu.innerHTML = html;
}

function addToCart(id, name, unitPrice, isUnit) {
    if (!cart[id]) cart[id] = { name, unitPrice, quantity: isUnit ? 1 : CONFIG.minQty, isUnit };
    else cart[id].quantity += isUnit ? 1 : CONFIG.minQty;
    
    updateCartUI();
    showNotification(`🛒 ${name} adicionado!`);
}

function updateQuantity(id, qty) {
    qty = parseInt(qty);
    if (qty <= 0) { delete cart[id]; }
    else if (!cart[id].isUnit && qty < CONFIG.minQty) {
        showNotification(`Mínimo de ${CONFIG.minQty} unidades.`, 'warning');
        cart[id].quantity = CONFIG.minQty;
    } else {
        cart[id].quantity = qty;
    }
    updateCartUI();
}

function updateCartUI() {
    let html = '';
    let total = 0;
    const items = Object.keys(cart);

    if (items.length === 0) {
        DOM.cartItems.innerHTML = '<p>Seu carrinho está vazio.</p>';
        DOM.cartTotal.innerText = 'Total: R$ 0,00';
        DOM.checkoutBtn.disabled = true;
        DOM.mobileBtn.style.display = 'none';
        return;
    }

    items.forEach(id => {
        const item = cart[id];
        const subtotal = item.unitPrice * item.quantity;
        total += subtotal;
        html += `
            <div class="cart-item">
                <div style="flex: 1; font-size: 0.95rem; line-height: 1.4;">
                    <strong>${item.name}</strong><br>${formatCurrency(subtotal)}
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                    <button class="btn-remove" onclick="updateQuantity(${id}, 0)">X</button>
                    <div class="qty-wrapper">
                        Qtd: <input type="number" min="0" value="${item.quantity}" onchange="updateQuantity(${id}, this.value)">
                    </div>
                </div>
            </div>`;
    });

    DOM.cartItems.innerHTML = html;
    DOM.cartTotal.innerText = `Total: ${formatCurrency(total)}`;
    DOM.checkoutBtn.disabled = false;
    DOM.mobileCount.innerText = items.length;
    if (window.innerWidth <= 768) DOM.mobileBtn.style.display = 'block';
}

function consult(name) {
    const msg = window.encodeURIComponent(`Olá Eduarda! Gostaria de consultar o valor de: ${name}`);
    window.open(`https://wa.me/55${CONFIG.phone}?text=${msg}`, '_blank');
}

function checkout() {
    let msg = "Olá, Eduarda! Gostaria de fazer o seguinte pedido:\n\n";
    let total = 0;
    
    for (const id in cart) {
        const item = cart[id];
        const sub = item.unitPrice * item.quantity;
        total += sub;
        msg += `• ${item.quantity}x ${item.name} - ${formatCurrency(sub)}\n`;
    }
    
    msg += `\n*Total do Pedido: ${formatCurrency(total)}*\n\nCiente do pagamento em Dinheiro ou PIX no ato da entrega.\n\n*Chave PIX (CPF):* 039.722.899-60`;
    window.open(`https://wa.me/55${CONFIG.phone}?text=${window.encodeURIComponent(msg)}`, '_blank');
}

function toggleMobileCart() {
    DOM.sidebar.classList.toggle('open');
    DOM.overlay.classList.toggle('show');
}

// Inicialização
loadCatalog();
