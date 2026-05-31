function gerarReciboGenerico(nomeParticipante, valor, descricao, data, cpf = '') {
    const textoCpf = cpf ? `, CPF <strong>${Utilidades.escaparHtml(cpf)}</strong>` : '';
    const conteudo = `
        <p>Recebemos de <strong>${Utilidades.escaparHtml(nomeParticipante)}</strong>${textoCpf} a importância de <strong>${Utilidades.formatarMoeda(valor)}</strong>.</p>
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

function gerarReciboLoteTemplate(nomeParoquia, nomesParticipantes, valorTotal, descricao, data, cnpj = '') {
    const lista = nomesParticipantes.map(nome => `<li>${Utilidades.escaparHtml(nome)}</li>`).join('');
    const textoCnpj = cnpj ? `, CNPJ <strong>${Utilidades.escaparHtml(cnpj)}</strong>` : '';
    const conteudo = `
        <p>Recebemos de <strong>${Utilidades.escaparHtml(nomeParoquia)}</strong>${textoCnpj} a importância de <strong>${Utilidades.formatarMoeda(valorTotal)}</strong>.</p>
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
