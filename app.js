// ============================================================================
// AUTHENTICATION SYSTEM
// ============================================================================

let users = JSON.parse(localStorage.getItem('ecomghosts_users') || '{}');
let currentUser = null;

// Initialize default admin if no users exist
if (Object.keys(users).length === 0) {
    users = {
        'admin': {
            password: 'admin123',
            role: 'admin',
            clients: [] // Empty means access to all
        }
    };
    localStorage.setItem('ecomghosts_users', JSON.stringify(users));
}

// Check for existing session
const sessionUser = sessionStorage.getItem('ecomghosts_session');
if (sessionUser && users[sessionUser]) {
    currentUser = sessionUser;
}

// DOM elements - Auth (will be initialized on load)
let loginScreen, loginForm, loginUsername, loginPassword, loginError;

// Setup authentication after DOM is ready
function setupAuth() {
    loginScreen = document.getElementById('loginScreen');
    loginForm = document.getElementById('loginForm');
    loginUsername = document.getElementById('loginUsername');
    loginPassword = document.getElementById('loginPassword');
    loginError = document.getElementById('loginError');

    // Login handler
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = loginUsername.value.trim();
            const password = loginPassword.value;

            if (users[username] && users[username].password === password) {
                currentUser = username;
                sessionStorage.setItem('ecomghosts_session', username);
                loginScreen.classList.add('hidden');
                init();
            } else {
                loginError.textContent = 'Invalid username or password';
                loginError.classList.remove('hidden');
            }
        });
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to log out?')) {
        currentUser = null;
        sessionStorage.removeItem('ecomghosts_session');
        location.reload();
    }
}

// Check if current user is admin
function isAdmin() {
    return currentUser && users[currentUser]?.role === 'admin';
}

// Check if user has access to a client
function hasClientAccess(clientName) {
    if (!currentUser) return false;
    const user = users[currentUser];
    if (user.role === 'admin') return true; // Admin sees all
    return user.clients && user.clients.includes(clientName);
}

// Get accessible clients for current user
function getAccessibleClients() {
    if (!currentUser) return [];
    const user = users[currentUser];
    if (user.role === 'admin') return Object.keys(clients); // Admin sees all
    return Object.keys(clients).filter(name => user.clients && user.clients.includes(name));
}

// ============================================================================
// STATE & ORIGINAL FUNCTIONALITY
// ============================================================================

let clients = JSON.parse(localStorage.getItem('ecomghosts_clients') || '{}');
let charts = {};
let currentClient = null;

// DOM elements (will be initialized in init())
let clientSelect, startDateInput, fileInput, emptyState, dashboard, summaryCards, chartsGrid, postsTableBody, startDateGroup, deleteGroup, loader;

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
    // Initialize DOM elements
    clientSelect = document.getElementById('clientSelect');
    startDateInput = document.getElementById('startDate');
    fileInput = document.getElementById('fileInput');
    emptyState = document.getElementById('emptyState');
    dashboard = document.getElementById('dashboard');
    summaryCards = document.getElementById('summaryCards');
    chartsGrid = document.getElementById('chartsGrid');
    postsTableBody = document.getElementById('postsTableBody');
    startDateGroup = document.getElementById('startDateGroup');
    deleteGroup = document.getElementById('deleteGroup');
    loader = document.getElementById('loader');

    // If not logged in, show login screen
    if (!currentUser) {
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) loginScreen.classList.remove('hidden');
        return;
    }

    Object.values(clients).forEach(hydrateClientData);
    updateClientDropdown();
    updateHeader();

    clientSelect.addEventListener('change', () => {
        const name = clientSelect.value;
        if (name && clients[name] && hasClientAccess(name)) {
            selectClient(name);
        } else {
            currentClient = null;
            // Admin sees mission control, users see empty state
            if (isAdmin()) {
                renderAdminMissionControl();
            } else {
                showEmptyState();
            }
        }
    });

    startDateInput.addEventListener('change', () => {
        if (currentClient && hasClientAccess(currentClient)) {
            clients[currentClient].startDate = startDateInput.value;
            saveClients();
            renderDashboard();
        }
    });

    fileInput.addEventListener('change', handleFileUpload);

    // Auto-select first client for non-admin users
    if (!isAdmin()) {
        console.log('User is not admin, checking clients...');
        const accessibleClients = getAccessibleClients();
        if (accessibleClients.length > 0) {
            selectClient(accessibleClients[0]);
        } else {
            showEmptyState();
        }
    } else {
        // Admin: Show mission control when no client selected
        console.log('User is admin, currentClient:', currentClient);
        console.log('Rendering mission control...');
        renderAdminMissionControl();
    }
}

