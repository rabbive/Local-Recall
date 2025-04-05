document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const connectionStatus = document.getElementById('connectionStatus');
  const loadingState = document.getElementById('loadingState');
  const summaryContainer = document.getElementById('summaryContainer');
  const summaryContent = document.getElementById('summaryContent');
  const keyPointsContainer = document.getElementById('keyPointsContainer');
  const keyPointsList = document.getElementById('keyPointsList');
  const conciseSummaryBtn = document.getElementById('conciseSummaryBtn');
  const detailedSummaryBtn = document.getElementById('detailedSummaryBtn');
  const copyBtn = document.getElementById('copyBtn');
  const saveBtn = document.getElementById('saveBtn');
  const tagInput = document.getElementById('tagInput');
  const addTagBtn = document.getElementById('addTagBtn');
  const tagsList = document.getElementById('tagsList');
  const settingsBtn = document.getElementById('settingsBtn');
  const serverInfo = document.getElementById('serverInfo');
  const errorContainer = document.getElementById('errorContainer');
  const errorMessage = document.getElementById('errorMessage');
  const dismissErrorBtn = document.getElementById('dismissErrorBtn');

  // State variables
  let currentUrl = '';
  let pageTitle = '';
  let pageContent = '';
  let conciseSummary = '';
  let detailedSummary = '';
  let keyPoints = [];
  let tags = [];
  let isConnected = false;
  let settings = {
    apiUrl: 'http://localhost:3000',
    ollamaEndpoint: 'http://localhost:11434'
  };

  // Initialize
  init();

  // Event listeners
  conciseSummaryBtn.addEventListener('click', () => getSummary('concise'));
  detailedSummaryBtn.addEventListener('click', () => getSummary('detailed'));
  copyBtn.addEventListener('click', copySummary);
  saveBtn.addEventListener('click', saveToLocalRecall);
  addTagBtn.addEventListener('click', addTag);
  tagInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTag();
  });
  dismissErrorBtn.addEventListener('click', dismissError);
  settingsBtn.addEventListener('click', openSettings);

  async function init() {
    // Load settings
    await loadSettings();
    
    // Check connection to LocalRecall server
    await checkConnection();
    
    // Get current tab info
    await getCurrentTabInfo();
    
    // Show initial UI state
    updateUIState();
  }

  async function loadSettings() {
    try {
      const savedSettings = await chrome.storage.sync.get('localrecallSettings');
      if (savedSettings.localrecallSettings) {
        settings = savedSettings.localrecallSettings;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async function checkConnection() {
    try {
      const response = await fetch(`${settings.apiUrl}/api/ollama/test`, {
        method: 'GET'
      });
      
      isConnected = response.ok;
      
      if (isConnected) {
        connectionStatus.classList.add('connected');
        connectionStatus.classList.remove('disconnected');
        connectionStatus.querySelector('.status-text').textContent = 'Connected to Ollama';
        serverInfo.textContent = `Connected to ${settings.apiUrl}`;
      } else {
        throw new Error('Could not connect to server');
      }
    } catch (error) {
      console.error('Connection error:', error);
      isConnected = false;
      connectionStatus.classList.remove('connected');
      connectionStatus.classList.add('disconnected');
      connectionStatus.querySelector('.status-text').textContent = 'Disconnected';
      serverInfo.textContent = 'Not connected to server';
      showError('Could not connect to LocalRecall server. Make sure the app is running.');
    }
  }

  async function getCurrentTabInfo() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      
      currentUrl = activeTab.url;
      pageTitle = activeTab.title || '';
      
      // Inject content script to extract page content
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        function: extractPageContent
      }, (results) => {
        if (results && results[0]) {
          pageContent = results[0].result;
        }
      });
    } catch (error) {
      console.error('Error getting tab info:', error);
      showError('Error accessing the current page content.');
    }
  }

  function extractPageContent() {
    // Check if it's a YouTube page
    const isYouTube = window.location.hostname.includes('youtube.com');
    
    if (isYouTube) {
      // Extract YouTube transcript if available
      const transcript = '';
      // Note: Extracting YouTube transcripts requires additional work
      // This is a placeholder for future implementation
      
      return {
        title: document.title,
        content: transcript || document.body.innerText.slice(0, 10000),
        isYouTube: true
      };
    } else {
      // For regular webpages, extract the main content
      // Try to get the main article content
      const article = document.querySelector('article') || 
                     document.querySelector('main') || 
                     document.querySelector('.content') ||
                     document.querySelector('#content');
      
      return {
        title: document.title,
        content: article ? article.innerText.slice(0, 10000) : document.body.innerText.slice(0, 10000),
        isYouTube: false
      };
    }
  }

  function updateUIState() {
    if (!isConnected) {
      conciseSummaryBtn.disabled = true;
      detailedSummaryBtn.disabled = true;
      return;
    }
    
    conciseSummaryBtn.disabled = false;
    detailedSummaryBtn.disabled = false;
  }

  async function getSummary(type) {
    if (!isConnected || !pageContent) {
      showError('Cannot generate summary. Check connection or page content.');
      return;
    }
    
    // Show loading state
    loadingState.style.display = 'flex';
    summaryContainer.style.display = 'none';
    keyPointsContainer.style.display = 'none';
    
    try {
      const response = await fetch(`${settings.apiUrl}/api/ollama/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: pageContent,
          options: {
            temperature: type === 'concise' ? 0.3 : 0.7,
            maxTokens: type === 'concise' ? 150 : 400
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get summary from server');
      }
      
      const data = await response.json();
      
      if (data.status === 'success' && data.data) {
        if (type === 'concise') {
          conciseSummary = data.data.summary;
          showSummary(conciseSummary);
        } else {
          detailedSummary = data.data.summary;
          showSummary(detailedSummary);
        }
        
        keyPoints = data.data.keyPoints || [];
        showKeyPoints(keyPoints);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error getting summary:', error);
      showError('Error generating summary. Please try again.');
    } finally {
      loadingState.style.display = 'none';
    }
  }

  function showSummary(summary) {
    summaryContent.textContent = summary;
    summaryContainer.style.display = 'block';
  }

  function showKeyPoints(points) {
    // Clear previous key points
    keyPointsList.innerHTML = '';
    
    // Add new key points
    if (points && points.length > 0) {
      points.forEach(point => {
        const li = document.createElement('li');
        li.textContent = point;
        keyPointsList.appendChild(li);
      });
      keyPointsContainer.style.display = 'block';
    } else {
      keyPointsContainer.style.display = 'none';
    }
  }

  function copySummary() {
    const textToCopy = summaryContent.textContent;
    
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          // Show a brief "Copied" tooltip
          const originalText = copyBtn.getAttribute('title');
          copyBtn.setAttribute('title', 'Copied!');
          setTimeout(() => {
            copyBtn.setAttribute('title', originalText);
          }, 1500);
        })
        .catch(err => {
          console.error('Error copying text:', err);
          showError('Failed to copy to clipboard');
        });
    }
  }

  async function saveToLocalRecall() {
    if (!currentUrl || !summaryContent.textContent) {
      showError('Nothing to save. Generate a summary first.');
      return;
    }
    
    try {
      // Determine which summary to save
      const summaryToSave = summaryContent.textContent;
      
      // Get content type
      const isYouTube = currentUrl.includes('youtube.com');
      const contentType = isYouTube ? 'video' : 'article';
      
      // Prepare the knowledge card data
      const cardData = {
        title: pageTitle,
        content: pageContent,
        summary: summaryToSave,
        keyPoints: keyPoints,
        sourceUrl: currentUrl,
        sourceName: new URL(currentUrl).hostname,
        contentType: contentType,
        tags: tags,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Send to LocalRecall API
      const response = await fetch(`${settings.apiUrl}/api/knowledge-cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save to LocalRecall');
      }
      
      // Show success message
      showSuccess('Saved to LocalRecall!');
      
    } catch (error) {
      console.error('Error saving to LocalRecall:', error);
      showError('Failed to save to LocalRecall. Make sure the app is running.');
    }
  }

  function addTag() {
    const tagValue = tagInput.value.trim();
    
    if (tagValue && !tags.includes(tagValue)) {
      tags.push(tagValue);
      renderTags();
      tagInput.value = '';
    }
  }

  function removeTag(tagToRemove) {
    tags = tags.filter(tag => tag !== tagToRemove);
    renderTags();
  }

  function renderTags() {
    tagsList.innerHTML = '';
    
    tags.forEach(tag => {
      const tagElement = document.createElement('div');
      tagElement.className = 'tag';
      tagElement.innerHTML = `
        ${tag}
        <span class="tag-remove" data-tag="${tag}">×</span>
      `;
      tagsList.appendChild(tagElement);
      
      // Add event listener to remove button
      tagElement.querySelector('.tag-remove').addEventListener('click', () => {
        removeTag(tag);
      });
    });
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorContainer.classList.add('visible');
  }

  function dismissError() {
    errorContainer.classList.remove('visible');
  }

  function showSuccess(message) {
    // Create a temporary success notification
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = 'var(--success-color)';
    notification.style.color = 'white';
    notification.style.padding = '8px 16px';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '1000';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  function openSettings() {
    // For this extension, we'll just open the LocalRecall settings page
    chrome.tabs.create({ url: `${settings.apiUrl}/dashboard/settings` });
  }
}); 