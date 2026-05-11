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

// Função para remover acentos e facilitar a busca (ex: "limao" acha "limão")
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

                if (!grouped[category]) grouped[category] = { category: category, items: [] };
                grouped[category].items.push({ id: idCounter++, name: name, priceCento: priceCento, unitPrice: unitPrice, imageUrl: imageUrl });
            }
        });

        catalog = Object.values(grouped);
        setupFilters(); 
        renderMenu();
    } catch (error) {
        container.innerHTML = "<h3 style='padding: 2rem; color: red; text-align:center;'>Erro de conexão. Tente novamente.</h3>";
    }
}

// Cria os botões e ativa a barra de pesquisa
function setupFilters() {
    const filterContainer = document.getElementById('filter-buttons');
    if (!filterContainer) return; // Segurança caso o HTML não tenha carregado
    
    let html = `<button class="filter-btn active" onclick="setCategory('Todos', this)">Todos</button>`;
    
    catalog.forEach(cat => {
        html += `<button class="filter-btn" onclick="setCategory('${cat.category}', this)">${cat.category}</button>`;
    });
    
    filterContainer.innerHTML = html;

    // Monitora o que é digitado na barra
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            searchTerm = removeAcentos(e.target.value);
            renderMenu();
        });
    }
}

// Muda a categoria clicada
function setCategory(category, buttonElement) {
    currentCategory = category;
    
    // Remove a classe 'active' de todos e coloca no clicado
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');
    
    renderMenu();
}

// Renderiza os produtos filtrados
function renderMenu() {
    const container = document.getElementById('menu-container');
    let html = '';
    let hasProducts = false;
    
    catalog.forEach(category => {
        // Filtro por botão de categoria
        if (currentCategory !== 'Todos' && category.category !== currentCategory) return;

        // Filtro pela barra de pesquisa (comparando sem acento)
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

                let buttonHtml = isConsult 
                    ? `<button class="btn btn-consultar" onclick="consultWhatsApp('${item.name.replace(/'/g, "\\'")}')">Consultar</button>`
                    : `<button class="btn" onclick="addToCart(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${unitValue}, ${item.unitPrice && !item.priceCento ? true : false})">Adicionar</button>`;

                html += `
                    <div class="product-card">
                        <img src="${item.imageUrl}" alt="${item.name}" loading="lazy">
                        <div class="product-name">${item.name}</div>
                        <div class="product-price">${priceText}</div>
                        ${buttonHtml}
                    </div>`;
            });
            html += `</div>`;
        }
    });

    // Mostra mensagem se não achar nada na pesquisa
    if (!hasProducts) {
        html = `<p style="text-align:center; padding: 2rem; color: #666; font-size: 1.1rem;">Nenhum doce encontrado. 😕</p>`;
    }

    container.innerHTML = html;
}

// --- Restante do código do Carrinho ---
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
        btn.style.transform = 'scale(1.1)';
        setTimeout(() => btn.style.transform = 'scale(1)', 200);
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

function checkout() {
    let msg = "Olá, Eduarda! Gostaria de fazer o seguinte pedido:\n\n";
    let total = 0;
    Object.keys(cart).forEach(id => {
        const item = cart[id];
        const itemTotal = item.unitPrice * item.quantity;
        total += itemTotal;
        msg += `• ${item.quantity}x ${item.name} - ${formatCurrency(itemTotal)}\n`;
    });
    msg += `\n*Total do Pedido: ${formatCurrency(total)}*\n\nCiente do pagamento em Dinheiro ou PIX no ato da entrega.\n\n*Chave PIX (CPF):* 039.722.899-60`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

loadCatalog();
