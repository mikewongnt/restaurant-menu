# Ember & Oak — Malaysian Food Menu System

A complete, browser-based restaurant ordering system localized for Malaysia, with two experiences:

- **Storefront** (`index.html`) — guests browse the menu, filter, customize dishes, build a cart, and order **dine-in, takeaway or delivery**, then track the order.
- **Staff dashboard** (`admin.html`) — manage the menu, categories, incoming orders, and storefront settings.

Everything is plain HTML, CSS, and JavaScript. There is no build step and no backend: menu data, carts, and orders persist in `localStorage`, and the two pages stay in sync live (including across browser tabs).

## Localized for Malaysia

- Prices in **RM** (`RM 15.00`), formatted with Malaysian number grouping
- **SST** at 6% (configurable tax label and rate)
- Malaysian menu — nasi lemak, char kway teow, Nyonya laksa, prawn satay, beef rendang, roti canai, curry puffs, cendol, pandan cake, teh tarik, limau ais and kopi
- Bangsar, Kuala Lumpur address, +60 phone number and opening hours on the storefront and in settings
- **Dine-in** ordering with table number and guest count, alongside takeaway and delivery
- Local imagery stored with the app (no external image dependency)

## Run it

From this folder:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173/>. The staff dashboard is at <http://localhost:4173/admin.html>.

> Open the site over `http://` rather than double-clicking the HTML file. Some browsers restrict `localStorage` for `file://` pages.

## Try the full loop

1. On the storefront, open **Nasi Lemak Wangi**, add `Ayam goreng berempah`, and add to cart.
2. Check out as **Dine-in** with your table number and guest count (or switch to Takeaway / Delivery).
3. Open the dashboard in a second tab. The order appears under **Overview → Live orders** and **Orders**, showing the table and pax.
4. Accept/advance the order (`New → Preparing → Ready → Served`). The guest's **My orders** view updates automatically.
5. Add or edit a dish in **Menu items**, toggle availability, and watch the storefront change.

## Features

### Storefront
- Editorial landing page with live open/closed state, prep time, and delivery fee
- Category filter chips, text search, vegetarian filter, and “hide sold out”
- Dish cards with optimized local photos, dietary tags, popular badges, sold-out state
- Dish modal with required pick-one options (sizes, portions, serving style), optional multi-select add-ons, quantity, notes, and live pricing
- Cart drawer with per-line options, notes, quantity controls, and merge-on-duplicate behavior
- Checkout with **dine-in / takeaway / delivery**, SST and delivery-fee calculation, inline validation (including table number for dine-in), and a confirmation ticket
- **My orders** with a live status tracker, table details, and one-click reorder

### Dashboard
- Overview: today's revenue, active orders, average order value, live item count, live orders, and top sellers
- Menu items: search/filter, create, edit, delete, option-group editor, dietary/popular/available labels
- Categories: add, rename inline, reorder, delete when empty
- Orders: status filters with counts, accept/advance, cancel with confirmation, table and pax for dine-in
- Settings: name, tagline, address, phone, hours, currency, tax label/rate, delivery fee, prep time, accepting-orders switch
- CSV export of all orders (including table and guests), and a full demo-data reset

## Project structure

```
index.html               Storefront
admin.html               Staff dashboard
assets/css/app.css       Design system + responsive layouts
assets/img/              Optimized menu and hero photography
assets/js/store.js       localStorage data layer, seed menu, pricing, orders
assets/js/ui.js          Shared helpers: RM formatting, icons, toasts, modals
assets/js/menu.js        Storefront logic
assets/js/admin.js       Dashboard logic
CREDITS.md               Photo and font attribution
```

## Data & reset

Data is saved under these `localStorage` keys:

| Key | Contents |
| --- | --- |
| `emberoak.menu.v2` | Settings, categories, menu items, orders |
| `emberoak.cart.v2` | Current cart |
| `emberoak.myorders.v2` | IDs of orders placed on this device |

Use **Dashboard → Settings → Reset demo data** to restore the sample menu and clear orders, carts, and settings.

## Notes

- This is a demo: no payment is processed and no orders are sent anywhere.
- Prices are stored in integer cents (sen); SST and delivery fees are calculated in the shared store so the storefront and dashboard always agree.
- Dine-in and takeaway orders have no delivery fee; delivery adds the configured fee.
- Modern browsers only (Chrome, Safari, Firefox, Edge).
