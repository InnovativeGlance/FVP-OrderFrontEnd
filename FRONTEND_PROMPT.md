
# FVP Order Desk – Frontend Build Prompt

Build a React + Vite + TypeScript + Tailwind CSS + shadcn/ui. It talks to the existing FVP Order Desk API (Express + MongoDB). Do not create or change any backend code.

## 1. Tech stack

- Vite + React 18 + TypeScript (`npm create vite@latest fvp-orderdesk-web -- --template react-ts`)
- Tailwind CSS + shadcn/ui (init with `npx shadcn@latest init`)
- shadcn components: `button input label card table select popover calendar badge skeleton alert sonner dropdown-menu separator`
- `react-router-dom` for routing
- `date-fns` for date formatting; `react-day-picker` comes with the shadcn Calendar
- `lucide-react` for icons
- Data fetching uses the native `fetch` API through one shared client (section 4). No axios.
- Dev server runs on **port 3000**.

`vite.config.ts`:

```ts
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 3000, strictPort: true },
  preview: { port: 3000 },
});
```

`.env` (and commit a `.env.example`):

```
VITE_API_BASE_URL=http://localhost:5000
```

The backend already allows CORS from `http://localhost:3000`.

## 2. Backend API contract (do not change)

Base URL: `import.meta.env.VITE_API_BASE_URL`. All responses are JSON. Every error looks like `{ "message": string }`.

### POST /api/login (public)
Request: `{ "email": string, "password": string }`
- 200 → `{ "accessToken": string, "tokenType": "Bearer", "expiresIn": "8h", "user": { "email": string } }`
- 400 → missing field, 401 → `"Invalid email or password"`, 429 → too many attempts

### Protected endpoints
All of these need the header `Authorization: Bearer <accessToken>`. A missing, invalid or expired token returns 401 `{ "message": "Unauthorized" }`.

#### GET /api/dashboard/cards
```json
{
  "totalOrders": 6112,
  "totalRevenue": 2394747.95,
  "refundsIssued": { "count": 24, "amount": 16050.78 },
  "orderDateRange": { "from": "2010-01-08T13:16:27.000Z", "to": "2025-07-14T11:03:55.000Z" },
  "currency": "USD"
}
```

#### GET /api/orders/statuses
```json
{ "data": ["Cancelled","Completed","Completed (Partial refund)","Draft","On hold","Pending payment","Purchase order","Quote","Refunded"] }
```

#### GET /api/orders
Query params (all optional):

| Param | Notes |
| --- | --- |
| `page` | default 1 |
| `limit` | default 25, max 100 |
| `search` | free text: name, company, email, phone, order # (`#185817` works), address, product |
| `status` | one of the statuses above; leave it out for "All" |
| `from`, `to` | `YYYY-MM-DD`, inclusive; `from` must be ≤ `to` |
| `sortBy` | `orderId`, `createdAt`, `customerName`, `email`, `location`, `itemsTotalQty`, `total`, `status` (default `createdAt`) |
| `sortOrder` | `asc` or `desc` (default `desc`) |

Response:
```json
{
  "data": [
    {
      "orderId": 185817,
      "createdAt": "2025-07-14T11:03:55.000Z",
      "customer": {
        "name": "Steve Mays",
        "company": "Mays Consulting",
        "email": "smays@mces.com",
        "phone": "740-363-9511",
        "address": { "line1": "201 pennsylvania ave", "line2": null, "city": "Delaware", "state": "OH", "postcode": "43015", "country": "US", "full": "201 pennsylvania ave, Delaware, OH, 43015, US" }
      },
      "itemsTotalQty": 2,
      "total": 245.98,
      "currency": "USD",
      "status": "Completed"
    }
  ],
  "pagination": { "page": 1, "limit": 25, "totalItems": 6112, "totalPages": 245, "hasNextPage": true, "hasPrevPage": false }
}
```

Any field in `customer` / `address` can be `null`.

## 3. Folder structure

```
src/
  main.tsx
  App.tsx                     # routes
  index.css                   # tailwind + shadcn theme
  lib/
    api-client.ts             # fetch wrapper with token (section 4)
    token.ts                  # get/set/clear access token
    format.ts                 # money, date, location helpers
    utils.ts                  # shadcn cn()
  types/api.ts                # TS types for every response above
  services/
    auth.service.ts           # login()
    orders.service.ts         # getOrders(params), getStatuses()
    dashboard.service.ts      # getDashboardCards()
  context/AuthContext.tsx     # token state, login(), logout(), isAuthenticated
  routes/
    ProtectedRoute.tsx
    PublicOnlyRoute.tsx
  hooks/
    useDebounce.ts
  pages/
    LoginPage.tsx
    DashboardPage.tsx
  components/
    layout/AppHeader.tsx      # app name, user email, Logout button
    dashboard/StatCards.tsx
    orders/OrderFilters.tsx
    orders/DatePicker.tsx     # shadcn Popover + Calendar
    orders/OrdersTable.tsx
    orders/StatusBadge.tsx
    orders/Pagination.tsx
    ui/                       # generated shadcn components
```

