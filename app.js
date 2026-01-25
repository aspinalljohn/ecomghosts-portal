// EcomGhosts Client Portal
const { useState, useEffect } = React;

// Mock data - replace with real API calls later
const MOCK_USERS = [
    { id: 1, email: 'client@example.com', password: 'demo', role: 'client', name: 'John Doe' },
    { id: 2, email: 'admin@ecomghosts.com', password: 'admin', role: 'admin', name: 'Admin User' },
    { id: 3, email: 'manager@ecomghosts.com', password: 'manager', role: 'manager', name: 'Content Manager' }
];

const MOCK_CONTENT = [
    {
        id: 1,
        type: 'post',
        title: 'E-commerce Growth Tips',
        content: 'Share insights about scaling your e-commerce business through strategic partnerships and operational excellence.',
        date: '2026-01-28',
        time: '09:00',
        clientId: 1,
        status: 'scheduled'
    },
    {
        id: 2,
        type: 'poll',
        title: 'Industry Survey',
        content: 'What\'s your biggest challenge in e-commerce right now?',
        pollOptions: [
            'Customer acquisition',
            'Inventory management',
            'Marketing ROI',
            'Operations scaling'
        ],
        date: '2026-01-30',
        time: '14:00',
        clientId: 1,
        status: 'scheduled'
    },
    {
        id: 3,
        type: 'post',
        title: 'LinkedIn Algorithm Update',
        content: 'Here\'s what the latest LinkedIn algorithm changes mean for your content strategy...',
        date: '2026-02-03',
        time: '10:30',
        clientId: 1,
        status: 'scheduled'
    },
    {
        id: 4,
        type: 'poll',
        title: 'Content Preferences',
        content: 'What type of content do you want to see more of?',
        pollOptions: [
            'Case studies',
            'Industry insights',
            'How-to guides',
            'Behind the scenes'
        ],
        date: '2026-02-05',
        time: '11:00',
        clientId: 1,
        status: 'scheduled'
    },
    {
        id: 5,
        type: 'post',
        title: 'Partnership Announcement',
        content: 'Excited to announce our new partnership that will help scale operations for our clients...',
        date: '2026-02-10',
        time: '15:00',
        clientId: 1,
        status: 'scheduled'
    }
];

// Login Component
function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        const user = MOCK_USERS.find(u => u.email === email && u.password === password);

        if (user) {
            onLogin(user);
        } else {
            setError('Invalid email or password');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <div className="auth-header">
                    <h1>👻 EcomGhosts Portal</h1>
                    <p>Login to view your content schedule</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    {error && <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</p>}
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        Login
                    </button>
                    <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Demo credentials:<br/>
                        Client: client@example.com / demo<br/>
                        Admin: admin@ecomghosts.com / admin
                    </p>
                </form>
            </div>
        </div>
    );
}

