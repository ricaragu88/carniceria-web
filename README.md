# 🥩 Carnicería Digital — Sistema de Pedidos de Barrio

Bienvenido a la aplicación web de pedidos diseñada especialmente para una **carnicería de barrio en una urbanización**.

Este sistema permite a los vecinos pedir desde un catálogo web móvil rápido (sin registro ni descargas) y envía el pedido ordenado y con código al carnicero por WhatsApp. La regla de oro del negocio está integrada en todo el flujo: **el precio del catálogo es orientativo y el definitivo se fija al pesar la carne en la báscula de la tienda**.

---

## 📁 Estructura del Proyecto (Dónde va cada cosa)

```text
Carnicero/
├── package.json               # Dependencias del proyecto (Express, CORS, Dotenv)
├── server.js                  # Servidor web principal y API REST
├── database.js                # Base de datos SQLite nativa (sin instalar nada extra)
├── carniceria.db              # Archivo de base de datos generado automáticamente
├── .env.example               # Plantilla de configuración editable
├── README.md                  # Esta guía paso a paso
│
├── services/
│   └── whatsappService.js     # Módulo AISLADO de WhatsApp (Fase 1 wa.me / Fase 2 API Meta)
│
└── public/                    # Archivos visibles en el navegador
    ├── index.html             # Catálogo web móvil para los VECINOS
    ├── panel.html             # Panel de mostrador para el CARNICERO (pantalla táctil)
    ├── admin.html             # Administración (editar productos, ofertas y franjas)
    ├── css/
    │   └── custom.css         # Estilos y formato de impresión de tickets
    └── js/
        ├── audio.js           # Timbre sonoro de tienda (Web Audio API)
        ├── catalog.js         # Lógica del catálogo, cesta y franjas horarias
        ├── panel.js           # Lógica del mostrador, estados y pesaje final
        └── admin.js           # Lógica de gestión de productos y ajustes
```

---

## 🚀 Cómo probarlo en local (En tu ordenador)

### Paso 1: Instalar dependencias
Abre una terminal o consola de comandos en la carpeta del proyecto y ejecuta:
```bash
npm install
```
*(Solo tarda 3 o 4 segundos porque no requiere compiladores externos).*

### Paso 2: Arrancar el servidor
Ejecuta:
```bash
npm start
```

Verás un mensaje en pantalla indicando:
- **Catálogo de Vecinos:** `http://localhost:3000`
- **Panel del Carnicero:** `http://localhost:3000/panel.html`
- **Administración:** `http://localhost:3000/admin.html`

### Paso 3: Probarlo en tu teléfono móvil (misma red WiFi)
1. Averigua la dirección IP local de tu ordenador (en Windows ejecuta `ipconfig` en otra consola y busca tu IPv4, por ejemplo `192.168.1.45`).
2. Conecta tu móvil a la misma red WiFi que el ordenador.
3. Abre el navegador de tu móvil y entra a: `http://192.168.1.45:3000`
4. ¡Verás el catálogo exactamente igual que lo verán los vecinos!

---

## ⚙️ Cómo rellenar los datos de la carnicería

Puedes rellenar o cambiar los datos del negocio de dos formas:

### Opción A (La más sencilla, desde la pantalla):
1. Entra a `http://localhost:3000/admin.html` (o pulsa "Productos y Tienda" desde el panel del mostrador).
2. El PIN por defecto es **`1234`**.
3. Rellena:
   - **Nombre de la tienda:** ej. *Carnicería Paco*
   - **WhatsApp de la tienda:** ej. *+34600111222*
   - **Horario:** ej. *L-V 9:00-14:00 y 17:00-20:00; S 9:00-14:00*
   - **Franjas de recogida y hora límite de pedido:** añade o modifica las franjas (ej. 13:00 con límite a las 12:00).
   - **Oferta del día ("Hoy en el mostrador"):** pon el texto de lo más fresco que haya entrado hoy y una foto.
4. Pulsa **Guardar Ajustes**.

### Opción B (Desde archivo):
Copia `.env.example` a un archivo `.env` y edita los valores.

---

## 🥩 Cómo funciona el flujo en el día a día

