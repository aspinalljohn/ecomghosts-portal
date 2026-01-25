const { useState, useEffect } = React;

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
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>👻 EcomGhosts Portal</h1>
        <form onSubmit={submit}>
          <input className="form-input" placeholder="Email" onChange={e => setEmail(e.target.value)} />
          <input className="form-input" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
          <button className="btn btn-primary" style={{ width: '100%' }}>Login</button>
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
        <button className="btn btn-logout" onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}

/* ---------------- CLIENT VIEW ---------------- */

function ClientActions({ item, updateStatus }) {
  if (item.status !== 'pending_approval') return null;

  return (
    <div style={{ marginTop: '1rem' }}>
      <button className="btn btn-primary" onClick={() => updateStatus(item.id, 'approved')}>
        Approve
      </button>
      <button className="btn btn-secondary" onClick={() => updateStatus(item.id, 'draft')}>
        Request Changes
      </button>
    </div>
  );
}

/* ---------------- CALENDAR ---------------- */

function Calendar({ content, user, updateStatus }) {
  return (
    <div className="container">
      <h1>Content Calendar</h1>
      {content.map(item => (
        <div key={item.id} className="content-card">
          <h3>{item.title}</h3>
          <p>Status: {item.status.replace('_', ' ')}</p>
          <p>{item.content}</p>

          {user.role === 'client' && (
            <ClientActions item={item} updateStatus={updateStatus} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------- ADMIN DASHBOARD ---------------- */

function AdminDashboard({ content }) {
  const statusCount = s => content.filter(c => c.status === s).length;

  return (
    <div className="container">
      <h1>Admin Dashboard</h1>

      <div className="dashboard-grid">
        <div className="stat-card">Drafts: {statusCount('draft')}</div>
        <div className="stat-card">Pending Approval: {statusCount('pending_approval')}</div>
        <div className="stat-card">Scheduled: {statusCount('scheduled')}</div>
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
            <th>Client</th>
            <th>Scheduled Content</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>John Doe</td>
            <td>{clientMap[1] || 0}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- APP ---------------- */

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('calendar');
  const [content, setContent] = useState(MOCK_CONTENT);

  const updateStatus = (id, status) => {
    setContent(prev =>
      prev.map(c => (c.id === id ? { ...c, status } : c))
    );
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <>
      <Navbar user={user} setView={setView} logout={() => setUser(null)} />
      {view === 'calendar' && <Calendar content={content} user={user} updateStatus={updateStatus} />}
      {view === 'dashboard' && user.role === 'admin' && <AdminDashboard content={content} />}
      {view === 'clients' && user.role === 'admin' && <ClientManager content={content} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
