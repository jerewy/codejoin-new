const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true, service: "playground-terminal" }));

app.post('/execute', (req, res) => {
  const { language = "node", code = "console.log('Hello')" } = req.body || {};
  // For now this just echoes back; we’ll hook Docker later
  res.json({ received: { language, code }, result: "fake executor (learning mode)" });
});

const port = process.env.PORT || 3100;
app.listen(port, () => console.log(`Playground API running on http://localhost:${port}`));
