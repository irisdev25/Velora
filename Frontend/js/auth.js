// frontend/js/auth.js
// Registro
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    if (submitBtn) window.toggleButtonLoading(submitBtn, true);
    
    // Usamos querySelector para buscar dentro del formulario específico
    const formData = {
      name: registerForm.querySelector('[name="name"]').value,
      business_name: registerForm.querySelector('[name="business_name"]').value,
      email: registerForm.querySelector('[name="email"]').value,
      password: registerForm.querySelector('[name="password"]').value
    };

    try {
      const data = await window.ApiService.post('/auth/register', formData);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.showToast('Registro exitoso', 'success');
      
      const admins = ['velorasupport883@gmail.com', 'irisdev25@gmail.com', 'iris201922@gmail.com'];
      const targetPage = admins.includes(data.user.email.toLowerCase()) ? '/pages/admin.html' : '/pages/dashboard.html';
      
      setTimeout(() => window.location.href = targetPage, 1000);
    } catch (error) {
      console.error('Error:', error);
      window.showToast(error.message || 'Error en el registro', 'error');
    } finally {
      if (submitBtn) window.toggleButtonLoading(submitBtn, false);
    }
  });
}

// Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    if (submitBtn) window.toggleButtonLoading(submitBtn, true);
    
    const formData = {
      email: loginForm.querySelector('[name="email"]').value,
      password: loginForm.querySelector('[name="password"]').value
    };

    try {
      const data = await window.ApiService.post('/auth/login', formData);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.showToast('Inicio de sesión exitoso', 'success');
      
      const admins = ['velorasupport883@gmail.com', 'irisdev25@gmail.com', 'iris201922@gmail.com'];
      const targetPage = admins.includes(data.user.email.toLowerCase()) ? '/pages/admin.html' : '/pages/dashboard.html';
      
      setTimeout(() => window.location.href = targetPage, 1000);
    } catch (error) {
      console.error('Error:', error);
      window.showToast(error.message || 'Error al iniciar sesión', 'error');
    } finally {
      if (submitBtn) window.toggleButtonLoading(submitBtn, false);
    }
  });
}

// Logout
const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/pages/index.html';
};

// Verificar autenticación
const checkAuth = () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const protectedPages = ['dashboard.html', 'services.html', 'appointments.html', 'settings.html', 'customers.html'];
  const currentPage = window.location.pathname.split('/').pop();
  
  if (protectedPages.includes(currentPage) && !token) {
    window.location.href = '/pages/login.html';
    return;
  }

  // Si es admin y está en una página de negocio, redirigir a admin.html
  if (user && token && protectedPages.includes(currentPage)) {
      const admins = ['velorasupport883@gmail.com', 'irisdev25@gmail.com', 'iris201922@gmail.com'];
      if (admins.includes(user.email.toLowerCase())) {
          window.location.href = '/pages/admin.html';
      }
  }
};

// Toggle password visibility (mejorado para soportar múltiples formularios)
const initPasswordToggle = () => {
  const toggles = document.querySelectorAll('.password-toggle');
  
  toggles.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const wrapper = btn.closest('.password-wrapper');
      const input = wrapper.querySelector('input');
      
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      
      // Update icon
      btn.innerHTML = isPassword ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
      if (window.lucide) {
          window.lucide.createIcons();
      }
    });
  });
};

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initPasswordToggle();
});