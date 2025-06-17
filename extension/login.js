document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const errorMessage = document.getElementById('error-message');

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('https://webextension-8p1b.onrender.com/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ Username: username, Password: password })
      });

      const result = await response.json();

      if (response.status === 200) {
        chrome.storage.local.set(
          {
            loggedIn: true,
            token: result.token,
            userId: result.userid
          },
          () => {
            console.log('User logged in successfully.');
            chrome.action.setPopup({ popup: 'popup.html' });
            window.location.href = 'popup.html'; // Redirect to popup.html after login
            
            // Notify service worker about login
            chrome.runtime.sendMessage({ type: 'login', userId: result.userid });
          }
        );
      } else {
        errorMessage.textContent = result.message || 'Login failed. Please try again.';
      }
    } catch (error) {
      console.error('Error during login:', error);
      errorMessage.textContent = 'An error occurred. Please try again.';
    }
  });
});
