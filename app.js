// State
let clients = JSON.parse(localStorage.getItem('ecomghosts_clients') || '{}');
let currentClient = null;
let charts = {};

// DOM elements
const clientSelect = document.getElementById('clientSelect');
const startDateInput = document.getElementById('startDate');
const fileInput = document.getElementById('fileInput');
const emptyState = document.getElementById('emptyState');
const dashboard = document.getElementById('dashboard');
const summaryCards = document.getElementById('summaryCards');
const chartsGrid = document.getElementById('chartsGrid');
const postsTableBody = document.getElementById('postsTableBody');
const startDateGroup = document.getElementById('startDateGroup');
const deleteGroup = document.getElementById('deleteGroup');
const loader = document.getElementById('loader');

const METRIC_INSIGHTS = {
    'Impressions': {
        def: "Total visibility. The size of your potential audience and digital footprint.",
        benchmark: "Benchmark: >10% Monthly Growth",
        good: ["Algorithm trust is high.", "Content format is working.", "Doubling down on recent topics."],
        bad: ["Review posting time.", "Hook needs more urgency.", "Test a new content format."]
    },
    'Engagements': {
        def: "Total interactions. The definitive measure of how much people care.",
        benchmark: "Benchmark: ~2% of Impressions",
        good: ["High audience trust.", "Topics are resonating.", "Strong Calls to Action."],
        bad: ["Ask more questions.", "Replies need more depth.", "Content was too passive."]
    },
    'New Followers': {
        def: "Audience retention. The permanent asset that compounds future reach.",
        benchmark: "Target: 2-5% Monthly Growth",
        good: ["Profile conversion is high.", "Bio is clear and compelling.", "Reach is targeted correctly."],
        bad: ["Audit your Profile/Bio.", "Content may be off-niche.", "Add 'Follow' CTAs to comments."]
    },
    'Engagement Rate': {
        def: "Content efficiency. The truest measure of Content-Market Fit.",
        benchmark: "Industry Avg: 1.8% - 3.0%",
        good: ["Highly relevant audience.", "Quality over Quantity.", "Perfect topic alignment."],
        bad: ["Stop chasing vanity metrics.", "Focus on depth, not width.", "Cut 'filler' content."]
    }
};

// Initialize
function init() {
    Object.values(clients).forEach(hydrateClientData);
    updateClientDropdown();

    clientSelect.addEventListener('change', () => {
        const name = clientSelect.value;
        if (name && clients[name]) {
            selectClient(name);
        } else {
            currentClient = null;
            showEmptyState();
        }
    });

    startDateInput.addEventListener('change', () => {
        if (currentClient) {
            clients[currentClient].startDate = startDateInput.value;
            saveClients();
            renderDashboard();
        }
    });

    fileInput.addEventListener('change', handleFileUpload);
}

function hydrateClientData(client) {
    ['engagement', 'followers', 'topPosts'].forEach(key => {
        if (client[key]) {
            client[key].forEach(item => {
                if (item.date) {
                    item.date = new Date(item.date);
                }
            });
        }
    });
}

function saveClients() {
    localStorage.setItem('ecomghosts_clients', JSON.stringify(clients));
}

function updateClientDropdown() {
    const names = Object.keys(clients).sort();
    clientSelect.innerHTML = '<option value="">-- Select or upload new --</option>';
    names.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        clientSelect.appendChild(opt);
    });
}

function selectClient(name) {
    currentClient = name;
    clientSelect.value = name;
    startDateInput.value = clients[name].startDate || '';
    startDateGroup.style.display = 'flex';
    deleteGroup.style.display = 'flex';
    showDashboard();
    renderDashboard();
}

function deleteClient() {
    if (!currentClient) return;
    if (confirm(`Delete "${currentClient}" and all their data?`)) {
        delete clients[currentClient];
        saveClients();
        updateClientDropdown();
        currentClient = null;
        showEmptyState();
    }
}

