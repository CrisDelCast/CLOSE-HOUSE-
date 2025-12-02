# Control de Acceso – Frontend

Interfaz web en React + Vite para operar el backend multi-tenant (login, residentes y visitantes).

## Requisitos
- Node.js **>= 20.19.0** (Vite 7 lo exige; si tienes 20.12 verás un warning).
- npm 10+.

## Configuración
1. Copia `.env.example` como `.env` y ajusta la URL del backend:
   ```bash
   VITE_API_BASE_URL=http://localhost:3000/api
   ```
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Ejecuta el entorno local:
   ```bash
   npm run dev
   ```
   El sitio quedará disponible en `http://localhost:5173`.
4. Compilar para producción:
   ```bash
   npm run build && npm run preview
   ```

## Flujo soportado
- **Login** por `tenantSlug`, correo y contraseña (usa `/api/auth/login`).
- **Dashboard protegido** con:
  - Listado y alta de residentes.
  - Listado de visitantes filtrado por estado, registro de entrada/salida y rechazo.
  - Formulario para registrar nuevas visitas (opcionalmente asociadas a un residente).

El cliente HTTP agrega automáticamente `Authorization: Bearer` y `x-tenant-id` leyendo la sesión almacenada en `localStorage`. Usa `react-query` para cache y estados de carga.
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
