import assert from "node:assert/strict";
import { test } from "node:test";
import { interpretarPedidoCompleto, resolverEmpresa } from "./VoiceOrcamento";

test("interprets partial company and product names from a complete voice command", () => {
  const dados = interpretarPedidoCompleto(
    "Crie orçamento de filtro carvão ativado para a Wmed",
    [{ id: 7, nome: "Wmed Equipamentos Médicos", nome_fantasia: null }],
    [{ id: 12, nome: "Filtro de carvão ativado para equipamento XYZ" }],
    []
  );

  assert.deepEqual(dados, {
    empresaId: 7,
    tipoOrcamento: "produtos",
    itens: [{ tipo: "produto", id: 12, quantidade: 1 }],
    formaPagamento: "",
    condicaoPagamento: "",
    descontoPercentual: "",
    descontoValor: "",
    prazoEntrega: "",
    frete: "",
    responsavel: "",
    informacoesAdicionais: "",
  });
});

test("reads spoken quantity and leaves optional payment information blank", () => {
  const dados = interpretarPedidoCompleto(
    "Orçamento para Wmed, duas unidades de filtro carvão ativado",
    [{ id: 7, nome: "Wmed Equipamentos Médicos", nome_fantasia: null }],
    [{ id: 12, nome: "Filtro de carvão ativado para equipamento XYZ" }],
    []
  );

  assert.equal(dados?.itens[0]?.quantidade, 2);
  assert.equal(dados?.formaPagamento, "");
});

test("recognizes payment, discounts, delivery, freight, owner, and additional information", () => {
  const dados = interpretarPedidoCompleto(
    "Orçamento para Clínica Central, 2 luva nitrílica, boleto em 30 dias, desconto de 10 por cento, desconto em R$ 20, prazo de entrega 5 dias úteis, frete de 15 reais, responsável João, informações adicionais: entregar na recepção.",
    [{ id: 1, nome: "Clínica Central", nome_fantasia: null }],
    [{ id: 2, nome: "Luva nitrílica" }],
    []
  );

  assert.equal(dados?.formaPagamento, "boleto");
  assert.equal(dados?.condicaoPagamento, "boleto em 30 dias");
  assert.equal(dados?.descontoPercentual, "10");
  assert.equal(dados?.descontoValor, "20");
  assert.equal(dados?.prazoEntrega, "5 dias uteis");
  assert.equal(dados?.frete, "15");
  assert.equal(dados?.responsavel, "João");
  assert.equal(dados?.informacoesAdicionais, "Observações: entregar na recepção.");
});

test("leaves optional conditions empty when they are not spoken", () => {
  const dados = interpretarPedidoCompleto(
    "Orçamento para Clínica Central, 2 luva nitrílica.",
    [{ id: 1, nome: "Clínica Central", nome_fantasia: null }],
    [{ id: 2, nome: "Luva nitrílica" }],
    []
  );

  assert.ok(dados);
  assert.equal(dados.formaPagamento, "");
  assert.equal(dados.condicaoPagamento, "");
  assert.equal(dados.descontoPercentual, "");
  assert.equal(dados.descontoValor, "");
  assert.equal(dados.prazoEntrega, "");
  assert.equal(dados.frete, "");
  assert.equal(dados.responsavel, "");
  assert.equal(dados.informacoesAdicionais, "");
});

test("does not mistake the percentage for the cash discount in a single spoken phrase", () => {
  const dados = interpretarPedidoCompleto(
    "Clínica Central, 2 luva nitrílica, desconto 10 por cento e 20 reais.",
    [{ id: 1, nome: "Clínica Central", nome_fantasia: null }],
    [{ id: 2, nome: "Luva nitrílica" }],
    []
  );

  assert.equal(dados?.descontoPercentual, "10");
  assert.equal(dados?.descontoValor, "20");
});

test("recognizes a client spoken in a separate response with words split by speech recognition", () => {
  const dados = interpretarPedidoCompleto(
    "É para a W med",
    [{ id: 7, nome: "Wmed Equipamentos Médicos", nome_fantasia: null }],
    [],
    []
  );

  assert.equal(dados?.empresaId, 7);
});

test("recognizes a client when speech recognition adds a trailing vowel", () => {
  const dados = interpretarPedidoCompleto(
    "Para a Wmede",
    [{ id: 7, nome: "Wmed Equipamentos Médicos", nome_fantasia: null }],
    [],
    []
  );

  assert.equal(dados?.empresaId, 7);
});

test("prefers an exact client name over a longer name that only contains the spoken words", () => {
  const resultado = resolverEmpresa("É para a Clínica Fares", [
    { id: 7, nome: "Clínica Fares Unidade Centro", nome_fantasia: null },
    { id: 8, nome: "Clínica Fares", nome_fantasia: null },
  ]);

  assert.deepEqual(resultado, { id: 8, ambiguo: false });
});

test("reports ambiguity when duplicate client names match equally", () => {
  const resultado = resolverEmpresa("É para a Clínica Fares", [
    { id: 7, nome: "Clínica Fares", nome_fantasia: null },
    { id: 8, nome: "Clínica Fares", nome_fantasia: null },
  ]);

  assert.deepEqual(resultado, { id: null, ambiguo: true });
});

test("does not guess when partial product terms match multiple catalog entries equally", () => {
  const dados = interpretarPedidoCompleto(
    "Orçamento de filtro carvão ativado para Wmed",
    [{ id: 7, nome: "Wmed Equipamentos Médicos", nome_fantasia: null }],
    [
      { id: 12, nome: "Filtro de carvão ativado modelo A" },
      { id: 13, nome: "Filtro de carvão ativado modelo B" },
    ],
    []
  );

  assert.deepEqual(dados?.itens, []);
  assert.equal(dados?.empresaId, 7);
});
