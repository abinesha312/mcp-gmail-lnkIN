import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export interface Field {
  key:     string;
  label:   string;
  secret?: boolean;
  hint?:   string;
}

export interface ServiceInfo {
  id:          string;
  label:       string;
  authType:    "oauth" | "apikey" | "credentials";
  fields:      Field[];
  configured:  boolean;
  hasOAuth:    boolean;
  keyCount:    number;
  lastUpdated: number | null;
  oauthUrl?:   string | null;
}

export const fetchServices  = () => api.get<ServiceInfo[]>("/services").then(r => r.data);
export const fetchService   = (id: string) =>
  api.get<ServiceInfo & { credentials: Record<string,string> }>(`/services/${id}`).then(r => r.data);
export const saveService    = (id: string, credentials: Record<string,string>) =>
  api.post(`/services/${id}`, { credentials }).then(r => r.data);
export const deleteService  = (id: string) => api.delete(`/services/${id}`).then(r => r.data);
export const invokeTool     = (tool: string, args: Record<string,any>) =>
  api.post("/tools/invoke", { tool, args }).then(r => r.data);