### 1. El Vecino pide desde el móvil:
1. Escanea el código QR en la tienda o pulsa el enlace que el carnicero tiene en su estado de WhatsApp o grupo de vecinos.
2. Añade productos a la cesta eligiendo la preparación (ej: *filetes finos*, *carne picada 2 veces*, etc.).
3. Selecciona una franja horaria abierta (si ya ha pasado la hora límite, la franja se desactiva sola).
4. Pulsa **"Enviar Pedido por WhatsApp"**:
   - El sistema genera el código de pedido (ej: `C-001`).
   - Se abre su WhatsApp con el mensaje ya escrito dirigido a la carnicería:
     ```text
     🟢 NUEVO PEDIDO C-001
     Pilar Sanmartín — Portal 4, 3º D — Tel. +34611223344
     Recogida: 14:00
     • 0.75 kg × Filetes de Ternera (Babilla 1ª) (Filetes muy finos)
     • 0.5 kg × Longaniza de Graus Artesana (Tira entera)
     Total orientativo: 17.68 € (definitivo al pesar)
     Notas: Por favor envasar para congelar
     ```
   - El vecino pulsa enviar y el carnicero lo recibe al instante.

### 2. El Carnicero en el mostrador (`/panel.html`):
1. Suena un timbre (*Ding-Dong*) automático y parpadea un aviso en pantalla cuando entra un pedido.
2. Si el carnicero prefiere el papel, pulsa el botón **"🖨️ Imprimir Hoja"** y le sale un albarán limpio con los cortes del día.
3. El carnicero pasa el pedido a **"Preparando"**.
4. Cuando corta la carne y la pone en la báscula, pulsa el botón grande verde **"⚖️ Pesar y Marcar LISTO"**:
   - Introduce el precio real que marca la báscula (ej: `18.20 €`).
   - Se abre WhatsApp con el mensaje oficial para el vecino:
     ```text
     🥩 Tu pedido C-001 ya está listo. Importe final: 18.20 €. Puedes pasar a recogerlo por Carnicería Parque Hispanidad. ¡Gracias!
     ```
5. El vecino pasa por la tienda a recoger su paquete en su franja y paga en efectivo o tarjeta como siempre.
6. El carnicero pulsa **"Entregado / Recogido"**.

---

## 🌐 Cómo publicarlo en Internet para los vecinos (Gratis)

Para que los vecinos puedan entrar desde cualquier lugar sin depender de tu ordenador encendido:

### Publicar en **Render.com** (Paso a paso para no programadores):
1. Sube esta carpeta a tu cuenta gratuita de **GitHub**.
2. Entra en [Render.com](https://render.com) y crea una cuenta gratuita.
3. Pulsa en **"New +"** y elige **"Web Service"**.
4. Conecta tu repositorio de GitHub.
5. Configura estos campos:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Pulsa **"Create Web Service"**. En un par de minutos Render te dará una dirección web pública segura (ej: `https://carniceria-vecinos.onrender.com`).
7. Entra en cualquier generador gratuito de códigos QR (ej: [qr-code-generator.com](https://www.qr-code-generator.com/)), pega la dirección web y descarga el QR para imprimirlo en un cartelito en el mostrador.

---

## 🔮 Fase 2: Cómo conectar la API Oficial de WhatsApp de Meta

El código está estructurado con el principio de responsabilidad única. Todo lo relativo a WhatsApp está aislado en:
`services/whatsappService.js`

En la **Fase 1 (piloto)**:
- Usamos enlaces universales `https://wa.me/` que no cuestan dinero y abren la aplicación de WhatsApp nativa del carnicero y del vecino.

En la **Fase 2 (cuando el piloto crezca)**:
- Para que los mensajes salgan solos desde el servidor sin que el carnicero tenga que abrir la ventana de chat:
  1. Da de alta una cuenta en [developers.facebook.com](https://developers.facebook.com) y activa **WhatsApp Business Cloud API**.
  2. Obtén tu `WHATSAPP_TOKEN` y tu `PHONE_NUMBER_ID`.
  3. En `services/whatsappService.js`, reemplaza la función que genera el enlace `wa.me` por un envío HTTP con `fetch`:
     ```javascript
     await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         messaging_product: 'whatsapp',
         to: cleanCustomerPhone,
         type: 'text',
         text: { body: messageText }
       })
     });
     ```
  4. **El resto de la aplicación (catálogo, báscula, base de datos y panel) continuará funcionando sin tocar ni una sola línea.**
