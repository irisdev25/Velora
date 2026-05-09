const express = require('express');
const pool = require('./config/db');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const logger = require('./config/logger');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const servicesRoutes = require('./routes/servicesRoutes');
const appointmentsRoutes = require('./routes/appointmentsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const statsRoutes = require('./routes/statsRoutes');
const businessRoutes = require('./routes/businessRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const customerRoutes = require('./routes/customerRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Seguridad: Cabeceras HTTP protegidas
app.use(helmet({
  crossOriginResourcePolicy: false, // Permitir cargar imágenes de otros dominios (Cloudinary)
}));
const isProduction = process.env.NODE_ENV === 'production';

console.log('Server initialization', {
  NODE_ENV: process.env.NODE_ENV,
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  hasDbHost: !!process.env.DB_HOST,
  hasJwtSecret: !!process.env.JWT_SECRET,
  isProduction,
});

// Rate limiting general
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Limitar cada IP a 1000 peticiones por ventana (Aumentado para desarrollo)
  message: { message: 'Demasiadas peticiones desde esta IP, por favor intenta después de 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting específico para Auth (Brute force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, // Más estricto para login/registro (Aumentado para desarrollo)
  message: { message: 'Demasiados intentos de acceso, por favor intenta después de 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const { startReminderService } = require('./config/reminderService');

// Iniciar cron jobs solo en desarrollo o cuando se habilita explícitamente
if (!isProduction && process.env.ENABLE_REMINDER_SERVICE !== 'false') {
  startReminderService();
}

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:8080',
  'http://127.0.0.1:5500',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (ej: Postman, mobile apps)
    if (!origin) return callback(null, true);
    // Permitir cualquier subdominio de vercel.app
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' no permitido`));
  },
  credentials: true
}));

// Payment routes registered BEFORE global express.json() to handle raw body for webhooks
app.use('/api/payments', paymentRoutes);

app.use(express.json());
const uploadDir = isProduction ? '/tmp/uploads/' : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api', apiLimiter); // Aplicar limite general a toda la API
app.use('/api/auth', authLimiter); // Aplicar limite más estricto a Auth
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/business-types', businessRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    env: {
      nodeEnv: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasDbHost: !!process.env.DB_HOST,
      hasJwtSecret: !!process.env.JWT_SECRET,
    }
  });
});

// Manejador global de errores
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

module.exports = app;