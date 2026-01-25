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

/* ---------------- AUTH & LAYOUT ---------------- */

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

/* ---------------- COMPONENT: CONTENT MODAL ---------------- */

function ContentModal({ isOpen, onClose, date, existingItem, onSave, user, selectedClient }) {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    title: '', type: 'post', status: 'in_progress', 
    content: '', assignedTo: 'admin', time: '09:00', notes: []
  });
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    if (existingItem) {
      setFormData(existingItem);
    } else {
      setFormData({
        id: Date.now(), clientId: selectedClient, date: date,
        title: '', type: 'post', status: 'in_progress', 
        content: '', assignedTo: 'admin', time: '09:00', notes: []
      });
    }
    setNewNote('');
  }, [existingItem, date, isOpen]);

  const handleSave = () => { onSave(formData); onClose(); };

  const addNote = () => {
    if (!newNote.trim()) return;
    const noteObj = { author: user.name, text: newNote, date: new Date().toLocaleDateString() };
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
          <div className="form-row">
             <div><label className="menu-label">Title</label><input className="form-input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
             <div><label className="menu-label">Time</label><input className="form-input" type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} /></div>
          </div>
          <div className="form-row">
            <div>
                <label className="menu-label">Type</label>
                <select className="form-select" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="post">📝 Post</option><option value="poll">📊 Poll</option>
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
          <div style={{marginBottom:'1rem'}}>
             <label className="menu-label">Assigned To</label>
             <div style={{display:'flex', gap:'1rem'}}>
                <button type="button" className={`btn ${formData.assignedTo === 'admin' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFormData({...formData, assignedTo: 'admin'})} style={{flex:1, padding:'0.5rem'}}>👻 Ghostwriter</button>
                <button type="button" className={`btn ${formData.assignedTo === 'client' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFormData({...formData, assignedTo: 'client'})} style={{flex:1, padding:'0.5rem'}}>👤 Client</button>
             </div>
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label className="menu-label">Content</label>
            <textarea className="form-input" rows="6" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}></textarea>
          </div>
          <div className="notes-section">
            <label className="menu-label">Notes</label>
            {formData.notes.length > 0 && (
                <div className="note-list">{formData.notes.map((n, i) => <div key={i} className="note-item"><b>{n.author}:</b> {n.text}</div>)}</div>
            )}
            <div style={{display:'flex', gap:'0.5rem'}}>
                <input className="form-input" style={{marginBottom:0}} placeholder="Add note..." value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()} />
                <button className="btn btn-secondary" onClick={addNote}>Send</button>
            </div>
          </div>
          <div style={{marginTop:'2rem'}}><button className="btn btn-primary" style={{width:'100%'}} onClick={handleSave}>Save Changes</button></div>
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
  
  // Admin sees selected client, Client only sees themselves
  const targetId = user.role === 'admin' ? Number(selectedClientId) : user.id;
  const filteredContent = content.filter(c => c.clientId === targetId);

  const handleDayClick = (day) => {
    if (!day) return;
    const dateStr = `2026-01-${String(day).padStart(2,'0')}`;
    setSelectedDate(dateStr); setEditingItem(null); setModalOpen(true);
  };

  const handleItemClick = (e, item) => {
    e.stopPropagation();
    setSelectedDate(item.date); setEditingItem(item); setModalOpen(true);
  };

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
          <h1>Content Calendar</h1>
          {user.role === 'admin' && (
              <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                  <span style={{color:'var(--text-secondary)'}}>Client:</span>
                  <select className="form-select" style={{marginBottom:0, width:'200px'}} value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                      {MOCK_USERS.filter(u => u.role === 'client').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
              </div>
          )}
      </div>
      <div className="calendar-grid">
        <div className="calendar-weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="weekday">{d}</div>)}</div>
        <div className="calendar-days">
          {days.map((day, i) => {
            const dateStr = day ? `2026-01-${String(day).padStart(2,'0')}` : '';
            const dayContent = filteredContent.filter(c => c.date === dateStr);
            return (
              <div key={i} className={`calendar-day ${!day ? '' : 'hover-day'}`} onClick={() => handleDayClick(day)} style={{cursor: day ? 'pointer' : 'default'}}>
                {day && (
                  <>
                    <div style={{fontWeight:'bold', marginBottom:'5px', color:'var(--text-secondary)'}}>{day}</div>
                    {dayContent.map(c => {
                        let statusClass = 'status-in-progress';
