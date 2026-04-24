export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'
  | string;

export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
}

export type BodyMode = 'none' | 'raw-json' | 'raw-text' | 'form-url';

export interface RequestDraft {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  bodyMode: BodyMode;
  bodyRaw: string;
  bodyForm: KeyValue[];
}

export interface ProxyRequestPayload {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface ProxyResponsePayload {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodyEncoding: 'utf-8' | 'base64';
  timingMs: number;
  sizeBytes: number;
  url: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  requestSnapshot: RequestDraft;
  status: number;
  timingMs: number;
  sizeBytes: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  order: number;
}

export interface Folder {
  id: string;
  collectionId: string;
  parentId: string | null;
  name: string;
  order: number;
}

export interface SavedRequest {
  id: string;
  collectionId: string;
  folderId: string | null;
  order: number;
  draft: RequestDraft;
}

export interface PersistedTab {
  id: string;
  originId: string | null;
  originSnapshot: RequestDraft | null;
  draft: RequestDraft;
}

export interface PersistedTabsState {
  key: 'default';
  tabs: PersistedTab[];
  activeId: string;
}
