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
    
    // Variáveis da forminha
    const wrapperSelection = document.getElementById('wrapper-selection');
    const wrapperCostDisplay = document.getElementById('wrapper-cost-display');

    let total = 0;
    let totalItems = 0; // Quantidade de doces no carrinho
    const cartKeys = Object.keys(cart);
    mobileCartCount.innerText = cartKeys.length;

    if (cartKeys.length === 0) {
        cartContainer.innerHTML = '<p>Seu carrinho está vazio.</p>';
        totalContainer.innerText = 'Total: R$ 0,00';
        checkoutBtn.disabled = true;
        
        // Esconde as opções de forminha se não tem itens
        wrapperSelection.style.display = 'none';
        wrapperCostDisplay.style.display = 'none';
        document.getElementById('wrapper-type').value = 'Acetato'; // Reseta para o padrão
        
        document.getElementById('mobile-cart-btn').style.display = 'none';
        document.getElementById('cart-sidebar').classList.remove('open');
        document.getElementById('cart-overlay').classList.remove('show');
        return;
    } else {
        // Mostra a seleção de forminhas e exibe botão flutuante se for mobile
        wrapperSelection.style.display = 'block';
        if(window.innerWidth <= 768) document.getElementById('mobile-cart-btn').style.display = 'block';
    }

    let cartHtml = '';
    cartKeys.forEach(id => {
        const item = cart[id];
        const itemTotal = item.unitPrice * item.quantity;
        total += itemTotal;
        totalItems += item.quantity; // Soma a quantidade para calcular o acréscimo
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

    // Pega o valor da forminha selecionada e multiplica pela quantidade total de doces
    const wrapperSelect = document.getElementById('wrapper-type');
    const wrapperPrice = parseFloat(wrapperSelect.options[wrapperSelect.selectedIndex].getAttribute('data-price'));
    const wrapperTotal = totalItems * wrapperPrice;

    // Se tiver acréscimo, mostra para o cliente no carrinho
    if (wrapperTotal > 0) {
        wrapperCostDisplay.innerText = `Acréscimo (Forminhas): ${formatCurrency(wrapperTotal)}`;
        wrapperCostDisplay.style.display = 'block';
    } else {
        wrapperCostDisplay.style.display = 'none';
    }

    total += wrapperTotal; // Soma o acréscimo ao total final

    cartContainer.innerHTML = cartHtml;
    totalContainer.innerText = `Total: ${formatCurrency(total)}`;
    checkoutBtn.disabled = false;
}

function openCheckoutModal() {
    document.getElementById('checkout-modal').classList.add('show');
}

function closeCheckoutModal() {
    document.getElementById('checkout-modal').classList.remove('show');
    // Reseta o formulário caso o usuário feche
    document.getElementById('payment-method').value = 'Pix';
    toggleChangeField(); 
}

// Mostra ou esconde o campo de Troco baseado na seleção de Pagamento
function toggleChangeField() {
    const method = document.getElementById('payment-method').value;
    const changeGroup = document.getElementById('change-field-group');
    if (method === 'Dinheiro') {
        changeGroup.style.display = 'flex';
    } else {
        changeGroup.style.display = 'none';
        document.getElementById('change-amount').value = ''; // Limpa se trocar pra Pix
    }
}

function sendOrder() {
    const name = document.getElementById('customer-name').value.trim();
    const dateInput = document.getElementById('order-date').value;
    const time = document.getElementById('order-time').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const changeAmount = document.getElementById('change-amount').value.trim();
    const notes = document.getElementById('order-notes').value.trim(); 
    
    // Captura as forminhas
    const wrapperSelect = document.getElementById('wrapper-type');
    const wrapperName = wrapperSelect.options[wrapperSelect.selectedIndex].value;
    const wrapperPrice = parseFloat(wrapperSelect.options[wrapperSelect.selectedIndex].getAttribute('data-price'));

    if (!name || !dateInput || !time) {
        showToast("Por favor, preencha todos os campos obrigatórios!", true);
        return;
    }

    const dateParts = dateInput.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    let msg = `Olá, Eduarda! Meu nome é *${name}* e gostaria de fazer o seguinte pedido:\n\n`;

    let total = 0;
    let totalItems = 0;
    Object.keys(cart).forEach(id => {
        const item = cart[id];
        const itemTotal = item.unitPrice * item.quantity;
        total += itemTotal;
        totalItems += item.quantity;
        msg += `• ${item.quantity}x ${item.name} - ${formatCurrency(itemTotal)}\n`;
    });

    // Adiciona a forminha e o acréscimo no WhatsApp
    msg += `\n*🧁 Forminha Escolhida:* ${wrapperName}`;
    const wrapperTotal = totalItems * wrapperPrice;
    if (wrapperTotal > 0) {
        msg += ` (Acréscimo: ${formatCurrency(wrapperTotal)})`;
    }

    total += wrapperTotal; 

    msg += `\n\n*Total do Pedido: ${formatCurrency(total)}*`;

    msg += `\n\n*📍 Retirada em:* Avenida Padre Jose Stefanello, n°340`;
    msg += `\n*📅 Data da Retirada:* ${formattedDate}`;
    msg += `\n*⏰ Horário:* ${time}`;

    msg += `\n\n*💳 Forma de Pagamento:* ${paymentMethod}`;
    
    // Lógica condicional para o Pagamento (Pix ou Dinheiro)
    if (paymentMethod === 'Dinheiro') {
        if (changeAmount) {
            msg += `\n*💵 Troco para:* R$ ${changeAmount}`;
        } else {
            msg += `\n*💵 Troco:* Não precisa`;
        }
        msg += `\n\nCiente do pagamento no ato da retirada.`;
    } else if (paymentMethod === 'Pix') {
        msg += `\n\nCiente do pagamento no ato da retirada.\n*Chave PIX (CPF):* 039.722.899-60`;
    }

    if (notes !== "") {
        msg += `\n\n*📝 Observação:* ${notes}`;
    }

    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    closeCheckoutModal();

    // Limpa os campos para o próximo pedido
    document.getElementById('order-notes').value = ""; 
    document.getElementById('change-amount').value = ""; 
    document.getElementById('payment-method').value = "Pix";
    toggleChangeField();

    document.getElementById('cart-sidebar').classList.remove('open');
    document.getElementById('cart-overlay').classList.remove('show');
}

loadCatalog();
