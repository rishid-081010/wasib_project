document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const usernameInput = document.getElementById('wa-username');
    const loginPanel = document.getElementById('login-panel');
    const chatPanel = document.getElementById('chat-panel');
    const chatMessages = document.getElementById('chat-messages');
    
    // Inputs and Triggers
    const clientMsgInput = document.getElementById('client-msg-input');
    const sendMsgBtn = document.getElementById('send-msg-btn');
    const triggerPitchBtn = document.getElementById('trigger-pitch-btn');
    const triggerInviteBtn = document.getElementById('trigger-invite-btn');
    const triggerFollowupBtn = document.getElementById('trigger-followup-btn');

    let currentUser = null;

    // Login Logic
    loginBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        if (!username) {
            alert('Please enter a username or phone number.');
            return;
        }
        
        currentUser = username;
        loginPanel.style.display = 'none';
        chatPanel.style.display = 'flex';
        
        // Enable simulators
        triggerPitchBtn.removeAttribute('disabled');
        triggerInviteBtn.removeAttribute('disabled');
        triggerFollowupBtn.removeAttribute('disabled');

        // Add initial welcome message
        addMessage(`Hello! This is WNN Realty. How can we assist you today?`, 'in');
    });

    function addMessage(text, direction) {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const bubble = document.createElement('div');
        bubble.className = `msg-bubble msg-${direction}`;
        bubble.innerHTML = `
            ${text}
            <span class="msg-time">${time}</span>
        `;
        chatMessages.appendChild(bubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Client sends message
    sendMsgBtn.addEventListener('click', () => {
        const msg = clientMsgInput.value.trim();
        if (!msg) return;
        addMessage(msg, 'out');
        clientMsgInput.value = '';
    });

    clientMsgInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMsgBtn.click();
        }
    });

    // Simulators
    triggerPitchBtn.addEventListener('click', () => {
        const msg = `Hi ${currentUser}, thank you for your interest! As discussed, here are the details for DAMAC Islands:
        
📍 Location: Emirates Road
🏡 Property: 4- & 5-Bedroom Lagoon-inspired Townhouses
💰 Starting Price: AED 3 Million
💳 Payment Plan: 1% Monthly

Check out the brochure here: [Link]
Let me know when you're available for a meeting!`;
        addMessage(msg.replace(/\n/g, '<br>'), 'in');
    });

    triggerInviteBtn.addEventListener('click', () => {
        const msg = `Hi ${currentUser}, we're excited to invite you to the exclusive DAMAC Open House!
        
📅 Date: This Saturday & Sunday
⏰ Time: 10:00 AM - 6:00 PM
📍 Location: DAMAC Sales Center
🏠 Showcasing: Apartments, Townhouses & Villas starting from AED 1M.

Please reply with "CONFIRM" to reserve your spot!`;
        addMessage(msg.replace(/\n/g, '<br>'), 'in');
    });

    triggerFollowupBtn.addEventListener('click', () => {
        const msg = `Hi ${currentUser}, just checking in to see if you had a chance to review the details we sent over. Let me know if you have any questions!`;
        addMessage(msg.replace(/\n/g, '<br>'), 'in');
    });
});
