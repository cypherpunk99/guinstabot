
'use strict';

const electron = require('electron');
const ipc = require('electron').ipcMain; 
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const path = require('path');
const url = require('url');

const autoUpdater = require("electron-updater").autoUpdater;
autoUpdater.logger = require("electron-log")
autoUpdater.logger.transports.file.level = "info"

var mainWindow = null;

ipc.on('user_add', (event, user) => {
  mainWindow.webContents.send('add', user);
});

ipc.on('user_edit', (event, user) => {
  mainWindow.webContents.send('edit', user);
});

ipc.on('task_complete_event', (event, taskName, ...params) => {
  mainWindow.webContents.send('task_complete', taskName, params);
});

ipc.on('add_task_event', (event, taskName, ...params) => {
  mainWindow.webContents.send('add_task', taskName, params);
});

app.on('window-all-closed', function() {
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('ready', function() {
  mainWindow = new BrowserWindow({width: 800, height: 600});
  mainWindow.setMenu(null)
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));
  mainWindow.on('closed', function() {
    mainWindow = null;
  });
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('sync_db');
  })
  mainWindow.webContents.openDevTools()
});

 

