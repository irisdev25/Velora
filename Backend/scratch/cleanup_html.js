const fs = require('fs');
const path = 'Frontend/pages/dashboard.html';
let content = fs.readFileSync(path, 'utf8');
// Remove only the one in the sidebar-header area (lines 78-81 approximately)
content = content.replace(/<!-- Botón de Salir para Móvil -->\s+<button onclick="logout\(\)" class="mobile-logout-btn" style="display:none" title="Cerrar sesión">\s+<i data-lucide="log-out"><\/i>\s+<\/button>/, '');
fs.writeFileSync(path, content);
console.log('Cleanup done');
