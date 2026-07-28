module.exports = {
  apps: [
    {
      name: "nexus-backend",
      script: "src/server.js",
      instances: "max",
      exec_mode: "cluster",
      env: { PORT: 5000, NODE_ENV: "production" },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
  ],
};
