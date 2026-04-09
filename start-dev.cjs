const path = require('path');
require('child_process').spawn('npx', ['vite', '--port', '5177'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname)
});
