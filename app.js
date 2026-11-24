// SUPABASE_CONFIG — fill in at Step 3, then swap the bodies of dataService below.
const SUPABASE_URL = "";        // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = "";   // public anon key (never the service key)

// ===================== DATA LAYER (only place that touches storage) =====================
const dataService = {
  _MENU: [
    { id: 1, cat: "traditional", name: "Chakhchoukha Batnia", desc: "Hand-torn rougag in a spiced red lamb sauce, chickpeas.", prep: 25, price: 1100, icon: "soup", available: true },
    { id: 2, cat: "traditional", name: "Bourek (x3)", desc: "Crisp pastry rolls with minced meat, egg and cheese.", prep: 12, price: 450, icon: "croissant", available: true },
    { id: 3, cat: "traditional", name: "Rechta Constantinoise", desc: "Fine noodles, chicken, turnips and white sauce.", prep: 30, price: 950, icon: "wheat", available: false },
    { id: 4, cat: "grills", name: "Mechoui Plate", desc: "Slow-roasted lamb, roasted potatoes, salad, bread.", prep: 30, price: 1800, icon: "flame", available: true },
    { id: 5, cat: "grills", name: "Merguez Grillées", desc: "Four grilled merguez, harissa, fries and salad.", prep: 18, price: 850, icon: "flame", available: true },
    { id: 6, cat: "grills", name: "Brochettes de Poulet", desc: "Marinated chicken skewers, rice, grilled tomato.", prep: 20, price: 1000, icon: "drumstick", available: true },
    { id: 7, cat: "fastfood", name: "Chicken Shawarma", desc: "Spiced chicken, garlic sauce, pickles, fries inside.", prep: 10, price: 600, icon: "sandwich", available: true },
    { id: 8, cat: "fastfood", name: "Tacos Gratiné", desc: "Chicken, fries and cheddar sauce, oven-gratinéed.", prep: 12, price: 750, icon: "utensils", available: true },
    { id: 9, cat: "fastfood", name: "Burger Maison", desc: "Beef patty, cheddar, caramelised onion, fries.", prep: 15, price: 900, icon: "beef", available: true },
    { id: 10, cat: "drinks", name: "Mint Tea", desc: "Fresh mint, green tea, served in a glass.", prep: 4, price: 150, icon: "coffee", available: true },
    { id: 11, cat: "drinks", name: "Hamoud Boualem", desc: "Algeria's classic selecto, 33 cl, served cold.", prep: 1, price: 120, icon: "cup-soda", available: true },
    { id: 12, cat: "drinks", name: "Ayran Maison", desc: "Chilled salted yogurt drink.", prep: 2, price: 200, icon: "glass-water", available: true },
  ],
  _orders() { try { return JSON.parse(localStorage.getItem("dek_orders")) || []; } catch { return []; } },

  async getMenuItems() { return this._MENU; },

  async createOrder(order) {
    const orders = this._orders();
    do { order.code = "ORD-" + (1000 + Math.floor(Math.random() * 9000)); }
    while (orders.some(o => o.code === order.code));
    order.status = "Pending";
    order.createdAt = new Date().toISOString();
    orders.push(order);
    localStorage.setItem("dek_orders", JSON.stringify(orders));
    return order;
  },

  async getOrderByCode(code) {
    return this._orders().find(o => o.code === code.trim().toUpperCase()) || null;
  },
};

// ===================== UI =====================
const DELIVERY_FEE = 200;
const CATS = [["all", "All"], ["traditional", "Traditional"], ["grills", "Grills"], ["fastfood", "Fast Food"], ["drinks", "Drinks"]];
const STATUSES = ["Pending", "Preparing", "Ready", "Completed"];
const $ = s => document.querySelector(s);
const da = n => n.toLocaleString("en-US") + " DA";
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icons = () => window.lucide && lucide.createIcons();

let menu = [], cat = "all", cart = {}; // cart: { itemId: qty }
const form = $("#orderForm");
const orderType = () => form.type.value;
const fee = () => (orderType() === "delivery" && Object.keys(cart).length ? DELIVERY_FEE : 0);
const subtotal = () => Object.entries(cart).reduce((s, [id, q]) => s + menu.find(m => m.id == id).price * q, 0);

function renderFilters() {
  $("#filters").innerHTML = CATS.map(([k, l]) => `<button type="button" data-cat="${k}" aria-pressed="${k === cat}">${l}</button>`).join("");
}
function renderMenu() {
  const list = menu.filter(m => cat === "all" || m.cat === cat);
  $("#menu").innerHTML = list.map(m => `
    <article class="dish ${m.available ? "" : "off"}">
      <div class="dish-top"><span class="ico"><i data-lucide="${m.icon}"></i></span>
        <span class="prep"><i data-lucide="clock"></i>${m.prep} min</span></div>
      <h3>${esc(m.name)}</h3><p>${esc(m.desc)}</p>
      <div class="dish-foot"><span class="price">${da(m.price)}</span>
        <button class="btn" data-add="${m.id}" ${m.available ? "" : "disabled"}>${m.available ? "+ Add" : "Unavailable"}</button></div>
    </article>`).join("");
  icons();
}
function renderTray() {
  const ids = Object.keys(cart);
  $("#items").innerHTML = ids.length ? ids.map(id => {
    const m = menu.find(x => x.id == id), q = cart[id];
    return `<li class="line"><span class="n">${esc(m.name)}</span><span class="price">${da(m.price * q)}</span>
      <span class="qty"><button type="button" data-dec="${id}" aria-label="Remove one">−</button><span>${q}</span><button type="button" data-inc="${id}" aria-label="Add one">+</button></span></li>`;
  }).join("") : `<li class="empty">Your tray is empty. Add a dish from the menu.</li>`;
  $("#sub").textContent = da(subtotal());
  $("#feeRow").hidden = !fee();
  $("#total").textContent = da(subtotal() + fee());
  $("#badge").textContent = Object.values(cart).reduce((a, b) => a + b, 0);
}
const toggleTray = on => { $("#tray").classList.toggle("on", on); $("#scrim").classList.toggle("on", on); };

