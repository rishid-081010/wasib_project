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

// ─── Tab Switching (Dashboard vs Webhooks) ──────────────────────────────────
function switchTab(tab) {
    const dashboardViews = document.querySelectorAll('#property-pitch-view, #open-house-view');
    const webhooksView = document.getElementById('webhooks-view');
    const topHeader = document.querySelector('.top-header');
    const navDashboard = document.getElementById('nav-dashboard');
    const navWebhooks = document.getElementById('nav-webhooks');

    if (tab === 'dashboard') {
        // Show dashboard content
        topHeader.style.display = 'flex';
        const campaignSelect = document.getElementById('campaign-select');
        if (campaignSelect.value === 'property-pitch') {
            document.getElementById('property-pitch-view').classList.add('active-view');
            document.getElementById('open-house-view').classList.remove('active-view');
        } else {
            document.getElementById('property-pitch-view').classList.remove('active-view');
            document.getElementById('open-house-view').classList.add('active-view');
        }
        webhooksView.classList.remove('active-view');

        navDashboard.classList.add('active');
        navWebhooks.classList.remove('active');
    } else if (tab === 'webhooks') {
        // Hide dashboard, show webhooks
        topHeader.style.display = 'none';
        document.getElementById('property-pitch-view').classList.remove('active-view');
        document.getElementById('open-house-view').classList.remove('active-view');
        webhooksView.classList.add('active-view');

        navDashboard.classList.remove('active');
        navWebhooks.classList.add('active');

        loadWebhookLogs();
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
    } catch (err) {
        console.error('Error loading webhook logs:', err);
    }
}
