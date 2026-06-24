/**
 * PM2 ecosystem file for production.
 * Usage (on VPS):
 *   pm2 start ecosystem.config.js
 *   pm2 save && pm2 startup
 */
export default {
  apps: [
    {
      name: "broker-platform",
      script: "server/server.js",
      cwd: "/var/www/broker-platform",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      error_file: "/var/log/broker-platform/error.log",
      out_file: "/var/log/broker-platform/out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
