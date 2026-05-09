# ✨ Velora - Gestión de Citas

**Velora** es una plataforma integral de gestión de reservas y CRM diseñada para negocios que buscan una presencia digital premium, moderna y altamente funcional. Desde salones de belleza hasta consultorios, Velora permite automatizar el flujo de citas con una estética "Cyber Glow" y herramientas de analítica avanzada.

---

## 🚀 Características Principales

- **Calendario Inteligente**: Interfaz interactiva para gestionar citas en tiempo real con soporte para múltiples vistas y estados.
- **Gestor de Servicios**: Sistema flexible para crear servicios con duraciones personalizadas, precios base, categorías y recursos.
- **CRM de Clientes**: Base de datos centralizada con historial de citas, preferencias y datos de contacto.
- **Analíticas en Tiempo Real**: Dashboards visuales (Chart.js) que muestran el crecimiento de ingresos, servicios más populares y KPIs de rendimiento.
- **Identidad Visual Personalizable**: Los negocios pueden cambiar su logo, banner y paleta de colores (Modo Oscuro/Claro) para reflejar su marca.
- **Sistema de Notificaciones**: Alertas automáticas para nuevas reservas y cambios de estado.
- **Landing Page de Reservas**: Cada negocio obtiene un enlace público optimizado para móviles donde sus clientes pueden agendar en segundos.

---

## 🛠️ Stack Tecnológico

**Frontend:**
- **Arquitectura**: Vanilla JavaScript, HTML5 Semántico y CSS3 Moderno.
- **Librerías**:
  - `Lucide Icons`: Iconografía minimalista.
  - `Chart.js`: Visualización de datos y estadísticas.
  - `FullCalendar`: Motor de gestión de eventos.
  - `Confetti.js`: Micro-interacciones de éxito.

**Backend:**
- **Entorno**: Node.js & Express.
- **Base de Datos**: PostgreSQL.
- **Seguridad**: Autenticación vía JWT (JSON Web Tokens) y encriptación de contraseñas con bcrypt.
- **Otras librerías**: Nodemailer (emails), node-cron (recordatorios automáticos), Stripe (pagos), Multer (subida de archivos).

---

## 📋 Requisitos Previos

Antes de instalar, asegúrate de tener lo siguiente en tu máquina:

- [Node.js](https://nodejs.org/) v18 o superior
- [PostgreSQL](https://www.postgresql.org/) v14 o superior
- Una cuenta de [Stripe](https://stripe.com) (opcional, solo si vas a usar pagos)
- Una cuenta de Gmail con [App Password](https://support.google.com/accounts/answer/185833) habilitada (para los emails)

---

## 📦 Instalación y Configuración

**1. Clonar el repositorio:**
```bash
git clone https://github.com/tu-usuario/velora.git
cd velora
```

**2. Instalar dependencias del backend:**
```bash
cd Backend
npm install
```

**3. Configurar variables de entorno:**

Crea un archivo `.env` dentro de la carpeta `Backend` con el siguiente contenido:

```env
# Base de datos
DB_USER=postgres
DB_HOST=localhost
DB_NAME=velora_bd
DB_PASSWORD=tu_contraseña
DB_PORT=5432

# Autenticación
JWT_SECRET=una_clave_secreta_larga_y_aleatoria

# Servidor
PORT=5000

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=tu_app_password_de_gmail
FRONTEND_URL=http://localhost:3001

# Stripe (opcional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
```

**4. Inicializar la base de datos:**

Asegúrate de tener PostgreSQL corriendo y una base de datos creada con el nombre `velora_bd`. Luego ejecuta:

```bash
node migrate.js
```

Esto creará todas las tablas necesarias automáticamente.

**5. Iniciar el proyecto:**
```bash
# Modo desarrollo (con auto-reload)
npm run dev

# Modo producción
npm start
```

El backend estará disponible en `http://localhost:5000`.

Para ver el frontend, abre directamente los archivos en `Frontend/pages/index.html` desde tu navegador o usa una extensión como Live Server en VS Code.

---

## 📁 Estructura del Proyecto

```
Velora/
├── Backend/
│   ├── config/          # Configuración de BD y servicios
│   ├── controllers/     # Lógica de negocio por módulo
│   ├── middleware/      # Auth, validación y manejo de errores
│   ├── routes/          # Definición de endpoints
│   ├── services/        # Servicios auxiliares (emails, etc.)
│   ├── uploads/         # Archivos subidos por los usuarios
│   └── server.js        # Punto de entrada
└── Frontend/
    ├── assets/          # Imágenes y recursos estáticos
    ├── css/             # Estilos por módulo
    ├── js/              # Lógica del cliente por módulo
    └── pages/           # Páginas HTML
```

---

## 🎨 Planes de Suscripción

Velora ofrece una experiencia escalable según las necesidades del negocio:

| Plan | Servicios | Citas/mes | Analíticas | Branding |
|------|-----------|-----------|------------|----------|
| **Free** | Hasta 5 | 25 | Básicas | — |
| **Pro** | Ilimitados | Ilimitadas | Avanzadas | — |
| **Business** | Ilimitados | Ilimitadas | Avanzadas | ✅ Completo |

---

## 🔐 Seguridad

- Contraseñas encriptadas con bcrypt.
- Autenticación con JWT con expiración configurable.
- Rate limiting en todos los endpoints y más estricto en auth (protección contra fuerza bruta).
- Variables sensibles manejadas exclusivamente por variables de entorno.

---

> **Velora**: Elevando la gestión de tu negocio al siguiente nivel visual y funcional. 💜
