module.exports = {
  apps: [
    {
      name: 'motocadena-admin',
      script: 'backend/server.js',
      cwd: '.',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: 3001,
        // El backend carga SUPABASE_URL y SUPABASE_SERVICE_KEY desde ./.env
      },
      watch: false,
      autorestart: true,
      max_memory_restart: '300M'
    }
  ]
};