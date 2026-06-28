<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/bot.svg" width="80" alt="Orchaix Logo" />
  <h1>Orchaix</h1>
  <p><strong>La Plataforma de Inteligencia Artificial Multi-Agente No-Code Definitiva para Comercios</strong></p>
</div>

---

## 🚀 ¿Qué es Orchaix?

**Orchaix** democratiza el acceso a la Inteligencia Artificial para pequeños y medianos comercios. A través de una plataforma 100% No-Code, cualquier negocio puede crear múltiples asistentes de IA expertos (Agentes), proveerles la información específica de su negocio y distribuirlos a través de múltiples canales (Web, Móvil, Escritorio, Widgets y Telegram).

La IA deja de ser una herramienta genérica y se convierte en tu **vendedor experto, tu equipo de soporte o tu recepcionista las 24/7**, todo operando bajo las directivas exactas de tu comercio.

---

## ✨ Características Principales (Hackathon Highlights)

* 🤖 **Arquitectura Multi-Agente por Proyecto:** Crea múltiples "Chats de la IA" especializados para tu negocio. (Ej: un agente exclusivo para Ventas y otro para Soporte Técnico).
* 📚 **RAG (Retrieval-Augmented Generation) Integrado:** Los comercios pueden subir sus propios datos (catálogos, precios, horarios, FAQs). La IA de Google Gemini asimila estos datos y responde *exclusivamente* basándose en ellos, eliminando alucinaciones.
* 🌐 **Distribución Omnicanal (Build Once, Deploy Everywhere):**
  * **Link Público Directo:** Páginas alojadas para acceso rápido (`orchaix.com/pe/usuario/proyecto/chat`).
  * **SDK Web Widget:** Código inyectable de una línea para tener una burbuja flotante de soporte en cualquier página externa.
  * **Telegram Bot Automatizado:** Vincula el token de Telegram y Orchaix tomará control del bot de forma automática para responder a los clientes.
* 📱 **Ecosistema Completo de Aplicaciones:**
  * **Web App (Dashboard):** Gestión completa de agentes, conocimiento y métricas.
  * **Mobile App (iOS/Android - Expo):** 
    * *Modo Comercio:* Para gestionar a los agentes desde cualquier lugar.
    * *Modo Cliente:* Con un sistema estilo "Discord", los usuarios introducen el código de acceso del chat para hablar directamente con el negocio.
  * **Desktop App (Electron):** Gestión ininterrumpida y nativa en Windows/macOS/Linux.

---

## 🛠️ Stack Tecnológico

Orchaix está construido pensando en escalabilidad y rendimiento:

* **IA Engine:** Google Gemini SDK (`@google/genai`).
* **Web Frontend / Backend:** Next.js (App Router), React, TailwindCSS, TypeScript.
* **Base de Datos:** PostgreSQL alojado en [Neon](https://neon.tech), ORM con [Prisma](https://www.prisma.io/).
* **Móvil:** React Native / Expo.
* **Escritorio:** Electron.js.

---

## 🏁 Cómo iniciar localmente (Quickstart)

### 1. Requisitos Previos
* Node.js v18+
* Una base de datos de Postgres (recomendado Neon).
* Un API Key de Google Gemini.

### 2. Configurar el Backend / Web Dashboard
1. Clona el repositorio e instala dependencias:
   ```bash
   git clone https://github.com/nadevrix/orchaix.git
   cd orchaix
   npm install
   ```
2. Configura tus variables de entorno creando un archivo `.env`:
   ```env
   DATABASE_URL="postgres://usuario:password@host/orchaix?sslmode=require"
   GEMINI_API_KEY="tu-api-key-de-gemini"
   JWT_SECRET="tu-secreto-super-seguro"
   ```
3. Empuja el esquema a tu base de datos:
   ```bash
   npx prisma db push
   ```
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

### 3. Iniciar la Aplicación Móvil
1. Ve al directorio `/mobile`.
2. Instala las dependencias y ejecuta Expo:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```

### 4. Iniciar la Aplicación de Escritorio
1. Ve al directorio `/desktop`.
2. Instala dependencias y corre Electron:
   ```bash
   cd desktop
   npm install
   npm start
   ```

---

## 💡 Modelo de Seguridad e Integración
El flujo comercial de Orchaix garantiza que **las claves de IA nunca se exponen al cliente**. Toda la orquestación ocurre en el Backend de la plataforma. El comercio solo comparte un enlace, un widget o un bot, garantizando seguridad absoluta mientras atiende de forma inteligente a miles de clientes en paralelo.

<div align="center">
  <i>Construido con pasión para potenciar los pequeños negocios a través de la IA.</i>
</div>
