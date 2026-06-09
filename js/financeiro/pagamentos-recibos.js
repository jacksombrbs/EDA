function normalizarReferenciaRecibo(descricao = '') {
    let texto = String(descricao || 'Pagamento').trim();
    texto = texto
        .replace(/^(aos\s+encontros:\s*){2,}/i, 'aos encontros: ')
        .replace(/^(às\s+disciplinas:\s*){2,}/i, 'às disciplinas: ')
        .replace(/^(às\s+mensalidades:\s*){2,}/i, 'às mensalidades: ');
    return texto || 'Pagamento';
}

function montarLinhaReferenciaRecibo(descricao = '') {
    const texto = normalizarReferenciaRecibo(descricao);
    const inicioDinamico = /^(à|às|ao|aos|a\s|a:)/i.test(texto);
    const prefixo = inicioDinamico ? 'Referente' : 'Referente a:';
    return `${prefixo} <strong>${Utilidades.escaparHtml(texto)}</strong>.`;
}

function gerarReciboGenerico(nomeParticipante, valor, descricao, data, cpf = '') {
    const textoCpf = cpf ? `, CPF <strong>${Utilidades.escaparHtml(cpf)}</strong>` : '';
    const conteudo = `
        <p>Recebemos de <strong>${Utilidades.escaparHtml(nomeParticipante)}</strong>${textoCpf} a importância de <strong>${Utilidades.formatarMoeda(valor)}</strong>.</p>
        <p>${montarLinhaReferenciaRecibo(descricao || 'Pagamento')}</p>
    `;

    gerarReciboPadrao('Recibo de Pagamento', {
        titulo: 'RECIBO',
        rotuloValor: 'Valor recebido',
        valorFormatado: Utilidades.formatarMoeda(valor),
        conteudo,
        data: Utilidades.formatarData(data || Utilidades.obterDataAtual()),
        rotuloAssinatura: 'Responsável',
        nomeAssinatura: NOME_INSTITUCIONAL
    });
}

function gerarReciboLoteTemplate(nomeParoquia, nomesParticipantes, valorTotal, descricao, data, cnpj = '') {
    const lista = nomesParticipantes.map(nome => `<li>${Utilidades.escaparHtml(nome)}</li>`).join('');
    const textoCnpj = cnpj ? `, CNPJ <strong>${Utilidades.escaparHtml(cnpj)}</strong>` : '';
    const conteudo = `
        <p>Recebemos de <strong>${Utilidades.escaparHtml(nomeParoquia)}</strong>${textoCnpj} a importância de <strong>${Utilidades.formatarMoeda(valorTotal)}</strong>.</p>
        <p>${montarLinhaReferenciaRecibo(descricao || 'Pagamento em lote')}</p>
        <p><strong>Participantes:</strong></p>
        <ul class="lista-participantes">${lista}</ul>
    `;

    gerarReciboPadrao('Recibo de Pagamento em Lote', {
        titulo: 'RECIBO',
        rotuloValor: 'Valor recebido',
        valorFormatado: Utilidades.formatarMoeda(valorTotal),
        conteudo,
        data: Utilidades.formatarData(data || Utilidades.obterDataAtual()),
        rotuloAssinatura: 'Responsável',
        nomeAssinatura: NOME_INSTITUCIONAL
    });
}