## 4. API client: one fetch instance that adds the token

`src/lib/token.ts`: store the token in `localStorage` under the key `fvp_access_token`, plus the user email under `fvp_user_email`. Export `getToken`, `setToken`, `clearToken`. Wrap every localStorage call in try/catch.

`src/lib/api-client.ts`: one shared instance used by every service:

```ts
import { getToken, clearToken } from './token';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Query = Record<string, string | number | undefined | null>;

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

async function request<T>(method: string, path: string, opts: { query?: Query; body?: unknown; auth?: boolean; signal?: AbortSignal } = {}): Promise<T> {
  const url = new URL(path, BASE_URL);
  Object.entries(opts.query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined, signal: opts.signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, 'Cannot reach the server. Is the API running?');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && opts.auth !== false) {
      clearToken();
      onUnauthorized();
    }
    throw new ApiError(res.status, data?.message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown, auth = true) => request<T>('POST', path, { body, auth }),
};
```

Rules:
- Every service goes through `api`. Never call `fetch` directly in components.
- `login()` calls `api.post('/api/login', { email, password }, false)`, so no token is sent.
- `AuthContext` calls `setUnauthorizedHandler(() => { logout(); navigate('/login', { replace: true }); toast.error('Session expired, please log in again'); })`.
- Abort in-flight order requests (AbortController) when the filters change, so an older response can never overwrite a newer one.

## 5. Routing and auth

- `/login` → `LoginPage`, wrapped in `PublicOnlyRoute` (sends logged-in users to `/`)
- `/` → `DashboardPage`, wrapped in `ProtectedRoute` (sends users without a token to `/login`)
- `*` → redirect to `/`
- `AuthContext` holds `token`, `userEmail`, `isAuthenticated`, `login(email, password)`, `logout()`. It reads the initial token from localStorage so a page refresh keeps the user logged in.
- Logout clears the token and email and goes to `/login`.

## 6. Login page

- A centered shadcn `Card` with the title "FVP Order Desk" and the subtitle "Sign in to continue".
- Fields: Email (`type="email"`, autoFocus, autocomplete `username`) and Password (`type="password"`, autocomplete `current-password`), with a show/hide toggle (Eye icon button).
- Client-side validation before calling the API: email required and well-formed, password required. Show the error under each field.
- Submit button shows a spinner and "Signing in…", and is disabled while the request runs. Pressing Enter submits.
- On success: save `accessToken` and `user.email`, then navigate to `/`.
- On error: show a shadcn destructive `Alert` above the button with the server `message` (401 → "Invalid email or password", 429 → "Too many login attempts, please try again later", network → "Cannot reach the server…").

## 7. Dashboard page

Layout: `AppHeader` (app name on the left; user email and a Logout button on the right), then the stat cards, then the filter bar, then the orders table and pagination. Max width about 1400px, responsive, no horizontal page scroll on mobile (the table scrolls inside its own container).

### 7.1 Stat cards (`GET /api/dashboard/cards`, loaded once on mount)
Four shadcn Cards in a grid (4 columns desktop, 2 tablet, 1 mobile):

| Card | Value |
| --- | --- |
| Total Orders | `6,112` (`toLocaleString`) |
| Total Revenue | `$2,394,747.95` |
| Refunds Issued | `24 ($16,050.78)` |
| Order Date Range | `Jan 8, 2010 to Jul 14, 2025` |

Show `Skeleton` blocks while loading, and an error message with a Retry button on failure.

### 7.2 Filter bar (`OrderFilters.tsx`)
One row on desktop that wraps on smaller screens:

1. **Search** – shadcn `Input` with a Search icon. Placeholder: "Search name, email, phone, order #, address, product…". Debounce 400 ms, then fetch. Include a clear (X) button when it has text.
2. **Status** – shadcn `Select` (not a native select). Options: "All" first, then the values from `GET /api/orders/statuses` (load once on mount). "All" means the `status` param is left out.
3. **From** and **To** – two `DatePicker` components (section 7.3).
4. **Clear filters** – outline `Button`: resets search, status, both dates, sorting and page back to the defaults.

Changing any filter resets `page` to 1.
Keep the filter state (search, status, from, to, sortBy, sortOrder, page, limit) in the URL query string with `useSearchParams`, so a refresh or a shared link restores the same view.

### 7.3 Date picker: must use shadcn, never `<input type="date">`
Build `DatePicker` from the shadcn **Popover + Calendar** pattern:

