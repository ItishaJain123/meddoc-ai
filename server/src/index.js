const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
