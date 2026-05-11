const phone = "44998542446";
const sheetID = "1LnFf7VKaV4CLedmpiLsWtgt_Z9bZJKuyLrPfevybQc0"; 
const urlPlanilha = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:csv`;

let cart = {};
let catalog = [];
let searchTerm = '';
let currentCategory = 'Todos';

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function removeAcentos(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function loadCatalog() {
    const container = document.getElementById('menu-container');
    try {
        const response = await fetch(urlPlanilha);
        const csvText = await response.text();
        const rows = csvText.split('\n').slice(1);
        const grouped = {};
        let idCounter = 1;

        rows.forEach(row => {
            const cols = row.split('","').map(col => col.replace(/^"|"$/g, '').trim());
            if (cols.length >= 2 && cols[1] !== "") {
                const category = cols[0];
                const name = cols[1];
                const priceCentoRaw = cols[2] ? cols[2].replace(',', '.') : "";
                const unitPriceRaw = cols[3] ? cols[3].replace(',', '.') : "";
                const priceCento = priceCentoRaw && priceCentoRaw !== "À Consultar" ? parseFloat(priceCentoRaw) : null;
                const unitPrice = unitPriceRaw && unitPriceRaw !== "À Consultar" ? parseFloat(unitPriceRaw) : null;
                let imageUrl = cols[4] || "https://via.placeholder.com/250x150.png?text=Sem+Foto";
                let badgeText = cols[5] ? cols[5] : null;

                if (!grouped[category]) grouped[category] = { category: category, items: [] };
                grouped[category].items.push({ 
                    id: idCounter++, 
                    name: name, 
                    priceCento: priceCento, 
                    unitPrice: unitPrice, 
                    imageUrl: imageUrl,
                    badge: badgeText 
                });
            }
        });

        catalog = Object.values(grouped);
        setupFilters(); 
        renderMenu();
    } catch (error) {
        container.innerHTML = "<h3 style='padding: 2rem; color: red; text-align:center;'>Erro de conexão. Tente novamente.</h3>";
    }
}

function setupFilters() {
    const filterContainer = document.getElementById('filter-buttons');
    if (!filterContainer) return; 
    let html = `<button class="filter-btn active" onclick="setCategory('Todos', this)">Todos</button>`;
    catalog.forEach(cat => {
        html += `<button class="filter-btn" onclick="setCategory('${cat.category}', this)">${cat.category}</button>`;
    });
    filterContainer.innerHTML = html;
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            searchTerm = removeAcentos(e.target.value);
            renderMenu();
        });
    }
}

function setCategory(category, buttonElement) {
    currentCategory = category;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');
    renderMenu();
}

function openLightbox(url) {
    document.getElementById('lightbox-img').src = url;
    document.getElementById('lightbox').classList.add('show');
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('show');
}

function renderMenu() {
    const container = document.getElementById('menu-container');
    let html = '';
    let hasProducts = false;
    catalog.forEach(category => {
        if (currentCategory !== 'Todos' && category.category !== currentCategory) return;
        const filteredItems = category.items.filter(item => 
            removeAcentos(item.name).includes(searchTerm)
        );
        if (filteredItems.length > 0) {
            hasProducts = true;
            html += `<h2 class="category-title">${category.category}</h2><div class="product-grid">`;
            filteredItems.forEach(item => {
                const isConsult = item.priceCento === null && item.unitPrice === null;
                const unitValue = item.unitPrice ? item.unitPrice : (item.priceCento ? item.priceCento / 100 : 0);
                let priceText = isConsult ? 'À Consultar' : formatCurrency(item.priceCento || (item.unitPrice * 100)) + ' / Cento';
                if(item.unitPrice && !item.priceCento) priceText = formatCurrency(item.unitPrice) + ' / Unidade';
                let badgeHtml = item.badge ? `<div class="badge">${item.badge}</div>` : '';
                let buttonHtml = isConsult 
                    ? `<button class="btn btn-consultar" onclick="consultWhatsApp('${item.name.replace(/'/g, "\\'")}')">Consultar</button>`
                    : `<button class="btn" onclick="addToCart(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${unitValue}, ${item.unitPrice && !item.priceCento ? true : false})">Adicionar</button>`;
                html += `
                    <div class="product-card">
                        ${badgeHtml}
                        <img src="${item.imageUrl}" alt="${item.name}" loading="lazy" onclick="openLightbox('${item.imageUrl}')">
                        <div class="product-name">${item.name}</div>
                        <div class="product-price">${priceText}</div>
                        ${buttonHtml}
                    </div>`;
            });
            html += `</div>`;
        }
    });
    if (!hasProducts) {
        html = `<p style="text-align:center; padding: 2rem; color: #666; font-size: 1.1rem;">Nenhum doce encontrado. 😕</p>`;
    }
    container.innerHTML = html;
}

function toggleMobileCart() {
    document.getElementById('cart-sidebar').classList.toggle('open');
    document.getElementById('cart-overlay').classList.toggle('show');
}

