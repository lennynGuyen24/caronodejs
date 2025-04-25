//Gỡ dịch vụ khỏi Windows Service
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'CaroNodeJSService',
  script: 'C:\\Users\\Administrator\\Documents\\GitHub\\caronodejs\\server.js'
});

svc.on('uninstall', () => {
  console.log('Service uninstalled');
});

svc.uninstall();