function showEmptyState() {
    emptyState.classList.remove('hidden');
    dashboard.classList.add('hidden');
    startDateGroup.style.display = 'none';
    deleteGroup.style.display = 'none';
}

function showDashboard() {
    emptyState.classList.add('hidden');
    dashboard.classList.remove('hidden');
}

// Parse Excel file
async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    loader.classList.remove('hidden');

    try {
        const data = await parseExcel(file);
        const clientName = prompt('Enter client name:');
        if (!clientName || !clientName.trim()) {
            alert('Client name is required');
            return;
        }

        const name = clientName.trim();
        clients[name] = {
            ...data,
            startDate: clients[name]?.startDate || '',
            uploadedAt: new Date().toISOString()
        };
        saveClients();
        updateClientDropdown();
        selectClient(name);
    } catch (err) {
        alert('Error parsing file: ' + err.message);
        console.error(err);
    } finally {
        loader.classList.add('hidden');
    }

    e.target.value = '';
}

function parseExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                const requiredSheets = ['DISCOVERY', 'ENGAGEMENT'];
                const missingSheets = requiredSheets.filter(sheetName => !workbook.SheetNames.includes(sheetName));

                if (missingSheets.length > 0) {
                    reject(new Error(`Missing required sheets: ${missingSheets.join(', ')}`));
                    return;
                }

                const result = {
                    discovery: {},
                    engagement: [],
                    topPosts: [],
                    followers: [],
                    totalFollowers: 0,
                    demographics: []
                };

                // DISCOVERY
                if (workbook.SheetNames.includes('DISCOVERY')) {
                    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['DISCOVERY']);
                    sheet.forEach(row => {
                        const key = row['Overall Performance'];
                        const val = row[Object.keys(row)[1]];
                        if (key && val) result.discovery[key] = val;
                    });
                }

                // ENGAGEMENT
                if (workbook.SheetNames.includes('ENGAGEMENT')) {
                    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['ENGAGEMENT']);
                    result.engagement = sheet.map(row => ({
                        date: excelDateToJS(row['Date']),
                        impressions: row['Impressions'] || 0,
                        engagements: row['Engagements'] || 0
                    })).filter(r => r.date).sort((a, b) => a.date - b.date);
                }

                // FOLLOWERS
                if (workbook.SheetNames.includes('FOLLOWERS')) {
                    const raw = XLSX.utils.sheet_to_json(workbook.Sheets['FOLLOWERS'], { header: 1 });
                    if (raw[0] && raw[0][1]) {
                        result.totalFollowers = raw[0][1];
                    }
                    let headerIdx = raw.findIndex(r => r[0] === 'Date');
                    if (headerIdx >= 0) {
                        for (let i = headerIdx + 1; i < raw.length; i++) {
                            if (raw[i][0] && raw[i][1] !== undefined) {
                                result.followers.push({
                                    date: excelDateToJS(raw[i][0]),
                                    newFollowers: raw[i][1] || 0
                                });
                            }
                        }
                        result.followers = result.followers.filter(r => r.date).sort((a, b) => a.date - b.date);
                    }
                }

                // TOP POSTS - Fixed parsing
                if (workbook.SheetNames.includes('TOP POSTS')) {
                    const raw = XLSX.utils.sheet_to_json(workbook.Sheets['TOP POSTS'], { header: 1 });

                    // Find the header row (contains 'Post URL')
                    let headerIdx = -1;
                    let typeColIdx = -1;
                    for (let i = 0; i < raw.length; i++) {
                        const row = raw[i];
                        if (row && row[0] === 'Post URL') {
                            headerIdx = i;
                            // Find 'Type' or 'Post type' column
                            typeColIdx = row.findIndex(cell => cell === 'Type' || cell === 'Post type');
                            break;
                        }
                    }

                    // Start parsing from row after header
                    const startRow = headerIdx >= 0 ? headerIdx + 1 : 2;

                    for (let i = startRow; i < raw.length && result.topPosts.length < 50; i++) {
                        const row = raw[i];
                        if (row && row[0] && String(row[0]).includes('linkedin.com')) {
                            const postType = typeColIdx !== -1 && row[typeColIdx] ? String(row[typeColIdx]).trim() : 'Text';
                            result.topPosts.push({
                                url: row[0],
                                date: excelDateToJS(row[1]),
                                engagements: parseInt(row[2]) || 0,
                                impressions: parseInt(row[6]) || 0,
                                type: postType
                            });
                        }
                    }

                    // Sort by engagements descending
                    result.topPosts.sort((a, b) => b.engagements - a.engagements);
                }

                // DEMOGRAPHICS
                if (workbook.SheetNames.includes('DEMOGRAPHICS')) {
                    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['DEMOGRAPHICS']);
                    const jobTitlesData = sheet.filter(row => row['Top Demographics'] === 'Job titles' && row['Value'] && row['Percentage'] !== undefined);

                    result.demographics = jobTitlesData.slice(0, 8).map(row => ({
                        label: String(row['Value']),
                        percentage: parseFloat(String(row['Percentage']).replace('%', ''))
                    })).filter(item => item.label && !isNaN(item.percentage));
                }

                console.log('Parsed data:', result);
                resolve(result);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function excelDateToJS(val) {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'number') {
        // Excel date serial number
        return new Date((val - 25569) * 86400 * 1000);
    }
    if (typeof val === 'string') {
        const d = new Date(val);
        return isNaN(d) ? null : d;
    }
    return null;
}

