const { useState } = React;
const e = React.createElement;

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

  const submit = event => {
    event.preventDefault();
    const user = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (user) onLogin(user);
  };

  return e(
    'div',
    { className: 'auth-container' },
    e(
      'div',
      { className: 'auth-box' },
      e('h1', null, '👻 EcomGhosts Portal'),
      e(
        'form',
        { onSubmit: submit },
        e('input', {
          className: 'form-input',
          placeholder: 'Email',
          onChange: event => setEmail(event.target.value)
        }),
        e('input', {
          className: 'form-input',
          type: 'password',
          placeholder: 'Password',
          onChange: event => setPassword(event.target.value)
        }),
        e(
          'button',
          { className: 'btn btn-primary', style: { width: '100%' } },
          'Login'
        )
      )
    )
  );
}

/* ---------------- NAV ---------------- */

function Navbar({ user, setView, logout }) {
  const navButtons = [
    e(
      'button',
      {
        key: 'calendar',
        className: 'nav-link',
        onClick: () => setView('calendar')
      },
      'Calendar'
    )
  ];

  if (user.role === 'admin') {
    navButtons.push(
      e(
        'button',
        {
          key: 'dashboard',
          className: 'nav-link',
          onClick: () => setView('dashboard')
        },
        'Dashboard'
      ),
      e(
        'button',
        {
          key: 'clients',
          className: 'nav-link',
          onClick: () => setView('clients')
        },
        'Clients'
      )
    );
  }

  return e(
    'nav',
    { className: 'navbar' },
    e('div', { className: 'logo' }, '👻 EcomGhosts Portal'),
    e(
      'div',
      { className: 'nav-menu' },
      ...navButtons,
      e('button', { className: 'btn btn-logout', onClick: logout }, 'Logout')
    )
  );
}

/* ---------------- CLIENT VIEW ---------------- */

function ClientActions({ item, updateStatus }) {
  if (item.status !== 'pending_approval') return null;

  return e(
    'div',
    { style: { marginTop: '1rem' } },
    e(
      'button',
      { className: 'btn btn-primary', onClick: () => updateStatus(item.id, 'approved') },
      'Approve'
    ),
    e(
      'button',
      { className: 'btn btn-secondary', onClick: () => updateStatus(item.id, 'draft') },
      'Request Changes'
    )
  );
}

/* ---------------- CALENDAR ---------------- */

function Calendar({ content, user, updateStatus }) {
  return e(
    'div',
    { className: 'container' },
    e('h1', null, 'Content Calendar'),
    ...content.map(item =>
      e(
        'div',
        { key: item.id, className: 'content-card' },
        e('h3', null, item.title),
        e('p', null, `Status: ${item.status.replace('_', ' ')}`),
        e('p', null, item.content),
        user.role === 'client' ? e(ClientActions, { item, updateStatus }) : null
      )
    )
  );
}

/* ---------------- ADMIN DASHBOARD ---------------- */

function AdminDashboard({ content }) {
  const statusCount = status => content.filter(item => item.status === status).length;

  return e(
    'div',
    { className: 'container' },
    e('h1', null, 'Admin Dashboard'),
    e(
      'div',
      { className: 'dashboard-grid' },
      e('div', { className: 'stat-card' }, `Drafts: ${statusCount('draft')}`),
      e('div', { className: 'stat-card' }, `Pending Approval: ${statusCount('pending_approval')}`),
      e('div', { className: 'stat-card' }, `Scheduled: ${statusCount('scheduled')}`)
    )
  );
}

/* ---------------- CLIENT MANAGEMENT ---------------- */

function ClientManager({ content }) {
  const clientMap = {};

  content.forEach(item => {
    clientMap[item.clientId] = (clientMap[item.clientId] || 0) + 1;
  });

  return e(
    'div',
    { className: 'container' },
    e('h1', null, 'Clients'),
    e(
      'table',
      { className: 'table' },
      e(
        'thead',
        null,
        e(
          'tr',
          null,
          e('th', null, 'Client'),
          e('th', null, 'Scheduled Content')
        )
      ),
      e(
        'tbody',
        null,
        e(
          'tr',
          null,
          e('td', null, 'John Doe'),
          e('td', null, clientMap[1] || 0)
        )
      )
    )
  );
}

/* ---------------- APP ---------------- */

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('calendar');
  const [content, setContent] = useState(MOCK_CONTENT);

  const updateStatus = (id, status) => {
    setContent(prev => prev.map(item => (item.id === id ? { ...item, status } : item)));
  };

  if (!user) return e(Login, { onLogin: setUser });

  return e(
    React.Fragment,
    null,
    e(Navbar, { user, setView, logout: () => setUser(null) }),
    view === 'calendar' ? e(Calendar, { content, user, updateStatus }) : null,
    view === 'dashboard' && user.role === 'admin' ? e(AdminDashboard, { content }) : null,
    view === 'clients' && user.role === 'admin' ? e(ClientManager, { content }) : null
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(e(App));
