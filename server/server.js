const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const app = express();
const https = require('https');
const bodyParser = require('body-parser');
const WebSocket = require('ws');

const {
  LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  LINKEDIN_REDIRECT_URI,
  GOOGLE_REDIRECT_URI,
  MONGO_URI
} = process.env;

app.use(bodyParser.json());

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const User = mongoose.model('loginCredentials', {
  name: String,
  email: String,
  linkedinId: String,
  googleId: String,
});

const linkedinClientId = LINKEDIN_CLIENT_ID;
const linkedinClientSecret = LINKEDIN_CLIENT_SECRET;
const googleClientId = GOOGLE_CLIENT_ID;
const googleClientSecret = GOOGLE_CLIENT_SECRET;


const linkedinRedirectUrl = LINKEDIN_REDIRECT_URI;
const googleRedirectUrl = GOOGLE_REDIRECT_URI;

axios.defaults.httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    console.log(`Received message => ${message}`);
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

app.get('/api/users', (req, res) => {
  User.find()
    .then(users => {
      res.status(200).json(users);
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ message: 'Error fetching users' });
    });
});

app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  const user = new User({ name, email });
  user.save()
    .then(() => {
      res.status(201).json(user);
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ message: 'Error creating user' });
    });
});

app.put('/api/users/:id', (req, res) => {
  const { name, email } = req.body;
  User.findByIdAndUpdate(req.params.id, { name, email }, { new: true })
    .then(user => {
      res.status(200).json(user);
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ message: 'Error updating user' });
    });
});

app.delete('/api/users/:id', (req, res) => {
  User.findByIdAndDelete(req.params.id)
    .then(() => {
      res.status(200).json({ message: 'User deleted successfully' });
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ message: 'Error deleting user' });
    });
});

app.get('/auth/linkedin', (req, res) => {
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${linkedinClientId}&redirect_uri=${linkedinRedirectUrl}&state=foobar&scope=liteprofile%20emailaddress%20w_member_social`;
  res.redirect(url);
});

app.get('/auth/linkedin/callback', (req, res) => {
  const code = req.query.code;
  const state = req.query.state;

  axios.post(`https://www.linkedin.com/oauth/v2/accessToken`, {
    grant_type: 'authorization_code',
    code: code,
    client_id: linkedinClientId,
    client_secret: linkedinClientSecret,
    redirect_uri: linkedinRedirectUrl,
  })
    .then(response => {
      const accessToken = response.data.access_token;

      return axios.get(`https://api.linkedin.com/v2/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    })
    .then(response => {
      const userProfile = response.data;

      const user = new User({
        name: userProfile.firstName + ' ' + userProfile.lastName,
        email: userProfile.emailAddress,
        linkedinId: userProfile.id,
      });
      return user.save();
    })
    .then(() => {
      res.redirect('/?code=linkedin');
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ message: 'Error logging in with LinkedIn' });
    });
});

app.get('/auth/google', (req, res) => {
  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${googleClientId}&redirect_uri=${googleRedirectUrl}&scope=profile%20email`;
  res.redirect(url);
});

app.get('/auth/google/callback', (req, res) => {
  const code = req.query.code;

  axios.post(`https://oauth2.googleapis.com/token`, {
    grant_type: 'authorization_code',
    code: code,
    client_id: googleClientId,
    client_secret: googleClientSecret,
    redirect_uri: googleRedirectUrl,
  })
    .then(response => {
      const accessToken = response.data.access_token;
      return axios.get(`https://openidconnect.googleapis.com/v1/userinfo`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    })
    .then(response => {
      const userProfile = response.data;

      const user = new User({
        name: userProfile.name,
        email: userProfile.email,
        googleId: userProfile.sub,
      });
      return user.save();
    })
    .then(() => {
      res.redirect('/?code=google');
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ message: 'Error logging in with Google' });
    });
});

app.use(express.static('public'));

const port = 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
