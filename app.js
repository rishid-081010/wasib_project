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

    // Mock Data for Property Pitch
    const ppStats = {
        totalCalls: 1250,
        answered: 450,
        interested: 180,
        meetingsBooked: 45,
        whatsappConfirmed: 80, // of interested people
        notInterested: {
            otherProject: 120,
            selling: 50,
            neither: 100
        }
    };

    // Update PP KPIs
    document.getElementById('pp-total-calls').innerText = ppStats.totalCalls;
    const answerRate = ((ppStats.answered / ppStats.totalCalls) * 100).toFixed(1);
    document.getElementById('pp-answer-rate').innerText = `${answerRate}% (${ppStats.answered})`;
    
    const intRate = ((ppStats.interested / ppStats.answered) * 100).toFixed(1);
    document.getElementById('pp-interested').innerText = `${intRate}% (${ppStats.interested})`;
    
    document.getElementById('pp-meetings-booked').innerText = ppStats.meetingsBooked;
    
    const notIntTotal = ppStats.notInterested.otherProject + ppStats.notInterested.selling + ppStats.notInterested.neither;
    const notIntRate = ((notIntTotal / ppStats.answered) * 100).toFixed(1);
    document.getElementById('pp-not-interested').innerText = `${notIntRate}% (${notIntTotal})`;
    
    const otherRate = ((ppStats.notInterested.otherProject / notIntTotal) * 100).toFixed(1);
    document.getElementById('pp-looking-other').innerText = `${otherRate}% (${ppStats.notInterested.otherProject})`;
    
    const sellRate = ((ppStats.notInterested.selling / notIntTotal) * 100).toFixed(1);
    document.getElementById('pp-looking-sell').innerText = `${sellRate}% (${ppStats.notInterested.selling})`;

    // Render Funnel Chart (Using Bar Chart as a funnel approximation)
    const funnelCtx = document.getElementById('pp-funnel-chart').getContext('2d');
    new Chart(funnelCtx, {
        type: 'bar',
        data: {
            labels: ['Answered', 'Interested', 'Meeting Booked', 'WA Confirmed'],
            datasets: [{
                label: 'Count',
                data: [ppStats.answered, ppStats.interested, ppStats.meetingsBooked, ppStats.whatsappConfirmed],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)', // blue
                    'rgba(34, 197, 94, 0.8)',  // green
                    'rgba(168, 85, 247, 0.8)', // purple
                    'rgba(234, 179, 8, 0.8)'   // yellow
                ],
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y', // horizontal bar chart
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true }
            }
        }
    });

    // Render Donut Chart
    const donutCtx = document.getElementById('pp-donut-chart').getContext('2d');
    new Chart(donutCtx, {
        type: 'doughnut',
        data: {
            labels: ['Other Project', 'Looking to Sell', 'No Interest / Nurture'],
            datasets: [{
                data: [ppStats.notInterested.otherProject, ppStats.notInterested.selling, ppStats.notInterested.neither],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)', // blue
                    'rgba(239, 68, 68, 0.8)',  // red
                    'rgba(148, 163, 184, 0.8)' // gray
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // Populate Call Log Table
    const mockLogs = [
        { date: '2026-07-15 10:30', phone: '+971 50 123 4567', duration: '2m 15s', outcome: 'Meeting Booked', badge: 'success', notes: 'Budget AED 4M' },
        { date: '2026-07-15 10:25', phone: '+971 55 987 6543', duration: '45s', outcome: 'Not Interested', badge: 'danger', notes: 'Looking for off-plan' },
        { date: '2026-07-15 10:15', phone: '+971 52 333 4444', duration: '1m 10s', outcome: 'Callback Requested', badge: 'warning', notes: 'Call tomorrow 5PM' },
        { date: '2026-07-15 10:05', phone: '+971 56 111 2222', duration: '3m 05s', outcome: 'Interested', badge: 'blue', notes: 'Sent brochure via WhatsApp' }
    ];

    const tbody = document.getElementById('pp-call-log-body');
    mockLogs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${log.date}</td>
            <td>${log.phone}</td>
            <td>${log.duration}</td>
            <td><span class="badge badge-${log.badge}">${log.outcome}</span></td>
            <td style="color: var(--text-muted); font-size: 0.85rem;">${log.notes}</td>
        `;
        tbody.appendChild(tr);
    });


    // Mock Data for Open House Invitation
    const ohStats = {
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
        showedUp: 35 // updated post-event
    };

    document.getElementById('oh-total-calls').innerText = ohStats.totalCalls;
    document.getElementById('oh-picked-up').innerText = ohStats.pickedUp;
    document.getElementById('oh-not-picked-up').innerText = ohStats.notPickedUp;
    document.getElementById('oh-yes').innerText = ohStats.saidYes;
    document.getElementById('oh-no').innerText = ohStats.saidNo;
    
    document.getElementById('oh-details-sent').innerText = ohStats.detailsSentWhatsApp.total;
    document.getElementById('oh-details-interested').innerText = ohStats.detailsSentWhatsApp.interested;
    document.getElementById('oh-details-not-interested').innerText = ohStats.detailsSentWhatsApp.notInterested;
    
    document.getElementById('oh-wants-updates').innerText = ohStats.wantsUpdates;
    document.getElementById('oh-do-not-contact').innerText = ohStats.doNotContact;
    document.getElementById('oh-callback').innerText = ohStats.callbackRequested;
    document.getElementById('oh-showed-up').innerText = ohStats.showedUp;

});
