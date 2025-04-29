// Login page functionality
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            showLoginError("Please enter both username and password");
            return;
        }
        
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    username: username,
                    password: password 
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.status === 'OK') {
                // Store token in localStorage and redirect to app
                localStorage.setItem('token', data.token);
                window.location.href = '/app';
            } else {
                showLoginError(data.message || "Login failed. Please check your username and password.");
            }
        } catch (error) {
            console.error("Error during login:", error);
            showLoginError("An error occurred during login. Please try again.");
        }
    });
    
    function showLoginError(message) {
        const errorDiv = document.querySelector('.alert') || document.createElement('div');
        errorDiv.className = 'alert';
        errorDiv.textContent = message;
        
        if (!document.querySelector('.alert')) {
            loginForm.insertAdjacentElement('afterend', errorDiv);
        }
    }
});