function updateHeader() {
    // Add logout button and user management to header
    const controls = document.querySelector('.controls');
    if (!controls) {
        console.error('Controls element not found');
        return;
    }

    // Remove existing auth controls
    const existingLogout = document.getElementById('logoutBtn');
    const existingUserMgmt = document.getElementById('userMgmtBtn');
    if (existingLogout) existingLogout.remove();
    if (existingUserMgmt) existingUserMgmt.remove();

    // Hide/show client select and related controls based on role
    // Find control groups by checking their children instead of :has() selector
    const controlGroups = document.querySelectorAll('.controls .control-group');
    let clientSelectGroup = null;
    let uploadGroup = null;

    controlGroups.forEach(group => {
        if (group.querySelector('#clientSelect')) clientSelectGroup = group;
        if (group.querySelector('#fileInput')) uploadGroup = group;
    });

    const startDateGroupEl = document.getElementById('startDateGroup');
    const deleteGroupEl = document.getElementById('deleteGroup');

    if (!isAdmin()) {
        // Hide client select and upload for regular users
        if (clientSelectGroup) clientSelectGroup.style.display = 'none';
        if (uploadGroup) uploadGroup.style.display = 'none';
    } else {
        // Show for admin
        if (clientSelectGroup) clientSelectGroup.style.display = 'flex';
        if (uploadGroup) uploadGroup.style.display = 'flex';
    }

    // Add user management button (admin only)
    if (isAdmin()) {
        const userMgmtGroup = document.createElement('div');
        userMgmtGroup.className = 'control-group';
        userMgmtGroup.style.alignSelf = 'flex-end';
        userMgmtGroup.id = 'userMgmtBtn';
        userMgmtGroup.innerHTML = `
            <button class="btn btn-purple" onclick="openUserManagement()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                Manage Users
            </button>
        `;
        controls.appendChild(userMgmtGroup);
    }

    // Add logout button
    const logoutGroup = document.createElement('div');
    logoutGroup.className = 'control-group';
    logoutGroup.style.alignSelf = 'flex-end';
    logoutGroup.id = 'logoutBtn';
    logoutGroup.innerHTML = `
        <button class="btn logout-btn" onclick="logout()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            Logout (${currentUser})
        </button>
    `;
    controls.appendChild(logoutGroup);
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
    const accessibleClients = getAccessibleClients();
    clientSelect.innerHTML = '<option value="">-- Select or upload new --</option>';
    accessibleClients.sort().forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        clientSelect.appendChild(opt);
    });
}

function selectClient(name) {
    if (!hasClientAccess(name)) {
        alert('You do not have access to this client');
        return;
    }
    currentClient = name;
    clientSelect.value = name;
    startDateInput.value = clients[name].startDate || '';

    // Show start date for both admin and users
    startDateGroup.style.display = 'flex';

    // Make start date read-only for regular users
    const startDateLabel = document.getElementById('startDateLabel');
    if (!isAdmin()) {
        startDateInput.setAttribute('readonly', true);
        startDateInput.style.cursor = 'not-allowed';
        startDateInput.style.opacity = '0.7';
        if (startDateLabel) {
            startDateLabel.textContent = 'Client Start Date (Read-Only)';
        }
    } else {
        startDateInput.removeAttribute('readonly');
        startDateInput.style.cursor = 'text';
        startDateInput.style.opacity = '1';
        if (startDateLabel) {
            startDateLabel.textContent = 'Client Start Date';
        }
    }

    // Only show delete button for admin
    deleteGroup.style.display = isAdmin() ? 'flex' : 'none';

    showDashboard();
    renderDashboard();
}

