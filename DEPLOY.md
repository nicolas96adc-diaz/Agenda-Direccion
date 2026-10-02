# Despliegue de Clínica Chutro

El único flujo de producción es:

`GitHub main → Hostinger Docker Manager → proyecto clinica-chutro → Desplegar`

Docker Manager clona `main` desde `nicolas96adc-diaz/Agenda-Direccion` y construye ese proyecto. No se usa GitHub Actions para publicar producción.

## Release normal

1. Confirmá que el cambio esté pusheado a `main`.
2. En Hostinger Docker Manager, abrí el proyecto **clinica-chutro**.
3. Elegí **Desplegar** y esperá a que el build finalice.
4. Verificá `https://clinica.gestionenvivo.com/`.

No modificar ni reiniciar otros proyectos o contenedores, incluido `chutro-gastos`.

## Reglas de Firestore

Las reglas son una configuración de seguridad independiente. Sólo publicarlas cuando cambie `firestore.rules`, apuntando al proyecto `clinica-chutro` y a Firestore `(default)`. Deben publicarse antes del frontend que dependa de ellas.

No se crean credenciales, proyectos ni bases adicionales para un release. La aplicación productiva usa exclusivamente:

- `projectId`: `clinica-chutro`
- `appId`: `1:654505421798:web:75522a7c05c0348aa30427`
- Firestore: `(default)`
