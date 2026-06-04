# ProSaber Beta Access

Pagina estatica lista para GitHub Pages. Guarda registros en una hoja de Google Drive usando Google Apps Script y muestra el enlace de prueba interna de Google Play despues del formulario.

## Archivos

- `index.html`: pagina principal.
- `styles.css`: diseno responsive.
- `app.js`: validacion, envio a Drive, historial y enlace de descarga.
- `Code.gs`: puente para escribir en Google Sheets.
- Enlace beta: `https://play.google.com/apps/internaltest/4701357693854014512`.

## Conectar con Drive

1. Crea o abre una hoja de calculo de Google en Drive. Si tienes un Excel `.xlsx`, abrelo con Google Sheets o conviertelo a hoja de calculo.
2. Copia el ID del documento, que es lo que va entre `/d/` y `/edit` en la URL.
3. En Google Sheets ve a `Extensiones > Apps Script`.
4. Pega el contenido de `Code.gs`.
5. El `SPREADSHEET_ID` ya esta configurado con tu hoja:
   `1xg_dP4u5pa1rJM3EnBYEMtgu_Xi_QowI1160VszI3_g`.
6. Ve a `Implementar > Nueva implementacion > Aplicacion web`.
7. Usa `Ejecutar como: Yo` y `Quien tiene acceso: Cualquier usuario`.
8. Copia la URL que termina en `/exec`.
9. En `app.js`, pega esa URL en `CONFIG.scriptEndpoint`.

El sitio no guarda claves privadas en el navegador. La escritura queda protegida por el Apps Script desplegado desde tu cuenta.

## Publicar en GitHub Pages

Sube estos archivos al repositorio: `index.html`, `styles.css`, `app.js`, `Code.gs` y `README.md`. Luego activa GitHub Pages desde `Settings > Pages` usando la rama principal.
