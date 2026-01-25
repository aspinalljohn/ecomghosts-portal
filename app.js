const { useState, useEffect } = React;

/* ---------------- HELPERS ---------------- */

// Generate calendar days for a specific month/year
const generateCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = [];
  // Add empty slots for days before the 1st of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  // Add actual days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  return days;
};

/* ---------------- MOCK DATA ---------------- */

const MOCK_USERS = [
  { id: 1, email: 'client@example.com', password: 'demo', role: 'client', name: 'John Doe' },
  { id: 2, email: 'admin@ecomghosts.com', password: 'admin', role: 'admin', name: 'Admin User' }
];

const MOCK_CONTENT = [
  {
    id: 1,
    type: 'post',
    title: 'E-commerce Growth Tips',
    content: 'Draft LinkedIn post copy goes here.',
    date: '2026-01-28',
    time: '09:00',
    clientId: 1,
    status: 'pending_approval',
    internalNotes: 'Angle focused on CTR hooks'
  },
  {
    id: 2,
    type: 'poll',
    title: 'Industry Survey',
    content: 'What is your biggest growth blocker?',
    pollOptions: ['Traffic', 'CVR', 'Creative', 'Retention'],
    date: '2026-01-30',
    time: '14:00',
    clientId: 1,
    status: 'scheduled',
    internalNotes: ''
  }
];

/* ---------------- LOGIN ---------------- */

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = e => {
    e.preventDefault();
    const user = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (user) onLogin(user);
    else alert("Invalid credentials");
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>👻 EcomGhosts Portal</h1>
        <form onSubmit={submit}>
          <input className="form-input" placeholder="Email" onChange={e => setEmail(e.target.value)} />
          <input className="form-input" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={{ marginTop: '10px' }} />
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }}>Login</button>
        </form>
      </div>
    </div>
  );
}

/* ---------------- NAV ---------------- */

function Navbar({ user, setView, logout }) {
  return (
    <nav className="navbar">
      <div className="logo">👻 EcomGhosts Portal</div>
      <div className="nav-menu">
        <button className="nav-link" onClick={() => setView('calendar')}>Calendar</button>
        {user.role === 'admin' && (
          <>
            <button className="nav-link" onClick={() => setView('dashboard')}>Dashboard</button>
            <button className="nav-link" onClick={() => setView('clients')}>Clients</button>
          </>
        )}
        <div className="user-info">
            <span className="user-role">{user.role.toUpperCase()}</span>
            <button className="btn btn-logout" onClick={logout}>Logout</button>
        </div>
      </div>
    </nav>
  );
}

/* ---------------- CALENDAR COMPONENT ---------------- */

