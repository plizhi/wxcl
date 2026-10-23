// 同一份配置服务生产和开发两个实例，用 APP_TARGET 区分：
//   生产：pm2 start ecosystem.config.cjs                 → wxcl-v2     :3006 (cluster)
//   开发：APP_TARGET=dev pm2 start ecosystem.config.cjs  → wxcl-v2-dev :3011 (fork)
const dev = process.env.APP_TARGET === 'dev';

module.exports = {
  apps: [
    {
      name: dev ? 'wxcl-v2-dev' : 'wxcl-v2',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: __dirname,
      instances: 1,
      exec_mode: dev ? 'fork' : 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: dev ? 3011 : 3006,
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
    },
  ],
};
