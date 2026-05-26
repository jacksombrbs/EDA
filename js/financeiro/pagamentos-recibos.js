function gerarReciboGenerico(nomeParticipante, valor, descricao, data) {
    const conteudo = `
        <p>Recebemos de <strong>${Utilidades.escaparHtml(nomeParticipante)}</strong> a importância de <strong>${Utilidades.formatarMoeda(valor)}</strong>.</p>
        <p>Referente a: <strong>${Utilidades.escaparHtml(descricao || 'Pagamento')}</strong>.</p>
    `;

    gerarReciboPadrao('Recibo de Pagamento', {
        titulo: 'RECIBO',
        rotuloValor: 'Valor recebido',
        valorFormatado: Utilidades.formatarMoeda(valor),
        conteudo,
        data: Utilidades.formatarData(data || new Date().toISOString().split('T')[0]),
        rotuloAssinatura: 'Responsável',
        nomeAssinatura: NOME_INSTITUCIONAL
    });
}

function gerarReciboLoteTemplate(nomeParoquia, nomesParticipantes, valorTotal, descricao, data) {
    const lista = nomesParticipantes.map(nome => `<li>${Utilidades.escaparHtml(nome)}</li>`).join('');
    const conteudo = `
        <p>Recebemos de <strong>${Utilidades.escaparHtml(nomeParoquia)}</strong> a importância de <strong>${Utilidades.formatarMoeda(valorTotal)}</strong>.</p>
        <p>Referente a: <strong>${Utilidades.escaparHtml(descricao || 'Pagamento em lote')}</strong>.</p>
        <ul class="lista-participantes">${lista}</ul>
    `;

    gerarReciboPadrao('Recibo de Pagamento em Lote', {
        titulo: 'RECIBO',
        rotuloValor: 'Valor recebido',
        valorFormatado: Utilidades.formatarMoeda(valorTotal),
        conteudo,
        data: Utilidades.formatarData(data || new Date().toISOString().split('T')[0]),
        rotuloAssinatura: 'Responsável',
        nomeAssinatura: NOME_INSTITUCIONAL
    });
}
