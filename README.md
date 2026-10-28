# FVP Order Desk – Frontend

React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui dashboard for the FVP Order Desk API.

## Requirements

- Node.js 20+
- The FVP Order Desk backend running on **http://localhost:5000** (it already allows CORS from `http://localhost:3000`)

## Setup

```bash
npm install
cp .env.example .env
```

`.env`:

```
VITE_API_BASE_URL=http://localhost:5000
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:3000 (fixed port) |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run preview` | Serve the production build on port 3000 |
| `npm run lint` | Lint with oxlint |

## Notes

- The access token is stored in `localStorage` (`fvp_access_token`, `fvp_user_email`). Any 401 clears it and sends you back to `/login`.
- Dashboard filters, sorting and pagination live in the URL query string, so refreshing or sharing a link restores the same view.
- Dates are sent to the API as local `yyyy-MM-dd`; order dates are displayed in UTC to match the store's wall-clock time.