// Render dashboard
function renderDashboard() {
    if (!currentClient || !clients[currentClient]) return;

    const data = clients[currentClient];
    const startDate = data.startDate ? new Date(data.startDate) : null;

    renderSummaryCards(data, startDate);
    renderCharts(data, startDate);
    renderDemographics(data.demographics);
    renderTopPosts(data.topPosts, startDate);
}

function formatNum(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.round(num).toLocaleString();
}

function calcBeforeAfter(data, startDate, key) {
    if (!data || data.length === 0 || !startDate) {
        return { before: 0, after: 0, change: 0 };
    }

    const before = data.filter(d => d.date < startDate);
    const after = data.filter(d => d.date >= startDate);

    const avgBefore = before.length > 0
        ? before.reduce((s, d) => s + (d[key] || 0), 0) / before.length
        : 0;
    const avgAfter = after.length > 0
        ? after.reduce((s, d) => s + (d[key] || 0), 0) / after.length
        : 0;

    const change = avgBefore > 0 ? ((avgAfter - avgBefore) / avgBefore) * 100 : 0;

    return { before: avgBefore, after: avgAfter, change };
}

function renderSummaryCards(data, startDate) {
    const totalImpressions = data.discovery['Impressions'] ||
        data.engagement.reduce((s, d) => s + d.impressions, 0);
    const totalEngagements = data.engagement.reduce((s, d) => s + d.engagements, 0);
    const totalFollowers = data.totalFollowers || 0;

    const impStats = calcBeforeAfter(data.engagement, startDate, 'impressions');
    const engStats = calcBeforeAfter(data.engagement, startDate, 'engagements');
    const folStats = calcBeforeAfter(data.followers, startDate, 'newFollowers');
    
    const engagementRateData = data.engagement.map(d => ({
        date: d.date,
        rate: d.impressions > 0 ? (d.engagements / d.impressions) * 100 : 0
    }));
    const engRateStats = calcBeforeAfter(engagementRateData, startDate, 'rate');
    const totalEngRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;

    summaryCards.innerHTML = `
        ${createSummaryCard('Total Impressions', totalImpressions, impStats, '/day')}
        ${createSummaryCard('Total Engagements', totalEngagements, engStats, '/day')}
        ${createSummaryCard('Total Followers', totalFollowers, folStats, '/day')}
        ${createSummaryCard('Engagement Rate', totalEngRate, engRateStats, '%')}
    `;
}

