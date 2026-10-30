// Safe bridge between the renderer and the main process.
const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);
const on = (channel) => (fn) => {
  const handler = (_e, payload) => fn(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('api', {
  init: invoke('app:init'),
  gameInfo: invoke('game:info'),
  setSettings: invoke('settings:set'),
  setGameSettings: invoke('settings:setGame'),
  listHistory: invoke('history:list'),
  addDraw: invoke('history:add'),
  removeDraw: invoke('history:remove'),
  downloadHistory: invoke('history:download'),
  importHistory: invoke('history:import'),
  exportHistory: invoke('history:export'),
  report: invoke('engine:report'),
  filters: invoke('engine:filters'),
  generate: invoke('engine:generate'),
  backtest: invoke('engine:backtest'),
  untilHit: invoke('engine:untilHit'),
  cancel: invoke('job:cancel'),
  onProgress: on('job:progress'),
  window: invoke('win:action'),
  openExternal: invoke('app:openExternal'),
});
