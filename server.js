const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Persistent Data Store (JSON file) ──────────────────────────────────────
const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('[Data] Error loading data file:', e.message);
    }
    return { calls: [], webhookLogs: [] };
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error('[Data] Error saving data file:', e.message);
    }
}

// Initialize data store
let store = loadData();

// ─── Serve Static Dashboard Files ───────────────────────────────────────────
app.use(express.static(__dirname));

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'WNN Realty - Retell AI Webhook Server', totalCalls: store.calls.length, time: new Date().toISOString() });
});

// ─── Retell AI Webhook Handler ──────────────────────────────────────────────
// Retell sends: { "call_id": "...", "name": "backend", "args": { ...14 fields... } }
function handleRetellWebhook(req, res) {
    const body = req.body || {};
    const timestamp = new Date().toISOString();

    console.log(`[Webhook] Received at ${timestamp}:`, JSON.stringify(body).substring(0, 500));

    // Log every raw webhook
    store.webhookLogs.unshift({
        id: store.webhookLogs.length + 1,
        timestamp,
        raw: body
    });
    if (store.webhookLogs.length > 200) store.webhookLogs.length = 200;

    // ── Handle the "backend" tool call from the VA ──
    const functionName = body.name;
    const args = body.args || {};
    const callId = body.call_id || `call_${Date.now()}`;

    if (functionName === 'unanswered') {
        const callRecord = {
            id: store.calls.length + 1,
            call_id: callId,
            timestamp,
            answered: 'no',
            main_property: null
        };
        store.calls.unshift(callRecord);
        saveData(store);
        return res.status(200).json({ status: 'success', message: 'unanswered tool logged' });
    }

    if (functionName === 'callback') {
        const callRecord = {
            id: store.calls.length + 1,
            call_id: callId,
            timestamp,
            answered: 'yes',
            callback_requested: 'yes',
            main_property: null,
            callback_date: args.Callback_date || null,
            callback_time: args.Callback_time || null
        };
        store.calls.unshift(callRecord);
        saveData(store);
        return res.status(200).json({ status: 'success', message: 'callback tool logged' });
    }

    if (functionName === 'backend' || args.Answered !== undefined || args.Main_property !== undefined) {
        // Ignore ghost calls where agent fires backend before the call even starts (all fields null)
        const allFieldsNull = !args.Answered && !args.Main_property && !args.Meeting_booked &&
            !args.Whatsapp_number && !args.Meeting_date && !args.Meeting_time &&
            !args.Other_properties && !args.Budget && !args.To_sell &&
            !args.Sell_type && !args.Sell_name && !args.Sell_BHK &&
            !args.Sell_location && !args.Sell_price;

        if (allFieldsNull) {
            console.log(`[Webhook] Ignored ghost call (all fields null) — call_id: ${callId}`);
            return res.status(200).json({ status: 'ignored', message: 'Ghost call ignored — all fields null' });
        }

        // Normalize Main_property to 'yes'/'no' for dashboard compatibility
        let normalizedMainProperty = args.Main_property || null;
        if (normalizedMainProperty === 'interested') normalizedMainProperty = 'yes';
        else if (normalizedMainProperty === 'not interested') normalizedMainProperty = 'no';

        // This is a valid tool call from the voice agent
        const callRecord = {
            id: store.calls.length + 1,
            call_id: callId,
            timestamp,
            // Core fields from the VA's backend call
            answered: 'yes', // Since backend is called, they must have answered
            callback_requested: 'no',
            customer_name: args.Name || args.Customer_name || args.Customer_Name || null,
            main_property: normalizedMainProperty,
            meeting_booked: args.Meeting_booked || null,
            whatsapp_number: args.Whatsapp_number || null,
            meeting_date: args.Meeting_date || null,
            meeting_time: args.Meeting_time || null,
            other_properties: args.Other_properties || null,
            budget: args.Budget || null,
            to_sell: args.To_sell || null,
            sell_type: args.Sell_type || null,
            sell_name: args.Sell_name || null,
            sell_bhk: args.Sell_BHK || null,
            sell_location: args.Sell_location || null,
            sell_price: args.Sell_price || null
        };

        store.calls.unshift(callRecord);
        saveData(store);

        console.log(`[Webhook] Call #${callRecord.id} processed. Answered: ${callRecord.answered}, Main Property: ${callRecord.main_property}`);

        return res.status(200).json({
            status: 'success',
            message: 'Call data received and stored',
            call_id: callId,
            call_number: callRecord.id
        });
    }

    // ── Handle post-call / call_ended / call_analyzed events from Retell ──
    if (body.event === 'call_ended' || body.event === 'call_analyzed') {
        console.log(`[Webhook] Retell event: ${body.event} for call ${body.call?.call_id || 'unknown'}`);
        
        // If it's the analyzed event, we can capture the recording URL
        if (body.event === 'call_analyzed' && body.call?.call_id) {
            const callId = body.call.call_id;
            const recordingUrl = body.call.recording_url;
            
            if (recordingUrl) {
                const existingCall = store.calls.find(c => c.call_id === callId);
                if (existingCall) {
                    existingCall.recording_url = recordingUrl;
                    console.log(`[Webhook] Attached recording_url to call ${callId}`);
                }
            }
        }

        saveData(store);
        return res.status(200).json({ status: 'success', message: `Event ${body.event} logged` });
    }

    // ── Fallback: unknown payload ──
    saveData(store);
    return res.status(200).json({ status: 'success', message: 'Webhook received (unrecognized format, logged for inspection)' });
}

