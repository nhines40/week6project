import { io } from "socket.io-client";
const React    = window.React;
const ReactDOM = window.ReactDOM;
const axios    = window.axios;
 
const socket = io(); 
 
socket.on('connect', () => {
  console.log('✅ Connected to the Socket.IO server (id =', socket.id, ')');
});
 
socket.on('message', (msg) => {
  console.log(`📨 Received message => ${msg}`);
  // You can update UI here – e.g. push the msg into a React state array.
});
 
socket.on('disconnect', () => {
  console.log('❌ Disconnected from Socket.IO server');
});
 
socket.on('connect_error', (err) => {
  console.error('⚠️ Connection error:', err);
});
 
/* -------------------------------------------------------------
   Helper to send a message to all other clients
   ------------------------------------------------------------- */
function broadcastMessage(text) {
  // Server expects the event name `message`
  socket.emit('message', text);
}
 
/* -------------------------------------------------------------
   OAuth helpers 
   ------------------------------------------------------------- */
const linkedinLogin = () => { window.location.href = '/auth/linkedin'; };
const googleLogin   = () => { window.location.href = '/auth/google'; };
 
/* -------------------------------------------------------------
   CRUD component 
   ------------------------------------------------------------- */
const Crud = () => {
  const [users, setUsers] = React.useState([]);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [highContrastMode, setHighContrastMode] = React.useState(false);
 
  // Load users once
  React.useEffect(() => {
    axios.get('/api/users')
      .then(r => setUsers(r.data))
      .catch(console.error);
  }, []);
 
  const createUser = (e) => {
    e.preventDefault();
    const nameValue  = document.getElementById('name').value;
    const emailValue = document.getElementById('email').value;
 
    axios.post('/api/users', { name: nameValue, email: emailValue })
      .then(r => {
        setUsers([...users, r.data]);
        // Example: broadcast the new user to other clients
        broadcastMessage(`New user: ${r.data.name} (${r.data.email})`);
        document.getElementById('name').value  = '';
        document.getElementById('email').value = '';
      })
      .catch(console.error);
  };
 
  // ... updateUser, deleteUser stay the same 
 
  const toggleHighContrastModeHandler = () => {
    setHighContrastMode(!highContrastMode);
  };
 
  return React.createElement(
    'div',
    {
      style: {
        textAlign: 'center',
        width: '100%',
        backgroundColor: highContrastMode ? 'black' : '',
        color: highContrastMode ? 'white' : ''
      }
    },
    React.createElement(
      'button',
      { onClick: toggleHighContrastModeHandler, style: { margin: '10px' } },
      'Toggle High Contrast Mode'
    ),
    React.createElement('h1', { style: { margin: '10px' } }, 'CRUD Operations'),
    /* ---------- FORM ---------- */
    React.createElement('form', { onSubmit: createUser, style: { margin: '10px' } },
      React.createElement('label', { style: { display: 'block', margin: '10px' } }, 'Name:'),
      React.createElement('input', { type: 'text', id: 'name', style: { width: '50%', margin: '10px' } }),
      React.createElement('br', null),
      React.createElement('label', { style: { display: 'block', margin: '10px' } }, 'Email:'),
      React.createElement('input', { type: 'email', id: 'email', style: { width: '50%', margin: '10px' } }),
      React.createElement('br', null),
      React.createElement('button', { type: 'submit', style: { margin: '10px' } }, 'Create')
    ),
    /* ---------- USER LIST ---------- */
    React.createElement('ul', { style: { listStyle: 'none', padding: '0', margin: '0' } },
      users.map(user =>
        React.createElement('li', { key: user._id, style: { margin: '10px' } },
          React.createElement('span', { style: { display: 'block', margin: '10px' } },
            `${user.name} (${user.email})`),
          /* ---- UPDATE FORM ---- */
          React.createElement('form', {
            onSubmit: e => {
              e.preventDefault();
              updateUser(user._id);
            },
            style: { margin: '10px' }
          },
            React.createElement('input', {
              type: 'text',
              id: `name-${user._id}`,
              defaultValue: user.name,
              style: { width: '50%', margin: '10px' }
            }),
            React.createElement('input', {
              type: 'email',
              id: `email-${user._id}`,
              defaultValue: user.email,
              style: { width: '50%', margin: '10px' }
            }),
            React.createElement('button', { type: 'submit', style: { margin: '10px' } }, 'Update')
          ),
          /* ---- DELETE BUTTON ---- */
          React.createElement('button', {
            onClick: () => deleteUser(user._id),
            style: { margin: '10px' }
          }, 'Delete')
        )
      )
    )
  );
};
 
const App = () => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [loginCode, setLoginCode]   = React.useState(null);
 
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('code')) {
      setLoginCode(params.get('code'));
      setIsLoggedIn(true);
    }
  }, []);
 
  return React.createElement(
    'div',
    null,
    !isLoggedIn && React.createElement(
      'div',
      { className: 'container' },
      React.createElement('h1', null, 'Social Media Login'),
      React.createElement('button', { id: 'linkedin-login', onClick: linkedinLogin }, 'Login with LinkedIn'),
      React.createElement('button', { id: 'google-login',   onClick: googleLogin   }, 'Login with Google')
    ),
    isLoggedIn && loginCode === 'linkedin' && React.createElement(Crud, null),
    isLoggedIn && loginCode === 'google'   && React.createElement(Crud, null)
  );
};
 
ReactDOM.render(
  React.createElement(App, null),
  document.getElementById('root')
);