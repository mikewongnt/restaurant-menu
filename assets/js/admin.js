/*!
 * Ember & Oak — staff dashboard
 */
(function () {
  'use strict';

  const { $, $$, money, icon, escapeHtml: esc, toast, modal, confirmDialog, timeLabel, relativeTime, downloadFile } = UI;

  const container = $('#adminView');
  const newItemBtn = $('#newItemBtn');

  const VIEWS = {
    overview: { title: 'Overview', sub: 'A live snapshot of your kitchen.' },
    menu: { title: 'Menu items', sub: 'Add dishes, edit prices and toggle availability.' },
    categories: { title: 'Categories', sub: 'Shape how guests browse the menu.' },
    orders: { title: 'Orders', sub: 'Accept orders and keep guests updated.' },
    settings: { title: 'Settings', sub: 'Storefront details, service and demo data.' },
  };

  const ACTIVE_STATUSES = ['new', 'preparing', 'ready'];

  const FILTERS = [
    { key: 'active', label: 'Active', test: (order) => ACTIVE_STATUSES.includes(order.status) },
    { key: 'new', label: 'New', test: (order) => order.status === 'new' },
    { key: 'preparing', label: 'Preparing', test: (order) => order.status === 'preparing' },
    { key: 'ready', label: 'Ready', test: (order) => order.status === 'ready' },
    { key: 'completed', label: 'Completed', test: (order) => order.status === 'completed' },
    { key: 'cancelled', label: 'Cancelled', test: (order) => order.status === 'cancelled' },
    { key: 'all', label: 'All', test: () => true },
  ];

  let menuQuery = '';
  let menuCategory = 'all';
  let orderFilter = 'active';

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */

  function currentView() {
    const hash = location.hash.replace('#', '');
    return VIEWS[hash] ? hash : 'overview';
  }

  function startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function isToday(iso) {
    const date = new Date(iso);
    return !Number.isNaN(date.getTime()) && date >= startOfToday();
  }

  function statusLabel(status) {
    return MenuStore.STATUS_LABELS[status] || status;
  }

  function emptyState(title, message, emoji) {
    return `<div class="empty-state in-panel">
      <div class="empty-emoji">${emoji || '🍽️'}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(message)}</p>
    </div>`;
  }

  function categoryOf(item, data) {
    return data.categories.find((cat) => cat.id === item.categoryId) || null;
  }

  function badgeType(type) {
    return MenuStore.TYPE_LABELS[type] || 'Dine-in';
  }

  /* ------------------------------------------------------------------ *
   * Overview
   * ------------------------------------------------------------------ */

  function topSellers(orders) {
    const tally = new Map();

    orders
      .filter((order) => order.status !== 'cancelled')
      .forEach((order) => {
        order.lines.forEach((line) => {
          const entry = tally.get(line.name) || { name: line.name, qty: 0, revenue: 0 };
          entry.qty += line.qty;
          entry.revenue += line.unitPrice * line.qty;
          tally.set(line.name, entry);
        });
      });

    return Array.from(tally.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }

  function topSellersMarkup(sellers) {
    if (!sellers.length) return emptyState('No sales yet', 'Your best sellers appear here after the first order.', '📈');

    const max = Math.max(...sellers.map((seller) => seller.qty), 1);

    return `<div class="sellers">
      ${sellers
        .map(
          (seller) => `<div class="seller">
            <div class="seller-head"><span>${esc(seller.name)}</span><strong>${seller.qty}</strong></div>
            <div class="seller-bar"><span style="width:${Math.max(8, Math.round((seller.qty / max) * 100))}%"></span></div>
          </div>`
        )
        .join('')}
    </div>`;
  }

  function overviewView() {
    const data = MenuStore.getState();
    const { settings } = data;
    const todayOrders = data.orders.filter((order) => isToday(order.createdAt));
    const paidToday = todayOrders.filter((order) => order.status !== 'cancelled');
    const revenue = paidToday.reduce((sum, order) => sum + order.totals.total, 0);
    const average = paidToday.length ? Math.round(revenue / paidToday.length) : 0;
    const active = data.orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
    const newCount = data.orders.filter((order) => order.status === 'new').length;
    const availableCount = data.items.filter((item) => item.available).length;

    return `
      ${
        settings.isOpen
          ? ''
          : `<div class="notice">
              <span>${icon('alert')} The storefront is paused — guests can browse but can't order.</span>
              <a class="link-btn" href="#settings">Open settings</a>
            </div>`
      }

      <div class="stats">
        <div class="stat">
          <span class="stat-label">${icon('wallet')} Revenue today</span>
          <strong>${money(revenue)}</strong>
          <small>${paidToday.length} order${paidToday.length === 1 ? '' : 's'} today</small>
        </div>
        <div class="stat">
          <span class="stat-label">${icon('ticket')} Active orders</span>
          <strong>${active.length}</strong>
          <small>${newCount} awaiting confirmation</small>
        </div>
        <div class="stat">
          <span class="stat-label">${icon('clock')} Average order</span>
          <strong>${money(average)}</strong>
          <small>Across today's orders</small>
        </div>
        <div class="stat">
          <span class="stat-label">${icon('star')} Live menu items</span>
          <strong>${availableCount}<span class="stat-of">/${data.items.length}</span></strong>
          <small>${data.items.length - availableCount} sold out</small>
        </div>
      </div>

      <div class="overview-grid">
        <section class="panel">
          <div class="panel-head">
            <h2>Live orders</h2>
            <a class="link-btn" href="#orders">View all ${icon('arrow-right')}</a>
          </div>
          ${
            active.length
              ? `<div class="order-stack">${active.map(adminOrderCard).join('')}</div>`
              : emptyState('No live orders', 'New orders from the storefront will land right here.', '🧾')
          }
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Top sellers</h2><span class="muted">All time</span></div>
          ${topSellersMarkup(topSellers(data.orders))}
        </section>
      </div>`;
  }

  /* ------------------------------------------------------------------ *
   * Orders
   * ------------------------------------------------------------------ */

  const NEXT_ACTIONS = {
    new: 'Accept & start',
    preparing: 'Mark ready',
    ready: 'Mark completed',
  };

  function adminOrderCard(order) {
    const next = MenuStore.STATUS_FLOW[order.status];
    const canCancel = ACTIVE_STATUSES.includes(order.status);
    const taxLabel = MenuStore.getState().settings.taxLabel || 'Tax';
    const isDineIn = order.type === 'dinein';
    const guests = order.customer.guests;
    const actionLabel = order.status === 'ready' && isDineIn ? 'Mark served' : NEXT_ACTIONS[order.status];

    return `<article class="admin-order" data-order="${esc(order.id)}">
      <div class="ao-head">
        <div class="ao-title">
          <span class="status status-${order.status}">${statusLabel(order.status)}</span>
          <strong>#${esc(order.number)}</strong>
          <span class="muted">${timeLabel(order.createdAt)} · ${badgeType(order.type)}</span>
        </div>
        <strong class="ao-total">${money(order.totals.total)}</strong>
      </div>

      <ul class="ao-items">
        ${order.lines
          .map(
            (line) => `<li>
              <span><b>${line.qty}×</b> ${esc(line.name)}${
              (line.options || []).length
                ? `<small>${(line.options || []).map((option) => esc(option.label)).join(', ')}</small>`
                : ''
            }</span>
              <span>${money(line.unitPrice * line.qty)}</span>
            </li>`
          )
          .join('')}
      </ul>

      <div class="ao-meta">
        <span>${icon(isDineIn ? 'utensils' : 'bag')} ${esc(order.customer.name)}</span>
        <span>${esc(order.customer.phone)}</span>
        ${
          isDineIn && order.customer.table
            ? `<span>Table ${esc(order.customer.table)}${guests ? ` · ${guests} pax` : ''}</span>`
            : ''
        }
        <span class="muted">${relativeTime(order.createdAt)}</span>
      </div>
      ${order.customer.address ? `<p class="ao-address">${icon('pin')} ${esc(order.customer.address)}</p>` : ''}
      ${order.customer.notes ? `<p class="ao-note">“${esc(order.customer.notes)}”</p>` : ''}

      <div class="ao-foot">
        <span class="ao-breakdown">Subtotal ${money(order.totals.subtotal)} · ${esc(taxLabel)} ${money(
      order.totals.tax
    )}${order.totals.fee ? ` · Delivery ${money(order.totals.fee)}` : ''}</span>
        <div class="ao-actions">
          ${
            next
              ? `<button class="btn btn-primary btn-sm" type="button" data-advance="${esc(order.id)}" data-next="${next}">${
                  actionLabel
                }</button>`
              : ''
          }
          ${
            canCancel
              ? `<button class="btn btn-outline btn-sm" type="button" data-cancel-order="${esc(order.id)}">Cancel</button>`
              : ''
          }
          ${
            !next && !canCancel
              ? `<span class="muted ao-done">${order.status === 'completed' ? 'Completed' : 'Cancelled'}</span>`
              : ''
          }
        </div>
      </div>
    </article>`;
  }

  function ordersView() {
    const data = MenuStore.getState();
    const activeOrders = data.orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
    const filter = FILTERS.find((entry) => entry.key === orderFilter) || FILTERS[0];
    const orders = data.orders.filter(filter.test);

    const chips = FILTERS.map((entry) => {
      const count = data.orders.filter(entry.test).length;
      return `<button class="chip${orderFilter === entry.key ? ' is-active' : ''}" type="button" data-filter="${
        entry.key
      }">${entry.label} <span class="chip-count">${count}</span></button>`;
    }).join('');

    return `
      ${
        activeOrders.length
          ? `<div class="notice notice-soft">${icon('clock')} ${activeOrders.length} order${
              activeOrders.length === 1 ? ' is' : 's are'
            } in progress.</div>`
          : ''
      }
      <div class="page-toolbar">
        <div class="chip-row">${chips}</div>
      </div>
      <div class="order-stack">
        ${
          orders.length
            ? orders.map(adminOrderCard).join('')
            : emptyState(
                orderFilter === 'active' ? 'No active orders' : 'Nothing here yet',
                'Try another filter, or share the storefront link to get an order rolling.',
                '🧾'
              )
        }
      </div>`;
  }

  /* ------------------------------------------------------------------ *
   * Menu items
   * ------------------------------------------------------------------ */

  function filteredMenuItems() {
    const data = MenuStore.getState();
    const query = menuQuery.trim().toLowerCase();

    return data.items.filter((item) => {
      if (menuCategory !== 'all' && item.categoryId !== menuCategory) return false;
      if (query && !`${item.name} ${item.description}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }

  function menuRow(item, data) {
    const cat = categoryOf(item, data);
    const emoji = (cat && cat.emoji) || '🍽';
    const groupCount = (item.optionGroups || []).length;

    return `<div class="menu-row">
      <div class="mr-item">
        <span class="thumb thumb-xs" data-emoji="${esc(emoji)}">
          ${item.image ? `<img src="${esc(item.image)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
        </span>
        <div class="mr-text">
          <strong>${esc(item.name)}${item.popular ? ' <span class="tag tag-popular">★</span>' : ''}</strong>
          <small>${esc(item.description || 'No description yet.')}</small>
        </div>
      </div>
      <div class="mr-cell">
        <span class="cell-label">Category</span>
        <span class="cat-pill">${esc(emoji)} ${esc(cat ? cat.name : 'Uncategorised')}</span>
      </div>
      <div class="mr-cell"><span class="cell-label">Price</span><strong>${money(item.price)}</strong></div>
      <div class="mr-cell">
        <span class="cell-label">Options</span>
        <span class="muted">${groupCount ? `${groupCount} group${groupCount === 1 ? '' : 's'}` : '—'}</span>
      </div>
      <div class="mr-cell">
        <span class="cell-label">Available</span>
        <label class="switch-line switch-only">
          <input type="checkbox" data-avail="${esc(item.id)}" ${item.available ? 'checked' : ''} aria-label="Available: ${esc(
      item.name
    )}">
          <span class="switch"></span>
        </label>
      </div>
      <div class="mr-actions">
        <button class="icon-btn" type="button" data-edit-item="${esc(item.id)}" aria-label="Edit ${esc(item.name)}">${icon(
      'edit'
    )}</button>
        <button class="icon-btn danger" type="button" data-delete-item="${esc(item.id)}" aria-label="Delete ${esc(
      item.name
    )}">${icon('trash')}</button>
      </div>
    </div>`;
  }

  function renderMenuList() {
    const host = $('#menuList');
    if (!host) return;

    const data = MenuStore.getState();
    const items = filteredMenuItems();

    host.innerHTML = items.length
      ? items.map((item) => menuRow(item, data)).join('')
      : `<div class="empty-state in-panel">
          <div class="empty-emoji">🔍</div>
          <h3>No dishes match</h3>
          <p>Try a different search or category filter.</p>
        </div>`;

    const count = $('#menuCount');
    if (count) count.textContent = `${items.length} of ${data.items.length} items`;
  }

  function menuView() {
    const data = MenuStore.getState();
    const items = filteredMenuItems();
    const categoryOptions = data.categories
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(
        (cat) =>
          `<option value="${esc(cat.id)}"${menuCategory === cat.id ? ' selected' : ''}>${esc(cat.emoji)} ${esc(
            cat.name
          )}</option>`
      )
      .join('');

    return `
      <div class="toolbar">
        <label class="search">
          <span class="sr-only">Search menu items</span>
          <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4-4"/></svg>
          <input type="search" id="menuSearch" placeholder="Search dishes…" autocomplete="off" value="${esc(menuQuery)}">
        </label>
        <select id="menuCatFilter" class="select" aria-label="Filter by category">
          <option value="all"${menuCategory === 'all' ? ' selected' : ''}>All categories</option>
          ${categoryOptions}
        </select>
        <span class="toolbar-count" id="menuCount">${items.length} of ${data.items.length} items</span>
      </div>

      <div class="menu-list" id="menuList">
        ${
          items.length
            ? items.map((item) => menuRow(item, data)).join('')
            : `<div class="empty-state in-panel">
                <div class="empty-emoji">🔍</div>
                <h3>No dishes match</h3>
                <p>Try a different search or category filter.</p>
              </div>`
        }
      </div>

      <p class="view-footnote">Tip: toggle “Available” to hide a dish from guests without deleting it.</p>`;
  }

  function choicesToText(choices) {
    return (choices || [])
      .map((choice) => (choice.delta ? `${choice.label}:+${(choice.delta / 100).toFixed(2)}` : choice.label))
      .join(', ');
  }

  function parseChoiceInput(raw) {
    let text = String(raw || '').trim();
    if (!text) return null;

    let delta = 0;
    const colon = text.lastIndexOf(':');
    if (colon > -1) {
      const pricePart = text.slice(colon + 1).replace(/[^0-9.]/g, '');
      if (pricePart && /^\d+(\.\d{1,2})?$/.test(pricePart)) {
        delta = Math.round(parseFloat(pricePart) * 100);
        text = text.slice(0, colon).trim();
      }
    }

    return text ? { label: text, delta } : null;
  }

  function openItemEditor(itemId) {
    const data = MenuStore.getState();

    if (!data.categories.length) {
      toast('Create a category before adding dishes.', 'error');
      return;
    }

    const item = itemId ? data.items.find((entry) => entry.id === itemId) : null;
    const editing = !!item;
    const draft = item || {
      name: '',
      description: '',
      categoryId: data.categories[0].id,
      price: 0,
      image: '',
      tags: [],
      popular: false,
      available: true,
      optionGroups: [],
    };

    const tags = draft.tags || [];
    const categoryOptions = data.categories
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(
        (cat) =>
          `<option value="${esc(cat.id)}"${draft.categoryId === cat.id ? ' selected' : ''}>${esc(cat.emoji)} ${esc(
            cat.name
          )}</option>`
      )
      .join('');

    const instance = modal(
      `<div class="modal-head">
        <div>
          <p class="eyebrow">${editing ? 'Edit dish' : 'New dish'}</p>
          <h2>${editing ? esc(item.name) : 'Add a menu item'}</h2>
        </div>
        <button class="icon-btn" type="button" data-close aria-label="Close">${icon('x')}</button>
      </div>

      <form class="item-form" novalidate>
        <div class="form-grid">
          <div class="field span-2">
            <label for="itemName">Dish name</label>
            <input id="itemName" name="name" maxlength="60" value="${esc(draft.name)}" placeholder="e.g. Ember Smash Burger" data-autofocus>
            <span class="err">Give the dish a name.</span>
          </div>
          <div class="field">
            <label for="itemPrice">Price (${esc(data.settings.currency)})</label>
            <input id="itemPrice" name="price" type="number" min="0" step="0.01" value="${
              draft.price ? (draft.price / 100).toFixed(2) : ''
            }" placeholder="12.00">
            <span class="err">Enter a valid price.</span>
          </div>
          <div class="field">
            <label for="itemCategory">Category</label>
            <select id="itemCategory" name="categoryId">${categoryOptions}</select>
          </div>
          <div class="field span-2">
            <label for="itemDescription">Description</label>
            <textarea id="itemDescription" name="description" rows="3" maxlength="220" placeholder="What makes it delicious?">${esc(
              draft.description
            )}</textarea>
          </div>
          <div class="field span-2">
            <label for="itemImage">Image URL <span class="muted">(optional)</span></label>
            <input id="itemImage" name="image" value="${esc(draft.image)}" placeholder="https://images.unsplash.com/…">
          </div>
        </div>

        <div class="fieldset">
          <h3>Labels</h3>
          <div class="check-row">
            <label class="check"><input type="checkbox" name="tagVeg" ${
              tags.includes('veg') ? 'checked' : ''
            }> Vegetarian</label>
            <label class="check"><input type="checkbox" name="tagSpicy" ${
              tags.includes('spicy') ? 'checked' : ''
            }> Spicy</label>
            <label class="check"><input type="checkbox" name="tagGf" ${
              tags.includes('gf') ? 'checked' : ''
            }> Gluten-free</label>
            <label class="check"><input type="checkbox" name="popular" ${
              draft.popular ? 'checked' : ''
            }> Popular pick</label>
            <label class="check"><input type="checkbox" name="available" ${
              draft.available !== false ? 'checked' : ''
            }> Available</label>
          </div>
        </div>

        <div class="fieldset">
          <div class="fieldset-head">
            <h3>Options &amp; add-ons</h3>
            <button type="button" class="btn btn-soft btn-sm" id="addOptionGroup">+ Add group</button>
          </div>
          <div id="optionGroups" class="option-groups"></div>
          <p class="hint">
            Required groups behave like pick-one sizes; optional groups are multi-select add-ons.
            Add a price with <code>Large:+3.00</code>.
          </p>
        </div>

        <div class="modal-actions">
          ${
            editing
              ? `<button type="button" class="btn btn-ghost danger-text" id="deleteDish">Delete dish</button>`
              : '<span></span>'
          }
          <div class="actions-right">
            <button type="button" class="btn btn-outline" data-close>Cancel</button>
            <button type="submit" class="btn btn-primary">${editing ? 'Save changes' : 'Add to menu'}</button>
          </div>
        </div>
      </form>`,
      { className: 'modal-editor', label: editing ? 'Edit item' : 'New item' }
    );

    const root = instance.modalEl;
    const form = root.querySelector('form');
    const optionHost = root.querySelector('#optionGroups');

    function addGroupEditor(group) {
      const editor = document.createElement('div');
      editor.className = 'opt-editor';
      editor.innerHTML = `
        <div class="opt-editor-top">
          <input class="g-name" placeholder="Group name (e.g. Size)" maxlength="40" value="${esc(
            (group && group.name) || ''
          )}" aria-label="Option group name">
          <label class="check check-sm">
            <input type="checkbox" class="g-req" ${group && group.required ? 'checked' : ''}> Required
          </label>
          <button type="button" class="icon-btn danger" data-remove-group aria-label="Remove option group">${icon('x')}</button>
        </div>
        <input class="g-choices" placeholder="Small, Medium:+2.00, Large:+4.00" value="${esc(
          choicesToText(group && group.choices)
        )}" aria-label="Choices and prices">
      `;
      optionHost.appendChild(editor);
    }

    (draft.optionGroups || []).forEach(addGroupEditor);

    root.querySelector('#addOptionGroup').addEventListener('click', () => {
      addGroupEditor(null);
      const inputs = optionHost.querySelectorAll('.g-name');
      if (inputs.length) inputs[inputs.length - 1].focus();
    });

    optionHost.addEventListener('click', (event) => {
      const remove = event.target.closest('[data-remove-group]');
      if (remove) remove.closest('.opt-editor').remove();
    });

    function markInvalid(input) {
      input.closest('.field').classList.add('is-invalid');
      input.focus();
    }

    form.addEventListener('input', (event) => {
      const field = event.target.closest('.field');
      if (field) field.classList.remove('is-invalid');
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const nameInput = form.elements.namedItem('name');
      const priceInput = form.elements.namedItem('price');
      const name = nameInput.value.trim();
      const priceValue = Number(priceInput.value);

      if (!name) return markInvalid(nameInput);
      if (!priceInput.value.trim() || !Number.isFinite(priceValue) || priceValue < 0) {
        return markInvalid(priceInput);
      }

      const optionGroups = [];
      const usedGroupIds = new Set();

      Array.from(optionHost.querySelectorAll('.opt-editor')).forEach((editor) => {
        const groupName = editor.querySelector('.g-name').value.trim();
        const rawChoices = editor.querySelector('.g-choices').value.trim();
        if (!groupName || !rawChoices) return;

        const choices = [];
        const usedChoiceIds = new Set();

        rawChoices.split(',').forEach((part) => {
          const parsed = parseChoiceInput(part);
          if (!parsed) return;

          const base = `c_${MenuStore.slugify(parsed.label)}`;
          let choiceId = base;
          let n = 2;
          while (usedChoiceIds.has(choiceId)) choiceId = `${base}_${n++}`;
          usedChoiceIds.add(choiceId);
          choices.push({ id: choiceId, label: parsed.label, delta: parsed.delta });
        });

        if (!choices.length) return;

        const baseGroup = `g_${MenuStore.slugify(groupName)}`;
        let groupId = baseGroup;
        let n = 2;
        while (usedGroupIds.has(groupId)) groupId = `${baseGroup}_${n++}`;
        usedGroupIds.add(groupId);

        optionGroups.push({
          id: groupId,
          name: groupName,
          required: editor.querySelector('.g-req').checked,
          choices,
        });
      });

      const nextTags = [];
      if (form.elements.namedItem('tagVeg').checked) nextTags.push('veg');
      if (form.elements.namedItem('tagSpicy').checked) nextTags.push('spicy');
      if (form.elements.namedItem('tagGf').checked) nextTags.push('gf');

      try {
        MenuStore.saveItem({
          id: draft.id,
          name,
          description: form.elements.namedItem('description').value.trim(),
          categoryId: form.elements.namedItem('categoryId').value,
          price: Math.round(priceValue * 100),
          image: form.elements.namedItem('image').value.trim(),
          tags: nextTags,
          popular: form.elements.namedItem('popular').checked,
          available: form.elements.namedItem('available').checked,
          optionGroups,
        });

        instance.close();
        toast(editing ? 'Dish updated' : 'Dish added to the menu');
      } catch (error) {
        toast(error.message || 'Could not save the dish.', 'error');
      }
    });

    const deleteButton = root.querySelector('#deleteDish');
    if (deleteButton) {
      deleteButton.addEventListener('click', async () => {
        const confirmed = await confirmDialog({
          title: `Delete “${item.name}”?`,
          message: 'This removes the dish from the menu. Existing orders keep their history.',
          confirmLabel: 'Delete dish',
          danger: true,
        });
        if (!confirmed) return;

        MenuStore.deleteItem(item.id);
        instance.close();
        toast('Dish deleted');
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * Categories
   * ------------------------------------------------------------------ */

  function catRow(cat, index, total, data) {
    const count = data.items.filter((item) => item.categoryId === cat.id).length;

    return `<div class="cat-row" data-cat="${esc(cat.id)}">
      <input class="cat-emoji" data-cat-emoji value="${esc(cat.emoji)}" maxlength="4" aria-label="Emoji for ${esc(
      cat.name
    )}">
      <input class="cat-name" data-cat-name value="${esc(cat.name)}" maxlength="30" aria-label="Name for ${esc(
      cat.name
    )}">
      <span class="cat-count">${count} item${count === 1 ? '' : 's'}</span>
      <div class="cat-actions">
        <button class="icon-btn" type="button" data-move="-1" aria-label="Move ${esc(cat.name)} up" ${
      index === 0 ? 'disabled' : ''
    }>↑</button>
        <button class="icon-btn" type="button" data-move="1" aria-label="Move ${esc(cat.name)} down" ${
      index === total - 1 ? 'disabled' : ''
    }>↓</button>
        <button class="icon-btn danger" type="button" data-delete-cat aria-label="Delete ${esc(
          cat.name
        )}">${icon('trash')}</button>
      </div>
    </div>`;
  }

  function categoriesView() {
    const data = MenuStore.getState();
    const cats = data.categories.slice().sort((a, b) => (a.order || 0) - (b.order || 0));

    return `
      <section class="panel">
        <div class="panel-head"><h2>Add a category</h2></div>
        <form class="inline-form" id="addCatForm">
          <input class="inline-emoji" name="emoji" maxlength="4" placeholder="🍟" aria-label="Category emoji">
          <input name="name" placeholder="e.g. Sides &amp; fries" maxlength="30" required aria-label="Category name">
          <button class="btn btn-dark" type="submit">Add category</button>
        </form>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Menu categories</h2>
          <span class="muted">${cats.length} total</span>
        </div>
        <p class="panel-hint">Rename inline, reorder with the arrows, or delete an empty category.</p>
        <div class="cat-list">
          ${
            cats.length
              ? cats.map((cat, index) => catRow(cat, index, cats.length, data)).join('')
              : emptyState('No categories yet', 'Add your first category above.', '🗂️')
          }
        </div>
      </section>`;
  }

  /* ------------------------------------------------------------------ *
   * Settings
   * ------------------------------------------------------------------ */

  function settingsView() {
    const settings = MenuStore.getState().settings;

    return `
      <section class="panel">
        <div class="panel-head"><h2>Storefront details</h2></div>
        <form id="settingsForm" class="settings-form">
          <div class="form-grid">
            <div class="field span-2">
              <label for="setName">Restaurant name</label>
              <input id="setName" name="name" value="${esc(settings.name)}" maxlength="40" required>
            </div>
            <div class="field span-2">
              <label for="setTagline">Tagline</label>
              <input id="setTagline" name="tagline" value="${esc(settings.tagline)}" maxlength="80">
            </div>
            <div class="field span-2">
              <label for="setAddress">Address</label>
              <input id="setAddress" name="address" value="${esc(settings.address || '')}" maxlength="120">
            </div>
            <div class="field">
              <label for="setPhone">Phone</label>
              <input id="setPhone" name="phone" value="${esc(settings.phone || '')}" maxlength="30">
            </div>
            <div class="field">
              <label for="setHours">Opening hours</label>
              <input id="setHours" name="hours" value="${esc(settings.hours || '')}" maxlength="60">
            </div>
            <div class="field">
              <label for="setCurrency">Currency symbol</label>
              <input id="setCurrency" name="currency" value="${esc(settings.currency)}" maxlength="3">
            </div>
            <div class="field">
              <label for="setTaxLabel">Tax label</label>
              <input id="setTaxLabel" name="taxLabel" value="${esc(settings.taxLabel || 'Tax')}" maxlength="12">
            </div>
            <div class="field">
              <label for="setTax">Tax rate (%)</label>
              <input id="setTax" name="taxRate" type="number" min="0" max="30" step="0.01" value="${settings.taxRate}">
            </div>
            <div class="field">
              <label for="setFee">Delivery fee (${esc(settings.currency)})</label>
              <input id="setFee" name="deliveryFee" type="number" min="0" step="0.01" value="${(
                settings.deliveryFee / 100
              ).toFixed(2)}">
            </div>
            <div class="field">
              <label for="setPrep">Prep time estimate</label>
              <input id="setPrep" name="prepTime" value="${esc(settings.prepTime)}" maxlength="20">
            </div>
            <div class="field span-2">
              <label class="switch-line is-large">
                <input type="checkbox" name="isOpen" ${settings.isOpen ? 'checked' : ''}>
                <span class="switch"></span>
                Accepting orders right now
              </label>
              <p class="hint">Turn this off to pause checkout while keeping the menu visible.</p>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" type="submit">Save settings</button>
          </div>
        </form>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Data</h2></div>
        <div class="data-row">
          <div>
            <strong>Export orders</strong>
            <p class="muted">Download every order as a CSV file for your records.</p>
          </div>
          <button class="btn btn-outline btn-sm" type="button" data-export-orders>${icon('download')} Export CSV</button>
        </div>
        <div class="data-row">
          <div>
            <strong class="danger-text">Reset demo data</strong>
            <p class="muted">Restores the sample menu and clears all orders, carts and settings.</p>
          </div>
          <button class="btn btn-danger btn-sm" type="button" data-reset>Reset everything</button>
        </div>
      </section>`;
  }

  /* ------------------------------------------------------------------ *
   * Render
   * ------------------------------------------------------------------ */

  const renderers = {
    overview: overviewView,
    menu: menuView,
    categories: categoriesView,
    orders: ordersView,
    settings: settingsView,
  };

  function render() {
    const data = MenuStore.getState();
    const view = currentView();
    const meta = VIEWS[view];

    $('#pageTitle').textContent = meta.title;
    $('#pageSub').textContent = meta.sub;
    $('#sideBrandName').textContent = data.settings.name;
    newItemBtn.hidden = view !== 'menu';

    $$('.side-link[data-nav]').forEach((link) => {
      link.classList.toggle('is-active', link.dataset.nav === view);
    });

    const statusPill = $('#adminStatus');
    statusPill.classList.toggle('is-closed', !data.settings.isOpen);
    statusPill.innerHTML = `<span class="status-dot"></span>${data.settings.isOpen ? 'Open now' : 'Closed'}`;

    const newCount = data.orders.filter((order) => order.status === 'new').length;
    const badge = $('#sideOrderCount');
    badge.hidden = newCount === 0;
    badge.textContent = newCount;

    document.title = `${newCount ? `(${newCount}) ` : ''}${data.settings.name} — Dashboard`;

    container.innerHTML = renderers[view]();
  }

  /* ------------------------------------------------------------------ *
   * Actions
   * ------------------------------------------------------------------ */

  async function exportOrders() {
    const orders = MenuStore.getState().orders;
    if (!orders.length) {
      toast('No orders to export yet.', 'error');
      return;
    }

    const rows = [
      ['Order', 'Placed', 'Status', 'Type', 'Customer', 'Phone', 'Table', 'Guests', 'Address', 'Items', 'Subtotal', 'Tax', 'Delivery', 'Total'],
    ];

    orders.forEach((order) => {
      rows.push([
        `#${order.number}`,
        new Date(order.createdAt).toLocaleString(),
        statusLabel(order.status),
        badgeType(order.type),
        order.customer.name,
        order.customer.phone,
        order.customer.table || '',
        order.customer.guests || '',
        order.customer.address || '',
        order.lines.map((line) => `${line.qty}x ${line.name}`).join('; '),
        (order.totals.subtotal / 100).toFixed(2),
        (order.totals.tax / 100).toFixed(2),
        (order.totals.fee / 100).toFixed(2),
        (order.totals.total / 100).toFixed(2),
      ]);
    });

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    downloadFile(`ember-oak-orders-${new Date().toISOString().slice(0, 10)}.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8');
    toast(`Exported ${orders.length} order${orders.length === 1 ? '' : 's'}`);
  }

  function bindGlobalEvents() {
    newItemBtn.addEventListener('click', () => openItemEditor(null));

    container.addEventListener('click', async (event) => {
      const filter = event.target.closest('[data-filter]');
      if (filter) {
        orderFilter = filter.dataset.filter;
        render();
        return;
      }

      const advance = event.target.closest('[data-advance]');
      if (advance) {
        const order = MenuStore.getState().orders.find((entry) => entry.id === advance.dataset.advance);
        try {
          MenuStore.updateOrderStatus(advance.dataset.advance, advance.dataset.next);
          if (order) toast(`Order #${order.number} → ${statusLabel(advance.dataset.next)}`);
        } catch (error) {
          toast(error.message, 'error');
        }
        return;
      }

      const cancel = event.target.closest('[data-cancel-order]');
      if (cancel) {
        const order = MenuStore.getState().orders.find((entry) => entry.id === cancel.dataset.cancelOrder);
        const confirmed = await confirmDialog({
          title: `Cancel order #${order ? order.number : ''}?`,
          message: 'The guest will see this order as cancelled. This cannot be undone.',
          confirmLabel: 'Cancel order',
          danger: true,
        });
        if (!confirmed) return;
        MenuStore.updateOrderStatus(cancel.dataset.cancelOrder, 'cancelled');
        toast(`Order #${order ? order.number : ''} cancelled`);
        return;
      }

      const edit = event.target.closest('[data-edit-item]');
      if (edit) {
        openItemEditor(edit.dataset.editItem);
        return;
      }

      const remove = event.target.closest('[data-delete-item]');
      if (remove) {
        const item = MenuStore.getState().items.find((entry) => entry.id === remove.dataset.deleteItem);
        if (!item) return;
        const confirmed = await confirmDialog({
          title: `Delete “${item.name}”?`,
          message: 'This removes the dish from the menu. Existing orders keep their history.',
          confirmLabel: 'Delete dish',
          danger: true,
        });
        if (!confirmed) return;
        MenuStore.deleteItem(item.id);
        toast('Dish deleted');
        return;
      }

      const move = event.target.closest('[data-move]');
      if (move) {
        const row = move.closest('[data-cat]');
        MenuStore.moveCategory(row.dataset.cat, Number(move.dataset.move));
        return;
      }

      const deleteCat = event.target.closest('[data-delete-cat]');
      if (deleteCat) {
        const row = deleteCat.closest('[data-cat]');
        const cat = MenuStore.getState().categories.find((entry) => entry.id === row.dataset.cat);
        const confirmed = await confirmDialog({
          title: `Delete “${cat ? cat.name : 'category'}”?`,
          message: 'Categories can only be deleted when no dishes are assigned to them.',
          confirmLabel: 'Delete category',
          danger: true,
        });
        if (!confirmed) return;
        try {
          MenuStore.deleteCategory(row.dataset.cat);
          toast('Category deleted');
        } catch (error) {
          toast(error.message, 'error');
        }
        return;
      }

      if (event.target.closest('[data-export-orders]')) {
        exportOrders();
        return;
      }

      if (event.target.closest('[data-reset]')) {
        const confirmed = await confirmDialog({
          title: 'Reset demo data?',
          message: 'This restores the sample menu and deletes all orders, carts and settings. It cannot be undone.',
          confirmLabel: 'Reset everything',
          danger: true,
        });
        if (!confirmed) return;
        MenuStore.resetData();
        toast('Demo data restored');
      }
    });

    container.addEventListener('change', (event) => {
      const availability = event.target.closest('[data-avail]');
      if (availability) {
        MenuStore.toggleItemAvailability(availability.dataset.avail, availability.checked);
        toast(availability.checked ? 'Dish is now available' : 'Dish hidden from the menu');
        return;
      }

      if (event.target.matches('[data-cat-name], [data-cat-emoji]')) {
        const row = event.target.closest('[data-cat]');
        const name = row.querySelector('[data-cat-name]').value.trim();
        const emoji = row.querySelector('[data-cat-emoji]').value.trim();
        if (!name) {
          toast('A category needs a name.', 'error');
          render();
          return;
        }
        try {
          MenuStore.saveCategory({ id: row.dataset.cat, name, emoji });
          toast('Category saved');
        } catch (error) {
          toast(error.message, 'error');
        }
      }
    });

    container.addEventListener('input', (event) => {
      if (event.target.id === 'menuSearch') {
        menuQuery = event.target.value;
        renderMenuList();
      }
    });

    container.addEventListener('change', (event) => {
      if (event.target.id === 'menuCatFilter') {
        menuCategory = event.target.value;
        renderMenuList();
      }
    });

    container.addEventListener('submit', (event) => {
      if (event.target.id === 'addCatForm') {
        event.preventDefault();
        const form = event.target;
        const name = form.elements.namedItem('name').value.trim();
        const emoji = form.elements.namedItem('emoji').value.trim();

        if (!name) {
          toast('A category needs a name.', 'error');
          return;
        }

        try {
          MenuStore.saveCategory({ name, emoji });
          toast('Category added');
        } catch (error) {
          toast(error.message, 'error');
        }
        return;
      }

      if (event.target.id === 'settingsForm') {
        event.preventDefault();
        const form = event.target;

        try {
          MenuStore.saveSettings({
            name: form.elements.namedItem('name').value.trim(),
            tagline: form.elements.namedItem('tagline').value.trim(),
            currency: form.elements.namedItem('currency').value.trim() || 'RM',
            taxLabel: form.elements.namedItem('taxLabel').value.trim() || 'Tax',
            taxRate: Number(form.elements.namedItem('taxRate').value) || 0,
            deliveryFee: Math.round((Number(form.elements.namedItem('deliveryFee').value) || 0) * 100),
            prepTime: form.elements.namedItem('prepTime').value.trim() || '20–30 min',
            address: form.elements.namedItem('address').value.trim(),
            phone: form.elements.namedItem('phone').value.trim(),
            hours: form.elements.namedItem('hours').value.trim(),
            isOpen: form.elements.namedItem('isOpen').checked,
          });
          toast('Settings saved');
        } catch (error) {
          toast(error.message, 'error');
        }
      }
    });

    window.addEventListener('hashchange', render);
    window.addEventListener('store:changed', render);
  }

  function init() {
    bindGlobalEvents();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
