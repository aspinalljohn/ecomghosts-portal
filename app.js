// ============================================================================
// AUTHENTICATION SYSTEM (SUPABASE)
// ============================================================================

let currentUser = null;
let currentUserData = null;

// DOM elements - Auth (will be initialized on load)
let loginScreen, loginForm, loginEmail, loginPassword, loginError;

// Setup authentication after DOM is ready
function setupAuth() {
    loginScreen = document.getElementById('loginScreen');
    loginForm = document.getElementById('loginForm');
    loginEmail = document.getElementById('loginEmail');
    loginPassword = document.getElementById('loginPassword');
    loginError = document.getElementById('loginError');

    // Login handler
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginEmail.value.trim();
            const password = loginPassword.value;

            try {
                const result = await signIn(email, password);
                if (result.success) {
                    currentUser = result.user;
                    currentUserData = result.userData;
                    loginScreen.classList.add('hidden');
                    await init();
                } else {
                    loginError.textContent = result.error || 'Invalid email or password';
                    loginError.classList.remove('hidden');
                }
            } catch (err) {
                loginError.textContent = 'Login failed: ' + err.message;
                loginError.classList.remove('hidden');
            }
        });
    }
}

// Logout function
async function logout() {
    if (confirm('Are you sure you want to log out?')) {
        try {
            await signOut();
            currentUser = null;
            currentUserData = null;
            location.reload();
        } catch (err) {
            alert('Logout failed: ' + err.message);
        }
    }
}

// Check if current user is admin
function isAdmin() {
    return currentUserData && currentUserData.role === 'admin';
}

// Check if user has access to a client
async function hasClientAccess(clientId) {
    if (!currentUser) return false;
    if (isAdmin()) return true; // Admin sees all

    // Check user_client_access table
    try {
        const result = await getUserClients(currentUser.id);
        if (result.success) {
            return result.clients.some(c => c.id === clientId);
        }
    } catch (err) {
        console.error('Error checking client access:', err);
    }
    return false;
}

// Get accessible clients for current user
async function getAccessibleClients() {
    if (!currentUser) return [];

    try {
        if (isAdmin()) {
            // Admin sees all clients
            const result = await getAllClients();
            return result.success ? result.clients : [];
        } else {
            // Regular user sees only assigned clients
            const result = await getUserClients(currentUser.id);
            return result.success ? result.clients : [];
        }
    } catch (err) {
        console.error('Error getting accessible clients:', err);
        return [];
    }
}

// ============================================================================
// STATE & ORIGINAL FUNCTIONALITY
// ============================================================================

