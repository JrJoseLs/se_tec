# Seshat Technologies · sitio principal

Sitio de la empresa hecho con React y Three.js (emblema 3D en la portada). El contenido vive en un JSON versionado en git, el formulario de contacto usa Supabase y el sitio se publica en GitHub Pages.

## Comandos

```bash
npm install --cache G:/npm-cache   # una vez
npm run dev                        # sitio en http://localhost:5173
npm run admin                      # panel "La escriba": http://localhost:5173/#/escriba
npm run build                      # genera dist/ (GitHub Actions lo hace al publicar)
```

## Editar el contenido

Todo el contenido (proyectos, servicios, pilares, tecnologías y textos) está en `src/content/site.json`.

1. Ejecuta `npm run admin`.
2. Edita lo que necesites. **Guardar** (o Ctrl+S) escribe `site.json` y el sitio abierto en otra pestaña se actualiza al instante. Cada guardado deja una copia en `.admin-backups/`, que no se sube a git.
3. En la pestaña **Publicar**, el panel hace `git commit` de `src/content` y `public/uploads` y luego `git push`. GitHub Actions construye y publica el sitio en 1–2 minutos.

### Por qué el panel es privado

- Solo existe con `npm run dev`. En `npm run build` su código se elimina: el sitio publicado no tiene la ruta, ni los endpoints, ni enlaces al panel.
- La API (`/__admin/*`) es un plugin de Vite que solo responde a peticiones desde `localhost` que traigan la cabecera `x-seshat-admin` y no vengan de otro origen. Así, otra web abierta en tu navegador no puede llamarla.
- No hay contraseña ni base de datos para el panel: para editar hace falta el repositorio en tu máquina.

## Supabase (formulario de contacto)

Mientras no esté configurado, el formulario guarda los envíos en el navegador ("modo local") y los puedes ver en la pestaña **Mensajes** del panel. Para conectarlo:

1. Crea un proyecto en supabase.com y ejecuta `supabase/schema.sql` en el SQL Editor. Esto crea la tabla `contactos` con RLS: los visitantes pueden insertar mensajes, pero no leerlos.
2. Copia `.env.example` como `.env.local` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Project Settings › API).
3. En GitHub, ve a Settings › Secrets and variables › Actions y crea esos mismos dos secretos.
4. Lee los mensajes en Supabase › Table Editor › contactos.

## Publicar en GitHub Pages (primera vez)

```bash
git init -b main
git add .
git commit -m "Sitio inicial"
git remote add origin https://github.com/<usuario>/<repo>.git
git push -u origin main
```

En el repositorio, ve a Settings › Pages y elige **GitHub Actions** como origen. El workflow `.github/workflows/deploy.yml` publica en cada push a `main`. Las rutas usan `#` (por ejemplo `#/p/myneg`), así que el sitio funciona igual en `usuario.github.io/repo/` que con un dominio propio.

## Estructura

```
src/content/site.json        contenido editable
src/pages/                   inicio y página de cada proyecto
src/components/Scene3D.jsx   emblema 3D (carga aparte; muestra el símbolo plano si no hay WebGL)
src/admin/                   panel local (solo en dev)
vite.config.js               plugin con la API local del panel
supabase/schema.sql          tabla y políticas del formulario
```
