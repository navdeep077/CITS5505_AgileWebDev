// Get ID from URL
const params = new URLSearchParams(window.location.search);
const shopId = parseInt(params.get("id"));

// Fetch data
fetch("data/shops.json")
.then(res => res.json())
.then(data => {

    const shop = data.find(s => s.id === shopId);

    if (!shop) return;

    // Fill header
    document.getElementById("shop-name").textContent = `☕ ${shop.name}`;
    document.getElementById("shop-location").textContent =
        `📍 ${shop.location} • ⭐ ${shop.rating}`;

    // Fill details
    document.getElementById("price").textContent = shop.price;
    document.getElementById("pet").textContent = shop.pet;
    document.getElementById("dine").textContent = shop.dine;
    document.getElementById("rating").textContent = `${shop.rating} / 5`;

    // Menu
   const menuList = document.getElementById("menu-list");
menuList.innerHTML = ""; // clear old content

shop.menu.forEach(item => {
    const li = document.createElement("li");
    li.classList.add("menu-item");

    li.innerHTML = `
        <div>
            <strong>${item.name}</strong>
            <p>${item.desc}</p>
        </div>
        <span>${item.price}</span>
    `;

    menuList.appendChild(li);
    });
    // Discounts
    const discountList = document.getElementById("discounts");
    shop.discounts.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        discountList.appendChild(li);
    });

});

document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("mousemove", e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        card.style.setProperty("--x", `${x}px`);
        card.style.setProperty("--y", `${y}px`);

        const glow = card.querySelector("::after");
    });

    card.addEventListener("mouseleave", () => {
        card.style.setProperty("--x", `50%`);
        card.style.setProperty("--y", `50%`);
    });
});
