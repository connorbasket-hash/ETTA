import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("ettaDesktop", {
  platform: process.platform,
});
