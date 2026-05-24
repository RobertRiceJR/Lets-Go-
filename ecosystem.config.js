const path = require('path');

// PM2 process configuration for local / spare-PC self-hosting.
// Run from anywhere — all paths are absolute via __dirname.
module.exports = {
  apps: [
    {
      name: 'lets-go',
      script: 'npm',
      args: 'start',

      // Always resolve relative to this file, regardless of where pm2 was launched from
      cwd: __dirname,

      watch: false,           // Never restart on file changes in production
      max_memory_restart: '500M',

      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        // Absolute path — works no matter where PM2 was launched from
        DB_PATH: path.join(__dirname, 'server', 'data', 'db.sqlite'),
      },

      out_file: path.join(__dirname, 'logs', 'out.log'),
      error_file: path.join(__dirname, 'logs', 'error.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
