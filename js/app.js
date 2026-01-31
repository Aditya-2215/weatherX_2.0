// ================= INITIALIZATION ================= //

// Check if user is already logged in on page load
window.addEventListener('DOMContentLoaded', () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  if (isLoggedIn === 'true') {
    // Redirect to dashboard if logged in
    window.location.href = 'dashboard.html';
  }
});

// ================= UTILITY FUNCTIONS ================= //

// Email validation with comprehensive regex
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).toLowerCase());
}

// Password validation (minimum 6 characters)
function validatePassword(password) {
  return password && password.length >= 6;
}

// City validation (minimum 2 characters, letters, spaces, hyphens)
function validateCity(city) {
  const cityRegex = /^[a-zA-Z\s\-]{2,}$/;
  return cityRegex.test(String(city).trim());
}

// Get users from localStorage
function getUsers() {
  try {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
  } catch (error) {
    console.error('Error reading users from localStorage:', error);
    return [];
  }
}

// Save users to localStorage
function saveUsers(users) {
  try {
    localStorage.setItem('users', JSON.stringify(users));
    return true;
  } catch (error) {
    console.error('Error saving users to localStorage:', error);
    showError('Failed to save user data. Please try again.');
    return false;
  }
}

// ================= MESSAGE DISPLAY FUNCTIONS ================= //

// Show error message
function showError(message) {
  const msgElement = document.getElementById('successMsg');
  const textElement = document.getElementById('successText');
  const svgElement = msgElement.querySelector('svg');
  
  // Change to error styling
  svgElement.innerHTML = '<line x1="18" y1="6" x2="6" y2="18" stroke-width="2"></line><line x1="6" y1="6" x2="18" y2="18" stroke-width="2"></line>';
  
  msgElement.style.background = 'rgba(239, 68, 68, 0.15)';
  msgElement.style.borderColor = 'rgba(239, 68, 68, 0.3)';
  svgElement.style.color = '#ef4444';
  textElement.style.color = '#fca5a5';
  textElement.textContent = message;
  
  msgElement.classList.add('active');
  msgElement.style.display = 'flex';
  
  setTimeout(() => {
    msgElement.classList.remove('active');
    setTimeout(() => {
      msgElement.style.display = 'none';
    }, 300);
  }, 4000);
}

// Show success message
function showSuccess(message) {
  const msgElement = document.getElementById('successMsg');
  const textElement = document.getElementById('successText');
  const svgElement = msgElement.querySelector('svg');
  
  // Change to success styling
  svgElement.innerHTML = '<polyline points="20 6 9 17 4 12" stroke-width="2"></polyline>';
  
  msgElement.style.background = 'rgba(16, 185, 129, 0.15)';
  msgElement.style.borderColor = 'rgba(16, 185, 129, 0.3)';
  svgElement.style.color = '#10b981';
  textElement.style.color = '#86efac';
  textElement.textContent = message;
  
  msgElement.classList.add('active');
  msgElement.style.display = 'flex';
  
  setTimeout(() => {
    msgElement.classList.remove('active');
    setTimeout(() => {
      msgElement.style.display = 'none';
    }, 300);
  }, 3000);
}

// ================= FORM NAVIGATION ================= //

// Show register form
function showRegister(e) {
  if (e) e.preventDefault();
  
  // Hide all forms
  document.getElementById('loginForm').classList.remove('active');
  document.getElementById('forgotForm').classList.remove('active');
  
  // Show register form
  document.getElementById('registerForm').classList.add('active');
  
  // Update header
  document.getElementById('formTitle').textContent = 'Create Account';
  document.getElementById('formSubtitle').textContent = 'Join WeatherX today';
  
  // Clear form fields
  document.getElementById('registerForm').reset();
}

// Show login form
function showLogin(e) {
  if (e) e.preventDefault();
  
  // Hide all forms
  document.getElementById('registerForm').classList.remove('active');
  document.getElementById('forgotForm').classList.remove('active');
  
  // Show login form
  document.getElementById('loginForm').classList.add('active');
  
  // Update header
  document.getElementById('formTitle').textContent = 'WeatherX';
  document.getElementById('formSubtitle').textContent = 'Smart Weather Alert System';
  
  // Clear form fields
  document.getElementById('loginForm').reset();
}

// Show forgot password form
function showForgot(e) {
  if (e) e.preventDefault();
  
  // Hide all forms
  document.getElementById('loginForm').classList.remove('active');
  document.getElementById('registerForm').classList.remove('active');
  
  // Show forgot form
  document.getElementById('forgotForm').classList.add('active');
  
  // Update header
  document.getElementById('formTitle').textContent = 'Reset Password';
  document.getElementById('formSubtitle').textContent = "We'll send you a reset link";
  
  // Clear form fields
  document.getElementById('forgotForm').reset();
}