function deleteClient() {
    if (!currentClient || !isAdmin()) return;
    if (confirm(`Delete "${currentClient}" and all their data?`)) {
        // Also remove from user assignments
        Object.values(users).forEach(user => {
            if (user.clients && user.clients.includes(currentClient)) {
                user.clients = user.clients.filter(c => c !== currentClient);
            }
        });
        localStorage.setItem('ecomghosts_users', JSON.stringify(users));

        delete clients[currentClient];
        saveClients();
        updateClientDropdown();
        currentClient = null;

        // Admin returns to mission control
        renderAdminMissionControl();
    }
}

function showEmptyState() {
    startDateGroup.style.display = 'none';
    deleteGroup.style.display = 'none';

    // Show different content for admin vs regular user
    if (isAdmin()) {
        // Admin sees mission control instead of empty state
        emptyState.classList.add('hidden');
        renderAdminMissionControl();
    } else {
        // Regular user sees empty state
        dashboard.classList.add('hidden');
        emptyState.classList.remove('hidden');
    }
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
            loader.classList.add('hidden');
            return;
        }

        const name = clientName.trim();
        clients[name] = {
            ...data,
            startDate: clients[name]?.startDate || '',
            uploadedAt: new Date().toISOString()
        };
        saveClients();

        // If user is not admin, automatically assign this client to them
        if (!isAdmin()) {
            if (!users[currentUser].clients) {
                users[currentUser].clients = [];
            }
            if (!users[currentUser].clients.includes(name)) {
                users[currentUser].clients.push(name);
                localStorage.setItem('ecomghosts_users', JSON.stringify(users));
            }
        }

        updateClientDropdown();
        selectClient(name);

        // If admin uploaded, refresh mission control after closing client view
        // (They can return to mission control via dropdown)
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

                // TOP POSTS
                if (workbook.SheetNames.includes('TOP POSTS')) {
                    const raw = XLSX.utils.sheet_to_json(workbook.Sheets['TOP POSTS'], { header: 1 });

                    let headerIdx = -1;
                    for (let i = 0; i < raw.length; i++) {
                        const row = raw[i];
                        if (row && row[0] === 'Post URL') {
                            headerIdx = i;
                            break;
                        }
                    }

                    const startRow = headerIdx >= 0 ? headerIdx + 1 : 2;

                    for (let i = startRow; i < raw.length && result.topPosts.length < 50; i++) {
                        const row = raw[i];
                        if (row && row[0] && String(row[0]).includes('linkedin.com')) {
                            result.topPosts.push({
                                url: row[0],
                                date: excelDateToJS(row[1]),
                                engagements: parseInt(row[2]) || 0,
                                impressions: parseInt(row[6]) || 0
                            });
                        }
                    }

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
    const emoji = stats.change >= 0 ? ' 😎' : '😡';

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
    Object.values(charts).forEach(c => c.destroy());
    charts = {};

    const initialPeriod = 'weekly';

    chartsGrid.innerHTML = `
        <div class="chart-card">
            <div class="chart-header">
                <h3 class="chart-title">👻 Impressions</h3>
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
                <h3 class="chart-title">👻 Engagements</h3>
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
                <h3 class="chart-title">👻 New Followers</h3>
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
                <h3 class="chart-title">👻 Engagement Rate</h3>
                <div class="time-toggle" data-chart="engagementRate">
                    <button data-period="daily">Daily</button>
                    <button data-period="weekly" class="active">Weekly</button>
                    <button data-period="monthly">Monthly</button>
                </div>
            </div>
            <div class="chart-container"><canvas id="engagementRateChart"></canvas></div>
        </div>
    `;

    document.querySelectorAll('.time-toggle').forEach(toggle => {
        const chartName = toggle.dataset.chart;
        toggle.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const period = btn.dataset.period;
                toggle.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateChart(chartName, period);
            });
        });
    });

    const engagementRateData = data.engagement.map(d => ({
        date: d.date,
        engagementRate: d.impressions > 0 ? (d.engagements / d.impressions) * 100 : 0
    }));

    createChart('impressions', data.engagement, 'impressions', startDate, initialPeriod);
    createChart('engagements', data.engagement, 'engagements', startDate, initialPeriod);
    createChart('followers', data.followers, 'newFollowers', startDate, initialPeriod);
    createChart('engagementRate', engagementRateData, 'engagementRate', startDate, initialPeriod, (v) => v.toFixed(2) + '%');
}

