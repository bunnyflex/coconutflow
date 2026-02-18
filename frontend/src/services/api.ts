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
  list(): Promise<FlowDefinition[]> {
    return request('/api/flows');
  },

  /** Get a single flow by ID */
  get(id: string): Promise<FlowDefinition> {
    return request(`/api/flows/${id}`);
  },

  /** Create a new flow */
  create(flow: FlowDefinition): Promise<FlowDefinition> {
    return request('/api/flows', {
      method: 'POST',
      body: JSON.stringify(transformFlowForBackend(flow)),
    });
  },

  /** Update an existing flow */
  update(id: string, flow: FlowDefinition): Promise<FlowDefinition> {
    return request(`/api/flows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transformFlowForBackend(flow)),
    });
  },

  /** Delete a flow */
  delete(id: string): Promise<void> {
    return request(`/api/flows/${id}`, { method: 'DELETE' });
  },

  /** Duplicate a flow — fetches original and saves a copy */
  async duplicate(id: string): Promise<FlowDefinition> {
    const original = await this.get(id);
    const copy = {
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} (copy)`,
      metadata: {
        ...original.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
    return this.create(copy as FlowDefinition);
  },

  /** Export flow as Python script */
  async exportPython(id: string): Promise<string> {
    const res = await fetch(`${BASE_URL}/api/flows/${id}/export/python`);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Export failed: ${res.status} ${body}`);
    }
    return res.text();
  },

  /** List featured templates */
  listFeatured(): Promise<FlowDefinition[]> {
    return request('/api/templates/featured');
  },

  /** List community-published templates */
  listCommunity(): Promise<FlowDefinition[]> {
    return request('/api/templates/community');
  },

  /** Clone a template as a new user flow */
  useTemplate(templateId: string): Promise<FlowDefinition> {
    return request(`/api/templates/${templateId}/use`, { method: 'POST' });
  },

  /** List flows, optionally filtered by user ID */
  listByUser(userId?: string): Promise<FlowDefinition[]> {
    const params = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    return request(`/api/flows/${params}`);
  },
};

// ---------------------------------------------------------------------------
// Credentials API (Keys page)
// ---------------------------------------------------------------------------

export interface Credential {
  id: string;
  service_name: string;
  credential_name: string;
  created_at: string;
}

export interface CredentialCreate {
  service_name: string;
  credential_name: string;
  api_key: string;
}

export const credentialsApi = {
  list(): Promise<Credential[]> {
    return request('/api/credentials/');
  },
  create(data: CredentialCreate): Promise<Credential> {
    return request('/api/credentials/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  delete(id: string): Promise<void> {
    return request(`/api/credentials/${id}`, { method: 'DELETE' });
  },
};