function syncType() {
  form.querySelectorAll("[data-for]").forEach(l => l.hidden = l.dataset.for !== orderType());
  renderTray();
}
function detailText(o) {
  return o.type === "dinein" ? `Dine-in · Table ${o.detail}` : o.type === "takeaway" ? `Takeaway · Pickup ${o.detail}` : `Delivery · ${o.detail}, Batna`;
}

// ---- events ----
$("#filters").addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (b) { cat = b.dataset.cat; renderFilters(); renderMenu(); } });
$("#menu").addEventListener("click", e => {
  const b = e.target.closest("[data-add]"); if (!b) return;
  cart[b.dataset.add] = (cart[b.dataset.add] || 0) + 1; renderTray();
  b.textContent = "Added"; setTimeout(() => (b.textContent = "+ Add"), 700);
});
$("#items").addEventListener("click", e => {
  const inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]");
  if (inc) cart[inc.dataset.inc]++;
  if (dec && --cart[dec.dataset.dec] <= 0) delete cart[dec.dataset.dec];
  if (inc || dec) renderTray();
});
$("#openTray").onclick = () => toggleTray(true);
$("#closeTray").onclick = $("#scrim").onclick = () => toggleTray(false);
document.addEventListener("keydown", e => { if (e.key === "Escape") { toggleTray(false); $("#ticketModal").hidden = true; } });
form.querySelectorAll("[name=type]").forEach(r => r.addEventListener("change", syncType));

form.addEventListener("submit", async e => {
  e.preventDefault();
  const err = $("#formErr"), perr = form.querySelector("[data-err=phone]");
  err.textContent = perr.textContent = "";
  const phone = form.phone.value.replace(/[\s.-]/g, "");
  const type = orderType();
  const detail = type === "dinein" ? form.table.value.trim() : type === "takeaway" ? form.pickup.value : form.address.value.trim();
  if (!Object.keys(cart).length) return (err.textContent = "Add at least one dish to your tray.");
  if (!form.name.value.trim()) return (err.textContent = "Enter your full name.");
  if (!/^0[567]\d{8}$/.test(phone)) return (perr.textContent = "Enter a 10-digit mobile number starting with 05, 06 or 07.");
  if (!detail) return (err.textContent = type === "dinein" ? "Enter your table number." : "Enter your neighborhood or street in Batna.");

  const items = Object.entries(cart).map(([id, qty]) => { const m = menu.find(x => x.id == id); return { id: m.id, name: m.name, qty, price: m.price }; });
  const order = await dataService.createOrder({
    name: form.name.value.trim(), phone, type, detail, notes: form.notes.value.trim(),
    items, subtotal: subtotal(), fee: fee(), total: subtotal() + fee(),
  });
  cart = {}; form.reset(); syncType(); toggleTray(false); showTicket(order);
});

function showTicket(o) {
  $("#tkCode").textContent = o.code;
  $("#tkItems").innerHTML = o.items.map(i => `<li><span>${i.qty} × ${esc(i.name)}</span><span class="mono">${da(i.price * i.qty)}</span></li>`).join("") +
    (o.fee ? `<li><span>Local delivery</span><span class="mono">${da(o.fee)}</span></li>` : "");
  $("#tkMeta").textContent = `${o.name} · ${detailText(o)}`;
  $("#tkTotal").textContent = da(o.total);
  $("#ticketModal").hidden = false;
  $("#tkClose").focus();
}
$("#tkClose").onclick = () => ($("#ticketModal").hidden = true);

$("#trackForm").addEventListener("submit", async e => {
  e.preventDefault();
  const box = $("#trackResult"), code = $("#trackCode").value;
  if (!code.trim()) return (box.textContent = "Enter your order code, like ORD-4821.");
  const o = await dataService.getOrderByCode(code);
  if (!o) return (box.textContent = "No order found for that code. Check it and try again.");
  const at = STATUSES.indexOf(o.status);
  box.innerHTML = `<b class="mono">${esc(o.code)}</b> · ${esc(detailText(o))} · <span class="mono">${da(o.total)}</span>
    <ol class="steps">${STATUSES.map((s, i) => `<li class="${i < at ? "done" : i === at ? "on" : ""}">${s}</li>`).join("")}</ol>`;
});

(async function init() {
  menu = await dataService.getMenuItems();
  renderFilters(); renderMenu(); syncType(); icons();
})();