function consultWhatsApp(itemName) {
    const msg = encodeURIComponent(`Olá, Eduarda! Gostaria de consultar o valor de: ${itemName}.`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
}

function showToast(msg, isWarning = false) {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    if(isWarning) toast.classList.add("warning");
    else toast.classList.remove("warning");
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

function addToCart(id, name, unitPrice, isUnitItem) {
    if (!cart[id]) cart[id] = { name, unitPrice, quantity: isUnitItem ? 1 : 25, isUnitItem };
    else cart[id].quantity += isUnitItem ? 1 : 25;
    updateCartUI();
    showToast(`🛒 ${name} adicionado!`);
    const btn = document.getElementById('mobile-cart-btn');
    if(window.innerWidth <= 768) {
        btn.classList.remove('animate-bounce');
        void btn.offsetWidth; 
        btn.classList.add('animate-bounce');
    }
}

function updateQuantity(id, newQty) {
    const item = cart[id];
    newQty = parseInt(newQty);
    if (newQty < 0) return;
    if (!item.isUnitItem && newQty > 0 && newQty < 25) {
        showToast("O pedido mínimo é de 25 unidades.", true);
        newQty = 25;
    }
    if (newQty === 0) delete cart[id];
    else cart[id].quantity = newQty;
    updateCartUI();
}

function removeFromCart(id) {
    delete cart[id];
    updateCartUI();
}

function updateCartUI() {
    const cartContainer = document.getElementById('cart-items');
    const totalContainer = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const mobileCartCount = document.getElementById('mobile-cart-count');
    let total = 0;
    const cartKeys = Object.keys(cart);
    mobileCartCount.innerText = cartKeys.length;
    
    if (cartKeys.length === 0) {
        cartContainer.innerHTML = '<p>Seu carrinho está vazio.</p>';
        totalContainer.innerText = 'Total: R$ 0,00';
        checkoutBtn.disabled = true;
        document.getElementById('mobile-cart-btn').style.display = 'none';
        document.getElementById('cart-sidebar').classList.remove('open');
        document.getElementById('cart-overlay').classList.remove('show');
        return;
    } else {
        if(window.innerWidth <= 768) document.getElementById('mobile-cart-btn').style.display = 'block';
    }
    
    let cartHtml = '';
    cartKeys.forEach(id => {
        const item = cart[id];
        const itemTotal = item.unitPrice * item.quantity;
        total += itemTotal;
        cartHtml += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <strong>${item.name}</strong><br>
                    ${formatCurrency(itemTotal)}
                </div>
                <div class="cart-controls">
                    <button class="btn-remove" onclick="removeFromCart(${id})" title="Remover doce">X</button>
                    <div class="qty-wrapper">
                        Qtd: <input type="number" min="0" step="${item.isUnitItem ? 1 : 5}" value="${item.quantity}" onchange="updateQuantity(${id}, this.value)">
                    </div>
                </div>
            </div>
        `;
    });
    cartContainer.innerHTML = cartHtml;
    totalContainer.innerText = `Total: ${formatCurrency(total)}`;
    checkoutBtn.disabled = false;
}

// ---------------- LÓGICA NOVA: MODAL DE CHECKOUT ----------------

function openCheckoutModal() {
    // Abre a janela de formulário
    document.getElementById('checkout-modal').classList.add('show');
}

function closeCheckoutModal() {
    // Fecha a janela de formulário
    document.getElementById('checkout-modal').classList.remove('show');
}

function sendOrder() {
    // Pega os valores preenchidos pelo cliente
    const name = document.getElementById('customer-name').value.trim();
    const dateInput = document.getElementById('order-date').value;
    const time = document.getElementById('order-time').value;

    // Validação de segurança: Impede o envio se estiver faltando algo
    if (!name || !dateInput || !time) {
        showToast("Por favor, preencha todos os campos!", true);
        return;
    }

    // O HTML devolve a data em AAAA-MM-DD. Vamos inverter para DD/MM/AAAA para o WhatsApp
    const dateParts = dateInput.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    // Constrói a mensagem final pro WhatsApp
    let msg = `Olá, Eduarda! Meu nome é *${name}* e gostaria de fazer o seguinte pedido:\n\n`;
    
    let total = 0;
    Object.keys(cart).forEach(id => {
        const item = cart[id];
        const itemTotal = item.unitPrice * item.quantity;
        total += itemTotal;
        msg += `• ${item.quantity}x ${item.name} - ${formatCurrency(itemTotal)}\n`;
    });
    
    msg += `\n*Total do Pedido: ${formatCurrency(total)}*`;
    
    // Adiciona a Data e Hora escolhida
    msg += `\n\n*📅 Data para entrega/retirada:* ${formattedDate}`;
    msg += `\n*⏰ Horário:* ${time}`;
    
    msg += `\n\nCiente do pagamento em Dinheiro ou PIX no ato da entrega.\n\n*Chave PIX (CPF):* 039.722.899-60`;
    
    // Dispara pro WhatsApp e fecha as telas
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    closeCheckoutModal();
    
    // Fecha também o carrinho do celular se estiver aberto
    document.getElementById('cart-sidebar').classList.remove('open');
    document.getElementById('cart-overlay').classList.remove('show');
}

// Inicia puxando o cardápio
loadCatalog();
