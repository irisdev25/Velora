const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  throw new Error('[authMiddleware] JWT_SECRET no está definido. Define esta variable en tu archivo .env antes de iniciar el servidor.');
}

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado: token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

module.exports = authMiddleware;