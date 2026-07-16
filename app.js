document.addEventListener('DOMContentLoaded', () => {
    // Dropdown Logic
    const campaignSelect = document.getElementById('campaign-select');
    const propertyPitchView = document.getElementById('property-pitch-view');
    const openHouseView = document.getElementById('open-house-view');

    campaignSelect.addEventListener('change', (e) => {
        if (e.target.value === 'property-pitch') {
            propertyPitchView.classList.add('active-view');
            openHouseView.classList.remove('active-view');
        } else {
            propertyPitchView.classList.remove('active-view');
            openHouseView.classList.add('active-view');
        }
    });

    // Chart.js Default styling for Dark Theme
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';

    // Chart instances (so we can destroy and re-create on refresh)
    let funnelChartInstance = null;
    let donutChartInstance = null;

    // ─── Fetch & Render Property Pitch Stats from Backend ───────────────────
    async function loadPropertyPitchStats() {
        try {
            const res = await fetch('/api/stats/property-pitch');
            const stats = await res.json();

            // KPI Cards
            document.getElementById('pp-total-calls').innerText = stats.totalCalls;
            document.getElementById('pp-answer-rate').innerText = `${stats.answerRate}% (${stats.answered})`;
            document.getElementById('pp-interested').innerText = `${stats.interestedRate}% (${stats.interested})`;
            document.getElementById('pp-meetings-booked').innerText = stats.meetingsBooked;
            document.getElementById('pp-not-interested').innerText = `${stats.notInterestedRate}% (${stats.notInterested})`;
            document.getElementById('pp-looking-other').innerText = `${stats.lookingOtherRate}% (${stats.lookingOther})`;
            document.getElementById('pp-looking-sell').innerText = `${stats.lookingToSellRate}% (${stats.lookingToSell})`;

            // Funnel Chart
            if (funnelChartInstance) funnelChartInstance.destroy();
            const funnelCtx = document.getElementById('pp-funnel-chart').getContext('2d');
            funnelChartInstance = new Chart(funnelCtx, {
                type: 'bar',
                data: {
                    labels: ['Answered', 'Interested', 'Meeting Booked', 'WA Confirmed'],
                    datasets: [{
                        label: 'Count',
                        data: [stats.funnel.answered, stats.funnel.interested, stats.funnel.meetingsBooked, stats.funnel.whatsappCaptured],
                        backgroundColor: [
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(168, 85, 247, 0.8)',
                            'rgba(234, 179, 8, 0.8)'
                        ],
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { beginAtZero: true } }
                }
            });

            // Donut Chart
            if (donutChartInstance) donutChartInstance.destroy();
            const donutCtx = document.getElementById('pp-donut-chart').getContext('2d');
            donutChartInstance = new Chart(donutCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Other Project', 'Looking to Sell', 'No Interest / Nurture'],
                    datasets: [{
                        data: [stats.lookingOther, stats.lookingToSell, stats.neither],
                        backgroundColor: [
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(148, 163, 184, 0.8)'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { legend: { position: 'bottom' } }
                }
            });

        } catch (err) {
            console.error('Error loading Property Pitch stats:', err);
        }
    }

    // ─── Fetch & Render Call Log Table from Backend ──────────────────────────
    async function loadCallLog() {
        try {
            const res = await fetch('/api/calls');
            const calls = await res.json();
            const tbody = document.getElementById('pp-call-log-body');
            tbody.innerHTML = '';

            if (calls.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No calls recorded yet. Waiting for Retell AI webhooks...</td></tr>';
                return;
            }

            calls.forEach(call => {
                const tr = document.createElement('tr');

                // Determine outcome and badge
                let outcome = 'Not Answered';
                let badge = 'danger';
                let notes = '';

                if (call.answered === 'yes') {
                    if (call.main_property === 'interested') {
                        if (call.meeting_booked === 'yes') {
                            outcome = 'Meeting Booked';
                            badge = 'success';
                            notes = `Meeting: ${call.meeting_date || ''} ${call.meeting_time || ''}`;
                            if (call.whatsapp_number) notes += ` | WA: ${call.whatsapp_number}`;
                        } else {
                            outcome = 'Interested';
                            badge = 'blue';
                        }
                    } else if (call.main_property === 'not interested') {
                        if (call.other_properties === 'yes') {
                            outcome = 'Looking for Other';
                            badge = 'warning';
                            notes = call.budget ? `Budget: ${call.budget}` : '';
                        } else if (call.to_sell === 'yes') {
                            outcome = 'Wants to Sell';
                            badge = 'warning';
                            const sellParts = [call.sell_type, call.sell_name, call.sell_bhk ? `${call.sell_bhk} BHK` : null, call.sell_location].filter(Boolean);
                            notes = sellParts.join(' | ');
                            if (call.sell_price) notes += ` | Price: ${call.sell_price}`;
                        } else {
                            outcome = 'Not Interested';
                            badge = 'danger';
                            notes = 'No further interest';
                        }
                    } else {
                        outcome = 'Answered';
                        badge = 'blue';
                    }
                } else {
                    outcome = 'Not Answered';
                    badge = 'danger';
                    notes = 'Call not picked up';
                }

                const dateStr = new Date(call.timestamp).toLocaleString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });

                tr.innerHTML = `
                    <td>${dateStr}</td>
                    <td>${call.call_id ? call.call_id.substring(0, 12) + '...' : 'N/A'}</td>
                    <td>—</td>
                    <td><span class="badge badge-${badge}">${outcome}</span></td>
                    <td style="color: var(--text-muted); font-size: 0.85rem;">${notes || '—'}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error loading call log:', err);
        }
    }

    // ─── Open House Stats (from backend — starts at 0 for now) ──────────────
    async function loadOpenHouseStats() {
        try {
            const res = await fetch('/api/stats/open-house');
            const stats = await res.json();

            document.getElementById('oh-total-calls').innerText = stats.totalCalls;
            document.getElementById('oh-picked-up').innerText = stats.pickedUp;
            document.getElementById('oh-not-picked-up').innerText = stats.notPickedUp;
            document.getElementById('oh-yes').innerText = stats.saidYes;
            document.getElementById('oh-no').innerText = stats.saidNo;

            document.getElementById('oh-details-sent').innerText = stats.detailsSentWhatsApp.total;
            document.getElementById('oh-details-interested').innerText = stats.detailsSentWhatsApp.interested;
            document.getElementById('oh-details-not-interested').innerText = stats.detailsSentWhatsApp.notInterested;

            document.getElementById('oh-wants-updates').innerText = stats.wantsUpdates;
            document.getElementById('oh-do-not-contact').innerText = stats.doNotContact;
            document.getElementById('oh-callback').innerText = stats.callbackRequested;
            document.getElementById('oh-showed-up').innerText = stats.showedUp;
        } catch (err) {
            console.error('Error loading Open House stats:', err);
        }
    }

    // ─── Initial Load ───────────────────────────────────────────────────────
    loadPropertyPitchStats();
    loadCallLog();
    loadOpenHouseStats();

    // ─── Auto-refresh every 15 seconds ──────────────────────────────────────
    setInterval(() => {
        loadPropertyPitchStats();
        loadCallLog();
    }, 15000);

});

// ─── Tab Switching (Dashboard / Calendar / Webhooks / Selling / Other / Callback / CRM / Transcripts)
function switchTab(tab) {
    const allViews = [
        'property-pitch-view', 'open-house-view', 'calendar-view', 
        'webhooks-view', 'selling-view', 'other-props-view', 
        'callback-view', 'crm-view', 'transcripts-view'
    ];
    const allNavs = [
        'nav-dashboard', 'nav-calendar', 'nav-webhooks', 
        'nav-selling', 'nav-other-props', 'nav-callback', 
        'nav-crm', 'nav-transcripts'
    ];
    const topHeader = document.querySelector('.top-header');

    // Hide everything
    allViews.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active-view');
    });
    allNavs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
    topHeader.style.display = 'none';

    if (tab === 'dashboard') {
        topHeader.style.display = 'flex';
        const campaignSelect = document.getElementById('campaign-select');
        if (campaignSelect.value === 'property-pitch') {
            document.getElementById('property-pitch-view').classList.add('active-view');
        } else {
            document.getElementById('open-house-view').classList.add('active-view');
        }
        document.getElementById('nav-dashboard').classList.add('active');
    } else if (tab === 'calendar') {
        document.getElementById('calendar-view').classList.add('active-view');
        document.getElementById('nav-calendar').classList.add('active');
        loadMeetings();
        renderCalendar();
    } else if (tab === 'webhooks') {
        document.getElementById('webhooks-view').classList.add('active-view');
        document.getElementById('nav-webhooks').classList.add('active');
        loadWebhookLogs();
    } else if (tab === 'selling') {
        document.getElementById('selling-view').classList.add('active-view');
        document.getElementById('nav-selling').classList.add('active');
        loadSellingLeads();
    } else if (tab === 'other-props') {
        document.getElementById('other-props-view').classList.add('active-view');
        document.getElementById('nav-other-props').classList.add('active');
        loadOtherPropsLeads();
    } else if (tab === 'callback') {
        document.getElementById('callback-view').classList.add('active-view');
        document.getElementById('nav-callback').classList.add('active');
        loadCallbackLeads();
    } else if (tab === 'crm') {
        document.getElementById('crm-view').classList.add('active-view');
        document.getElementById('nav-crm').classList.add('active');
        loadCRM();
    } else if (tab === 'transcripts') {
        document.getElementById('transcripts-view').classList.add('active-view');
        document.getElementById('nav-transcripts').classList.add('active');
        loadTranscripts();
    }
}

// ─── Calendar State ─────────────────────────────────────────────────────────
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();
let meetingsData = [];

function calendarPrev() {
    calendarMonth--;
    if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    renderCalendar();
}

function calendarNext() {
    calendarMonth++;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    renderCalendar();
}

function calendarToday() {
    calendarMonth = new Date().getMonth();
    calendarYear = new Date().getFullYear();
    renderCalendar();
}

function parseMeetingDate(dateStr) {
    // Retell sends DD/MM/YYYY
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return null;
}

function renderCalendar() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('calendar-month-label').innerText = `${monthNames[calendarMonth]} ${calendarYear}`;

    const container = document.getElementById('calendar-cells');
    container.innerHTML = '';

    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    // Monday = 0 offset
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

    // Build meeting lookup: "YYYY-M-D" -> [meetings]
    const meetingsByDate = {};
    meetingsData.forEach(m => {
        const d = parseMeetingDate(m.date);
        if (d) {
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!meetingsByDate[key]) meetingsByDate[key] = [];
            meetingsByDate[key].push(m);
        }
    });

    // Previous month fill
    const prevLastDay = new Date(calendarYear, calendarMonth, 0);
    for (let i = startOffset - 1; i >= 0; i--) {
        const cell = document.createElement('div');
        cell.className = 'cal-cell other-month';
        cell.innerHTML = `<div class="cal-date">${prevLastDay.getDate() - i}</div>`;
        container.appendChild(cell);
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const cell = document.createElement('div');
        const dateKey = `${calendarYear}-${calendarMonth}-${d}`;
        const isToday = dateKey === todayStr;
        cell.className = `cal-cell${isToday ? ' today' : ''}`;

        let inner = `<div class="cal-date">${d}</div>`;
        if (meetingsByDate[dateKey]) {
            meetingsByDate[dateKey].forEach(m => {
                inner += `<div class="cal-meeting">${m.time || '—'} · ${m.whatsapp_number || 'No WA'}</div>`;
            });
        }
        cell.innerHTML = inner;
        container.appendChild(cell);
    }

    // Next month fill (to complete the grid row)
    const totalCells = startOffset + lastDay.getDate();
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
        const cell = document.createElement('div');
        cell.className = 'cal-cell other-month';
        cell.innerHTML = `<div class="cal-date">${i}</div>`;
        container.appendChild(cell);
    }
}

// ─── Load Meetings from Backend ─────────────────────────────────────────────
async function loadMeetings() {
    try {
        const res = await fetch('/api/meetings');
        meetingsData = await res.json();

        const tbody = document.getElementById('meetings-table-body');
        tbody.innerHTML = '';

        if (meetingsData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No meetings booked yet.</td></tr>';
            renderCalendar();
            return;
        }

        meetingsData.forEach(m => {
            const tr = document.createElement('tr');
            const meetDate = parseMeetingDate(m.date);
            const isPast = meetDate && meetDate < new Date(new Date().setHours(0,0,0,0));

            tr.innerHTML = `
                <td>${m.date || '—'}</td>
                <td>${m.time || '—'}</td>
                <td>${m.whatsapp_number || '—'}</td>
                <td style="font-family: monospace; font-size: 0.8rem;">${m.call_id ? m.call_id.substring(0, 16) + '...' : '—'}</td>
                <td><span class="badge ${isPast ? 'badge-warning' : 'badge-success'}">${isPast ? 'Past' : 'Upcoming'}</span></td>
            `;
            tbody.appendChild(tr);
        });

        renderCalendar();
    } catch (err) {
        console.error('Error loading meetings:', err);
    }
}

// ─── Webhook Logs Fetcher ───────────────────────────────────────────────────
async function loadWebhookLogs() {
    try {
        const res = await fetch('/api/webhook-logs');
        const data = await res.json();
        const tbody = document.getElementById('webhook-log-body');
        tbody.innerHTML = '';

        if (!data.logs || data.logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No webhooks received yet.</td></tr>';
            return;
        }

        data.logs.forEach(log => {
            const tr = document.createElement('tr');
            const dateStr = new Date(log.timestamp).toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });

            const raw = log.raw || {};
            const eventName = raw.name || raw.event || 'unknown';
            const callId = raw.call_id || raw.call?.call_id || '—';
            const payloadStr = JSON.stringify(raw, null, 2);

            tr.innerHTML = `
                <td>${log.id}</td>
                <td>${dateStr}</td>
                <td><span class="badge badge-blue">${eventName}</span></td>
                <td style="font-family: monospace; font-size: 0.8rem;">${callId.length > 16 ? callId.substring(0, 16) + '...' : callId}</td>
                <td>
                    <details>
                        <summary style="cursor: pointer; color: var(--primary);">View Payload</summary>
                        <pre style="background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 0.5rem; margin-top: 0.5rem; overflow-x: auto; font-size: 0.75rem; max-height: 300px; overflow-y: auto; color: #22c55e;">${payloadStr}</pre>
                    </details>
                </td>
            `;
            tbody.appendChild(tr);
        });
// ─── Fetch Functions for New Tabs ─────────────────────────────────────────────
async function loadSellingLeads() {
    try {
        const res = await fetch('/api/selling');
        const data = await res.json();
        document.getElementById('sell-total').innerText = data.length;
        const tbody = document.getElementById('sell-table-body');
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;">No sellers yet.</td></tr>';
            return;
        }
        data.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${m.date || '—'}</td>
                <td><span class="badge badge-yellow">${m.sell_type || '—'}</span></td>
                <td>${m.sell_name || '—'}</td>
                <td>${m.sell_bhk || '—'}</td>
                <td>${m.sell_location || '—'}</td>
                <td>${m.sell_price ? 'AED ' + m.sell_price : '—'}</td>
                <td style="font-family: monospace; font-size: 0.8rem;">${m.call_id ? m.call_id.substring(0, 16) + '...' : '—'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error('Error loadSellingLeads:', e); }
}

async function loadOtherPropsLeads() {
    try {
        const res = await fetch('/api/other-props');
        const data = await res.json();
        document.getElementById('other-props-total').innerText = data.length;
        const tbody = document.getElementById('other-props-table-body');
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:2rem;">No leads for other properties yet.</td></tr>';
            return;
        }
        data.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${m.date || '—'}</td>
                <td>${m.budget || '—'}</td>
                <td style="font-family: monospace; font-size: 0.8rem;">${m.call_id ? m.call_id.substring(0, 16) + '...' : '—'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error('Error loadOtherPropsLeads:', e); }
}

async function loadCallbackLeads() {
    try {
        const res = await fetch('/api/callback');
        const data = await res.json();
        document.getElementById('callback-total').innerText = data.length;
        const tbody = document.getElementById('callback-table-body');
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:2rem;">No callbacks required.</td></tr>';
            return;
        }
        data.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${m.date || '—'}</td>
                <td style="font-family: monospace; font-size: 0.8rem;">${m.call_id ? m.call_id.substring(0, 16) + '...' : '—'}</td>
                <td><span class="badge badge-warning">Pending</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error('Error loadCallbackLeads:', e); }
}

async function loadCRM() {
    try {
        const res = await fetch('/api/calls');
        const data = await res.json();
        const tbody = document.getElementById('crm-table-body');
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:2rem;">No contacts yet.</td></tr>';
            return;
        }
        // sort newest first
        data.reverse().forEach(m => {
            const tr = document.createElement('tr');
            const dateStr = new Date(m.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            tr.innerHTML = `
                <td>${m.id}</td>
                <td>${dateStr}</td>
                <td>${m.answered === 'yes' ? '✅' : '❌'}</td>
                <td>${m.main_property === 'yes' ? '✅' : (m.main_property === 'no' ? '❌' : '—')}</td>
                <td>${m.meeting_booked === 'yes' ? '✅' : '—'}</td>
                <td>${m.whatsapp_number || '—'}</td>
                <td>${m.budget || '—'}</td>
                <td>${m.to_sell === 'yes' ? '✅' : '—'}</td>
                <td style="font-family: monospace; font-size: 0.8rem;">${m.call_id ? m.call_id.substring(0, 16) + '...' : '—'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error('Error loadCRM:', e); }
}

async function loadTranscripts() {
    try {
        const res = await fetch('/api/transcripts');
        const data = await res.json();
        const container = document.getElementById('transcripts-container');
        container.innerHTML = '';
        if (data.length === 0) {
            container.innerHTML = '<div class="glass-card" style="text-align:center;color:var(--text-muted);padding:2rem;">No transcripts available.</div>';
            return;
        }
        data.forEach(m => {
            const card = document.createElement('div');
            card.className = 'transcript-card';
            const dateStr = new Date(m.timestamp).toLocaleString('en-GB');
            card.innerHTML = `
                <div class="transcript-meta">
                    <div>
                        <strong>Call ID:</strong> <span style="font-family: monospace;">${m.call_id}</span>
                    </div>
                    <div style="color: var(--text-muted); font-size: 0.9rem;">${dateStr}</div>
                </div>
                <div class="transcript-text">${m.transcript || 'No transcript text available for this call.'}</div>
            `;
            container.appendChild(card);
        });
    } catch (e) { console.error('Error loadTranscripts:', e); }
}
