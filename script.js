
const products = [
    {
        id: 1,
        name: "Smartphone",
        price: 499.99,
        image: "https://via.placeholder.com/200"
    },
    {
        id: 2,
        name: "Laptop",
        price: 999.99,
        image: "https://via.placeholder.com/200"
    },
    {
        id: 3,
        name: "Headphones",
        price: 99.99,
        image: "https://via.placeholder.com/200"
    },
    {
        id: 4,
        name: "Smartwatch",
        price: 199.99,
        image: "https://via.placeholder.com/200"
    }
];

let cart = [];
let cartOpen = false;

// Display products
function displayProducts() {
    const productsContainer = document.getElementById('products');
    productsContainer.innerHTML = '';

    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p class="price">$${product.price}</p>
            <button class="add-to-cart" onclick="addToCart(${product.id})">Add to Cart</button>
        `;
        productsContainer.appendChild(productCard);
    });
}

// Add to cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCartCount();
    updateCartDisplay();
}

// Update cart count
function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
}

// Update cart display
function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    cartItems.innerHTML = '';

    let total = 0;

    cart.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <span>${item.name} x${item.quantity}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        `;
        cartItems.appendChild(itemElement);
        total += item.price * item.quantity;
    });

    cartTotal.textContent = `$${total.toFixed(2)}`;
}

// Toggle cart
document.querySelector('.cart').addEventListener('click', () => {
    const cartModal = document.getElementById('cartModal');
    cartOpen = !cartOpen;
    cartModal.style.display = cartOpen ? 'block' : 'none';
});

// Initialize
displayProducts();
