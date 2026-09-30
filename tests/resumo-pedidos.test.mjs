import test from 'node:test';
import assert from 'node:assert/strict';
import { resumoPedidos, saiuDoQuadro } from '../src/lib/resumo-pedidos.ts';
const now = new Date('2026-09-30T15:00:00Z');
const base = {status:'novo', total:100, created_at:'2026-09-01T12:00:00Z', recebido_em:null, data_entrega:'2026-09-30'};
test('mês segue criação: exclui recebimentos de pedidos antigos e cancelados', () => {
 const rows=[base,{...base,total:225,created_at:'2026-08-26T12:00:00Z',recebido_em:'2026-09-01'}, {...base,total:424,created_at:'2026-08-31T12:00:00Z',recebido_em:'2026-09-01'},{...base,status:'cancelado'},{...base,created_at:'2026-10-01T12:00:00Z'}];
 const r=resumoPedidos(rows,now); assert.equal(r.faturamentoMes,100);assert.equal(r.numMes,1);
});
test('virada do mês usa São Paulo', () => {
 assert.equal(resumoPedidos([{...base,created_at:'2026-10-01T02:59:59Z'}, {...base,created_at:'2026-09-01T02:59:59Z'}],now).numMes,1);
});
test('entrega antiga paga sai mesmo marcada como concluída hoje; sem pagamento permanece', () => {
 const p={...base,status:'entregue',data_entrega:'2026-08-27',entregue_em:now.toISOString(),recebido_em:'2026-09-01'};
 assert.equal(saiuDoQuadro(p,now),true);assert.equal(saiuDoQuadro({...p,recebido_em:null},now),false);
 assert.equal(saiuDoQuadro({...p,data_entrega:'2026-09-30'},now),false);
});
test('sem data programada usa conclusão; sem datas permanece', () => {
 const p={...base,status:'entregue',data_entrega:null,recebido_em:'2026-09-01'};
 assert.equal(saiuDoQuadro({...p,entregue_em:'2026-09-30T02:00:00Z'},now),true);
 assert.equal(saiuDoQuadro(p,now),false);
});
