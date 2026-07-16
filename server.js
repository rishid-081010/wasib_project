const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static dashboard files
app.use(express.static(__dirname));

// In-memory data store for Webhooks and Webhook-driven Stats
const webhookLogs = [];
const callLogs = [
    { id: 1, date: '2026-07-16 10:30', phone: '+971 50 123 4567', duration: '2m 15s', outcome: 'Meeting Booked', badge: 'success', notes: 'Budget AED 4M' },
    { id: 2, date: '2026-07-16 10:25', phone: '+971 55 987 6543', duration: '45s', outcome: 'Not Interested', badge: 'danger', notes: 'Looking for off-plan' },
    { id: 3, date: '2026-07-16 10:15', phone: '+971 52 333 4444', duration: '1m 10s', outcome: 'Callback Requested', badge: 'warning', notes: 'Call tomorrow 5PM' },
    { id: 4, date: '2026-07-16 10:05', phone: '+971 56 111 2222', duration: '3m 05s', outcome: 'Interested', badge: 'blue', notes: 'Sent brochure via WhatsApp' }
];

let propertyPitchStats = {
    totalCalls: 1250,
    answered: 450,
    interested: 180,
    meetingsBooked: 45,
    whatsappConfirmed: 80,
    notInterested: {
        total: 270,
        otherProject: 120,
        selling: 50,
        neither: 100
    }
};

let openHouseStats = {
    totalCalls: 850,
    pickedUp: 310,
    notPickedUp: 540,
    saidYes: 85,
    saidNo: 225,
    detailsSentWhatsApp: {
        total: 110,
        interested: 30,
        notInterested: 80
    },
    wantsUpdates: 60,
    doNotContact: 15,
    callbackRequested: 40,
    showedUp: 35
};

// Webhook Handler for Retell AI
function handleRetellWebhook(req, res) {
    const payload = req.body || {};
    const timestamp = new Date().toISOString();
    const eventType = payload.event || payload.type || 'unknown_event';
    const callData = payload.call || payload;

    console.log(`[Retell Webhook Received] Event: ${eventType} at ${timestamp}`);

    const logEntry = {
        id: webhookLogs.length + 1,
        timestamp,
        event: eventType,
        call_id: callData.call_id || 'N/A',
        phone: callData.from_number || callData.user_number || callData.phone || 'Unknown',
        payload
    };

    // Keep last 100 logs
    webhookLogs.unshift(logEntry);
    if (webhookLogs.length > 100) webhookLogs.pop();

    // Dynamically update stats if it's a call event
    if (eventType === 'call_analyzed' || eventType === 'call_ended' || callData.call_analysis) {
        const analysis = callData.call_analysis || {};
        const customArgs = analysis.custom_analysis_data || payload.args || {};
        const userSentiment = analysis.user_sentiment || '';
        const isSuccessful = analysis.call_successful || customArgs.interested;

        propertyPitchStats.totalCalls += 1;
        propertyPitchStats.answered += 1;

        if (isSuccessful || userSentiment.toLowerCase() === 'positive' || customArgs.interested) {
            propertyPitchStats.interested += 1;
            if (customArgs.meeting_booked || customArgs.booking_date) {
                propertyPitchStats.meetingsBooked += 1;
            }
        } else {
            propertyPitchStats.notInterested.total += 1;
            if (customArgs.looking_for_other) {
                propertyPitchStats.notInterested.otherProject += 1;
            } else if (customArgs.looking_to_sell) {
                propertyPitchStats.notInterested.selling += 1;
            } else {
                propertyPitchStats.notInterested.neither += 1;
            }
        }

        // Add to call logs
        callLogs.unshift({
            id: callLogs.length + 1,
            date: new Date().toISOString().replace('T', ' ').substring(0, 16),
            phone: logEntry.phone,
            duration: callData.duration_ms ? `${Math.round(callData.duration_ms / 1000)}s` : '1m',
            outcome: isSuccessful ? 'Interested' : 'Not Interested',
            badge: isSuccessful ? 'success' : 'danger',
            notes: analysis.call_summary || customArgs.summary || 'Retell AI Call Completed'
        });
    }

    return res.status(200).json({
        status: 'success',
        message: 'Webhook received and processed by Retell AI endpoint',
        event: eventType,
        received_at: timestamp
    });
}

// Define Retell Webhook Endpoints
app.post('/webhook', handleRetellWebhook);
app.post('/api/webhook', handleRetellWebhook);
app.post('/api/retell-webhook', handleRetellWebhook);
app.post('/api/webhooks/retell', handleRetellWebhook);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Retell AI Webhook Server', time: new Date() });
});

// API Endpoints for Dashboard
app.get('/api/webhook-logs', (req, res) => {
    res.json({ status: 'success', total: webhookLogs.length, logs: webhookLogs });
});

app.get('/api/stats/property-pitch', (req, res) => {
    res.json(propertyPitchStats);
});

app.get('/api/stats/open-house', (req, res) => {
    res.json(openHouseStats);
});

app.get('/api/calls', (req, res) => {
    res.json(callLogs);
});

// Fallback HTML route for SPA / root navigation
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Retell Webhook Server running on port ${PORT}`);
    console.log(`👉 Webhook URL: http://localhost:${PORT}/api/retell-webhook or /webhook`);
});