function Calendar({ content, user, updateStatus }) {
  // Hardcoded to Jan 2026 for demo purposes
  const year = 2026;
  const month = 0; // January
  const monthName = "January 2026";
  
  const days = generateCalendarDays(year, month);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Filter content for this view
  const getContentForDay = (day) => {
    if (!day) return [];
    // Format date string to match mock data (YYYY-MM-DD)
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return content.filter(c => c.date === dateStr);
  };

  return (
    <div className="container">
      <div className="calendar-header">
        <h1 className="calendar-title">{monthName}</h1>
      </div>

      <div className="calendar-grid">
        {/* Weekday Headers */}
        <div className="calendar-weekdays">
          {weekdays.map(d => <div key={d} className="weekday">{d}</div>)}
        </div>

        {/* Calendar Days */}
        <div className="calendar-days">
          {days.map((day, index) => {
            const dayContent = getContentForDay(day);
            return (
              <div key={index} className={`calendar-day ${!day ? 'other-month' : ''}`}>
                {day && (
                  <>
                    <div className="day-number">{day}</div>
                    <div className="day-content">
                      {dayContent.map(item => (
                        <div key={item.id} 
                             className={`content-item ${item.type}`}
                             title={item.title}>
                          <span className="content-icon">
                            {item.type === 'post' ? '📝' : '📊'}
                          </span>
                          <span>{item.time} - {item.title}</span>
                          
                          {/* Quick Client Action: Approve/Reject */}
                          {user.role === 'client' && item.status === 'pending_approval' && (
                             <div style={{marginLeft: 'auto', fontSize: '10px'}}>
                                <button onClick={() => updateStatus(item.id, 'approved')}>✅</button>
                             </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- ADMIN DASHBOARD (Manage Content) ---------------- */

function AdminDashboard({ content, addContent, deleteContent }) {
  const [newPost, setNewPost] = useState({
    title: '', type: 'post', date: '', time: '', content: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    addContent(newPost);
    // Reset form
    setNewPost({ title: '', type: 'post', date: '', time: '', content: '' });
  };

  return (
    <div className="container">
      <h1>Admin Dashboard</h1>
      
      {/* 1. Stats Row */}
      <div className="dashboard-grid">
        <div className="stat-card">
            <div className="stat-label">Total Drafts</div>
            <div className="stat-value">{content.filter(c => c.status === 'draft').length}</div>
        </div>
        <div className="stat-card">
            <div className="stat-label">Pending Approval</div>
            <div className="stat-value">{content.filter(c => c.status === 'pending_approval').length}</div>
        </div>
        <div className="stat-card">
            <div className="stat-label">Scheduled</div>
            <div className="stat-value">{content.filter(c => c.status === 'scheduled').length}</div>
        </div>
      </div>

      {/* 2. Create New Content Form */}
      <div className="content-card">
        <h3>➕ Schedule New Content</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
            <input 
                className="form-input" 
                placeholder="Post Title (e.g., 'CTR Hacks')" 
                value={newPost.title}
                onChange={e => setNewPost({...newPost, title: e.target.value})}
                required 
            />
            <select 
                className="form-select" 
                value={newPost.type}
                onChange={e => setNewPost({...newPost, type: e.target.value})}
            >
                <option value="post">📝 LinkedIn Post</option>
                <option value="poll">📊 LinkedIn Poll</option>
            </select>
            
            <input 
                className="form-input" 
                type="date" 
                value={newPost.date}
                onChange={e => setNewPost({...newPost, date: e.target.value})}
                required 
            />
            <input 
                className="form-input" 
                type="time" 
                value={newPost.time}
                onChange={e => setNewPost({...newPost, time: e.target.value})}
                required 
            />
            
            <textarea 
                className="form-input" 
                placeholder="Write your LinkedIn copy here..." 
                style={{ gridColumn: '1 / -1', minHeight: '100px' }}
                value={newPost.content}
                onChange={e => setNewPost({...newPost, content: e.target.value})}
            />
            
            <button className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>Schedule Content</button>
        </form>
      </div>

      {/* 3. Manage Existing Content List */}
      <div className="content-table">
        <table className="table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {content.map(item => (
                    <tr key={item.id}>
                        <td>{item.date}</td>
                        <td>{item.type === 'post' ? '📝 Post' : '📊 Poll'}</td>
                        <td>{item.title}</td>
                        <td>
                            <span style={{ 
                                color: item.status === 'approved' ? 'var(--success)' : 
                                       item.status === 'pending_approval' ? 'var(--warning)' : 'var(--text-secondary)' 
                            }}>
                                {item.status.replace('_', ' ').toUpperCase()}
                            </span>
                        </td>
                        <td>
                            <button className="btn-secondary action-btn" onClick={() => deleteContent(item.id)}>Delete</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- CLIENT MANAGEMENT ---------------- */

function ClientManager({ content }) {
  const clientMap = {};
  content.forEach(c => {
    clientMap[c.clientId] = (clientMap[c.clientId] || 0) + 1;
  });

  return (
    <div className="container">
      <h1>Clients</h1>
      <table className="table">
        <thead>
          <tr>
            <th>Client Name</th>
            <th>Scheduled Items</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>John Doe</td>
            <td>{clientMap[1] || 0} Posts</td>
            <td><span style={{color: 'var(--success)'}}>Active</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- MAIN APP CONTROLLER ---------------- */

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('calendar');
  const [content, setContent] = useState(MOCK_CONTENT);

  // Action: Update Status (Approve/Reject)
  const updateStatus = (id, status) => {
    setContent(prev =>
      prev.map(c => (c.id === id ? { ...c, status } : c))
    );
  };

  // Action: Add New Content (Admin)
  const addContent = (newItem) => {
    const item = {
        id: Date.now(),
        clientId: 1, // Defaulting to Client 1 for demo
        status: 'pending_approval',
        ...newItem
    };
    setContent([...content, item]);
    alert("Content Scheduled!");
  };

  // Action: Delete Content (Admin)
  const deleteContent = (id) => {
      if(confirm('Are you sure you want to delete this content?')) {
          setContent(prev => prev.filter(c => c.id !== id));
      }
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <>
      <Navbar user={user} setView={setView} logout={() => setUser(null)} />
      
      {view === 'calendar' && (
        <Calendar content={content} user={user} updateStatus={updateStatus} />
      )}
      
      {view === 'dashboard' && user.role === 'admin' && (
        <AdminDashboard 
            content={content} 
            addContent={addContent} 
            deleteContent={deleteContent} 
        />
      )}
      
      {view === 'clients' && user.role === 'admin' && (
        <ClientManager content={content} />
      )}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
