import { readPort } from './config.js';
import { createApp } from './app.js';

try {
  const port = readPort();
  const server = createApp().listen(port, () => {
    console.info(`Tùng Thiện QR Generator: http://localhost:${port}`);
  });
  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE'
      ? 'Không thể khởi động: cổng đang được sử dụng.'
      : 'Không thể khởi động HTTP server.');
    process.exitCode = 1;
  });
} catch {
  console.error('Không thể khởi động: kiểm tra cấu hình server.');
  process.exitCode = 1;
}