function getChartColor(period) {
    switch (period) {
        case 'daily': return '#10b981';
        case 'weekly': return '#8b5cf6';
        case 'monthly': return '#f97316';
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
    const topPostsSection = document.getElementById('topPostsSection');

    const existingNote = topPostsSection.querySelector('.attribution-note');
    if (existingNote) existingNote.remove();

    if (!posts || posts.length === 0) {
        postsTableBody.innerHTML = '<tr><td colspan="7" style="color:#888;text-align:center;padding:40px;">No post data available</td></tr>';
        return;
    }

    const today = new Date();
    const topTen = posts.slice(0, 10);

    const attributedPosts = startDate ? topTen.filter(p => p.date && p.date >= startDate).length : 0;

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
        const activityMatch = post.url.match(/activity:(\d+)/);
        const activityId = activityMatch ? activityMatch[1] : 'N/A';
        const shortId = activityId.slice(-8);

        const daysAgo = post.date ? Math.floor((today - post.date) / (1000 * 60 * 60 * 24)) : null;
        const daysAgoText = daysAgo !== null ? (daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`) : '-';

        const engRate = post.impressions > 0 ? ((post.engagements / post.impressions) * 100).toFixed(2) : '0.00';

        const fullImpressions = post.impressions.toLocaleString();
        const fullEngagements = post.engagements.toLocaleString();

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
            `;
    }).join('');
}

