//Gỡ dịch vụ khỏi Windows Service
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'CaroNodeJSService',
  script: 'D:\\caronodejs_git\\server.js'
});

svc.on('uninstall', () => {
  console.log('Service uninstalled');
});

svc.uninstall();