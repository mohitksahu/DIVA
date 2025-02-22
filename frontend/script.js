// API endpoint for the Flask backend
const API_URL = "https://71c0-2a09-bac1-36e0-60-00-1ae-3.ngrok-free.app/chat/";

// Function to simulate typing effect
function typeResponse(chatBox, responseText) {
    let index = 0;
    let responseElement = document.createElement("p");
    responseElement.innerHTML = `<strong>DIVA AI:</strong> `;
    chatBox.appendChild(responseElement);

    function typeNextLetter() {
        if (index < responseText.length) {
            responseElement.innerHTML += responseText.charAt(index);
            index++;
            setTimeout(typeNextLetter, 30); // Adjust typing speed
        }
    }

    typeNextLetter();
}

// Function to send a message to the backend and display the response
async function sendMessage() {
    let userInput = document.getElementById("user-input").value.trim();

    // Prevent sending empty messages
    if (!userInput) return;

    let chatBox = document.getElementById("chat-box");

    // Display user input in the chat box
    chatBox.innerHTML += `<p><strong>You:</strong> ${userInput}</p>`;

    // Clear input field after sending message
    document.getElementById("user-input").value = "";

    // Show typing indicator
    let typingIndicator = document.createElement("p");
    typingIndicator.innerHTML = `<strong>DIVA AI:</strong> <em>typing...</em>`;
    chatBox.appendChild(typingIndicator);

    try {
        let response = await fetch(API_URL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ prompt: userInput })
        });

        // Handle non-200 responses
        if (!response.ok) {
            throw new Error(`Server Error: ${response.status} ${response.statusText}`);
        }

        let data = await response.json();
        console.log("Raw Response:", data); // Debugging

        // Ensure `data.response` exists
        let botResponse = data.response || "No response received from DIVA AI.";

        // Remove typing indicator before displaying response
        chatBox.removeChild(typingIndicator);

        // Simulate typing effect for response
        typeResponse(chatBox, botResponse);

    } catch (error) {
        // Remove typing indicator if error occurs
        chatBox.removeChild(typingIndicator);
        chatBox.innerHTML += `<p><strong>Error:</strong> ${error.message}</p>`;
    }

    // Auto-scroll to the latest message
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Add event listener for Enter key press
document.getElementById("user-input").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});
