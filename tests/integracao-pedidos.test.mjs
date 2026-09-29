import test from 'node:test';
import assert from 'node:assert/strict';
import { receberPedido } from '../src/lib/integracao-pedidos.ts';

const payload = { external_id: 'pedido-123', cliente_nome: 'Cliente teste', cliente_whatsapp: '48999999999', data_entrega: '2026-10-01', itens: [{ nome: 'Cesta', preco: 120, qtd: 1 }] };
const token = 'a'.repeat(40);
const req = (body = payload, headers = {}) => new Request('https://flua.test/api/integracoes/pedidos', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const success = { ok: true, id: '00000000-0000-4000-8000-000000000001', numero: 1, duplicado: false };
test('rejeita ausência de autenticação sem chamar o banco', async () => {
  const response = await receberPedido(req(payload, { authorization: '' }), () => { throw new Error('não deve chamar'); });
  assert.equal(response.status, 401);
});
test('rejeita JSON, data e quantidade inválidos', async () => {
  for (const input of ['{', { ...payload, data_entrega: '2026-02-30' }, { ...payload, itens: [{ nome: 'Cesta', preco: 120, qtd: -1 }] }]) {
    assert.equal((await receberPedido(req(input), async () => success)).status, 400);
  }
});
test('limita corpo mesmo sem content-length', async () => {
  assert.equal((await receberPedido(req(' '.repeat(65537)), async () => success)).status, 413);
});
test('ignora empresa e status recebidos e conserva os dados de entrega', async () => {
  const response = await receberPedido(req({ ...payload, company_id: 'outra-empresa', status: 'entregue', endereco: 'Rua teste', taxa_entrega: 10 }), async (receivedToken, data) => {
    assert.equal(receivedToken, token);
    assert.equal(data.company_id, undefined);
    assert.equal(data.status, undefined);
    assert.equal(data.endereco, 'Rua teste');
    assert.equal(data.taxa_entrega, 10);
    return success;
  });
  assert.equal(response.status, 201);
});
test('reenvio confirmado pela RPC retorna o mesmo pedido', async () => {
  const response = await receberPedido(req(), async () => ({ ...success, duplicado: true }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).id, success.id);
});
test('propaga recusa e limite sem vazar detalhes internos', async () => {
  for (const status of [401, 429]) {
    const response = await receberPedido(req(), async () => ({ ok: false, status, code: 'detalhe privado' }));
    assert.equal(response.status, status);
    assert.ok(!(await response.text()).includes('privado'));
    if (status === 429) assert.equal(response.headers.get('retry-after'), '600');
  }
  const response = await receberPedido(req(), async () => { throw new Error('segredo'); });
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('segredo'));
});
