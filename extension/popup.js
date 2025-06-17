document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  chrome.storage.local.get(['loggedIn'], (result) => {
    if (!result.loggedIn) {
      // If not logged in, redirect to login page
      window.location.href = 'login.html';
    }
  });

  document.getElementById('startMonitoring').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'startMonitoring' });
  });

  document.getElementById('stopMonitoring').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'stopMonitoring' });
  });

  document.getElementById('logout').addEventListener('click', () => {
    chrome.storage.local.remove(['loggedIn', 'token', 'userId'], () => {
      console.log('User logged out.');
      chrome.action.setPopup({ popup: 'login.html' });
      window.location.href = 'login.html'; // Redirect to login page after logout
    });
  });
});
