

let tabData = {
  scannedFiles: 0,
  problemFiles: 0,
};

// Function to reset counts after 24 hours
function resetCountsAfter24Hours() {
  const storageKey = 'fileScanData';
  const now = new Date();

  chrome.storage.local.get('lastResetDate', (result) => {
    const lastReset = result.lastResetDate;

    if (!lastReset || now - new Date(lastReset) >= 24 * 60 * 60 * 1000) {
      tabData.scannedFiles = 0;
      tabData.problemFiles = 0;
      chrome.storage.local.set({ fileScanData: tabData, lastResetDate: now.toISOString() }, () => {
        console.log('Counts reset after 24 hours.');
      });
    }
  });
}

// Function to scan files for phishy or suspicious content
function scanFiles() {
  let totalFilesScanned = 0;
  let problemFiles = 0;

  const suspiciousPatterns = [
    /<script[^>]*>.*<\/script>/gi,
    /src\s*=\s*['"]https?:\/\/[^'"]*['"]/gi,
    /eval\s*\(/gi,
    /document\.write\s*\(/gi,
    /javascript\s*:/gi,
  ];

  function isSuspicious(content) {
    return suspiciousPatterns.some((pattern) => pattern.test(content));
  }

  function fetchAndScan(url) {
    return fetch(url)
      .then((response) => response.text())
      .then((content) => {
        totalFilesScanned++;
        if (isSuspicious(content)) {
          problemFiles++;
        }
      })
      .catch((error) => {
        console.error('Error fetching file:', url, error);
      });
  }

  const resourcePromises = performance
    .getEntriesByType('resource')
    .filter((resource) => resource.initiatorType === 'script' || resource.initiatorType === 'link')
    .map((resource) => fetchAndScan(resource.name));

  return Promise.all(resourcePromises).then(() => {
    return {
      totalFilesScanned,
      problemFiles,
    };
  });
}

// Function to update tabData and send to backend
function updateTabData(fileScanResults, tabUrl) {
  tabData.scannedFiles += fileScanResults.totalFilesScanned;
  tabData.problemFiles += fileScanResults.problemFiles;

  chrome.storage.local.set({ fileScanData: tabData }, () => {
    chrome.storage.local.get('userId', (result) => {
      const userId = result.userId;
      if (userId) {
        const dataEntry = {
          date: new Date().toISOString(),
          url: tabUrl,
          scannedFiles: tabData.scannedFiles,
          problemFiles: tabData.problemFiles,
          userId,
        };

        fetch('https://webextension-8p1b.onrender.com/monitor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataEntry),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            return response.json();
          })
          .then((data) => console.log('Data sent to backend:', data))
          .catch((error) => console.error('Error sending data:', error));
      } else {
        console.error('User ID not found in storage');
      }
    });
  });
}

// Function to initialize WebSocket connection
function initializeWebSocket(userId) {
  const socket = new WebSocket(`wss://webextension-8p1b.onrender.com/socket?userId=${userId}`);

  socket.addEventListener('open', () => {
    console.log('WebSocket connection established');
    setInterval(() => {
      socket.send(JSON.stringify({ type: 'ping' }));
    }, 30000);
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'closeTab' && message.url) {
      chrome.tabs.query({ url: message.url }, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs.remove(tab.id, () => {
            console.log(`Closed tab with URL: ${message.url}`);
          });
        });
      });
    }
  });

  socket.addEventListener('close', () => {
    console.log('WebSocket connection closed');
  });

  socket.addEventListener('error', (event) => {
    console.error('WebSocket error:', event);
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    socket.send(JSON.stringify({ type: 'closeTab', tabId }));
  });

  return socket;
}

// Function to handle tab updates
function handleTabUpdates(socket) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      resetCountsAfter24Hours();
      scanFiles().then((fileScanResults) => {
        updateTabData(fileScanResults, tab.url);
      });

      chrome.storage.local.get('userId', (result) => {
        const userId = result.userId;
        if (userId) {
          socket.send(JSON.stringify({ type: 'openTab', tabId, url: tab.url }));
        }
      });
    }
  });
}

// Initialize the service worker
chrome.runtime.onInstalled.addListener(() => {
  resetCountsAfter24Hours();

  chrome.storage.local.get(['loggedIn', 'userId'], (result) => {
    if (result.loggedIn && result.userId) {
      const socket = initializeWebSocket(result.userId);
      handleTabUpdates(socket);
    } else {
      console.log('User is not logged in.');
    }
  });
});

// Listen for login event to initialize WebSocket and handle tabs
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'login' && message.userId) {
    const socket = initializeWebSocket(message.userId);
    handleTabUpdates(socket);
  }
});



