const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => res.render('form', { error: null }));

app.post('/submit', async (req, res) => {
	  try {
		      const resp = await fetch('http://backend:5000/submit', {
			            method: 'POST',
			            headers: { 'Content-Type': 'application/json' },
			            body: JSON.stringify(req.body)
			          });
		      if (resp.ok) res.redirect('/success');
		      else {
			            const err = await resp.text();
			            res.render('form', { error: err });
			          }
		    } catch (e) {
			        res.render('form', { error: e.message });
			      }
});

app.get('/success', (req, res) => res.send('Data submitted successfully!'));
app.listen(3000, () => console.log('Frontend listening on 3000'));

