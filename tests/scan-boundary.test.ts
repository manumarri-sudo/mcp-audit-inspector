import { describe, it, expect } from 'vitest';
import { POST } from '../app/api/scan/route';
import { requestScan } from '../lib/request_scan';

describe('unscanned input cannot receive a clean score', () => {
  for (const config of ['{"mcpServers":{"local":{"command":"example"}}}', '{"mcpServers":{}}', '{"tools":[]}', '{"tools":[{"name":"no-description"}]}']) {
    it(`rejects ${config}`, async () => {
      const result = await POST(new Request('http://localhost/api/scan', { method: 'POST', body: JSON.stringify({ config }) }));
      expect(result.status).toBe(422); expect((await result.json()).summary).toBeUndefined();
    });
  }
  it('continues to score an actual benign description', async () => {
    const result = await POST(new Request('http://localhost/api/scan', { method: 'POST', body: JSON.stringify({ config: 'Adds two integers.' }) }));
    expect(result.status).toBe(200); expect((await result.json()).summary.score).toBe(100);
  });
  it('rejects HTTP failures rather than returning an error body as a result', async () => {
    const failing = (async () => new Response('{"error":"too large"}', {status:413})) as typeof fetch;
    await expect(requestScan('text', failing)).rejects.toThrow('Scan failed');
  });
  it('rejects missing result fields even when HTTP status is successful', async () => {
    const incomplete = (async () => new Response('{}')) as typeof fetch;
    await expect(requestScan('text', incomplete)).rejects.toThrow('incomplete');
  });
});