let clients = {}; // clientId -> client data
let charts = {};
let currentClient = null;
let currentClientId = null;
let originalDashboardHTML = null;

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
async function init() {
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

    // Save original dashboard HTML structure
    if (dashboard && !originalDashboardHTML) {
        originalDashboardHTML = dashboard.innerHTML;
    }

    // If not logged in, show login screen
    if (!currentUser) {
        const loginScreenEl = document.getElementById('loginScreen');
        if (loginScreenEl) loginScreenEl.classList.remove('hidden');
        return;
    }

    // Load all clients
    try {
        const clientsResult = await getAllClients();
        if (clientsResult.success) {
            for (const client of clientsResult.clients) {
                clients[client.id] = {
                    id: client.id,
                    name: client.name,
                    startDate: client.start_date || '',
                    uploadedAt: client.created_at || '',
                    engagement: [],
                    followers: [],
                    topPosts: [],
                    demographics: [],
                    totalFollowers: 0,
                    discovery: {}
                };

                // Load analytics data for each client
                await loadClientData(client.id);
            }
        }
    } catch (err) {
        console.error('Error loading clients:', err);
    }

    updateClientDropdown();
    updateHeader();

    if (clientSelect) {
        clientSelect.addEventListener('change', async () => {
            const clientId = clientSelect.value;
            if (clientId && clients[clientId] && (await hasClientAccess(clientId))) {
                selectClient(clientId);
            } else {
                currentClient = null;
                currentClientId = null;
                // Admin sees mission control, users see empty state
                if (isAdmin()) {
                    renderAdminMissionControl();
                } else {
                    showEmptyState();
                }
            }
        });
    }

    if (startDateInput) {
        startDateInput.addEventListener('change', async () => {
            if (currentClientId && clients[currentClientId] && (await hasClientAccess(currentClientId))) {
                clients[currentClientId].startDate = startDateInput.value;
                await updateClient(currentClientId, { start_date: startDateInput.value });
                renderDashboard();
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    // Auto-select first client for non-admin users
    if (!isAdmin()) {
        console.log('User is not admin, checking clients...');
        const accessibleClients = await getAccessibleClients();
        if (accessibleClients.length > 0) {
            selectClient(accessibleClients[0].id);
        } else {
            showEmptyState();
        }
    } else {
        // Admin: Show mission control when no client selected
        console.log('User is admin, showing mission control...');
        renderAdminMissionControl();
    }
}

// Load client data from Supabase
async function loadClientData(clientId) {
    try {
        // Load engagement data
        const engResult = await getEngagementData(clientId);
        if (engResult.success) {
            clients[clientId].engagement = engResult.data.map(d => ({
                date: new Date(d.date),
                impressions: d.impressions,
                engagements: d.engagements
            }));
        }

        // Load followers data
        const folResult = await getFollowersData(clientId);
        if (folResult.success) {
            clients[clientId].followers = folResult.data.map(d => ({
                date: new Date(d.date),
                newFollowers: d.new_followers
            }));
        }

        // Load top posts
        const postsResult = await getTopPosts(clientId);
        if (postsResult.success) {
            clients[clientId].topPosts = postsResult.data.map(p => ({
                url: p.url,
                date: p.post_date ? new Date(p.post_date) : null,
                engagements: p.engagements,
                impressions: p.impressions
            }));
        }

        // Load demographics
        const demoResult = await getDemographicsData(clientId);
        if (demoResult.success) {
            clients[clientId].demographics = demoResult.data.map(d => ({
                label: d.job_title,
                percentage: d.percentage
            }));
        }
    } catch (err) {
        console.error('Error loading client data:', err);
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
    const existingHome = document.getElementById('homeBtn');
    if (existingLogout) existingLogout.remove();
    if (existingUserMgmt) existingUserMgmt.remove();
    if (existingHome) existingHome.remove();

    // Hide/show client select and related controls based on role
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
        // Admin: Hide client dropdown and start date (use Mission Control instead)
        if (clientSelectGroup) clientSelectGroup.style.display = 'none';
        if (startDateGroupEl) startDateGroupEl.style.display = 'none';
        if (uploadGroup) uploadGroup.style.display = 'none';
    }

    // Add home button (admin only)
    if (isAdmin()) {
        const homeGroup = document.createElement('div');
        homeGroup.className = 'control-group';
        homeGroup.style.alignSelf = 'flex-end';
        homeGroup.id = 'homeBtn';
        homeGroup.innerHTML = `
            <button class="btn" onclick="goToMissionControl()" style="background: #f97316;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
                Mission Control
            </button>
        `;
        controls.appendChild(homeGroup);
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
            Logout (${currentUserData?.email || 'User'})
        </button>
    `;
    controls.appendChild(logoutGroup);
}

function updateClientDropdown() {
    if (!clientSelect) return;

    clientSelect.innerHTML = '<option value="">-- Select or upload new --</option>';
    const sortedClients = Object.values(clients).sort((a, b) => a.name.localeCompare(b.name));
    sortedClients.forEach(client => {
        const opt = document.createElement('option');
        opt.value = client.id;
        opt.textContent = client.name;
        clientSelect.appendChild(opt);
    });
}

async function selectClient(clientId) {
    console.log('selectClient called with:', clientId);
    console.log('Client exists:', !!clients[clientId]);
    console.log('Has access:', await hasClientAccess(clientId));

    if (!(await hasClientAccess(clientId))) {
        alert('You do not have access to this client');
        return;
    }

    // Restore original dashboard HTML structure if it was replaced by Mission Control
    if (originalDashboardHTML && dashboard) {
        console.log('Restoring original dashboard HTML...');
        dashboard.innerHTML = originalDashboardHTML;

        // Re-query DOM elements after restoring HTML
        summaryCards = document.getElementById('summaryCards');
        chartsGrid = document.getElementById('chartsGrid');
        postsTableBody = document.getElementById('postsTableBody');
    }

    currentClientId = clientId;
    currentClient = clients[clientId].name;
    clientSelect.value = clientId;
    startDateInput.value = clients[clientId].startDate || '';

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

    console.log('Calling showDashboard and renderDashboard...');
    showDashboard();
    renderDashboard();
    console.log('Dashboard should now be visible');
}

async function deleteClient() {
    if (!currentClientId || !isAdmin()) return;
    if (confirm(`Delete "${clients[currentClientId]?.name}" and all their data?`)) {
        try {
            await deleteClient(currentClientId);
            delete clients[currentClientId];
            updateClientDropdown();
            currentClient = null;
            currentClientId = null;

            // Admin returns to mission control
            renderAdminMissionControl();
        } catch (err) {
            alert('Error deleting client: ' + err.message);
        }
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

        // Create client in Supabase
        const clientResult = await createClient(name, null);
        if (!clientResult.success) {
            throw new Error(clientResult.error);
        }

        const newClient = clientResult.client;
        const clientId = newClient.id;

        // Initialize client data
        clients[clientId] = {
            id: clientId,
            name: name,
            startDate: '',
            uploadedAt: new Date().toISOString(),
            engagement: data.engagement || [],
            followers: data.followers || [],
            topPosts: data.topPosts || [],
            demographics: data.demographics || [],
            totalFollowers: data.totalFollowers || 0,
            discovery: data.discovery || {}
        };

        // Save data to Supabase
        await saveEngagementData(clientId, data.engagement || []);
        await saveFollowersData(clientId, data.followers || []);
        await saveTopPosts(clientId, data.topPosts || []);
        await saveDemographicsData(clientId, data.demographics || []);

        // Update client with total followers
        if (data.totalFollowers) {
            // Store total followers in a metadata field or discovery
            clients[clientId].totalFollowers = data.totalFollowers;
        }

        // If user is not admin, automatically assign this client to them
        if (!isAdmin()) {
            await assignClientToUser(currentUser.id, clientId);
        }

        updateClientDropdown();
        selectClient(clientId);

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
    if (!currentClientId || !clients[currentClientId]) return;

    const data = clients[currentClientId];
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

function goToMissionControl() {
    if (!isAdmin()) return;

    // Clear current client selection
    currentClient = null;
    currentClientId = null;

    // Hide start date and delete controls
    if (startDateGroup) startDateGroup.style.display = 'none';
    if (deleteGroup) deleteGroup.style.display = 'none';

    // Render Mission Control
    renderAdminMissionControl();
}

async function renderAdminMissionControl() {
    console.log('renderAdminMissionControl called');
    console.log('emptyState element:', emptyState);
    console.log('dashboard element:', dashboard);

    const allClients = Object.values(clients).sort((a, b) => a.name.localeCompare(b.name));

    // Get all users
    let allUsers = [];
    try {
        const usersResult = await getAllUsers();
        allUsers = usersResult.success ? usersResult.users : [];
    } catch (err) {
        console.error('Error loading users:', err);
    }

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
                    ${allUsers.filter(u => u.role === 'admin').length} admin,
                    ${allUsers.filter(u => u.role === 'user').length} regular
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
                                ${allClients.map(client => {
                                    const uploadDate = client.created_at ? new Date(client.created_at).toLocaleDateString() : 'Unknown';
                                    return `
                                        <tr>
                                            <td><strong>${client.name}</strong></td>
                                            <td style="color:#888;font-size:13px;">${uploadDate}</td>
                                            <td>
                                                <button class="btn btn-small" data-client-id="${client.id}" data-action="view-client">
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
                                <th>Email</th>
                                <th>Role</th>
                                <th>Clients</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allUsers.map(user => {
                                const roleClass = user.role === 'admin' ? 'badge-admin' : 'badge-user';
                                return `
                                    <tr>
                                        <td><strong>${user.email}</strong></td>
                                        <td><span class="badge ${roleClass}">${user.role}</span></td>
                                        <td style="color:#888;font-size:13px;">--</td>
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
    const viewButtons = dashboard.querySelectorAll('[data-action="view-client"]');
    console.log('Found view buttons:', viewButtons.length);

    viewButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const clientId = btn.getAttribute('data-client-id');
            console.log('View Dashboard clicked for:', clientId);
            if (clientId) {
                selectClient(clientId);
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
                            <th>Email</th>
                            <th>Role</th>
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

async function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    try {
        const result = await getAllUsers();
        const users = result.success ? result.users : [];

        tbody.innerHTML = users.map(user => {
            const roleClass = user.role === 'admin' ? 'badge-admin' : 'badge-user';
            return `
                <tr>
                    <td><strong>${user.email}</strong></td>
                    <td><span class="badge ${roleClass}">${user.role}</span></td>
                    <td>
                        <button class="btn btn-small btn-secondary" onclick='editUser("${user.id}","${user.email}")'>Edit</button>
                        ${user.id !== currentUser.id ? `<button class="btn btn-small btn-danger" onclick='deleteUserAccount("${user.id}","${user.email}")'>Delete</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Error rendering users:', err);
    }
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
                    <label>Email</label>
                    <input type="email" id="newEmail" placeholder="user@example.com">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="newPassword" placeholder="Enter password">
                </div>
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="newFullName" placeholder="John Doe">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select id="newRole">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeUserForm()">Cancel</button>
                    <button class="btn" onclick="saveNewUser()">Create User</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', formHTML);
}

function editUser(userId, email) {
    const formHTML = `
        <div id="userFormModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit User: ${email}</h3>
                    <button class="close-modal" onclick="closeUserForm()">×</button>
                </div>
                <div class="form-group">
                    <label>New Password (leave blank to keep current)</label>
                    <input type="password" id="editPassword" placeholder="Enter new password">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select id="editRole">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeUserForm()">Cancel</button>
                    <button class="btn" onclick='saveEditUser("${userId}","${email}")'>Save Changes</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', formHTML);
}

async function saveNewUser() {
    const email = document.getElementById('newEmail').value.trim();
    const password = document.getElementById('newPassword').value;
    const fullName = document.getElementById('newFullName').value.trim();
    const role = document.getElementById('newRole').value;

    if (!email || !password || !fullName) {
        alert('Email, password, and full name are required');
        return;
    }

    try {
        const result = await signUp(email, password, fullName, role);
        if (result.success) {
            closeUserForm();
            renderUsersTable();
            alert('User created successfully');
        } else {
            alert('Error creating user: ' + result.error);
        }
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function saveEditUser(userId, email) {
    const password = document.getElementById('editPassword').value;
    const role = document.getElementById('editRole').value;

    try {
        const updates = { role: role };
        const result = await updateUser(userId, updates);

        if (result.success) {
            closeUserForm();
            renderUsersTable();
            alert('User updated successfully');
        } else {
            alert('Error updating user: ' + result.error);
        }
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function deleteUserAccount(userId, email) {
    if (confirm(`Delete user "${email}"?`)) {
        try {
            const result = await deleteUser(userId);
            if (result.success) {
                renderUsersTable();
                alert('User deleted successfully');
            } else {
                alert('Error deleting user: ' + result.error);
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }
}

function closeUserForm() {
    const modal = document.getElementById('userFormModal');
    if (modal) modal.remove();
}

// Init on load - wait for DOM to be ready
async function startApp() {
    setupAuth();

    // Check if user is already logged in
    const user = await getCurrentUser();
    if (user) {
        currentUser = user;
        currentUserData = user;
        const loginScreenEl = document.getElementById('loginScreen');
        if (loginScreenEl) loginScreenEl.classList.add('hidden');
        await init();
    } else {
        const loginScreenEl = document.getElementById('loginScreen');
        if (loginScreenEl) loginScreenEl.classList.remove('hidden');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    // DOM already loaded
    startApp();
}