// Register webhook endpoints
app.post('/webhook', handleRetellWebhook);
app.post('/api/webhook', handleRetellWebhook);
app.post('/api/retell-webhook', handleRetellWebhook);
app.post('/api/webhooks/retell', handleRetellWebhook);

// ─── API: Property Pitch Stats (Computed from real data) ────────────────────
app.get('/api/stats/property-pitch', (req, res) => {
    const calls = store.calls;

    const totalCalls = calls.length;
    const answeredCalls = calls.filter(c => c.answered === 'yes');
    const notAnswered = calls.filter(c => c.answered === 'no');
    const answered = answeredCalls.length;

    const interested = answeredCalls.filter(c => c.main_property === 'interested').length;
    const notInterested = answeredCalls.filter(c => c.main_property === 'not interested').length;

    const meetingsBooked = answeredCalls.filter(c => c.meeting_booked === 'yes').length;
    const whatsappCaptured = answeredCalls.filter(c => c.whatsapp_number && c.whatsapp_number !== 'null').length;

    const lookingOther = answeredCalls.filter(c => c.other_properties === 'yes').length;
    const lookingToSell = answeredCalls.filter(c => c.to_sell === 'yes').length;
    const neitherCount = notInterested - lookingOther - lookingToSell;

    res.json({
        totalCalls,
        answered,
        notAnswered: notAnswered.length,
        answerRate: totalCalls > 0 ? ((answered / totalCalls) * 100).toFixed(1) : '0.0',
        interested,
        interestedRate: answered > 0 ? ((interested / answered) * 100).toFixed(1) : '0.0',
        notInterested,
        notInterestedRate: answered > 0 ? ((notInterested / answered) * 100).toFixed(1) : '0.0',
        meetingsBooked,
        whatsappCaptured,
        lookingOther,
        lookingOtherRate: notInterested > 0 ? ((lookingOther / notInterested) * 100).toFixed(1) : '0.0',
        lookingToSell,
        lookingToSellRate: notInterested > 0 ? ((lookingToSell / notInterested) * 100).toFixed(1) : '0.0',
        neither: Math.max(0, neitherCount),
        neitherRate: notInterested > 0 ? ((Math.max(0, neitherCount) / notInterested) * 100).toFixed(1) : '0.0',
        // Funnel data
        funnel: {
            answered,
            interested,
            meetingsBooked,
            whatsappCaptured
        }
    });
});

// ─── API: Call Log ──────────────────────────────────────────────────────────
app.get('/api/calls', (req, res) => {
    res.json(store.calls);
});

