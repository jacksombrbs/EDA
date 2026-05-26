async function montarLivroCaixa() {
    const [financas, pagamentos, lotes, participantes, paroquias] = await Promise.all([
        bd.obterTodos('financas'),
        bd.obterTodos('pagamentos'),
        bd.obterTodos('pagamentos_lote'),
        bd.obterTodos('participantes'),
        bd.obterTodos('paroquias')
    ]);

    const transacoes = [
        ...pagamentos
            .filter(pagamento => !pagamento.id_lote)
            .map(pagamento => montarEntradaPagamentoIndividual(pagamento, participantes)),
        ...lotes.map(lote => montarEntradaPagamentoLote(lote, paroquias)),
        ...financas.map(montarTransacaoManual)
    ];

    transacoes.sort((a, b) => new Date(b.data) - new Date(a.data));
    return transacoes;
}

function montarEntradaPagamentoIndividual(pagamento, participantes = []) {
    const participante = participantes.find(item => String(item.id) === String(pagamento.id_participante));

    return {
        id: pagamento.id,
        data: pagamento.data || new Date().toISOString().split('T')[0],
        descricao: `Recebimento: ${pagamento.tipo || 'Pagamento'} - Participante: ${participante?.nome || 'Participante não identificado'}`,
        tipo: 'Entrada',
        categoria: 'Pagamento individual',
        origem: 'pagamento',
        valor: Utilidades.normalizarValorMonetario(pagamento.valor),
        podeExcluir: false
    };
}

function montarEntradaPagamentoLote(lote, paroquias = []) {
    const paroquia = paroquias.find(item => String(item.id) === String(lote.id_paroquia));

    return {
        id: lote.id,
        data: lote.data || new Date().toISOString().split('T')[0],
        descricao: `Recebimento em lote: ${lote.tipo || 'Pagamento'} - ${paroquia?.nome || 'Paróquia não identificada'}`,
        tipo: 'Entrada',
        categoria: 'Pagamento em lote',
        origem: 'lote',
        valor: Utilidades.normalizarValorMonetario(lote.valor_total),
        podeExcluir: false
    };
}

function montarTransacaoManual(financa) {
    return {
        id: financa.id,
        data: financa.data || new Date().toISOString().split('T')[0],
        descricao: financa.descricao || 'Lançamento manual',
        tipo: financa.tipo || 'Saída',
        categoria: financa.categoria || '',
        origem: 'manual',
        valor: Utilidades.normalizarValorMonetario(financa.valor),
        podeExcluir: true,
        id_disciplina: financa.id_disciplina || '',
        id_palestrante: financa.id_palestrante || ''
    };
}

function calcularResumoLivroCaixa(transacoes = []) {
    const totalEntradas = transacoes
        .filter(transacao => transacao.tipo === 'Entrada')
        .reduce((total, transacao) => total + (transacao.valor || 0), 0);
    const totalSaidas = transacoes
        .filter(transacao => transacao.tipo === 'Saída')
        .reduce((total, transacao) => total + (transacao.valor || 0), 0);

    return {
        totalEntradas,
        totalSaidas,
        saldo: totalEntradas - totalSaidas
    };
}
