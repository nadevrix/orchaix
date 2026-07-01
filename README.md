<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/bot.svg" width="80" alt="Orchaix Logo" />
  <h1>Orchaix</h1>
  <p><strong>La Plataforma SaaS donde cualquier PYME crea y despliega un agente de IA en menos de 2 minutos.</strong></p>
  <p><i>🌟 Proyecto participante en ElevateU - VCILAT 2026 🌟</i></p>
</div>

---

> *"Mientras el mundo tiene n8n para developers, nosotros somos el ChatGPT para el emprendedor latinoamericano que solo quiere que su negocio funcione con IA."*

---

## 🎯 1. Propuesta de Valor (El Problema y la Solución)

Las PYMEs necesitan automatización con IA, pero las herramientas actuales (n8n, Make, Botpress) son exclusivas para equipos técnicos: requieren configurar nodos, manejar APIs, saber inglés y pagar costosas licencias por separado. 

**La Solución: Orchaix**
Orchaix es una plataforma **100% No-Code**. El usuario simplemente escribe en lenguaje natural qué quiere lograr (Ej: "Quiero vender zapatos por WhatsApp"). Nuestro **Orquestador A2A (Agent-to-Agent)** interno traduce mágicamente esa idea en un System Prompt profesional, configura la IA y la despliega instantáneamente en Widgets, Telegram o WhatsApp. Todo en menos de 2 minutos.

## 🚀 2. Potencial de Mercado y Escalabilidad

Orchaix nace como un modelo B2B SaaS altamente escalable enfocado en la adopción masiva:
* **TAM (Total Addressable Market):** Mercado global de agentes de IA proyectado en +$47 mil millones para 2030.
* **SAM (Serviceable Available Market):** +25 millones de PYMEs en Latinoamérica que hoy no tienen acceso real a IA por barreras técnicas.
* **Modelo de Negocio (Wallet / Pay-as-you-go):** El cliente recarga saldo (pre-pago). Orchaix absorbe la complejidad de las API Keys. Se cobra una fracción de centavo por mensaje generado, asegurando rentabilidad desde el día 1 sin fricción de suscripciones fijas internacionales.

## ⚙️ 3. Validación Inicial y Estado del MVP (Prototipo Funcional)

Orchaix ya se encuentra en fase de **Producto Mínimo Viable (MVP) Funcional**.
* **Frontend Omnicanal:** Dashboard Web (Next.js), App Móvil para gestión (React Native/Expo) y App de Escritorio (Electron).
* **Core Tecnológico:** Integración probada con Google Gemini (1.5 Flash) para máxima velocidad y bajo costo.
* **Arquitectura RAG:** Los usuarios ya pueden subir los datos de su negocio (precios, reglas) para que la IA responda sin alucinar.
* **Despliegue Inmediato:** Generación de links públicos directos y conexión nativa con bots de Telegram.

## 🧠 4. Diferenciador Tecnológico: El Orquestador A2A
La verdadera innovación no es conectar una IA, es **orquestarla**.
El usuario no interactúa con parámetros técnicos. Al escribir sus instrucciones, un "Agente Orquestador" analiza el *intent*, elige la mejor plantilla y configura al "Agente de Acción". El resultado es un asistente de ventas o soporte altamente calibrado, generado de forma completamente invisible para el usuario final.

---

## 🏁 Cómo Probar el MVP Localmente

### 1. Configurar el Backend / Web Dashboard
```bash
git clone https://github.com/nadevrix/orchaix.git
cd orchaix
npm install
```
Configura el archivo `.env`:
```env
DATABASE_URL="postgres://usuario:password@host/orchaix?sslmode=require"
GEMINI_API_KEY="tu-api-key-de-gemini"
JWT_SECRET="tu-secreto-super-seguro"
```
Inicia la base de datos y el servidor:
```bash
npx prisma db push
npm run dev
```

### 2. Ecosistema Adicional
* **App Móvil:** `cd mobile && npm install && npx expo start`
* **App de Escritorio:** `cd desktop && npm install && npm start`

---
<div align="center">
  <i>Construido con pasión por la Next Gen of Founders para transformar la economía de LATAM.</i>
</div>
