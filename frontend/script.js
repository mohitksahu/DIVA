// API endpoint for the Flask backend
const API_URL = "http://127.0.0.1:5000";

// Global state
let isTyping = false;
let conversationStarted = false;
let abortTyping = false;

// DOM elements
const chatMessages = document.getElementById('chat-messages');
const welcomeScreen = document.getElementById('welcome-screen');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const stopBtn = document.getElementById('stop-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const typingIndicator = document.getElementById('typing-indicator');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const charCount = document.getElementById('char-count');
const errorToast = document.getElementById('error-toast');
const toastMessage = document.getElementById('toast-message');

// Theme preferences
let currentTheme = 'dark'; // Default to dark theme

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    setupEventListeners();
    updateCharacterCount();
    checkConnectionStatus();
    loadThemePreference();
});

// Setup event listeners
function setupEventListeners() {
    // Send button click
    sendBtn.addEventListener('click', sendMessage);

    // Stop button click
    stopBtn.addEventListener('click', stopGenerating);

    // Theme toggle button
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Enter key press
    userInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    // Input changes
    userInput.addEventListener('input', function () {
        updateCharacterCount();
        autoResizeTextarea();
    });

    // Focus on input when page loads
    userInput.focus();
}

// Auto-resize textarea
function autoResizeTextarea() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
}

// Update character count
function updateCharacterCount() {
    const count = userInput.value.length;
    charCount.textContent = count;

    if (count > 1800) {
        charCount.style.color = '#ef4444';
    } else if (count > 1500) {
        charCount.style.color = '#f59e0b';
    } else {
        charCount.style.color = '#9ca3af';
    }
}

// Set quick message from welcome screen buttons
function setQuickMessage(message) {
    userInput.value = message;
    updateCharacterCount();
    autoResizeTextarea();
    userInput.focus();
}

// Show/hide welcome screen
function toggleWelcomeScreen(show) {
    if (show) {
        welcomeScreen.style.display = 'flex';
        chatMessages.classList.remove('active');
    } else {
        welcomeScreen.style.display = 'none';
        chatMessages.classList.add('active');
        conversationStarted = true;
    }
}

// Update status indicator
function updateStatus(status, text) {
    statusDot.className = `status-dot ${status}`;
    statusText.textContent = text;
}

// Check connection status
async function checkConnectionStatus() {
    try {
        updateStatus('connecting', 'Connecting...');

        // Simple health check
        const response = await fetch(`${API_URL}/health`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            updateStatus('', 'Ready');
        } else {
            updateStatus('error', 'Connection Error');
        }
    } catch (error) {
        updateStatus('error', 'Offline');
        console.warn('Connection check failed:', error);
    }
}

// Main send message function
async function sendMessage() {
    const message = userInput.value.trim();

    // Validate input
    if (!message || isTyping) return;

    // Switch to chat view if needed
    if (!conversationStarted) {
        toggleWelcomeScreen(false);
    }

    // Add user message
    addMessage(message, 'user');

    // Clear input
    userInput.value = '';
    updateCharacterCount();
    autoResizeTextarea();

    // Disable input while processing
    setInputState(false);

    // Show typing indicator
    showTypingIndicator(); try {
        // Reset the abort flag before starting a new request
        abortTyping = false;

        updateStatus('connecting', 'Sending...');

        const response = await fetch(`${API_URL}/chat/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ prompt: message })
        });

        if (!response.ok) {
            throw new Error(`Server Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const botResponse = data.response || 'No response received from DIVA AI.';

        // Hide typing indicator
        hideTypingIndicator();

        // Add bot response with typing effect
        await addMessageWithTyping(botResponse, 'assistant');

        updateStatus('', 'Ready');

    } catch (error) {
        console.error('Error:', error);
        hideTypingIndicator();
        addMessage(`Error: ${error.message}`, 'error');
        updateStatus('error', 'Error');
        showToast(`Failed to send message: ${error.message}`);
    } finally {
        setInputState(true);
        userInput.focus();
    }
}

// Stop text generation
function stopGenerating() {
    if (isTyping) {
        // Set the flag to stop the typing animation
        abortTyping = true;
        isTyping = false;

        // Display a brief message in status
        updateStatus('', 'Generation stopped');

        // Enable input again
        setInputState(true);

        setTimeout(() => {
            if (!isTyping) {
                updateStatus('', 'Ready');
            }
        }, 1500);

        // Provide a brief visual feedback that stop was pressed
        stopBtn.classList.add('pressed');
        setTimeout(() => {
            stopBtn.classList.remove('pressed');
        }, 300);
    }
}

// Add message to chat
function addMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    // Add avatar
    const avatar = document.createElement('div');
    avatar.className = 'avatar';

    if (type === 'user') {
        avatar.innerHTML = '<i class="fas fa-user"></i>';
    } else if (type === 'assistant') {
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
    } else if (type === 'error') {
        avatar.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        avatar.style.background = '#ef4444';
        avatar.style.color = 'white';
    }    // Add message bubble
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    // Use innerHTML instead of textContent to preserve formatting
    if (type === 'assistant') {
        // Process the content to ensure proper formatting
        // Replace newlines with <br>, fix spacing issues, and apply basic markdown
        let formattedContent = content
            .replace(/\n/g, '<br>')
            .replace(/\s{2,}/g, ' ')  // Replace multiple spaces with a single space
            .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;'); // Replace tabs with non-breaking spaces

        // Apply basic markdown-like formatting
        formattedContent = formattedContent
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>');             // Italic

        bubble.innerHTML = formattedContent;
    } else {
        bubble.textContent = content;
    }

    // Special styling for error messages
    if (type === 'error') {
        bubble.style.background = '#fef2f2';
        bubble.style.color = '#dc2626';
        bubble.style.border = '1px solid #fecaca';
    }

    messageContent.appendChild(avatar);
    messageContent.appendChild(bubble);
    messageDiv.appendChild(messageContent);

    chatMessages.appendChild(messageDiv);
    scrollToBottom();

    return messageDiv;
}