function renderDemographics(demographics) {
    if (charts.demographics) {
        charts.demographics.destroy();
    }

    const container = document.getElementById('demographicsChartContainer');
    const canvas = document.getElementById('demographicsChart');
    if (!container || !canvas) return;

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

// ============================================================================
// ADMIN MISSION CONTROL
// ============================================================================

function renderAdminMissionControl() {
    console.log('renderAdminMissionControl called');
    console.log('emptyState element:', emptyState);
    console.log('dashboard element:', dashboard);

    const allClients = Object.keys(clients).sort();
    const allUsers = Object.entries(users);

    // Hide empty state and show dashboard
    emptyState.classList.add('hidden');
    console.log('emptyState hidden');

    // Use the dashboard div for mission control
    dashboard.innerHTML = `
        <div style="margin-bottom: 32px;">
            <h1 style="font-size: 32px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#f97316">
                    <path d="M12 2C7.58 2 4 5.58 4 10v10.5c0 .83.67 1.5 1.5 1.5s1.17-.41 1.5-1c.33.59.92 1 1.5 1s1.17-.41 1.5-1c.33.59.92 1 1.5 1s1.17-.41 1.5-1c.33.59.92 1 1.5 1s1.17-.41 1.5-1c.33.59.92 1 1.5 1s1.5-.67 1.5-1.5V10c0-4.42-3.58-8-8-8zm-2 11a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                </svg>
                Mission Control
            </h1>
            <p style="color: #888;">Admin overview of all clients and users</p>
        </div>

        <div class="summary-cards" style="margin-bottom: 32px;">
            <div class="summary-card">
                <h3>Total Clients</h3>
                <div class="value">${allClients.length}</div>
                <div style="color:#888;font-size:13px;">Active client accounts</div>
            </div>
            <div class="summary-card">
                <h3>Total Users</h3>
                <div class="value">${allUsers.length}</div>
                <div style="color:#888;font-size:13px;">
                    ${allUsers.filter(([u, data]) => data.role === 'admin').length} admin,
                    ${allUsers.filter(([u, data]) => data.role === 'user').length} regular
                </div>
            </div>
            <div class="summary-card">
                <h3>Quick Actions</h3>
                <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">
                    <button class="btn" onclick="document.getElementById('fileInput').click()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/>
                        </svg>
                        Upload Client Data
                    </button>
                    <button class="btn btn-purple" onclick="openUserManagement()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                        Manage Users
                    </button>
                </div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 24px;">
            <!-- Clients Section -->
            <div class="chart-card">
                <div class="chart-header">
                    <h3 class="chart-title">📊 All Clients</h3>
                </div>
                ${allClients.length === 0 ? `
                    <div style="color:#888;text-align:center;padding:40px;">
                        No clients yet. Upload LinkedIn data to get started.
                    </div>
                ` : `
                    <div style="max-height: 500px; overflow-y: auto;">
                        <table class="posts-table">
                            <thead>
                                <tr>
                                    <th>Client Name</th>
                                    <th>Uploaded</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${allClients.map((clientName, idx) => {
                                    const client = clients[clientName];
                                    const uploadDate = client.uploadedAt ? new Date(client.uploadedAt).toLocaleDateString() : 'Unknown';
                                    return `
                                        <tr>
                                            <td><strong>${clientName}</strong></td>
                                            <td style="color:#888;font-size:13px;">${uploadDate}</td>
                                            <td>
                                                <button class="btn btn-small" data-client-name="${clientName}" data-action="view-client">
                                                    View Dashboard
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>

            <!-- Users Section -->
            <div class="chart-card">
                <div class="chart-header">
                    <h3 class="chart-title">👥 All Users</h3>
                </div>
                <div style="max-height: 500px; overflow-y: auto;">
                    <table class="posts-table">
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Role</th>
                                <th>Clients</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allUsers.map(([username, user]) => {
                                const roleClass = user.role === 'admin' ? 'badge-admin' : 'badge-user';
                                const clientCount = user.role === 'admin' ? 'All' : (user.clients?.length || 0);
                                return `
                                    <tr>
                                        <td><strong>${username}</strong></td>
                                        <td><span class="badge ${roleClass}">${user.role}</span></td>
                                        <td style="color:#888;font-size:13px;">${clientCount}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    dashboard.classList.remove('hidden');
    emptyState.classList.add('hidden');

    // Add event listeners for View Dashboard buttons
    document.querySelectorAll('[data-action="view-client"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const clientName = btn.getAttribute('data-client-name');
            if (clientName) {
                selectClient(clientName);
            }
        });
    });
}

// ============================================================================
// USER MANAGEMENT (ADMIN ONLY)
// ============================================================================

function openUserManagement() {
    if (!isAdmin()) return;

    const userMgmtHTML = `
        <div id="userMgmtModal" class="modal">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>👥 User Management</h3>
                    <button class="close-modal" onclick="closeUserManagement()">×</button>
                </div>
                <button class="btn" onclick="openAddUserForm()" style="margin-bottom: 16px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                    Add New User
                </button>
                <table class="users-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Client Access</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="usersTableBody"></tbody>
                </table>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', userMgmtHTML);
    renderUsersTable();
}

function closeUserManagement() {
    const modal = document.getElementById('userMgmtModal');
    if (modal) modal.remove();
}

function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    tbody.innerHTML = Object.entries(users).map(([username, user]) => {
        const roleClass = user.role === 'admin' ? 'badge-admin' : 'badge-user';
        const clientsText = user.role === 'admin' ? 'All Clients' : (user.clients && user.clients.length > 0 ? user.clients.join(', ') : 'No clients assigned');

        return `
            <tr>
                <td><strong>${username}</strong></td>
                <td><span class="badge ${roleClass}">${user.role}</span></td>
                <td style="font-size: 12px; color: #888;">${clientsText}</td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick='editUser("${username}")'>Edit</button>
                    ${username !== 'admin' ? `<button class="btn btn-small btn-danger" onclick='deleteUser("${username}")'>Delete</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function openAddUserForm() {
    const formHTML = `
        <div id="userFormModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New User</h3>
                    <button class="close-modal" onclick="closeUserForm()">×</button>
                </div>
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="newUsername" placeholder="john@example.com">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="newPassword" placeholder="Enter password">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select id="newRole" onchange="toggleClientSelection()">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div class="form-group" id="clientSelectionGroup">
                    <label>Assign Clients</label>
                    <div class="client-checklist" id="clientChecklist"></div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeUserForm()">Cancel</button>
                    <button class="btn" onclick="saveNewUser()">Create User</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', formHTML);
    renderClientChecklist();
}

function editUser(username) {
    const user = users[username];
    if (!user) return;

    const formHTML = `
        <div id="userFormModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit User: ${username}</h3>
                    <button class="close-modal" onclick="closeUserForm()">×</button>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="editPassword" placeholder="Enter new password (leave blank to keep current)">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select id="editRole" onchange="toggleClientSelection()">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                <div class="form-group" id="clientSelectionGroup" style="${user.role === 'admin' ? 'display:none;' : ''}">
                    <label>Assign Clients</label>
                    <div class="client-checklist" id="clientChecklist"></div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeUserForm()">Cancel</button>
                    <button class="btn" onclick='saveEditUser("${username}")'>Save Changes</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', formHTML);
    renderClientChecklist(user.clients || []);
}

function renderClientChecklist(selectedClients = []) {
    const checklist = document.getElementById('clientChecklist');
    if (!checklist) return;

    const allClients = Object.keys(clients).sort();

    if (allClients.length === 0) {
        checklist.innerHTML = '<div style="color:#888;padding:8px;">No clients available</div>';
        return;
    }

    checklist.innerHTML = allClients.map(name => {
        const checked = selectedClients.includes(name) ? 'checked' : '';
        return `
            <label>
                <input type="checkbox" value="${name}" ${checked}>
                ${name}
            </label>
        `;
    }).join('');
}

function toggleClientSelection() {
    const roleSelect = document.getElementById('newRole') || document.getElementById('editRole');
    const clientGroup = document.getElementById('clientSelectionGroup');

    if (roleSelect && clientGroup) {
        clientGroup.style.display = roleSelect.value === 'admin' ? 'none' : 'block';
    }
}

function saveNewUser() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;

    if (!username || !password) {
        alert('Username and password are required');
        return;
    }

    if (users[username]) {
        alert('User already exists');
        return;
    }

    const selectedClients = role === 'admin' ? [] : Array.from(document.querySelectorAll('#clientChecklist input:checked')).map(cb => cb.value);

    users[username] = {
        password: password,
        role: role,
        clients: selectedClients
    };

    localStorage.setItem('ecomghosts_users', JSON.stringify(users));
    closeUserForm();
    renderUsersTable();
}

function saveEditUser(username) {
    const password = document.getElementById('editPassword').value;
    const role = document.getElementById('editRole').value;

    if (password) {
        users[username].password = password;
    }

    users[username].role = role;

    if (role === 'admin') {
        users[username].clients = [];
    } else {
        users[username].clients = Array.from(document.querySelectorAll('#clientChecklist input:checked')).map(cb => cb.value);
    }

    localStorage.setItem('ecomghosts_users', JSON.stringify(users));
    closeUserForm();
    renderUsersTable();
}

function deleteUser(username) {
    if (confirm(`Delete user "${username}"?`)) {
        delete users[username];
        localStorage.setItem('ecomghosts_users', JSON.stringify(users));
        renderUsersTable();
    }
}

function closeUserForm() {
    const modal = document.getElementById('userFormModal');
    if (modal) modal.remove();
}

// Init on load - wait for DOM to be ready
function startApp() {
    setupAuth();
    init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    // DOM already loaded
    startApp();
}