function createSummaryCard(title, total, stats, suffix) {
    const hasStartDate = stats.before !== 0 || stats.after !== 0;
    const changeClass = stats.change >= 0 ? 'positive' : 'negative';
    const arrow = stats.change >= 0 ? '↑' : '↓';
    const emoji = stats.change >= 0 ? '👻😎' : '👻😡';

    let insightKey;
    if (title === 'Total Impressions') insightKey = 'Impressions';
    else if (title === 'Total Engagements') insightKey = 'Engagements';
    else if (title === 'Total Followers') insightKey = 'New Followers';
    else if (title === 'Engagement Rate') insightKey = 'Engagement Rate';

    const insights = METRIC_INSIGHTS[insightKey];
    const definitionHtml = insights ? `<div class="metric-def">${insights.def}</div>` : '';

    let insightBoxHtml = '';
    if (hasStartDate && insights) {
        const advice = stats.change >= 0 ? insights.good : insights.bad;
        const boxClass = stats.change >= 0 ? 'positive' : 'negative';
        const adviceHtml = advice.map(item => `<li>${item}</li>`).join('');
        insightBoxHtml = `
            <div class="insight-box ${boxClass}">
                <ul>${adviceHtml}</ul>
            </div>
        `;
    }

    return `
        <div class="summary-card">
            <h3>${title}</h3>
            <div class="value">${formatNum(total)}${suffix === '%' ? '%' : ''}</div>
            ${insights && insights.benchmark ? `<div class="benchmark-badge">${insights.benchmark}</div>` : ''}
            ${hasStartDate ? `
            <div class="comparison">
                <div class="before">
                    <span class="label">Before</span>
                    <span class="num">${formatNum(stats.before)}${suffix}</span>
                </div>
                <div class="after">
                    <span class="label">After</span>
                    <span class="num">${formatNum(stats.after)}${suffix}</span>
                </div>
                <div class="change ${changeClass}">
                    ${arrow} ${Math.abs(stats.change).toFixed(1)}% ${emoji}
                </div>
            </div>` : '<div style="color:#666;font-size:13px;">Set start date to see comparison</div>'}
            ${definitionHtml}
            ${insightBoxHtml}
        </div>
    `;
}

function renderCharts(data, startDate) {
    // Destroy existing charts
    Object.values(charts).forEach(c => c.destroy());
    charts = {};

    const initialPeriod = 'weekly';
    const initialColor = getChartColor(initialPeriod);

    chartsGrid.innerHTML = `
        <div class="chart-card">
            <div class="chart-header">
                <h3 class="chart-title">
                    👻 Impressions
                </h3>
                <div class="time-toggle" data-chart="impressions">
                    <button data-period="daily">Daily</button>
                    <button data-period="weekly" class="active">Weekly</button>
                    <button data-period="monthly">Monthly</button>
                </div>
            </div>
            <div class="chart-container"><canvas id="impressionsChart"></canvas></div>
        </div>
        <div class="chart-card">
            <div class="chart-header">
                <h3 class="chart-title">
                    👻 Engagements
                </h3>
                <div class="time-toggle" data-chart="engagements">
                    <button data-period="daily">Daily</button>
                    <button data-period="weekly" class="active">Weekly</button>
                    <button data-period="monthly">Monthly</button>
                </div>
            </div>
            <div class="chart-container"><canvas id="engagementsChart"></canvas></div>
        </div>
        <div class="chart-card">
            <div class="chart-header">
                <h3 class="chart-title">
                    👻 New Followers
                </h3>
                <div class="time-toggle" data-chart="followers">
                    <button data-period="daily">Daily</button>
                    <button data-period="weekly" class="active">Weekly</button>
                    <button data-period="monthly">Monthly</button>
                </div>
            </div>
            <div class="chart-container"><canvas id="followersChart"></canvas></div>
        </div>
        <div class="chart-card">
            <div class="chart-header">
                <h3 class="chart-title">
                    👻 Engagement Rate
                </h3>
                <div class="time-toggle" data-chart="engagementRate">
                    <button data-period="daily">Daily</button>
                    <button data-period="weekly" class="active">Weekly</button>
                    <button data-period="monthly">Monthly</button>
                </div>
            </div>
            <div class="chart-container"><canvas id="engagementRateChart"></canvas></div>
        </div>
    `;

    // Setup toggle buttons
    document.querySelectorAll('.time-toggle').forEach(toggle => {
        const chartName = toggle.dataset.chart;
        toggle.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const period = btn.dataset.period;
                
                // Update active button styling for this specific chart only
                toggle.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update the specific chart
                updateChart(chartName, period);
            });
        });
    });

    // Calculate engagement rate data
    const engagementRateData = data.engagement.map(d => ({
        date: d.date,
        engagementRate: d.impressions > 0 ? (d.engagements / d.impressions) * 100 : 0
    }));

    // Create charts
    createChart('impressions', data.engagement, 'impressions', startDate, initialPeriod);
    createChart('engagements', data.engagement, 'engagements', startDate, initialPeriod);
    createChart('followers', data.followers, 'newFollowers', startDate, initialPeriod);
    createChart('engagementRate', engagementRateData, 'engagementRate', startDate, initialPeriod, (v) => v.toFixed(2) + '%');
}

