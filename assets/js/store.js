/*!
 * Ember & Oak — shared store
 * A tiny localStorage-backed data layer shared by the storefront and admin page.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'emberoak.menu.v2';
  const CART_KEY = 'emberoak.cart.v2';
  const MY_ORDERS_KEY = 'emberoak.myorders.v2';

  const STATUS_LABELS = {
    new: 'New',
    preparing: 'Preparing',
    ready: 'Ready',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  const STATUS_FLOW = {
    new: 'preparing',
    preparing: 'ready',
    ready: 'completed',
    completed: null,
    cancelled: null,
  };

  const TYPE_LABELS = {
    dinein: 'Dine-in',
    pickup: 'Takeaway',
    delivery: 'Delivery',
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'group';
  }

  /* ------------------------------------------------------------------ *
   * Seed data (used the first time the app runs, or after a reset)
   * ------------------------------------------------------------------ */

  const SEED = {
    settings: {
      name: 'Ember & Oak',
      tagline: 'Wood-fired Malaysian kitchen',
      currency: 'RM',
      taxLabel: 'SST',
      taxRate: 6,
      deliveryFee: 500,
      prepTime: '20–30 min',
      isOpen: true,
      address: '18 Jalan Telawi 3, Bangsar, 59100 Kuala Lumpur',
      phone: '+60 3-2201 8820',
      hours: 'Open daily · 11:00 – 22:00',
    },
    categories: [
      { id: 'cat_rice', name: 'Rice & Noodles', emoji: '🍚', order: 1 },
      { id: 'cat_grills', name: 'Satay & Grills', emoji: '🍢', order: 2 },
      { id: 'cat_burgers', name: 'Burgers', emoji: '🍔', order: 3 },
      { id: 'cat_small', name: 'Small Plates', emoji: '🥟', order: 4 },
      { id: 'cat_sweets', name: 'Sweets', emoji: '🍧', order: 5 },
      { id: 'cat_drinks', name: 'Drinks', emoji: '🥤', order: 6 },
    ],
    items: [
      {
        id: 'itm_nasi_lemak',
        name: 'Nasi Lemak Wangi',
        categoryId: 'cat_rice',
        price: 1500,
        available: true,
        popular: true,
        tags: [],
        description:
          'Coconut rice with sambal tumis, crispy ikan bilis, peanuts, cucumber and half a boiled egg.',
        image: 'assets/img/nasi-lemak.jpg',
        optionGroups: [
          {
            id: 'g_nl_extras',
            name: 'Make it a set',
            required: false,
            choices: [
              { id: 'c_nl_chicken', label: 'Ayam goreng berempah', delta: 500 },
              { id: 'c_nl_rendang', label: 'Beef rendang', delta: 700 },
              { id: 'c_nl_sambal', label: 'Extra sambal', delta: 150 },
              { id: 'c_nl_egg', label: 'Extra egg', delta: 100 },
            ],
          },
        ],
      },
      {
        id: 'itm_ckt',
        name: 'Char Kway Teow',
        categoryId: 'cat_rice',
        price: 1600,
        available: true,
        popular: false,
        tags: [],
        description:
          'Wok-charred flat noodles with prawns, cockles, chives, egg and dark soy.',
        image: 'assets/img/char-kway-teow.jpg',
        optionGroups: [
          {
            id: 'g_ckt_extras',
            name: 'Add-ons',
            required: false,
            choices: [
              { id: 'c_ckt_prawns', label: 'Extra prawns', delta: 600 },
              { id: 'c_ckt_cockles', label: 'Extra cockles', delta: 400 },
              { id: 'c_ckt_egg', label: 'Extra egg', delta: 200 },
            ],
          },
        ],
      },
      {
        id: 'itm_laksa',
        name: 'Nyonya Laksa',
        categoryId: 'cat_rice',
        price: 1800,
        available: true,
        popular: false,
        tags: ['spicy'],
        description:
          'Rich coconut curry broth with rice noodles, tofu puffs, prawns, egg and sambal.',
        image: 'assets/img/nyonya-laksa.jpg',
        optionGroups: [
          {
            id: 'g_laksa_extras',
            name: 'Add-ons',
            required: false,
            choices: [
              { id: 'c_laksa_prawns', label: 'Extra prawns', delta: 600 },
              { id: 'c_laksa_tofu', label: 'Extra tofu puffs', delta: 200 },
              { id: 'c_laksa_sambal', label: 'Extra sambal', delta: 100 },
            ],
          },
        ],
      },
      {
        id: 'itm_nasi_goreng',
        name: 'Nasi Goreng Kampung',
        categoryId: 'cat_rice',
        price: 1500,
        available: true,
        popular: false,
        tags: ['spicy'],
        description:
          'Village-style fried rice with anchovies, kangkung, chilli and a fried egg.',
        image: 'assets/img/nasi-goreng.jpg',
        optionGroups: [
          {
            id: 'g_ng_extras',
            name: 'Add-ons',
            required: false,
            choices: [
              { id: 'c_ng_chicken', label: 'Ayam goreng berempah', delta: 500 },
              { id: 'c_ng_egg', label: 'Extra fried egg', delta: 200 },
              { id: 'c_ng_sambal', label: 'Extra sambal', delta: 100 },
            ],
          },
        ],
      },
      {
        id: 'itm_satay',
        name: 'Prawn Satay',
        categoryId: 'cat_grills',
        price: 2200,
        available: true,
        popular: true,
        tags: [],
        description:
          'Charcoal-grilled prawn skewers basted in lemongrass, with peanut sauce and ketupat.',
        image: 'assets/img/prawn-satay.jpg',
        optionGroups: [
          {
            id: 'g_satay_portion',
            name: 'Portion',
            required: true,
            choices: [
              { id: 'c_satay_10', label: '10 sticks', delta: 0 },
              { id: 'c_satay_20', label: '20 sticks', delta: 1800 },
            ],
          },
          {
            id: 'g_satay_extras',
            name: 'Add-ons',
            required: false,
            choices: [
              { id: 'c_peanut', label: 'Extra peanut sauce', delta: 200 },
              { id: 'c_ketupat', label: 'Extra ketupat', delta: 200 },
            ],
          },
        ],
      },
      {
        id: 'itm_rendang',
        name: 'Beef Rendang',
        categoryId: 'cat_grills',
        price: 2400,
        available: true,
        popular: false,
        tags: [],
        description:
          'Slow-cooked beef in coconut, lemongrass and toasted kerisik, served with nasi impit and acar.',
        image: 'assets/img/beef-rendang.jpg',
        optionGroups: [
          {
            id: 'g_rendang_extras',
            name: 'Add-ons',
            required: false,
            choices: [
              { id: 'c_rendang_gravy', label: 'Extra rendang gravy', delta: 400 },
              { id: 'c_rendang_nasi', label: 'Extra nasi impit', delta: 300 },
            ],
          },
        ],
      },
      {
        id: 'itm_smash',
        name: 'Ember Smash Burger',
        categoryId: 'cat_burgers',
        price: 2500,
        available: true,
        popular: true,
        tags: [],
        description:
          'Double smashed beef, aged cheddar, charred onion, house pickles and smoked aioli on a toasted brioche bun.',
        image: 'assets/img/smash-burger.jpg',
        optionGroups: [
          {
            id: 'g_extras',
            name: 'Make it extra',
            required: false,
            choices: [
              { id: 'c_bacon', label: 'Crispy bacon', delta: 500 },
              { id: 'c_egg', label: 'Fried egg', delta: 300 },
              { id: 'c_avocado', label: 'Smashed avocado', delta: 400 },
              { id: 'c_patty', label: 'Extra beef patty', delta: 800 },
            ],
          },
        ],
      },
      {
        id: 'itm_mushroom',
        name: 'Smoky Mushroom Burger',
        categoryId: 'cat_burgers',
        price: 2300,
        available: true,
        popular: false,
        tags: ['veg'],
        description:
          'Charred portobello, smoked provolone, caramelised onion and garlic aioli on a potato bun.',
        image: 'assets/img/mushroom-burger.jpg',
        optionGroups: [
          {
            id: 'g_veg_extras',
            name: 'Add-ons',
            required: false,
            choices: [
              { id: 'c_avocado2', label: 'Smashed avocado', delta: 400 },
              { id: 'c_egg2', label: 'Fried egg', delta: 300 },
              { id: 'c_cheese', label: 'Extra provolone', delta: 200 },
            ],
          },
        ],
      },
      {
        id: 'itm_roti',
        name: 'Roti Canai',
        categoryId: 'cat_small',
        price: 600,
        available: true,
        popular: false,
        tags: ['veg'],
        description:
          'Flaky griddled flatbread with dhal and sambal — order it egg or cheese.',
        image: 'assets/img/roti-canai.jpg',
        optionGroups: [
          {
            id: 'g_roti_style',
            name: 'Style',
            required: true,
            choices: [
              { id: 'c_roti_plain', label: 'Plain', delta: 0 },
              { id: 'c_roti_egg', label: 'Egg', delta: 150 },
              { id: 'c_roti_cheese', label: 'Cheese', delta: 250 },
            ],
          },
          {
            id: 'g_roti_extras',
            name: 'Add-ons',
            required: false,
            choices: [
              { id: 'c_roti_dhal', label: 'Extra dhal', delta: 100 },
              { id: 'c_roti_sambal', label: 'Extra sambal', delta: 50 },
            ],
          },
        ],
      },
      {
        id: 'itm_curry_puff',
        name: 'Curry Puff',
        categoryId: 'cat_small',
        price: 900,
        available: true,
        popular: false,
        tags: [],
        description:
          'Three crisp puffs with spiced potato, egg or chicken. Fried to order.',
        image: 'assets/img/curry-puff.jpg',
        optionGroups: [
          {
            id: 'g_puff_filling',
            name: 'Filling',
            required: true,
            choices: [
              { id: 'c_puff_potato', label: 'Potato & egg', delta: 0 },
              { id: 'c_puff_chicken', label: 'Chicken', delta: 100 },
              { id: 'c_puff_sardine', label: 'Sardine', delta: 100 },
            ],
          },
          {
            id: 'g_puff_more',
            name: 'Make it a box',
            required: false,
            choices: [{ id: 'c_puff_six', label: 'Add 3 more', delta: 800 }],
          },
        ],
      },
      {
        id: 'itm_cendol',
        name: 'Cendol Melaka',
        categoryId: 'cat_sweets',
        price: 900,
        available: true,
        popular: true,
        tags: ['veg'],
        description:
          'Shaved ice, pandan jelly, red beans, gula melaka and fresh coconut milk.',
        image: 'assets/img/cendol.jpg',
        optionGroups: [
          {
            id: 'g_cendol_extras',
            name: 'Add-ons',
            required: false,
            choices: [
              { id: 'c_cendol_durian', label: 'Durian', delta: 600 },
              { id: 'c_cendol_gula', label: 'Extra gula melaka', delta: 100 },
              { id: 'c_cendol_pulut', label: 'Pulut', delta: 200 },
            ],
          },
        ],
      },
      {
        id: 'itm_pandan',
        name: 'Pandan Chiffon Cake',
        categoryId: 'cat_sweets',
        price: 1200,
        available: true,
        popular: false,
        tags: ['veg'],
        description: 'Airy pandan sponge with coconut cream and a gula melaka crumb.',
        image: 'assets/img/pandan-cake.jpg',
        optionGroups: [],
      },
      {
        id: 'itm_teh',
        name: 'Teh Tarik',
        categoryId: 'cat_drinks',
        price: 600,
        available: true,
        popular: false,
        tags: ['veg'],
        description: 'Frothy pulled milk tea, hot or iced.',
        image: 'assets/img/teh-tarik.jpg',
        optionGroups: [
          {
            id: 'g_teh_serve',
            name: 'Serve',
            required: true,
            choices: [
              { id: 'c_teh_hot', label: 'Hot', delta: 0 },
              { id: 'c_teh_iced', label: 'Iced', delta: 50 },
            ],
          },
          {
            id: 'g_teh_extras',
            name: 'Add-ons',
            required: false,
            choices: [{ id: 'c_teh_kuat', label: 'Extra kuat', delta: 100 }],
          },
        ],
      },
      {
        id: 'itm_limau',
        name: 'Limau Ais',
        categoryId: 'cat_drinks',
        price: 700,
        available: true,
        popular: false,
        tags: ['veg'],
        description: 'Iced lime juice with asam boi and a hint of mint.',
        image: 'assets/img/limau-ais.jpg',
        optionGroups: [
          {
            id: 'g_limau_size',
            name: 'Size',
            required: true,
            choices: [
              { id: 'c_limau_regular', label: 'Regular', delta: 0 },
              { id: 'c_limau_large', label: 'Large', delta: 150 },
            ],
          },
        ],
      },
      {
        id: 'itm_kopi',
        name: 'Kopi',
        categoryId: 'cat_drinks',
        price: 550,
        available: true,
        popular: false,
        tags: ['veg'],
        description: 'House coffee, brewed strong. Hot or iced.',
        image: 'assets/img/kopi.jpg',
        optionGroups: [
          {
            id: 'g_kopi_serve',
            name: 'Serve',
            required: true,
            choices: [
              { id: 'c_kopi_hot', label: 'Hot', delta: 0 },
              { id: 'c_kopi_iced', label: 'Iced', delta: 50 },
            ],
          },
        ],
      },
    ],
    orders: [],
  };

  /* ------------------------------------------------------------------ *
   * Persistence helpers
   * ------------------------------------------------------------------ */

  function emit(name) {
    global.dispatchEvent(new Event(name));
  }

  function readState() {
    let raw = null;
    try {
      raw = global.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      raw = null;
    }
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          parsed.settings &&
          Array.isArray(parsed.items) &&
          Array.isArray(parsed.categories) &&
          Array.isArray(parsed.orders)
        ) {
          return parsed;
        }
      } catch (err) {
        /* fall through to reseed */
      }
    }
    const fresh = clone(SEED);
    persist(fresh, false);
    return fresh;
  }

  function persist(state, notify) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      /* storage may be unavailable (private mode) — app still works in-memory */
    }
    if (notify !== false) emit('store:changed');
    return state;
  }

  global.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) emit('store:changed');
    if (event.key === CART_KEY) emit('cart:changed');
  });

  /* ------------------------------------------------------------------ *
   * Settings & menu
   * ------------------------------------------------------------------ */

  function saveSettings(patch) {
    const state = readState();
    state.settings = { ...state.settings, ...patch };

    state.settings.taxRate = Math.max(0, Number(state.settings.taxRate) || 0);
    state.settings.deliveryFee = Math.max(0, Math.round(Number(state.settings.deliveryFee) || 0));
    state.settings.name = String(state.settings.name || '').trim() || 'My Restaurant';
    state.settings.currency = String(state.settings.currency || '$').trim().slice(0, 3) || '$';
    state.settings.taxLabel = String(state.settings.taxLabel || 'Tax').trim().slice(0, 12) || 'Tax';
    state.settings.address = String(state.settings.address || '').trim();
    state.settings.phone = String(state.settings.phone || '').trim();
    state.settings.hours = String(state.settings.hours || '').trim();
    state.settings.isOpen = !!state.settings.isOpen;

    persist(state);
    return state.settings;
  }

  function saveItem(input) {
    const state = readState();
    const index = state.items.findIndex((item) => item.id === input.id);

    const item = {
      id: input.id || uid('itm'),
      name: String(input.name || '').trim(),
      description: String(input.description || '').trim(),
      categoryId: input.categoryId || (state.categories[0] && state.categories[0].id),
      price: Math.max(0, Math.round(Number(input.price) || 0)),
      image: String(input.image || '').trim(),
      tags: Array.isArray(input.tags) ? input.tags : [],
      popular: !!input.popular,
      available: input.available !== false,
      optionGroups: Array.isArray(input.optionGroups) ? input.optionGroups : [],
    };

    if (!item.name) throw new Error('A dish needs a name.');
    if (!item.categoryId) throw new Error('Create a category first.');
    if (!state.categories.some((cat) => cat.id === item.categoryId)) {
      throw new Error('Pick a valid category.');
    }

    if (index === -1) state.items.push(item);
    else state.items[index] = item;

    persist(state);
    return item;
  }

  function deleteItem(id) {
    const state = readState();
    state.items = state.items.filter((item) => item.id !== id);
    persist(state);
  }

  function toggleItemAvailability(id, available) {
    const state = readState();
    const item = state.items.find((entry) => entry.id === id);
    if (!item) return;
    item.available = !!available;
    persist(state);
  }

  function saveCategory(input) {
    const state = readState();
    const index = state.categories.findIndex((cat) => cat.id === input.id);
    const name = String(input.name || '').trim();
    if (!name) throw new Error('A category needs a name.');

    if (index === -1) {
      const maxOrder = state.categories.reduce((max, cat) => Math.max(max, cat.order || 0), 0);
      state.categories.push({
        id: input.id || uid('cat'),
        name,
        emoji: String(input.emoji || '🍽').trim().slice(0, 4) || '🍽',
        order: maxOrder + 1,
      });
    } else {
      state.categories[index] = {
        ...state.categories[index],
        name,
        emoji: String(input.emoji || state.categories[index].emoji || '🍽').trim().slice(0, 4) || '🍽',
      };
    }
    persist(state);
  }

  function deleteCategory(id) {
    const state = readState();
    const count = state.items.filter((item) => item.categoryId === id).length;
    if (count > 0) {
      throw new Error(
        `${count} item${count === 1 ? ' is' : 's are'} still in this category. Move or delete ${count === 1 ? 'it' : 'them'} first.`
      );
    }
    state.categories = state.categories.filter((cat) => cat.id !== id);
    persist(state);
  }

  function moveCategory(id, direction) {
    const state = readState();
    const sorted = state.categories.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    const index = sorted.findIndex((cat) => cat.id === id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= sorted.length) return;

    const tmp = sorted[index];
    sorted[index] = sorted[target];
    sorted[target] = tmp;

    sorted.forEach((cat, orderIndex) => {
      const stored = state.categories.find((entry) => entry.id === cat.id);
      if (stored) stored.order = orderIndex + 1;
    });

    persist(state);
  }

  /* ------------------------------------------------------------------ *
   * Cart
   * ------------------------------------------------------------------ */

  function getCart() {
    try {
      const raw = global.localStorage.getItem(CART_KEY);
      const cart = raw ? JSON.parse(raw) : null;
      if (cart && Array.isArray(cart.lines)) return cart;
    } catch (err) {
      /* ignore corrupt cart */
    }
    return { lines: [] };
  }

  function saveCart(cart) {
    try {
      global.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (err) {
      /* ignore */
    }
    emit('cart:changed');
    return cart;
  }

  /**
   * Build a stable identity for a cart line: same dish + same options + same note
   * merge into a single line.
   */
  function lineKey(itemId, groups, notes) {
    const parts = (groups || [])
      .filter((group) => group.choices && group.choices.length)
      .map((group) => `${group.groupId}:${group.choices.slice().sort().join(',')}`)
      .sort();
    const notePart = notes ? `n:${String(notes).trim().toLowerCase()}` : '';
    return `${itemId}::${parts.join('|')}::${notePart}`;
  }

  function addToCart(line) {
    const cart = getCart();
    const qty = Math.max(1, Math.min(99, Number(line.qty) || 1));
    const existing = cart.lines.find((entry) => entry.key === line.key);

    if (existing) {
      existing.qty = Math.min(99, existing.qty + qty);
    } else {
      cart.lines.push({ ...line, qty });
    }
    return saveCart(cart);
  }

  function setLineQty(key, qty) {
    const cart = getCart();
    const line = cart.lines.find((entry) => entry.key === key);
    if (!line) return cart;

    if (qty <= 0) {
      cart.lines = cart.lines.filter((entry) => entry.key !== key);
    } else {
      line.qty = Math.min(99, qty);
    }
    return saveCart(cart);
  }

  function removeLine(key) {
    const cart = getCart();
    cart.lines = cart.lines.filter((entry) => entry.key !== key);
    return saveCart(cart);
  }

  function clearCart() {
    return saveCart({ lines: [] });
  }

  /* ------------------------------------------------------------------ *
   * Orders
   * ------------------------------------------------------------------ */

  function computeTotals(settings, lines, type) {
    const subtotal = (lines || []).reduce(
      (sum, line) => sum + (Number(line.unitPrice) || 0) * (Number(line.qty) || 0),
      0
    );
    const taxRate = Number(settings.taxRate) || 0;
    const tax = Math.round((subtotal * taxRate) / 100);
    const fee = type === 'delivery' ? Math.max(0, Math.round(Number(settings.deliveryFee) || 0)) : 0;

    return { subtotal, tax, fee, taxRate, total: subtotal + tax + fee };
  }

  function getMyOrderIds() {
    try {
      const raw = global.localStorage.getItem(MY_ORDERS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return [];
    }
  }

  function rememberOrder(id) {
    try {
      const list = getMyOrderIds();
      list.unshift(id);
      global.localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(list.slice(0, 25)));
    } catch (err) {
      /* ignore */
    }
  }

  function getMyOrders() {
    const state = readState();
    return getMyOrderIds()
      .map((id) => state.orders.find((order) => order.id === id))
      .filter(Boolean);
  }

  function createOrder({ type, customer, lines }) {
    const state = readState();

    if (!state.settings.isOpen) throw new Error('The kitchen is closed right now.');
    if (!lines || !lines.length) throw new Error('Your cart is empty.');

    const cleanType = TYPE_LABELS[type] ? type : 'dinein';
    const order = {
      id: uid('ord'),
      number: String(1000 + state.orders.length + 1),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'new',
      type: cleanType,
      customer: {
        name: String(customer.name || '').trim(),
        phone: String(customer.phone || '').trim(),
        address: String(customer.address || '').trim(),
        table: String(customer.table || '').trim(),
        guests: Math.max(0, Math.min(20, Number(customer.guests) || 0)),
        notes: String(customer.notes || '').trim(),
      },
      lines: clone(lines),
      totals: computeTotals(state.settings, lines, cleanType),
    };

    state.orders.unshift(order);
    persist(state);
    rememberOrder(order.id);
    return order;
  }

  function updateOrderStatus(id, status) {
    if (!STATUS_LABELS[status]) throw new Error('Unknown order status.');
    const state = readState();
    const order = state.orders.find((entry) => entry.id === id);
    if (!order) throw new Error('Order not found.');

    order.status = status;
    order.updatedAt = new Date().toISOString();
    persist(state);
    return order;
  }

  function resetData() {
    try {
      global.localStorage.removeItem(CART_KEY);
      global.localStorage.removeItem(MY_ORDERS_KEY);
    } catch (err) {
      /* ignore */
    }
    persist(clone(SEED));
    emit('cart:changed');
  }

  /* ------------------------------------------------------------------ *
   * Public API
   * ------------------------------------------------------------------ */

  global.MenuStore = {
    STORAGE_KEY,
    STATUS_LABELS,
    STATUS_FLOW,
    TYPE_LABELS,
    getState: readState,
    saveSettings,
    saveItem,
    deleteItem,
    toggleItemAvailability,
    saveCategory,
    deleteCategory,
    moveCategory,
    resetData,
    getCart,
    addToCart,
    setLineQty,
    removeLine,
    clearCart,
    lineKey,
    computeTotals: (lines, type) => computeTotals(readState().settings, lines, type),
    createOrder,
    updateOrderStatus,
    getMyOrders,
    uid,
    slugify,
  };
})(window);
