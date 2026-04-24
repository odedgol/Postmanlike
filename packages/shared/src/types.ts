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

export type AuthType = 'none' | 'api-key' | 'bearer' | 'basic' | 'aws-sigv4';

export interface ApiKeyAuth {
  type: 'api-key';
  key: string;
  value: string;
  location: 'header' | 'query';
}

export interface BearerAuth {
  type: 'bearer';
  token: string;
}

export interface BasicAuth {
  type: 'basic';
  username: string;
  password: string;
}

export interface AwsSigV4Auth {
  type: 'aws-sigv4';
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service: string;
  sessionToken?: string;
}

export interface NoAuth {
  type: 'none';
}

export type RequestAuth = NoAuth | ApiKeyAuth | BearerAuth | BasicAuth | AwsSigV4Auth;

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
  preScript?: string;
  testScript?: string;
  auth?: RequestAuth;
}

export interface ProxyRequestPayload {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  auth?: RequestAuth;
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

export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  order: number;
  values: EnvironmentVariable[];
}

export interface GlobalsRow {
  key: 'default';
  values: EnvironmentVariable[];
}

export interface ActiveEnvRow {
  key: 'default';
  environmentId: string | null;
}

// Flows

export type FlowStepKind = 'request' | 'evaluate' | 'delay';

export interface RequestStep {
  id: string;
  kind: 'request';
  outputName: string;
  draft: RequestDraft;
}

export interface EvaluateStep {
  id: string;
  kind: 'evaluate';
  outputName: string;
  expression: string;
}

export interface DelayStep {
  id: string;
  kind: 'delay';
  ms: number;
}

export type FlowStep = RequestStep | EvaluateStep | DelayStep;

export interface Flow {
  id: string;
  name: string;
  order: number;
  steps: FlowStep[];
}

// Scripting

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error';

export interface ConsoleEntry {
  id: string;
  timestamp: number;
  level: ConsoleLevel;
  args: string[];
  phase: 'pre-request' | 'test';
}

export interface TestResult {
  name: string;
  pass: boolean;
  message?: string;
}

export interface ScriptError {
  message: string;
  stack?: string;
}

export interface PreScriptOutcome {
  envPatch: Record<string, string>;
  globalsPatch: Record<string, string>;
  consoleEntries: ConsoleEntry[];
  error?: ScriptError;
}

export interface TestScriptOutcome {
  tests: TestResult[];
  consoleEntries: ConsoleEntry[];
  error?: ScriptError;
}
