const { useState, useEffect } = React;

/* ---------------- HELPERS ---------------- */
const generateCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
};

/* ---------------- MOCK DATA ---------------- */
const MOCK_USERS = [
  { id: 1, email: 'client@example.com', password: 'demo', role: 'client', name: 'John Doe', company: 'TechStart Inc.' },
  { id: 2, email: 'admin@ecomghosts.com', password: 'admin', role: 'admin', name: 'Admin User', company: 'EcomGhosts' }
];

// Added 'notes' array and 'assignedTo' field
const INITIAL_CONTENT = [
  { 
    id: 1, clientId: 1, type: 'post', title: 'E-commerce Growth Tips', 
    content: 'Here are 3 tips to grow...', 
    date: '2026-01-28', time: '09:00', status: 'waiting_approval', 
    assignedTo: 'client',
    notes: [{ author: 'Admin', text: 'Please review the hook.', date: '2026-01-20' }] 
  },
  { 
    id: 2, clientId: 1, type: 'poll', title: 'Industry Survey', 
    content: 'Poll Question here...',
    date: '2026-01-30', time: '14:00', status: 'scheduled', 
    assignedTo: 'admin',
    notes: [] 
  }
];

/* ---------------- COMPONENTS ---------------- */

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = e => {
    e.preventDefault();
    const user = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (user) onLogin(user);
    else alert("Try: admin@ecomghosts.com / admin");
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1 style={{marginBottom:'1rem', textAlign:'center'}}>👻 EcomGhosts</h1>
        <form onSubmit={submit}>
          <input className="form-input" placeholder="Email" onChange={e => setEmail(e.target.value)} />
          <input className="form-input" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
          <button className="btn btn-primary" style={{ width: '100%' }}>Login</button>
        </form>
      </div>
    </div>
  );
}

function Sidebar({ user, view, setView, logout }) {
  const NavItem = ({ id, icon, label }) => (
    <button 
      className={`nav-item ${view === id ? 'active' : ''}`} 
      onClick={() => setView(id)}
    >
      <span>{icon}</span> {label}
    </button>
  );

  return (
    <aside className="sidebar">
      <div className="logo">👻 EcomGhosts</div>
      <div className="menu-group">
        <div className="menu-label">Content</div>
        <NavItem id="calendar" icon="📅" label="View Calendar" />
        <NavItem id="upcoming" icon="🚀" label="Upcoming Posts" />
      </div>
      {user.role === 'admin' && (
        <div className="menu-group">
          <div className="menu-label">Client Management</div>
          <NavItem id="clients" icon="👥" label="Manage Clients" />
          <NavItem id="add-client" icon="➕" label="Add New Client" />
        </div>
      )}
      <div className="user-profile">
        <div className="avatar">{user.name.charAt(0)}</div>
        <div className="user-details">
          <div className="user-name">{user.name}</div>
          <div className="user-role">{user.company}</div>
        </div>
        <button className="btn-logout" onClick={logout}>↪</button>
      </div>
    </aside>
  );
}

/* ---------------- CONTENT MODAL (The Popup) ---------------- */

