// Background script for LocalRecall Chrome extension

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('LocalRecall extension installed');
  
  // Set default settings if not already set
  chrome.storage.sync.get('localrecallSettings', (data) => {
    if (!data.localrecallSettings) {
      chrome.storage.sync.set({
        localrecallSettings: {
          apiUrl: 'http://localhost:3000',
          ollamaEndpoint: 'http://localhost:11434'
        }
      });
    }
  });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getPageContent') {
    // This could be used to forward content from a content script to the popup
    sendResponse({ success: true });
    return true;
  }
}); 