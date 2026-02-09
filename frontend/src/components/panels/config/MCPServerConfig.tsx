import type { NodeConfig, MCPServerConfig } from '../../../types/flow';

interface Props {
  nodeId: string;
  config: NodeConfig;
  onChange: (c: NodeConfig) => void;
}

export default function MCPServerConfigForm({ config, onChange }: Props) {
  const cfg = config as MCPServerConfig;

  const update = (partial: Partial<MCPServerConfig>) => {
    onChange({ ...cfg, ...partial });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Server Name</label>
        <input
          type="text"
          value={cfg.server_name}
          onChange={(e) => update({ server_name: e.target.value })}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
          placeholder="filesystem"
        />
        <p className="mt-1 text-xs text-gray-500">
          Human-readable name for the MCP server.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Server URL/Command</label>
        <input
          type="text"
          value={cfg.server_url}
          onChange={(e) => update({ server_url: e.target.value })}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
          placeholder="npx @modelcontextprotocol/server-filesystem"
        />
        <p className="mt-1 text-xs text-gray-500">
          Command for stdio servers, or URL for SSE/HTTP servers.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Server Type</label>
        <select
          value={cfg.server_type}
          onChange={(e) => update({ server_type: e.target.value as 'stdio' | 'sse' | 'http' })}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
        >
          <option value="stdio">stdio</option>
          <option value="sse">sse</option>
          <option value="http">http</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Communication protocol for the MCP server.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Instructions</label>
        <textarea
          value={cfg.instructions || ''}
          onChange={(e) => update({ instructions: e.target.value || null })}
          rows={3}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
          placeholder="Optional instructions for the agent..."
        />
        <p className="mt-1 text-xs text-gray-500">
          Additional context or instructions for using this MCP server.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Credential ID</label>
        <input
          type="text"
          value={cfg.credential_id || ''}
          onChange={(e) => update({ credential_id: e.target.value || null })}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
          placeholder="Optional credential ID"
        />
        <p className="mt-1 text-xs text-gray-500">
          Optional credential for authenticated MCP servers.
        </p>
      </div>
    </div>
  );
}