function ContentModal({ isOpen, onClose, date, existingItem, onSave, user, selectedClient }) {
  if (!isOpen) return null;

  // Initialize form state
  const [formData, setFormData] = useState({
    title: '', type: 'post', status: 'in_progress', 
    content: '', assignedTo: 'admin', time: '09:00', notes: []
  });

  const [newNote, setNewNote] = useState('');

  // Load data if editing existing item, else reset for new item
  useEffect(() => {
    if (existingItem) {
      setFormData(existingItem);
    } else {
      setFormData({
        id: Date.now(),
        clientId: selectedClient,
        date: date,
        title: '', type: 'post', status: 'in_progress', 
        content: '', assignedTo: 'admin', time: '09:00', notes: []
      });
    }
    setNewNote('');
  }, [existingItem, date, isOpen]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const noteObj = {
      author: user.name,
      text: newNote,
      date: new Date().toLocaleDateString()
    };
    setFormData({ ...formData, notes: [...formData.notes, noteObj] });
    setNewNote('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{existingItem ? 'Edit Content' : 'New Content'} - {date}</h3>
          <button className="btn-secondary" onClick={onClose} style={{padding:'5px 10px'}}>✕</button>
        </div>
        
        <div className="modal-body">
          {/* Top Row: Title & Time */}
          <div className="form-row">
             <div>
                <label className="menu-label">Title</label>
                <input className="form-input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Post Hook / Title" />
             </div>
             <div>
                <label className="menu-label">Post Time</label>
                <input className="form-input" type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
             </div>
          </div>

          {/* Second Row: Type & Status */}
          <div className="form-row">
            <div>
                <label className="menu-label">Type</label>
                <select className="form-select" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="post">📝 LinkedIn Post</option>
                    <option value="poll">📊 LinkedIn Poll</option>
                </select>
            </div>
            <div>
                <label className="menu-label">Status</label>
                <select className="form-select" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="in_progress">🚧 In Progress</option>
                    <option value="waiting_approval">✋ Waiting Approval</option>
                    <option value="revision_needed">⚠️ Revision Needed</option>
                    <option value="scheduled">✅ Scheduled</option>
                </select>
            </div>
          </div>

          {/* Assignment Row */}
          <div style={{marginBottom:'1rem'}}>
             <label className="menu-label">Assigned To</label>
             <div style={{display:'flex', gap:'1rem'}}>
                <button 
                    type="button"
                    className={`btn ${formData.assignedTo === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFormData({...formData, assignedTo: 'admin'})}
                    style={{flex:1, padding:'0.5rem'}}
                >
                    👻 Ghostwriter
                </button>
                <button 
                    type="button"
                    className={`btn ${formData.assignedTo === 'client' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFormData({...formData, assignedTo: 'client'})}
                    style={{flex:1, padding:'0.5rem'}}
                >
                    👤 Client
                </button>
             </div>
          </div>

          {/* Content Area */}
          <div style={{marginBottom:'1rem'}}>
            <label className="menu-label">Content / Copy</label>
            <textarea 
                className="form-input" 
                rows="6" 
                value={formData.content} 
                onChange={e => setFormData({...formData, content: e.target.value})}
                placeholder="Write the LinkedIn post content here..."
            ></textarea>
          </div>

          {/* Notes Section */}
          <div className="notes-section">
            <label className="menu-label">Internal Notes</label>
            
            {formData.notes.length > 0 && (
                <div className="note-list">
                    {formData.notes.map((note, idx) => (
                        <div key={idx} className="note-item">
                            <div className="note-meta">
                                <span>{note.author}</span>
                                <span>{note.date}</span>
                            </div>
                            <div>{note.text}</div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{display:'flex', gap:'0.5rem'}}>
                <input 
                    className="form-input" 
                    style={{marginBottom:0}}
                    placeholder="Add a note..." 
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addNote()}
                />
                <button className="btn btn-secondary" onClick={addNote}>Send</button>
            </div>
          </div>

          <div style={{marginTop:'2rem'}}>
             <button className="btn btn-primary" style={{width:'100%'}} onClick={handleSave}>
                {existingItem ? 'Save Changes' : 'Create Content'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- VIEW: CALENDAR ---------------- */

function ViewCalendar({ content, updateContent, user }) {
  const [selectedClientId, setSelectedClientId] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const year = 2026, month = 0;
  const days = generateCalendarDays(year, month);
  
  // Filter content by selected Client
  const filteredContent = content.filter(c => c.clientId === Number(selectedClientId));

  const handleDayClick = (day) => {
    if (!day) return;
    const dateStr = `2026-01-${String(day).padStart(2,'0')}`;
    
    // Check if user clicked an existing item (handled in item click, but failsafe here)
    setSelectedDate(dateStr);
    setEditingItem(null); // Default to new item
    setModalOpen(true);
  };

  const handleItemClick = (e, item) => {
    e.stopPropagation(); // Don't trigger day click
    setSelectedDate(item.date);
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSaveContent = (item) => {
    updateContent(item);
  };

  return (
    <div>
      {/* 1. Client Dropdown Header */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
          <h1>Content Calendar</h1>
          
          {user.role === 'admin' && (
              <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                  <span style={{color:'var(--text-secondary)'}}>Viewing Client:</span>
                  <select 
                    className="form-select" 
                    style={{marginBottom:0, width:'200px'}}
                    value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                  >
                      {MOCK_USERS.filter(u => u.role === 'client').map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                  </select>
              </div>
          )}
      </div>

      {/* 2. Calendar Grid */}
      <div className="calendar-grid">
        <div className="calendar-weekdays">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="weekday">{d}</div>)}
        </div>
        <div className="calendar-days">
          {days.map((day, i) => {
            const dateStr = day ? `2026-01-${String(day).padStart(2,'0')}` : '';
            const dayContent = filteredContent.filter(c => c.date === dateStr);
            
            return (
              <div 
                key={i} 
                className={`calendar-day ${!day ? '' : 'hover-day'}`}
                onClick={() => handleDayClick(day)}
                style={{cursor: day ? 'pointer' : 'default'}}
              >
                {day && (
                  <>
                    <div style={{fontWeight:'bold', marginBottom:'5px', color:'var(--text-secondary)'}}>{day}</div>
                    
                    {dayContent.map(c => {
                        // Determine status class
                        let statusClass = 'status-in-progress';
                        if(c.status === 'waiting_approval') statusClass = 'status-waiting';
                        if(c.status === 'revision_needed') statusClass = 'status-revision';
                        if(c.status === 'scheduled') statusClass = 'status-scheduled';

                        return (
                          <div 
                            key={c.id} 
                            className={`content-item ${c.type}`}
                            onClick={(e) => handleItemClick(e, c)}
                          >
                            <div style={{display:'flex', justifyContent:'space-between'}}>
                                <span>{c.type==='post'?'📝':'📊'} {c.time}</span>
                                {c.assignedTo === 'client' && <span>👤</span>}
                            </div>
                            <div style={{marginTop:'2px', fontWeight:'600'}}>{c.title || 'Untitled'}</div>
                            <div className={`status-badge ${statusClass}`} style={{marginTop:'4px', display:'inline-block', fontSize:'0.6rem', padding:'2px 6px'}}>
                                {c.status.replace('_', ' ')}
                            </div>
                          </div>
                        );
                    })}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. The Popup Modal */}
      <ContentModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        date={selectedDate}
        existingItem={editingItem}
        onSave={handleSaveContent}
        user={user}
        selectedClient={Number(selectedClientId)}
      />
    </div>
  );
}

/* ---------------- VIEW: UPCOMING LIST ---------------- */

function ViewUpcoming({ content }) {
    // Simple list view of the same content
    return (
        <div>
            <h1>Upcoming Posts</h1>
            <div className="card">
                <table className="table">
                    <thead><tr><th>Date</th><th>Type</th><th>Client</th><th>Status</th></tr></thead>
                    <tbody>
                        {content.map(c => (
                            <tr key={c.id}>
                                <td>{c.date}</td>
                                <td>{c.type}</td>
                                <td>Client #{c.clientId}</td>
                                <td>{c.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ---------------- APP ORCHESTRATOR ---------------- */

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('calendar');
  const [content, setContent] = useState(INITIAL_CONTENT);

  // Helper to add or update content
  const updateContent = (item) => {
    setContent(prev => {
        const exists = prev.find(c => c.id === item.id);
        if (exists) {
            return prev.map(c => c.id === item.id ? item : c);
        } else {
            return [...prev, item];
        }
    });
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="app-layout">
      <Sidebar user={user} view={view} setView={setView} logout={() => setUser(null)} />
      <main className="main-content">
        {view === 'calendar' && (
            <ViewCalendar 
                content={content} 
                updateContent={updateContent} 
                user={user} 
            />
        )}
        {view === 'upcoming' && <ViewUpcoming content={content} />}
        {view === 'clients' && <h1>Client Management</h1>}
        {view === 'add-client' && <h1>Add Client</h1>}
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
