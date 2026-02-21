const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('uroflowDesktop', {
  platform: process.platform,
});
