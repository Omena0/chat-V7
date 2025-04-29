// Login page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const tokenMeta = document.querySelector('meta[name="token"]');
    if (tokenMeta) {
        const token = tokenMeta.content;
        localStorage.setItem('token', token);
        console.log('Token stored in localStorage:', token);
    }

    const loginForm = document.querySelector('form');
    if (loginForm) {
        console.log('Login script loaded successfully');

        // Override the standard form submission
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Login form submitted');

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            if (!username || !password) {
                showError('Please enter both username and password');
                return;
            }

            console.log('Attempting login for user:', username);

            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);            fetch('/login', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            })
            .then(response => {
                if (response.redirected) {
                    window.location.href = response.url;
                } else {
                    // Try to get a more specific error message
                    response.json()
                        .then(data => {
                            if (data && data.status) {
                                switch (data.status) {
                                    case 'INVALID': showError(data.message || 'Invalid request'); break;
                                    case 'USER_NOT_FOUND': showError('User not found'); break;
                                    case 'INCORRECT_PASSWORD': showError('Incorrect password'); break;
                                    case 'INVALID_USERNAME': showError('Invalid username format'); break;
                                    case 'INVALID_PASSWORD': showError('Invalid password format'); break;
                                    case 'SERVER_ERROR': showError('Server error. Please try again later'); break;
                                    case 'RATE_LIMITED': showError('Too many attempts. Please try again later'); break;
                                    default: showError(data.message || 'Invalid username or password');
                                }
                            } else {
                                showError('Invalid username or password');
                            }
                        })
                        .catch(() => {
                            showError('Invalid username or password');
                        });
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                showError('An error occurred during login. Please try again.');
            });
        });
    }

    function showError(message) {
        let errorDiv = document.querySelector('.alert');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'alert';
            loginForm.insertAdjacentElement('afterend', errorDiv);
        }
        errorDiv.textContent = message;
    }
});