- Trigger: an outline `Button` showing a `CalendarIcon` and either the date formatted `MMM d, yyyy` or a muted placeholder ("From date" / "To date"). When a date is set, show a small X inside the button to clear it.
- Content: `<Calendar mode="single" selected={value} onSelect={...} captionLayout="dropdown" startMonth={new Date(2010, 0)} endMonth={new Date()} />`. The month/year dropdowns let users jump across 15 years quickly. Close the popover after a date is picked.
- Limits: in the **From** picker, disable dates after the selected **To** date; in the **To** picker, disable dates before the selected **From** date. Disable future dates in both.
- Send dates to the API as `format(date, 'yyyy-MM-dd')` from date-fns. **Never use `toISOString()`**: it converts to UTC and can shift the day.
- When reading the URL back, parse `yyyy-MM-dd` with `parse(value, 'yyyy-MM-dd', new Date())`, which gives a local date.

### 7.4 Orders table (`GET /api/orders`)
Use the shadcn `Table`. Columns (match the reference screenshot):

| Header | Content | sortBy |
| --- | --- | --- |
| ORDER # | bold `#185817` | `orderId` |
| DATE | `Jul 14, 2025` (see the date note below) | `createdAt` |
| CUSTOMER | name (bold) with company below in small muted text | `customerName` |
| EMAIL / PHONE | email with phone below in small muted text; `-` if there's no email | `email` |
| LOCATION | `city, state`, or `-` | `location` |
| ITEMS | `itemsTotalQty`, right aligned | `itemsTotalQty` |
| TOTAL | `$1,349.45`, right aligned | `total` |
| STATUS | `StatusBadge` | `status` |

- Click a header to sort. The first click on a new column sorts `desc`; clicking the same column toggles `asc`/`desc`. Show an arrow icon on the active column. The default is `createdAt desc`.
- **Date display:** `createdAt` holds the store's wall-clock time saved as UTC. Format it in UTC so the day never shifts: `new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(createdAt))`. Use the same helper for the dashboard date-range card.
- Money: `new Intl.NumberFormat('en-US', { style: 'currency', currency: row.currency || 'USD' })`.
- Loading: 10 skeleton rows (keep the old rows dimmed while a new page loads, so the layout doesn't jump).
- Empty: one full-width row with "No matching orders" and "Try a different search term or clear your filters."
- Error: an `Alert` with the message and a Retry button.

`StatusBadge` colors (shadcn `Badge` with Tailwind classes, readable in light and dark mode):
- Completed → green
- Completed (Partial refund) → teal
- Pending payment, On hold → amber
- Quote, Draft, Purchase order → slate/blue
- Cancelled, Refunded → red

### 7.5 Pagination (`Pagination.tsx`)
Below the table:
- Left: "Showing 1–25 of 6,112 orders".
- Right: First / Prev / "Page X of Y" / Next / Last buttons, disabled using `hasPrevPage` / `hasNextPage`, plus a rows-per-page shadcn `Select` (10 / 25 / 50 / 100; changing it resets to page 1).
- Scroll back to the top of the table when the page changes.

## 8. Types (`src/types/api.ts`)
Write TS types for `LoginResponse`, `Address`, `Customer`, `OrderListItem`, `Pagination`, `OrdersResponse`, `OrderStatus` (string union of the 9 statuses), `DashboardCards`, `OrdersQuery`, and `ApiErrorBody`, all matching section 2 exactly.

## 9. UI and quality
- Use shadcn defaults with a neutral theme and support light and dark mode (follow the system setting).
- Every interactive element works with the keyboard, and every form field has a label.
- Show toasts (`sonner`) for session expiry and network errors.
- No `any` types. `npm run build` and `npm run lint` must pass.
- Add a README: setup, `.env`, `npm run dev` (port 3000), and a note that the backend must run on port 5000.

## 10. Out of scope
- An Export CSV button (the backend has no export endpoint yet).
- An order details drawer, user management, or registration.

## 11. Done when
1. `npm run dev` serves the app at http://localhost:3000.
2. Opening `/` while logged out redirects to `/login`. A wrong password shows "Invalid email or password". The correct credentials open the dashboard.
3. The network tab shows `Authorization: Bearer …` on `/api/orders`, `/api/orders/statuses` and `/api/dashboard/cards`, and no token on `/api/login`.
4. The cards show 6,112 orders, $2,394,747.95, 24 ($16,050.78), and Jan 8, 2010 to Jul 14, 2025.
5. The search, the status Select, both shadcn date pickers (including the limits), sorting, pagination and rows-per-page all change the table correctly. A refresh keeps the filters (URL state).
6. Picking Jul 1 – Jul 31, 2025 with status Completed and search "mays" shows only order #185817.
7. Deleting the token from localStorage (or letting it expire) and then triggering any request sends the user back to `/login` with a toast.
