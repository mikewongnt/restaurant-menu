/*!
 * Ember & Oak — storefront app
 */
(function () {
  'use strict';

  const { $, money, icon, escapeHtml: esc, toast, modal, debounce, timeLabel } = UI;

  const state = {
    categoryId: 'all',
    query: '',
    vegOnly: false,
    hideSoldOut: false,
  };

  const drawer = $('#cartDrawer');
  const scrim = $('#scrim');
  const grid = $('#dishGrid');

  let ordersBodyEl = null;

  /* ------------------------------------------------------------------ *
   * Small helpers
   * ------------------------------------------------------------------ */

  function categoryOf(item, data) {
    return data.categories.find((cat) => cat.id === item.categoryId) || null;
  }

  function emojiOf(item, data) {
    const cat = categoryOf(item, data);
    return (cat && cat.emoji) || '🍽';
  }

  function tagsHtml(item) {
    const tags = [];
    if (item.popular) tags.push('<span class="tag tag-popular">★ Popular</span>');
    if ((item.tags || []).includes('veg')) tags.push(`<span class="tag tag-veg">${icon('leaf')} Vegetarian</span>`);
    if ((item.tags || []).includes('spicy')) tags.push(`<span class="tag tag-spicy">${icon('flame')} Spicy</span>`);
    if ((item.tags || []).includes('gf')) tags.push('<span class="tag tag-gf">Gluten-free</span>');
    return tags.join('');
  }

  /* ------------------------------------------------------------------ *
   * Shell
   * ------------------------------------------------------------------ */

  function renderShell() {
    const { settings } = MenuStore.getState();
    document.title = `${settings.name} — Menu`;

    $('#brandName').textContent = settings.name;
    $('#footerName').textContent = settings.name;
    if (settings.tagline) {
      $('#brandTagline').textContent = settings.tagline;
      $('.footer-brand p').textContent = settings.tagline;
    }

    $('#heroPrep').textContent = settings.prepTime || '20 min';
    $('#heroFee').textContent = settings.isOpen ? money(settings.deliveryFee) : '—';

    const pill = $('#statusPill');
    pill.classList.toggle('is-closed', !settings.isOpen);
    pill.innerHTML = `<span class="status-dot"></span>${settings.isOpen ? 'Open now' : 'Closed'}`;

    $('#heroStatus').textContent = settings.isOpen
      ? 'Open for dine-in, takeaway & delivery'
      : 'Closed right now — browse the menu';

    const footerHours = $('#footerHours');
    if (footerHours) footerHours.textContent = settings.hours || 'Open daily · 11:00 – 22:00';

    const footerContact = $('#footerContact');
    if (footerContact) {
      footerContact.textContent =
        [settings.address, settings.phone].filter(Boolean).join(' · ') ||
        '18 Jalan Telawi 3, Bangsar, 59100 Kuala Lumpur';
    }
  }

  /* ------------------------------------------------------------------ *
   * Menu rendering
   * ------------------------------------------------------------------ */

  function renderCategories() {
    const data = MenuStore.getState();

    const chips = [
      `<button class="chip${state.categoryId === 'all' ? ' is-active' : ''}" type="button" role="tab" aria-selected="${
        state.categoryId === 'all'
      }" data-cat="all">All dishes <span class="chip-count">${data.items.length}</span></button>`,
    ];

    data.categories
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach((cat) => {
        const count = data.items.filter((item) => item.categoryId === cat.id).length;
        if (!count) return;
        chips.push(
          `<button class="chip${state.categoryId === cat.id ? ' is-active' : ''}" type="button" role="tab" ` +
            `aria-selected="${state.categoryId === cat.id}" data-cat="${esc(cat.id)}">` +
            `<span class="chip-emoji">${esc(cat.emoji)}</span>${esc(cat.name)} ` +
            `<span class="chip-count">${count}</span></button>`
        );
      });

    $('#categoryChips').innerHTML = chips.join('');
  }

  function visibleItems() {
    const data = MenuStore.getState();
    const query = state.query.trim().toLowerCase();

    return data.items
      .filter((item) => {
        if (state.categoryId !== 'all' && item.categoryId !== state.categoryId) return false;
        if (state.vegOnly && !(item.tags || []).includes('veg')) return false;
        if (state.hideSoldOut && !item.available) return false;
        if (query) {
          const cat = categoryOf(item, data);
          const haystack = `${item.name} ${item.description} ${(item.tags || []).join(' ')} ${
            cat ? cat.name : ''
          }`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => Number(b.popular) - Number(a.popular));
  }

  function dishCard(item, data) {
    const cat = categoryOf(item, data);
    const soldOut = !item.available;
    const hasOptions = (item.optionGroups || []).length > 0;
    const action = soldOut ? 'Unavailable' : hasOptions ? 'Choose' : 'Add';

    return `<article class="dish${soldOut ? ' is-soldout' : ''}" data-item="${esc(item.id)}">
      <div class="thumb dish-thumb" data-emoji="${esc((cat && cat.emoji) || '🍽')}">
        <img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy" onerror="this.style.display='none'">
        ${item.popular ? '<span class="badge badge-star">★ Popular</span>' : ''}
        ${soldOut ? '<span class="badge badge-sold">Sold out</span>' : ''}
      </div>
      <div class="dish-body">
        <div class="dish-title-row">
          <h3><button class="dish-open" type="button" data-open="${esc(item.id)}">${esc(item.name)}</button></h3>
          <span class="price">${money(item.price)}</span>
        </div>
        <p class="dish-desc">${esc(item.description)}</p>
        <div class="dish-foot">
          <div class="tags">${tagsHtml(item)}</div>
          <button class="btn btn-add" type="button" data-add="${esc(item.id)}" ${soldOut ? 'disabled' : ''}>
            ${action}<span class="sr-only"> ${esc(item.name)}</span>
          </button>
        </div>
      </div>
    </article>`;
  }

  function renderGrid() {
    const data = MenuStore.getState();
    const items = visibleItems();

    grid.innerHTML = items.map((item) => dishCard(item, data)).join('');
    $('#menuEmpty').hidden = items.length > 0;
  }

  function renderMenu() {
    renderCategories();
    renderGrid();
  }

  /* ------------------------------------------------------------------ *
   * Cart
   * ------------------------------------------------------------------ */

  function cartLineTemplate(line) {
    const opts = (line.options || []).map((opt) => esc(opt.label)).join(' · ');
    return `<div class="cart-line" data-key="${esc(line.key)}">
      <div class="thumb thumb-sm" data-emoji="${esc(line.emoji || '🍽')}">
        ${line.image ? `<img src="${esc(line.image)}" alt="" onerror="this.style.display='none'">` : ''}
      </div>
      <div class="cart-line-main">
        <div class="cart-line-top">
          <h4>${esc(line.name)}</h4>
          <strong>${money(line.unitPrice * line.qty)}</strong>
        </div>
        ${opts ? `<p class="cart-line-opts">${opts}</p>` : ''}
        ${line.notes ? `<p class="cart-line-notes">“${esc(line.notes)}”</p>` : ''}
        <div class="cart-line-actions">
          <div class="stepper stepper-sm">
            <button class="stepper-btn" type="button" data-cart-minus aria-label="Decrease quantity">${icon('minus')}</button>
            <span>${line.qty}</span>
            <button class="stepper-btn" type="button" data-cart-plus aria-label="Increase quantity">${icon('plus')}</button>
          </div>
          <button class="link-btn danger-text" type="button" data-cart-remove>Remove</button>
        </div>
      </div>
    </div>`;
  }

  function renderCart() {
    const cart = MenuStore.getCart();
    const data = MenuStore.getState();
    const count = cart.lines.reduce((sum, line) => sum + line.qty, 0);

    $('#cartCount').textContent = count;
    $('#cartBtn').setAttribute('aria-label', `Open cart, ${count} item${count === 1 ? '' : 's'}`);

    const body = $('#cartLines');
    const foot = $('#cartFoot');

    if (!cart.lines.length) {
      body.innerHTML = `<div class="cart-empty">
        <div class="empty-emoji">🧺</div>
        <h3>Your cart is empty</h3>
        <p>Add something delicious from the menu.</p>
        <button class="btn btn-outline" type="button" data-close-drawer>Browse the menu</button>
      </div>`;
      foot.innerHTML = '';
      return;
    }

    body.innerHTML = cart.lines.map(cartLineTemplate).join('');

    const subtotal = cart.lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
    const open = data.settings.isOpen;

    foot.innerHTML = `
      <div class="totals-row"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
      <p class="fineprint">Taxes and fees are calculated at checkout.</p>
      ${open ? '' : '<p class="closed-note">The kitchen is closed — ordering is paused.</p>'}
      <button class="btn btn-primary btn-block" type="button" id="checkoutBtn" ${open ? '' : 'disabled'}>
        Go to checkout ${icon('arrow-right')}
      </button>
      <button class="link-btn centered" type="button" data-close-drawer>Keep browsing</button>`;

    const checkoutBtn = $('#checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', openCheckout);
  }

  function changeQty(key, delta) {
    const cart = MenuStore.getCart();
    const line = cart.lines.find((entry) => entry.key === key);
    if (!line) return;
    MenuStore.setLineQty(key, line.qty + delta);
  }

  /* ------------------------------------------------------------------ *
   * Drawer
   * ------------------------------------------------------------------ */

  function openDrawer() {
    drawer.inert = false;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    scrim.classList.add('is-open');
    UI.lockScroll();
    renderCart();
    const closeBtn = drawer.querySelector('[data-close-drawer]');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeDrawer() {
    if (!drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.inert = true;
    scrim.classList.remove('is-open');
    UI.unlockScroll();
  }

  function bumpCart() {
    const btn = $('#cartBtn');
    btn.classList.remove('bump');
    void btn.offsetWidth;
    btn.classList.add('bump');
  }

  /* ------------------------------------------------------------------ *
   * Item modal
   * ------------------------------------------------------------------ */

  function openItem(itemId) {
    const data = MenuStore.getState();
    const item = data.items.find((entry) => entry.id === itemId);
    if (!item) return;

    const cat = categoryOf(item, data);
    const emoji = (cat && cat.emoji) || '🍽';
    const groups = item.optionGroups || [];
    const selected = {};

    groups.forEach((group) => {
      selected[group.id] = group.required && group.choices[0] ? [group.choices[0].id] : [];
    });

    let qty = 1;

    const groupsHtml = groups
      .map((group) => {
        const choices = group.choices
          .map((choice) => {
            const isSelected = selected[group.id].includes(choice.id);
            return `<button type="button" class="opt${isSelected ? ' is-selected' : ''}" data-group="${esc(
              group.id
            )}" data-choice="${esc(choice.id)}" aria-pressed="${isSelected}">
              <span>${esc(choice.label)}</span>
              ${choice.delta ? `<span class="opt-delta">+${money(choice.delta)}</span>` : ''}
            </button>`;
          })
          .join('');

        return `<div class="opt-group" data-opt-group="${esc(group.id)}">
          <div class="opt-group-head">
            <h4>${esc(group.name)}</h4>
            <span class="opt-kind">${group.required ? 'Required · pick one' : 'Optional · pick any'}</span>
          </div>
          <div class="opts">${choices}</div>
        </div>`;
      })
      .join('');

    const instance = modal(
      `<div class="item-hero thumb" data-emoji="${esc(emoji)}">
        <img src="${esc(item.image)}" alt="${esc(item.name)}" onerror="this.style.display='none'">
        <button class="icon-btn item-close" type="button" data-close aria-label="Close">${icon('x')}</button>
        ${item.popular ? '<span class="badge badge-star">★ Popular</span>' : ''}
      </div>
      <div class="item-content">
        <div class="item-heading">
          <div>
            <p class="eyebrow">${cat ? `${esc(cat.emoji)} ${esc(cat.name)}` : 'Menu'}</p>
            <h2>${esc(item.name)}</h2>
          </div>
          <span class="item-price">${money(item.price)}</span>
        </div>
        <p class="item-desc">${esc(item.description)}</p>
        ${tagsHtml(item) ? `<div class="tags">${tagsHtml(item)}</div>` : ''}
        ${groupsHtml}
        <div class="field">
          <label for="itemNotes">Special instructions <span class="muted">(optional)</span></label>
          <textarea id="itemNotes" rows="2" placeholder="No onions, sauce on the side…" maxlength="160"></textarea>
        </div>
        <div class="item-footer">
          <div class="stepper" aria-label="Quantity">
            <button class="stepper-btn" type="button" data-qty-minus aria-label="Decrease quantity">${icon('minus')}</button>
            <span data-qty>1</span>
            <button class="stepper-btn" type="button" data-qty-plus aria-label="Increase quantity">${icon('plus')}</button>
          </div>
          <button class="btn btn-primary js-add" type="button" ${item.available ? '' : 'disabled'}>
            ${item.available ? 'Add to cart' : 'Currently unavailable'}
          </button>
        </div>
      </div>`,
      { className: 'modal-item', label: item.name }
    );

    const root = instance.modalEl;

    function unitPrice() {
      let price = item.price;
      groups.forEach((group) => {
        (selected[group.id] || []).forEach((choiceId) => {
          const choice = group.choices.find((entry) => entry.id === choiceId);
          if (choice) price += choice.delta || 0;
        });
      });
      return price;
    }

    function syncPrice() {
      const btn = root.querySelector('.js-add');
      if (!btn || !item.available) return;
      btn.innerHTML = `Add ${qty} to cart · ${money(unitPrice() * qty)}`;
    }

    root.addEventListener('click', (event) => {
      const opt = event.target.closest('.opt');

      if (opt) {
        const groupId = opt.dataset.group;
        const choiceId = opt.dataset.choice;
        const group = groups.find((entry) => entry.id === groupId);
        if (!group) return;

        if (group.required) {
          selected[groupId] = [choiceId];
        } else {
          const list = selected[groupId];
          const index = list.indexOf(choiceId);
          if (index === -1) list.push(choiceId);
          else list.splice(index, 1);
        }

        root.querySelectorAll(`.opt[data-group="${groupId}"]`).forEach((button) => {
          const active = selected[groupId].includes(button.dataset.choice);
          button.classList.toggle('is-selected', active);
          button.setAttribute('aria-pressed', String(active));
        });
        syncPrice();
        return;
      }

      if (event.target.closest('[data-qty-minus]')) {
        qty = Math.max(1, qty - 1);
        root.querySelector('[data-qty]').textContent = qty;
        syncPrice();
      }

      if (event.target.closest('[data-qty-plus]')) {
        qty = Math.min(99, qty + 1);
        root.querySelector('[data-qty]').textContent = qty;
        syncPrice();
      }

      if (event.target.closest('.js-add') && item.available) {
        const chosen = [];
        const keyGroups = [];

        groups.forEach((group) => {
          const ids = selected[group.id] || [];
          keyGroups.push({ groupId: group.id, choices: ids });
          ids.forEach((choiceId) => {
            const choice = group.choices.find((entry) => entry.id === choiceId);
            if (choice) {
              chosen.push({
                groupId: group.id,
                group: group.name,
                choiceId: choice.id,
                label: choice.label,
                delta: choice.delta || 0,
              });
            }
          });
        });

        const notes = root.querySelector('#itemNotes').value.trim();
        const line = {
          key: MenuStore.lineKey(item.id, keyGroups, notes),
          itemId: item.id,
          name: item.name,
          unitPrice: unitPrice(),
          qty,
          options: chosen,
          notes,
          image: item.image,
          emoji,
        };

        MenuStore.addToCart(line);
        instance.close();
        bumpCart();
        toast(`${qty} × ${item.name} added to cart`);
      }
    });

    syncPrice();
  }

  function quickAdd(itemId) {
    const data = MenuStore.getState();
    const item = data.items.find((entry) => entry.id === itemId);
    if (!item || !item.available) return;

    if ((item.optionGroups || []).length) {
      openItem(itemId);
      return;
    }

    MenuStore.addToCart({
      key: MenuStore.lineKey(item.id, [], ''),
      itemId: item.id,
      name: item.name,
      unitPrice: item.price,
      qty: 1,
      options: [],
      notes: '',
      image: item.image,
      emoji: emojiOf(item, data),
    });
    bumpCart();
    toast(`${item.name} added to cart`);
  }

  /* ------------------------------------------------------------------ *
   * Checkout
   * ------------------------------------------------------------------ */

  function orderTypeLabel(order) {
    if (order.type === 'dinein') {
      return `Dine-in${order.customer.table ? ` · Table ${order.customer.table}` : ''}`;
    }
    return order.type === 'delivery' ? 'Delivery' : 'Takeaway';
  }

  function summaryHtml(totals, settings, type) {
    const taxLabel = settings.taxLabel || 'Tax';

    return `
      <div class="totals-row"><span>Subtotal</span><span>${money(totals.subtotal)}</span></div>
      <div class="totals-row"><span>${esc(taxLabel)} (${settings.taxRate}%)</span><span>${money(totals.tax)}</span></div>
      ${
        type === 'delivery'
          ? `<div class="totals-row"><span>Delivery</span><span>${money(totals.fee)}</span></div>`
          : ''
      }
      <div class="totals-row is-total"><span>Total</span><strong>${money(totals.total)}</strong></div>`;
  }

  function guestOptions(selected) {
    return Array.from({ length: 10 }, (_, index) => index + 1)
      .map(
        (count) =>
          `<option value="${count}"${Number(selected) === count ? ' selected' : ''}>${count} guest${
            count === 1 ? '' : 's'
          }</option>`
      )
      .join('');
  }

  function checkoutTemplate(settings, cart) {
    const totals = MenuStore.computeTotals(cart.lines, 'dinein');

    return `<div class="modal-head">
      <div>
        <p class="eyebrow">Almost there</p>
        <h2>Checkout</h2>
      </div>
      <button class="icon-btn" type="button" data-close aria-label="Close">${icon('x')}</button>
    </div>
    <form class="checkout-form" novalidate>
      <div class="seg seg-3" role="radiogroup" aria-label="Order type">
        <label class="seg-opt is-active">
          <input type="radio" name="orderType" value="dinein" checked>
          <span class="seg-title">${icon('utensils')} Dine-in</span>
          <small>At your table · no fees</small>
        </label>
        <label class="seg-opt">
          <input type="radio" name="orderType" value="pickup">
          <span class="seg-title">${icon('bag')} Takeaway</span>
          <small>Ready in ${esc(settings.prepTime)}</small>
        </label>
        <label class="seg-opt">
          <input type="radio" name="orderType" value="delivery">
          <span class="seg-title">${icon('truck')} Delivery</span>
          <small>+ ${money(settings.deliveryFee)} · 35–50 min</small>
        </label>
      </div>

      <div class="form-grid">
        <div class="field" data-table>
          <label for="ckTable">Table number</label>
          <input id="ckTable" name="table" placeholder="e.g. 12 or T12" maxlength="12" data-autofocus>
          <span class="err">Enter your table number.</span>
        </div>
        <div class="field" data-guests>
          <label for="ckGuests">Guests</label>
          <select id="ckGuests" name="guests">${guestOptions(2)}</select>
        </div>
        <div class="field">
          <label for="ckName">Full name</label>
          <input id="ckName" name="name" autocomplete="name" placeholder="Aina Rahman">
          <span class="err">Please enter your name.</span>
        </div>
        <div class="field">
          <label for="ckPhone">Phone</label>
          <input id="ckPhone" name="phone" inputmode="tel" autocomplete="tel" placeholder="012-345 6789">
          <span class="err">Enter a valid phone number.</span>
        </div>
        <div class="field span-2" data-address hidden>
          <label for="ckAddress">Delivery address</label>
          <input id="ckAddress" name="address" autocomplete="street-address" placeholder="Unit, street, postcode, city">
          <span class="err">We need an address for delivery.</span>
        </div>
        <div class="field span-2">
          <label for="ckNotes">Notes for the kitchen <span class="muted">(optional)</span></label>
          <textarea id="ckNotes" name="notes" rows="2" placeholder="Allergies, less spicy, cutlery…" maxlength="240"></textarea>
        </div>
      </div>

      <div class="summary" data-summary>${summaryHtml(totals, settings, 'dinein')}</div>

      <button class="btn btn-primary btn-block" type="submit" data-submit>
        Place order · ${money(totals.total)}
      </button>
      <p class="fineprint">Demo checkout — ${esc(
        settings.taxLabel || 'Tax'
      )} is calculated on the subtotal. No payment is processed.</p>
    </form>`;
  }

  function successTemplate(order, settings) {
    const firstName = order.customer.name.split(' ')[0] || 'friend';
    const isDineIn = order.type === 'dinein';
    const guests = order.customer.guests;
    const eta = order.type === 'delivery' ? '35–50 min' : settings.prepTime || '20–30 min';
    const destination = isDineIn
      ? `We'll serve it at <strong>Table ${esc(order.customer.table)}</strong>${
          guests ? ` for ${guests} guest${guests === 1 ? '' : 's'}` : ''
        } in about <strong>${esc(eta)}</strong>.`
      : `<strong>${order.type === 'delivery' ? 'Delivery' : 'Takeaway'}</strong> in about <strong>${esc(eta)}</strong>.`;

    return `<div class="success-view">
      <button class="icon-btn success-close" type="button" data-close aria-label="Close">${icon('x')}</button>
      <div class="success-icon">${icon('check')}</div>
      <p class="eyebrow">Order confirmed</p>
      <h2>Thanks, ${esc(firstName)}!</h2>
      <p class="success-sub">Order <strong>#${esc(order.number)}</strong> is with the kitchen. ${destination}</p>

      <div class="order-ticket">
        <div class="ticket-meta">
          <span>${esc(orderTypeLabel(order))}</span>
          ${guests ? `<span>${guests} guest${guests === 1 ? '' : 's'}</span>` : ''}
        </div>
        ${order.lines
          .map(
            (line) => `<div class="ticket-line">
              <span>${line.qty} × ${esc(line.name)}${
              (line.options || []).length
                ? `<small>${(line.options || []).map((opt) => esc(opt.label)).join(', ')}</small>`
                : ''
            }</span>
              <span>${money(line.unitPrice * line.qty)}</span>
            </div>`
          )
          .join('')}
        <div class="ticket-total"><span>Total</span><strong>${money(order.totals.total)}</strong></div>
      </div>

      <div class="success-actions">
        <button class="btn btn-primary" type="button" data-view-orders>Track order</button>
        <button class="btn btn-outline" type="button" data-close>Order more</button>
      </div>
      <p class="fineprint">Status updates automatically — updates are shared with the staff dashboard.</p>
    </div>`;
  }

  function openCheckout() {
    const cart = MenuStore.getCart();
    if (!cart.lines.length) return;

    const { settings } = MenuStore.getState();
    closeDrawer();

    const instance = modal(checkoutTemplate(settings, cart), {
      className: 'modal-checkout',
      label: 'Checkout',
    });
    const root = instance.modalEl;
    const form = root.querySelector('form');

    let type = 'dinein';

    const syncTypeFields = () => {
      form.querySelector('[data-address]').hidden = type !== 'delivery';
      form.querySelector('[data-table]').hidden = type !== 'dinein';
      form.querySelector('[data-guests]').hidden = type !== 'dinein';
    };

    form.addEventListener('change', (event) => {
      if (event.target.name !== 'orderType') return;
      type = event.target.value;

      form.querySelectorAll('.seg-opt').forEach((label) => {
        label.classList.toggle('is-active', label.querySelector('input').checked);
      });

      syncTypeFields();

      const totals = MenuStore.computeTotals(cart.lines, type);
      form.querySelector('[data-summary]').innerHTML = summaryHtml(totals, settings, type);
      form.querySelector('[data-submit]').textContent = `Place order · ${money(totals.total)}`;
    });

    form.addEventListener('input', (event) => {
      const field = event.target.closest('.field');
      if (field) field.classList.remove('is-invalid');
    });

    syncTypeFields();

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const name = form.elements.namedItem('name');
      const phone = form.elements.namedItem('phone');
      const address = form.elements.namedItem('address');
      const table = form.elements.namedItem('table');
      const guests = form.elements.namedItem('guests');
      const notes = form.elements.namedItem('notes');

      const values = {
        name: name.value.trim(),
        phone: phone.value.trim(),
        address: type === 'delivery' ? address.value.trim() : '',
        table: type === 'dinein' ? table.value.trim() : '',
        guests: type === 'dinein' ? Number(guests.value) || 0 : 0,
        notes: notes.value.trim(),
      };

      let valid = true;
      const markInvalid = (input) => {
        input.closest('.field').classList.add('is-invalid');
        valid = false;
      };

      if (!values.name) markInvalid(name);
      if (values.phone.replace(/\D/g, '').length < 7) markInvalid(phone);
      if (type === 'delivery' && !values.address) markInvalid(address);
      if (type === 'dinein' && !values.table) markInvalid(table);

      if (!valid) {
        const firstInvalid = form.querySelector('.field.is-invalid input, .field.is-invalid select');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      try {
        const order = MenuStore.createOrder({
          type,
          customer: values,
          lines: MenuStore.getCart().lines,
        });

        MenuStore.clearCart();
        renderCart();
        closeDrawer();

        instance.overlay.querySelector('.modal').classList.add('modal-success');
        root.innerHTML = successTemplate(order, MenuStore.getState().settings);

        const trackBtn = root.querySelector('[data-view-orders]');
        if (trackBtn) {
          trackBtn.addEventListener('click', () => {
            instance.close();
            setTimeout(openMyOrders, 200);
          });
        }
        toast('Order placed — the kitchen is on it');
      } catch (error) {
        toast(error.message || 'Could not place the order.', 'error');
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Order tracking
   * ------------------------------------------------------------------ */

  function statusLabel(status) {
    return MenuStore.STATUS_LABELS[status] || status;
  }

  function orderTracker(status) {
    if (status === 'cancelled') {
      return '<p class="cancelled-note">This order was cancelled. Call the restaurant if you have questions.</p>';
    }

    const steps = ['new', 'preparing', 'ready', 'completed'];
    const current = status === 'completed' ? steps.length : steps.indexOf(status);

    return `<ol class="tracker">
      ${steps
        .map(
          (step, index) => `<li class="${index < current ? 'is-done' : ''}${index === current ? ' is-current' : ''}">
            <span class="tracker-dot">${index < current ? '✓' : index + 1}</span>
            <small>${statusLabel(step)}</small>
          </li>`
        )
        .join('')}
    </ol>`;
  }

  function myOrdersBody(orders) {
    if (!orders.length) {
      return `<div class="empty-state in-modal">
        <div class="empty-emoji">🧾</div>
        <h3>No orders yet</h3>
        <p>Orders placed on this device will show up here.</p>
      </div>`;
    }

    return orders
      .map(
        (order) => `<article class="order-card">
          <div class="order-card-head">
            <div>
              <strong>#${esc(order.number)}</strong>
              <span class="muted"> · ${timeLabel(order.createdAt)} · ${esc(orderTypeLabel(order))}</span>
            </div>
            <span class="status status-${order.status}">${statusLabel(order.status)}</span>
          </div>
          <ul class="order-items">
            ${order.lines
              .map(
                (line) => `<li>
                  <span>${line.qty} × ${esc(line.name)}${
                  (line.options || []).length ? `<small>${(line.options || []).map((opt) => esc(opt.label)).join(', ')}</small>` : ''
                }</span>
                  <span>${money(line.unitPrice * line.qty)}</span>
                </li>`
              )
              .join('')}
          </ul>
          <div class="order-card-foot">
            <span class="muted">Total</span>
            <strong>${money(order.totals.total)}</strong>
            <button class="link-btn" type="button" data-reorder="${esc(order.id)}">Reorder</button>
          </div>
          ${orderTracker(order.status)}
        </article>`
      )
      .join('');
  }

  function openMyOrders() {
    const instance = modal(
      `<div class="modal-head">
        <div>
          <p class="eyebrow">This device</p>
          <h2>My orders</h2>
        </div>
        <button class="icon-btn" type="button" data-close aria-label="Close">${icon('x')}</button>
      </div>
      <div class="orders-body">${myOrdersBody(MenuStore.getMyOrders())}</div>`,
      { className: 'modal-orders', label: 'My orders' }
    );

    ordersBodyEl = instance.modalEl.querySelector('.orders-body');

    ordersBodyEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-reorder]');
      if (!button) return;

      const order = MenuStore.getMyOrders().find((entry) => entry.id === button.dataset.reorder);
      if (!order) return;

      order.lines.forEach((line) => MenuStore.addToCart({ ...line }));
      instance.close();
      bumpCart();
      toast('Order added back to your cart');
      setTimeout(openDrawer, 200);
    });
  }

  function refreshOpenOrders() {
    if (ordersBodyEl && ordersBodyEl.isConnected) {
      ordersBodyEl.innerHTML = myOrdersBody(MenuStore.getMyOrders());
    }
  }

  /* ------------------------------------------------------------------ *
   * Wiring
   * ------------------------------------------------------------------ */

  function bindEvents() {
    $('#cartBtn').addEventListener('click', openDrawer);
    $('#myOrdersBtn').addEventListener('click', openMyOrders);
    $('#heroOrdersBtn').addEventListener('click', openMyOrders);
    $('#footerOrders').addEventListener('click', openMyOrders);

    scrim.addEventListener('click', closeDrawer);
    drawer.addEventListener('click', (event) => {
      if (event.target.closest('[data-close-drawer]')) closeDrawer();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
    });

    $('#categoryChips').addEventListener('click', (event) => {
      const chip = event.target.closest('[data-cat]');
      if (!chip) return;
      state.categoryId = chip.dataset.cat;
      renderCategories();
      renderGrid();
    });

    const onSearch = debounce((value) => {
      state.query = value;
      renderGrid();
    }, 140);
    $('#searchInput').addEventListener('input', (event) => onSearch(event.target.value));

    $('#vegOnly').addEventListener('change', (event) => {
      state.vegOnly = event.target.checked;
      renderGrid();
    });

    $('#hideSoldOut').addEventListener('change', (event) => {
      state.hideSoldOut = event.target.checked;
      renderGrid();
    });

    $('#clearFilters').addEventListener('click', () => {
      state.categoryId = 'all';
      state.query = '';
      state.vegOnly = false;
      state.hideSoldOut = false;
      $('#searchInput').value = '';
      $('#vegOnly').checked = false;
      $('#hideSoldOut').checked = false;
      renderCategories();
      renderGrid();
    });

    grid.addEventListener('click', (event) => {
      const add = event.target.closest('[data-add]');
      if (add) {
        event.stopPropagation();
        quickAdd(add.dataset.add);
        return;
      }
      const card = event.target.closest('[data-item]');
      if (card) openItem(card.dataset.item);
    });

    $('#cartLines').addEventListener('click', (event) => {
      const row = event.target.closest('[data-key]');
      if (!row) return;
      const key = row.dataset.key;

      if (event.target.closest('[data-cart-plus]')) changeQty(key, 1);
      else if (event.target.closest('[data-cart-minus]')) changeQty(key, -1);
      else if (event.target.closest('[data-cart-remove]')) MenuStore.removeLine(key);
    });

    const header = $('#siteHeader');
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  window.addEventListener('cart:changed', () => {
    renderCart();
    renderCategories();
    renderGrid();
  });

  window.addEventListener('store:changed', () => {
    renderShell();
    renderMenu();
    renderCart();
    refreshOpenOrders();
  });

  function init() {
    renderShell();
    renderMenu();
    renderCart();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
