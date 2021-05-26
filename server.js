const express = require('express');
const connectDB = require('./config/db');
const path = require('path');
const app = express();

//Connect Database
connectDB();

//Init Middleware
app.use(express.json({ extended: false }));

app.get('/', (req, res) => res.send('API is Live and Running Perfectly'));

//Define Routes
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/postjob', require('./routes/api/postjob'));
app.use('/api/users', require('./routes/api/users'));
app.use('/api/recruiters', require('./routes/api/recruiters'));
app.use('/api/jobstatus', require('./routes/api/jobstatus'));
app.use('/home', require('./routes/api/postjob'));
const PORT = process.env.PORT || 1010;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