// ─── API: Meetings (calls where meeting_booked = yes) ───────────────────────
app.get('/api/meetings', (req, res) => {
    const meetings = store.calls
        .filter(c => c.meeting_booked === 'yes' && c.meeting_date)
        .map(c => ({
            id: c.id,
            call_id: c.call_id,
            date: c.meeting_date,       // DD/MM/YYYY from Retell
            time: c.meeting_time,       // HH:MM 24h from Retell
            whatsapp_number: c.whatsapp_number,
            timestamp: c.timestamp
        }));
    res.json(meetings);
});

// ─── API: Selling (calls where to_sell = yes) ───────────────────────────────
app.get('/api/selling', (req, res) => {
    const selling = store.calls
        .filter(c => c.to_sell === 'yes')
        .map(c => ({
            id: c.id,
            call_id: c.call_id,
            date: new Date(c.timestamp).toLocaleDateString('en-GB'),
            sell_type: c.sell_type,
            sell_name: c.sell_name,
            sell_bhk: c.sell_bhk,
            sell_location: c.sell_location,
            sell_price: c.sell_price,
            timestamp: c.timestamp
        }));
    res.json(selling);
});

// ─── API: Other Properties (calls where other_properties = yes) ─────────────
app.get('/api/other-props', (req, res) => {
    const otherProps = store.calls
        .filter(c => c.other_properties === 'yes')
        .map(c => ({
            id: c.id,
            call_id: c.call_id,
            date: new Date(c.timestamp).toLocaleDateString('en-GB'),
            budget: c.budget,
            timestamp: c.timestamp
        }));
    res.json(otherProps);
});

// ─── API: Callbacks (for now, let's mock or filter calls that were not answered?)
app.get('/api/callback', (req, res) => {
    // Retell doesn't have a direct "callback" field in your prompt right now,
    // so we can use answered = no as a placeholder for callbacks.
    const callbacks = store.calls
        .filter(c => c.answered === 'no' || c.callback_requested === 'yes')
        .map(c => ({
            id: c.id,
            call_id: c.call_id,
            date: new Date(c.timestamp).toLocaleDateString('en-GB'),
            timestamp: c.timestamp
        }));
    res.json(callbacks);
});

// ─── API: Unanswered Leads ──────────────────────────────────────────────────
app.get('/api/unanswered', (req, res) => {
    const unanswered = store.calls
        .filter(c => c.answered === 'no' && c.callback_requested !== 'yes')
        .map(c => ({
            id: c.id,
            call_id: c.call_id,
            date: new Date(c.timestamp).toLocaleDateString('en-GB'),
            timestamp: c.timestamp
        }));
    res.json(unanswered);
});

// ─── API: Transcripts (placeholder, returns all calls) ──────────────────────
app.get('/api/transcripts', (req, res) => {
    const transcripts = store.calls
        .map(c => ({
            id: c.id,
            call_id: c.call_id,
            timestamp: c.timestamp,
            // Since Retell doesn't send transcript in the `backend` tool call,
            // we mock it or show a placeholder message.
            transcript: "Transcript data is currently unavailable in the webhook payload. You can view the full transcript in the Retell AI dashboard for call ID: " + c.call_id
        }));
    res.json(transcripts);
});

// ─── API: Raw Webhook Logs (for debugging) ──────────────────────────────────
app.get('/api/webhook-logs', (req, res) => {
    res.json({ total: store.webhookLogs.length, logs: store.webhookLogs });
});

// ─── API: Open House Stats (mock for now — agent not configured yet) ────────
app.get('/api/stats/open-house', (req, res) => {
    res.json({
        totalCalls: 0,
        pickedUp: 0,
        notPickedUp: 0,
        saidYes: 0,
        saidNo: 0,
        detailsSentWhatsApp: { total: 0, interested: 0, notInterested: 0 },
        wantsUpdates: 0,
        doNotContact: 0,
        callbackRequested: 0,
        showedUp: 0
    });
});

// ─── Fallback for SPA routing ───────────────────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 WNN Realty Webhook Server running on port ${PORT}`);
    console.log(`📡 Retell Webhook URL: /api/retell-webhook`);
    console.log(`📊 Total calls in store: ${store.calls.length}`);
});