// Navbar Component
function Navbar({ user, onLogout }) {
    const roleLabels = {
        client: 'Client',
        admin: 'Admin',
        manager: 'Content Manager'
    };

    return (
        <nav className="navbar">
            <div className="logo">
                👻 EcomGhosts Portal
            </div>
            <div className="nav-menu">
                <a href="#calendar" className="nav-link">Calendar</a>
                {(user.role === 'admin' || user.role === 'manager') && (
                    <a href="#admin" className="nav-link">Dashboard</a>
                )}
                <div className="user-info">
                    <span>{user.name}</span>
                    <span className="user-role">{roleLabels[user.role]}</span>
                    <button className="btn btn-logout" onClick={onLogout}>
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}

// Content Detail Modal
function ContentModal({ content, onClose }) {
    if (!content) return null;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{content.title}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="content-detail">
                        <div className="detail-row">
                            <span className="detail-label">Type:</span>
                            <span className="detail-value">
                                <span className={`content-badge ${content.type}`}>
                                    {content.type === 'post' ? '📝' : '📊'} {content.type.charAt(0).toUpperCase() + content.type.slice(1)}
                                </span>
                            </span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Date:</span>
                            <span className="detail-value">{formatDate(content.date)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Time:</span>
                            <span className="detail-value">{content.time}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Status:</span>
                            <span className="detail-value">
                                <span style={{
                                    padding: '0.25rem 0.75rem',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.875rem'
                                }}>
                                    {content.status.charAt(0).toUpperCase() + content.status.slice(1)}
                                </span>
                            </span>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                            <div className="detail-label" style={{ marginBottom: '0.75rem' }}>Content:</div>
                            <div className="content-text">{content.content}</div>
                        </div>
                        {content.type === 'poll' && content.pollOptions && (
                            <div>
                                <div className="detail-label" style={{ marginBottom: '0.75rem' }}>Poll Options:</div>
                                <div className="poll-options">
                                    {content.pollOptions.map((option, index) => (
                                        <div key={index} className="poll-option">
                                            {index + 1}. {option}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Calendar Component
function Calendar({ user, content }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedContent, setSelectedContent] = useState(null);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
                day: prevMonthLastDay - i,
                isCurrentMonth: false,
                date: new Date(year, month - 1, prevMonthLastDay - i)
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                day: i,
                isCurrentMonth: true,
                date: new Date(year, month, i)
            });
        }

        // Next month days
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                day: i,
                isCurrentMonth: false,
                date: new Date(year, month + 1, i)
            });
        }

        return days;
    };

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const formatDateKey = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    const getContentForDate = (date) => {
        const dateKey = formatDateKey(date);
        return content.filter(item => item.date === dateKey);
    };

    const days = getDaysInMonth(currentDate);
    const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <>
            <div className="container">
                <div className="calendar-header">
                    <h1 className="calendar-title">Content Calendar</h1>
                    <div className="calendar-controls">
                        <div className="calendar-nav">
                            <button className="btn btn-secondary" onClick={goToPreviousMonth}>←</button>
                            <button className="btn btn-secondary" onClick={goToToday}>Today</button>
                            <button className="btn btn-secondary" onClick={goToNextMonth}>→</button>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{monthYear}</div>
                    </div>
                </div>

                <div className="calendar-grid">
                    <div className="calendar-weekdays">
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                            <div key={day} className="weekday">{day}</div>
                        ))}
                    </div>
                    <div className="calendar-days">
                        {days.map((dayInfo, index) => {
                            const dayContent = getContentForDate(dayInfo.date);
                            const isTodayClass = isToday(dayInfo.date) ? 'today' : '';
                            const otherMonthClass = !dayInfo.isCurrentMonth ? 'other-month' : '';

                            return (
                                <div
                                    key={index}
                                    className={`calendar-day ${isTodayClass} ${otherMonthClass}`}
                                >
                                    <div className="day-number">{dayInfo.day}</div>
                                    <div className="day-content">
                                        {dayContent.map(item => (
                                            <div
                                                key={item.id}
                                                className={`content-item ${item.type}`}
                                                onClick={() => setSelectedContent(item)}
                                            >
                                                <span className="content-icon">
                                                    {item.type === 'post' ? '📝' : '📊'}
                                                </span>
                                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {item.title}
                                                </span>
                                                <span className="content-time">{item.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {selectedContent && (
                <ContentModal
                    content={selectedContent}
                    onClose={() => setSelectedContent(null)}
                />
            )}
        </>
    );
}

// Admin Dashboard Component
function AdminDashboard({ content, user }) {
    const [showForm, setShowForm] = useState(false);

    const stats = {
        totalScheduled: content.length,
        postsScheduled: content.filter(c => c.type === 'post').length,
        pollsScheduled: content.filter(c => c.type === 'poll').length
    };

    return (
        <div className="container">
            <div className="calendar-header">
                <h1 className="calendar-title">Admin Dashboard</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    + New Content
                </button>
            </div>

            <div className="dashboard-grid">
                <div className="stat-card">
                    <div className="stat-label">Total Scheduled</div>
                    <div className="stat-value">{stats.totalScheduled}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Posts Scheduled</div>
                    <div className="stat-value">{stats.postsScheduled}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Polls Scheduled</div>
                    <div className="stat-value">{stats.pollsScheduled}</div>
                </div>
            </div>

            <div className="content-table">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Title</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {content.map(item => (
                            <tr key={item.id}>
                                <td>
                                    <span className={`content-badge ${item.type}`}>
                                        {item.type === 'post' ? '📝' : '📊'} {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                    </span>
                                </td>
                                <td>{item.title}</td>
                                <td>{new Date(item.date).toLocaleDateString()}</td>
                                <td>{item.time}</td>
                                <td>{item.status}</td>
                                <td>
                                    <button className="btn btn-secondary action-btn">Edit</button>
                                    <button className="btn btn-secondary action-btn">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Create New Content</h2>
                            <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form>
                                <div className="form-group">
                                    <label className="form-label">Content Type</label>
                                    <select className="form-select">
                                        <option value="post">Post</option>
                                        <option value="poll">Poll</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Title</label>
                                    <input type="text" className="form-input" placeholder="Content title" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input type="date" className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Time</label>
                                    <input type="time" className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Content</label>
                                    <textarea className="form-input" rows="5" placeholder="Enter your content here..."></textarea>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Assign to Client</label>
                                    <select className="form-select">
                                        <option value="1">John Doe</option>
                                        <option value="2">Jane Smith</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                    Create Content
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Main App Component
function App() {
    const [user, setUser] = useState(null);
    const [currentView, setCurrentView] = useState('calendar');

    useEffect(() => {
        // Check if user is already logged in (localStorage)
        const savedUser = localStorage.getItem('ecomghosts_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
    }, []);

    const handleLogin = (loggedInUser) => {
        setUser(loggedInUser);
        localStorage.setItem('ecomghosts_user', JSON.stringify(loggedInUser));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('ecomghosts_user');
    };

    // Filter content based on user role
    const getVisibleContent = () => {
        if (!user) return [];
        if (user.role === 'client') {
            return MOCK_CONTENT.filter(c => c.clientId === user.id);
        }
        return MOCK_CONTENT; // Admin and managers see all
    };

    if (!user) {
        return <Login onLogin={handleLogin} />;
    }

    // Handle navigation
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.slice(1);
            if (hash === 'admin' && (user.role === 'admin' || user.role === 'manager')) {
                setCurrentView('admin');
            } else {
                setCurrentView('calendar');
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [user]);

    const visibleContent = getVisibleContent();

    return (
        <>
            <Navbar user={user} onLogout={handleLogout} />
            {currentView === 'calendar' ? (
                <Calendar user={user} content={visibleContent} />
            ) : (
                <AdminDashboard user={user} content={visibleContent} />
            )}
        </>
    );
}

// Render App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