// Add message with typing effect
async function addMessageWithTyping(content, type) {
    const messageDiv = addMessage('', type);
    const bubble = messageDiv.querySelector('.message-bubble');

    isTyping = true;
    abortTyping = false;

    // Typing animation
    for (let i = 0; i <= content.length; i++) {
        // Check both flags to handle cancellation
        if (!isTyping || abortTyping) {
            // If stopped early, still show the full response
            abortTyping = false;
            break;
        }

        const currentText = content.substring(0, i);
        // Use temporary text display during typing animation
        bubble.textContent = currentText;
        scrollToBottom();

        // Variable delay for more natural typing
        const delay = Math.random() * 30 + 20;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    isTyping = false;
    // Use innerHTML for assistant messages to preserve formatting
    if (type === 'assistant') {
        // Process the content to ensure proper formatting
        // Replace newlines with <br>, fix spacing issues, and apply basic markdown
        let formattedContent = content
            .replace(/\n/g, '<br>')
            .replace(/\s{2,}/g, ' ')  // Replace multiple spaces with a single space
            .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;'); // Replace tabs with non-breaking spaces

        // Apply basic markdown-like formatting
        formattedContent = formattedContent
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>');             // Italic

        bubble.innerHTML = formattedContent;
    } else {
        bubble.textContent = content;
    }

    scrollToBottom();
}

// Show typing indicator
function showTypingIndicator() {
    typingIndicator.style.display = 'block';
    scrollToBottom();
}

// Hide typing indicator
function hideTypingIndicator() {
    typingIndicator.style.display = 'none';
}

// Enable/disable input
function setInputState(enabled) {
    sendBtn.disabled = !enabled;
    userInput.disabled = !enabled;

    if (enabled) {
        userInput.focus();
    }
}

// Scroll to bottom of chat
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show error toast
function showToast(message) {
    toastMessage.textContent = message;
    errorToast.classList.add('show');

    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideToast();
    }, 5000);
}

// Hide error toast
function hideToast() {
    errorToast.classList.remove('show');
}

// Utility function to format time
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Handle window resize
window.addEventListener('resize', () => {
    scrollToBottom();
});

// Keyboard shortcuts
document.addEventListener('keydown', function (event) {
    // Ctrl/Cmd + / to focus input
    if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        userInput.focus();
    }

    // Escape to clear input
    if (event.key === 'Escape') {
        userInput.value = '';
        updateCharacterCount();
        autoResizeTextarea();
    }
});

// Prevent form submission if wrapped in form
document.addEventListener('submit', function (event) {
    event.preventDefault();
    sendMessage();
});

// Theme toggle functions
function toggleTheme() {
    // For now, we're only using the dark theme
    // No toggling needed
}

function applyTheme() {
    // Always use the dark theme
    document.querySelector('#theme-toggle-btn i').className = 'fas fa-sun';
}

function loadStylesheet() {
    // Nothing to do - we're using a fixed stylesheet
}

function saveThemePreference() {
    // Nothing to save - we're using a fixed theme
}

function loadThemePreference() {
    // Nothing to load - we're using a fixed theme
}

// Make setQuickMessage globally available for HTML onclick
window.setQuickMessage = setQuickMessage;
window.sendMessage = sendMessage;
window.hideToast = hideToast;
