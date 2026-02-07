/**
 * HTTP API client for flow CRUD operations.
 *
 * Endpoints:
 *   GET    /api/flows        — list flows
 *   GET    /api/flows/:id    — get single flow
 *   POST   /api/flows        — create flow
 *   PUT    /api/flows/:id    — update flow
 *   DELETE /api/flows/:id    — delete flow
 */

import type { FlowDefinition } from '../types/flow';
import { transformFlowForBackend } from './flowTransform';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface FlowListItem {
  id: string;
  name: string;
  description: string;
  metadata: { created_at: string; updated_at: string; version: number };
}

export const flowApi = {
  /** List all saved flows */
  list(): Promise<FlowListItem[]> {
    return request('/api/flows');
  },

  /** Get a single flow by ID */
  get(id: string): Promise<FlowListItem> {
    return request(`/api/flows/${id}`);
  },

  /** Create a new flow */
  create(flow: FlowDefinition): Promise<FlowListItem> {
    return request('/api/flows', {
      method: 'POST',
      body: JSON.stringify(transformFlowForBackend(flow)),
    });
  },

  /** Update an existing flow */
  update(id: string, flow: FlowDefinition): Promise<FlowListItem> {
    return request(`/api/flows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transformFlowForBackend(flow)),
    });
  },

  /** Delete a flow */
  delete(id: string): Promise<void> {
    return request(`/api/flows/${id}`, { method: 'DELETE' });
  },
};
