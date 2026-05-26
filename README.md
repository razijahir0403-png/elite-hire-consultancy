# Elite Hire Consultancy Maintenance System

Production-ready MERN stack application for consultancy operations, candidate tracking, and audit trails across Naukri, Indeed, and internal analytics workflows.

---

## Project structure

```text
project-root/
├── client/                 # React (Vite) frontend
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── api/            # Axios HTTP client
│   │   ├── assets/         # Images and static imports
│   │   ├── components/     # Shared UI components
│   │   ├── context/        # React context (auth)
│   │   ├── hooks/          # Custom hooks (useAuth)
│   │   ├── layouts/        # Dashboard shell, route guards
│   │   ├── pages/          # Route-level views
│   │   ├── routes/         # App routing
│   │   ├── services/       # Domain API modules (optional)
│   │   ├── styles/         # Global CSS (Tailwind)
│   │   ├── utils/          # Helpers and exports
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── vercel.json
│   └── package.json
│
├── server/                 # Node.js / Express API
│   ├── config/             # DB, CORS, env
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── uploads/            # File uploads (static)
│   ├── .env.example
│   └── package.json
│
├── render.yaml             # Render blueprint (API)
├── package.json            # Root scripts (dev, build, start)
└── README.md
```

---

## Quick start (local)

### 1. Install dependencies

```bash
npm run install-all
```

### 2. Environment files

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` with your MongoDB Atlas URI and JWT secret.  
Edit `client/.env` so `VITE_API_BASE_URL` points at the API (default: `http://localhost:5000/api`).

### 3. Seed database (optional)

```bash
npm run seed
```

Default admin: `admin@elitehire.com` / `password123`

### 4. Run development

```bash
npm run dev
```

| Service   | URL                      |
|-----------|--------------------------|
| Frontend  | http://localhost:5173    |
| Backend   | http://localhost:5000    |
| Health    | http://localhost:5000/api/health |

### 5. Production build (local)

```bash
npm run build          # builds client → client/dist
npm start              # starts API (set SERVE_CLIENT=true to also serve dist)
```

---

## Environment variables

### `server/.env`

| Variable | Description |
|----------|-------------|
| `PORT` | API port (Render sets this automatically) |
| `NODE_ENV` | `development` or `production` |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `CLIENT_URL` | Comma-separated allowed CORS origins (e.g. Vercel URL + localhost) |
| `SERVE_CLIENT` | `true` to serve `client/dist` from Express (monolith); `false` for split deploy |

### `client/.env`

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Full API base including `/api` (e.g. `https://your-api.onrender.com/api`) |

---

## Deployment

### MongoDB Atlas

1. Create a cluster and database user.
2. Allow network access (deployment IPs or `0.0.0.0/0` for testing).
3. Copy the connection string into `MONGO_URI` on Render.

### Backend — Render

1. New **Web Service**, root directory: `server`
2. Build: `npm install` · Start: `npm start`
3. Set env vars from `server/.env.example` (`NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `SERVE_CLIENT=false`)
4. Or use the included `render.yaml` blueprint.

### Frontend — Vercel

1. Import repo, root directory: `client`
2. Framework: **Vite**
3. Set `VITE_API_BASE_URL` to your Render API URL + `/api`
4. `vercel.json` handles SPA rewrites.

Ensure `CLIENT_URL` on the API includes your exact Vercel origin (e.g. `https://your-app.vercel.app`).

---

## NPM scripts (root)

| Script | Action |
|--------|--------|
| `npm run dev` | Client + server concurrently |
| `npm run build` | Production client build |
| `npm start` | Start API (`server/`) |
| `npm run seed` | Seed roles, admin, sample data |
| `npm run client` | Frontend only |
| `npm run server` | Backend only |

---

## Tech stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router, Axios, React Toastify
- **Backend**: Express, Mongoose, JWT, express-validator, CORS
- **Database**: MongoDB (Atlas recommended)