function getChartColor(period) {
    switch (period) {
        case 'daily': return '#10b981'; // Green
        case 'weekly': return '#8b5cf6'; // Purple
        case 'monthly': return '#f97316'; // Orange
        default: return '#888';
    }
}

function aggregateData(data, period) {
    if (!data || data.length === 0) return { labels: [], values: [] };

    const getKey = (date) => {
        const d = new Date(date);
        if (period === 'daily') return d.toISOString().split('T')[0];
        if (period === 'weekly') {
            const startOfWeek = new Date(d);
            startOfWeek.setDate(d.getDate() - d.getDay());
            return startOfWeek.toISOString().split('T')[0];
        }
        if (period === 'monthly') {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
    };

    const grouped = {};
    data.forEach(item => {
        const key = getKey(item.date);
        if (!grouped[key]) grouped[key] = { sum: 0, count: 0 };
        Object.keys(item).forEach(k => {
            if (typeof item[k] === 'number') {
                grouped[key][k] = (grouped[key][k] || 0) + item[k];
            }
        });
    });

    const sorted = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
    return {
        labels: sorted.map(([k]) => k),
        data: sorted.map(([, v]) => v)
    };
}

function formatDateLabel(dateStr, period) {
    if (period === 'monthly') {
        const [y, m] = dateStr.split('-');
        return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function createChart(name, rawData, valueKey, startDate, period, tickCallback) {
    const canvas = document.getElementById(name + 'Chart');
    if (!canvas) return;

    const color = getChartColor(period);
    const agg = aggregateData(rawData, period);
    const labels = agg.labels.map(l => formatDateLabel(l, period));
    const values = agg.data.map(d => d[valueKey] || 0);

    // Find start date index for annotation
    let startIndex = -1;
    if (startDate) {
        const startStr = startDate.toISOString().split('T')[0];
        startIndex = agg.labels.findIndex(l => l >= startStr);
    }

    const annotations = {};
    if (startIndex >= 0) {
        annotations.startLine = {
            type: 'line',
            xMin: startIndex,
            xMax: startIndex,
            borderColor: '#f97316',
            borderWidth: 2,
            borderDash: [6, 4],
            label: {
                display: true,
                content: '👻 Started with EcomGhosts',
                position: 'start',
                backgroundColor: 'rgba(249, 115, 22, 0.9)',
                color: '#fff',
                font: { size: 11, weight: 'bold' }
            }
        };
    }

    charts[name] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: name,
                data: values,
                borderColor: color,
                backgroundColor: color + '33',
                fill: true,
                tension: 0.45,
                pointRadius: period === 'daily' ? 0 : 2,
                pointHoverRadius: 6,
                borderWidth: 2.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                annotation: { annotations }
            },
            scales: {
                x: {
                    grid: { color: '#333' },
                    ticks: { color: '#888', maxRotation: 45 }
                },
                y: {
                    grid: { color: '#333' },
                    ticks: {
                        color: '#888',
                        callback: tickCallback || formatNum
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });

    // Store metadata for updates
    charts[name]._rawData = rawData;
    charts[name]._valueKey = valueKey;
    charts[name]._startDate = startDate;
    charts[name]._tickCallback = tickCallback;
}

function updateChart(name, period) {
    const chart = charts[name];
    if (!chart) return;

    const rawData = chart._rawData;
    const valueKey = chart._valueKey;
    const startDate = chart._startDate;
    const tickCallback = chart._tickCallback;
    const color = getChartColor(period);

    const agg = aggregateData(rawData, period);
    const labels = agg.labels.map(l => formatDateLabel(l, period));
    const values = agg.data.map(d => d[valueKey] || 0);

    let startIndex = -1;
    if (startDate) {
        const startStr = startDate.toISOString().split('T')[0];
        startIndex = agg.labels.findIndex(l => l >= startStr);
    }

    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.data.datasets[0].pointRadius = period === 'daily' ? 0 : 2;
    chart.data.datasets[0].borderColor = color;
    chart.data.datasets[0].backgroundColor = color + '33';

    if (tickCallback) {
        chart.options.scales.y.ticks.callback = tickCallback;
    }

    if (startIndex >= 0) {
        chart.options.plugins.annotation.annotations = {
            startLine: {
                type: 'line',
                xMin: startIndex,
                xMax: startIndex,
                borderColor: '#f97316',
                borderWidth: 2,
                borderDash: [6, 4],
                label: {
                    display: true,
                    content: '👻 Started with EcomGhosts',
                    position: 'start',
                    backgroundColor: 'rgba(249, 115, 22, 0.9)',
                    color: '#fff',
                    font: { size: 11, weight: 'bold' }
                }
            }
        };
    } else {
        chart.options.plugins.annotation.annotations = {};
    }

    chart.update();
}

function renderTopPosts(posts, startDate) {
    console.log('Rendering top posts:', posts);

    const topPostsSection = document.getElementById('topPostsSection');

    // Remove any existing attribution note
    const existingNote = topPostsSection.querySelector('.attribution-note');
    if (existingNote) existingNote.remove();

    if (!posts || posts.length === 0) {
        postsTableBody.innerHTML = '<tr><td colspan="7" style="color:#888;text-align:center;padding:40px;">No post data available</td></tr>';
        return;
    }

    const today = new Date();
    const topTen = posts.slice(0, 10);

    // Count posts attributed to EcomGhosts (on or after start date)
    const attributedPosts = startDate ? topTen.filter(p => p.date && p.date >= startDate).length : 0;

    // Add attribution note if start date is set and there are attributed posts
    if (startDate && attributedPosts > 0) {
        const noteHTML = `
            <div class="attribution-note">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#f97316">
                    <path d="M12 2C7.58 2 4 5.58 4 10v10.5c0 .83.67 1.5 1.5 1.5s1.17-.41 1.5-1c.33.59.92 1 1.5 1s1.17-.41 1.5-1c.33.59.92 1 1.5 1s1.17-.41 1.5-1c.33.59.92 1 1.5 1s1.17-.41 1.5-1c.33.59.92 1 1.5 1s1.5-.67 1.5-1.5V10c0-4.42-3.58-8-8-8zm-2 11a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                </svg>
                <span class="attribution-count">${attributedPosts}</span> of ${topTen.length} top posts created <strong>after</strong> starting with EcomGhosts (${startDate.toLocaleDateString()})
            </div>
        `;
        const tableEl = topPostsSection.querySelector('.posts-table');
        tableEl.insertAdjacentHTML('beforebegin', noteHTML);
    }

    postsTableBody.innerHTML = topTen.map((post, i) => {
        // Extract activity ID from URL for display
        const activityMatch = post.url.match(/activity:(\d+)/);
        const activityId = activityMatch ? activityMatch[1] : 'N/A';
        const shortId = activityId.slice(-8); // Last 8 digits

        // Calculate days ago
        const daysAgo = post.date ? Math.floor((today - post.date) / (1000 * 60 * 60 * 24)) : null;
        const daysAgoText = daysAgo !== null ? (daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`) : '-';

        // Calculate engagement rate
        const engRate = post.impressions > 0 ? ((post.engagements / post.impressions) * 100).toFixed(2) : '0.00';

        // Format full numbers
        const fullImpressions = post.impressions.toLocaleString();
        const fullEngagements = post.engagements.toLocaleString();

        // Check if post is attributed to EcomGhosts
        const isAttributed = startDate && post.date && post.date >= startDate;
        const rowClass = isAttributed ? 'row-highlighted' : '';
        const badge = isAttributed ? `
            <span class="ghost-badge">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C7.58 2 4 5.58 4 10v10.5c0 .83.67 1.5 1.5 1.5s1.17-.41 1.5-1c.33.59.92 1 1.5 1s1.17-.41 1.5-1c.33.59.92 1 1.5 1s1.17-.41 1.5-1c.33.59.92 1 1.5 1s1.17-.41 1.5-1c.33.59.92 1 1.5 1s1.5-.67 1.5-1.5V10c0-4.42-3.58-8-8-8zm-2 11a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                </svg>
                EcomGhosts
            </span>
        ` : '';

        return `
                <tr class="${rowClass}">
                    <td>
                        <a href="${post.url}" target="_blank" rel="noopener">
                            👻 View Post →
                        </a>
                        <span class="post-id">ID: ...${shortId}</span>
                    </td>
                    <td>
                        <a href="${post.url}" target="_blank" rel="noopener" class="preview-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                            </svg>
                            Open
                        </a>
                    </td>
                    <td>
                        ${post.date ? post.date.toLocaleDateString() : '-'}
                        ${badge}
                    </td>
                    <td><span class="days-ago">${daysAgoText}</span></td>
                    <td><strong>${fullEngagements}</strong></td>
                    <td>${fullImpressions}</td>
                    <td><span class="eng-rate">${engRate}%</span></td>
                </tr>
            `}).join('');
}

function renderDemographics(demographics) {
    if (charts.demographics) {
        charts.demographics.destroy();
    }

    const container = document.getElementById('demographicsChartContainer');
    const canvas = document.getElementById('demographicsChart');
    if (!container || !canvas) return;

    // Clear previous state and re-add canvas
    container.innerHTML = '<canvas id="demographicsChart"></canvas>';
    const newCanvas = document.getElementById('demographicsChart');

    if (!demographics || demographics.length === 0) {
        container.innerHTML = '<div style="color:#888;text-align:center;padding:40px;">No audience job title data available</div>';
        return;
    }

    const labels = demographics.map(d => d.label);
    const data = demographics.map(d => d.percentage);

    charts.demographics = new Chart(newCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Job Title Percentage',
                data: data,
                backgroundColor: '#f97316',
                borderColor: '#f97316',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return (context.raw || 0).toFixed(2) + '%';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: '#333' },
                    ticks: {
                        color: '#888',
                        callback: function(value) { return value + '%'; }
                    }
                },
                y: {
                    grid: { color: 'transparent' },
                    ticks: { color: '#e0e0e0' }
                }
            }
        }
    });
}

// Init on load
init();