// ================= WELCOME MODAL ================= //

// Show welcome modal
function showWelcome(userName, userCity) {
  const modal = document.getElementById('welcomeModal');
  const title = document.getElementById('welcomeTitle');
  const message = document.getElementById('welcomeMessage');
  
  title.textContent = `Welcome to WeatherX, ${userName}!`;
  message.textContent = `Your account has been created successfully. Get ready to receive personalized weather alerts for ${userCity}.`;
  
  modal.classList.add('active');
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

// Close welcome modal
function closeWelcome() {
  const modal = document.getElementById('welcomeModal');
  modal.classList.remove('active');
  
  // Re-enable body scroll
  document.body.style.overflow = '';
  
  // Show login form after closing
  setTimeout(() => {
    showLogin();
  }, 300);
}

// ================= FORM HANDLERS ================= //

// Login form handler
document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const submitBtn = this.querySelector('button[type="submit"]');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  // Validation
  if (!email || !password) {
    showError('Please fill in all fields');
    return;
  }
  
  if (!validateEmail(email)) {
    showError('Please enter a valid email address');
    return;
  }
  
  // Add loading state
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  
  // Simulate network delay for better UX
  setTimeout(() => {
    // Check credentials
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      showError('Invalid email or password');
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      return;
    }
    
    // Login successful
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUser', JSON.stringify({
      email: user.email,
      city: user.city
    }));
    
    showSuccess('Login successful! Redirecting...');
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
  }, 500);
});

// Register form handler
document.getElementById('registerForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const submitBtn = this.querySelector('button[type="submit"]');
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const city = document.getElementById('registerCity').value.trim();
  
  // Validation
  if (!email || !password || !city) {
    showError('Please fill in all fields');
    return;
  }
  
  if (!validateEmail(email)) {
    showError('Please enter a valid email address');
    return;
  }
  
  if (!validatePassword(password)) {
    showError('Password must be at least 6 characters long');
    return;
  }
  
  if (!validateCity(city)) {
    showError('Please enter a valid city name (letters only)');
    return;
  }
  
  // Add loading state
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  
  // Simulate network delay for better UX
  setTimeout(() => {
    // Check if user already exists
    const users = getUsers();
    const existingUser = users.find(u => u.email === email);
    
    if (existingUser) {
      showError('An account with this email already exists');
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      return;
    }
    
    // Create new user
    const newUser = {
      email: email,
      password: password,
      city: city,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    
    if (!saveUsers(users)) {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      return;
    }
    
    // Remove loading state
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
    
    // Show success message briefly
    showSuccess('Account created successfully!');
    
    // Extract first name from email (before @)
    const userName = email.split('@')[0];
    
    // Show welcome modal after a short delay
    setTimeout(() => {
      showWelcome(userName, city);
    }, 800);
    
  }, 500);
});

// Forgot password form handler
document.getElementById('forgotForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const submitBtn = this.querySelector('button[type="submit"]');
  const email = document.getElementById('forgotEmail').value.trim();
  
  // Validation
  if (!email) {
    showError('Please enter your email address');
    return;
  }
  
  if (!validateEmail(email)) {
    showError('Please enter a valid email address');
    return;
  }
  
  // Add loading state
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  
  // Simulate network delay for better UX
  setTimeout(() => {
    // Check if user exists
    const users = getUsers();
    const userExists = users.find(u => u.email === email);
    
    if (!userExists) {
      showError('No account found with this email address');
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      return;
    }
    
    // Success (demo mode)
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
    
    showSuccess('Password reset link sent to your email (demo mode)');
    
    setTimeout(() => {
      showLogin();
    }, 2000);
  }, 500);
});

// ================= KEYBOARD SHORTCUTS ================= //

// ESC key to close welcome modal
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const modal = document.getElementById('welcomeModal');
    if (modal.classList.contains('active')) {
      closeWelcome();
    }
  }
});

// ================= INPUT ENHANCEMENTS ================= //

// Auto-focus first input when form changes
const formObserver = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.attributeName === 'class') {
      const activeForm = document.querySelector('.form-container form.active');
      if (activeForm) {
        const firstInput = activeForm.querySelector('input');
        if (firstInput) {
          setTimeout(() => firstInput.focus(), 100);
        }
      }
    }
  });
});

// Observe all forms for class changes
document.querySelectorAll('.form-container form').forEach(form => {
  formObserver.observe(form, { attributes: true });
});

// ================= ERROR HANDLING ================= //

// Global error handler
window.addEventListener('error', function(e) {
  console.error('Global error:', e.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(e) {
  console.error('Unhandled promise rejection:', e.reason);
});

console.log('WeatherX Authentication System Initialized');