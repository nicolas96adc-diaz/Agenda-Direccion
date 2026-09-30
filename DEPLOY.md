# Despliegue en VPS de Hostinger

La app se construye con Vite y se sirve como SPA mediante Caddy. El contenedor se reinicia automáticamente con Docker (`unless-stopped`).

## Publicar un release

El único flujo habitual de producción es el workflow manual **Deploy production** de GitHub Actions. Se ejecuta sólo desde `main` y exige escribir `DEPLOY` como confirmación. Primero valida el build, el acceso SSH y la cuenta de servicio de Firebase; después actualiza el servicio `clinica-chutro` con Docker Compose, publica únicamente `firestore.rules` y comprueba la URL pública.

Configuración única en GitHub → Settings → Secrets and variables → Actions:

- Secrets: `HOSTINGER_VPS_HOST`, `HOSTINGER_VPS_USER`, `HOSTINGER_VPS_SSH_KEY`, `HOSTINGER_VPS_KNOWN_HOSTS`, `FIREBASE_SERVICE_ACCOUNT_CLINICA_CHUTRO`.
- Variable opcional: `HOSTINGER_VPS_APP_DIR` si la carpeta de la app en la VPS no se llama `Agenda-Direccion`.

No se publica automáticamente con cada push: requiere autorización explícita mediante la ejecución manual del workflow.

## Primera instalación

En la VPS (Ubuntu/Debian), instalá Docker Engine y el plugin Docker Compose si todavía no están instalados. Luego cloná el repositorio:

```sh
git clone https://github.com/nicolas96adc-diaz/Agenda-Direccion.git
cd Agenda-Direccion
cp .env.vps.example .env
chmod 600 .env
```

Editá `.env` solamente en la VPS con la configuración web de Firebase de Clínica Chutro. No copies contraseñas, tokens, llaves privadas ni credenciales de servicio a ese archivo. Los valores `VITE_*` son configuración de cliente y quedan incorporados al build; por eso nunca deben guardarse en Git.

Construí e iniciá el servicio:

```sh
docker compose up -d --build
```

La app escucha en el puerto 80 por defecto. Asegurá que el firewall de la VPS y el firewall de Hostinger permitan TCP 80. Comprobaciones:

```sh
docker compose ps
curl -I http://127.0.0.1/
```

Desde afuera estará disponible en `http://IP_DE_LA_VPS/`.

## Actualizar con un solo comando

Desde el directorio del repositorio en la VPS:

```sh
git pull --ff-only && docker compose up -d --build --remove-orphans
```

## Pasar a dominio y HTTPS

1. Creá un registro DNS tipo **A** para el dominio o subdominio apuntando a la IP de la VPS.
2. Abrí TCP 80 y 443 en Hostinger y en el firewall de la VPS.
3. En `Caddyfile`, reemplazá `:80 {` por el nombre del dominio, por ejemplo `turno.tudominio.com {`, y eliminá el bloque `auto_https off`.
4. Ejecutá el comando de actualización. Caddy solicitará y renovará automáticamente el certificado HTTPS.

No se modifica Firebase Auth ni Firestore desde este despliegue. Si Firebase Auth rechazara inicios de sesión una vez que uses un dominio propio, autorizá ese dominio manualmente en la consola de Firebase antes de exponerlo a usuarios.
