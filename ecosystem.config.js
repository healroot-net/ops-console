module.exports = {
  apps: [
    {
      name: 'ops-console',
      script: '.next/standalone/server.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 9998,
        HOSTNAME: '0.0.0.0'
      }
    }
  ]
};
