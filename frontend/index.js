const express = require('express');
const fetch = require('node-fetch'); // Make sure node-fetch is installed
const app = express();

// Flask backend will be running on localhost:5000 from the perspective of the Express app
const apiBaseUrl = 'http://localhost:5000'; 

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // If you have static assets like CSS, JS

app.get('/', (req, res) => {
  res.render('form', { error: null });
});

app.post('/submit', async (req, res) => {
  try {
    // Send request to Flask backend
    const response = await fetch(`${apiBaseUrl}/api/submit`, { // Flask route is /api/submit
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    if (response.ok) {
      res.redirect('/success');
    } else {
      const errorText = await response.text();
      console.error('Error from backend:', errorText);
      res.render('form', { error: `Backend Error: ${errorText}` });
    }
  } catch (error) {
    console.error('Error during backend fetch:', error.message);
    res.render('form', { error: `Frontend Error: ${error.message}` });
  }
});

app.get('/success', (req, res) => {
  res.send('<h1>Data submitted successfully!</h1><p><a href="/">Go back to form</a></p>');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Express frontend listening on port ${PORT}`);
});

