import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('katha', {
  settingsGetApiKeys: () => ipcRenderer.invoke('settings:getApiKeys'),
  settingsSetApiKeys: (p: {
    openai?: string
    gemini?: string
    deepseek?: string
    leonardo?: string
  }) => ipcRenderer.invoke('settings:setApiKeys', p),
  settingsGetApiKeysRaw: () => ipcRenderer.invoke('settings:getApiKeysRaw'),
  settingsHasFileKeys: () => ipcRenderer.invoke('settings:hasFileKeys'),
  settingsDebugKeyPaths: () => ipcRenderer.invoke('settings:debugKeyPaths'),
  projectsList: () => ipcRenderer.invoke('projects:list'),
  projectsLoad: (id: string) => ipcRenderer.invoke('projects:load', id),
  projectsSave: (project: unknown) => ipcRenderer.invoke('projects:save', project),
  projectsDelete: (id: string) => ipcRenderer.invoke('projects:delete', id),
  aiComplete: (payload: {
    system: string
    user: string
    preferProvider?: 'openai' | 'gemini' | 'deepseek'
    maxTokens?: number
  }) => ipcRenderer.invoke('ai:complete', payload),
  leonardoGenerate: (payload: {
    prompt: string
    modelId?: string
    width?: number
    height?: number
    seed?: number
  }) => ipcRenderer.invoke('leonardo:generate', payload),
  backendGenerateKatha: (payload: {
    theme: string
    country: string
    genre: string
    length: string
    baseUrl?: string
  }) => ipcRenderer.invoke('backend:generateKatha', payload),
  uiShowContextMenu: (payload: { selectionText?: string; isEditable: boolean }) =>
    ipcRenderer.invoke('ui:showContextMenu', payload),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
})
