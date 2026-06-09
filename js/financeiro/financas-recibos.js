function gerarReciboPalestranteTemplate(nomePalestrante, nomeDisciplina, valor, descricao, data, cpf = '') {
    const textoReferencia = nomeDisciplina
        ? `ministração da disciplina: <strong>${Utilidades.escaparHtml(nomeDisciplina)}</strong>`
        : `atividade acadêmica / ministração de palestra: <strong>${Utilidades.escaparHtml(descricao || 'Formação Catequética')}</strong>`;

    const textoCpf = cpf ? `, CPF <strong>${Utilidades.escaparHtml(cpf)}</strong>` : '';

    gerarReciboPadrao('Recibo de Pagamento - Prestador/Palestrante', {
        titulo: 'RECIBO DE PAGAMENTO',
        rotuloValor: 'Valor',
        valorFormatado: Utilidades.formatarMoeda(valor),
        data: Utilidades.formatarData(data || Utilidades.obterDataAtual()),
        conteudo: `
            <p>Eu, <strong>${Utilidades.escaparHtml(nomePalestrante)}</strong>${textoCpf}, recebi de <strong>${NOME_INSTITUCIONAL}</strong>, a importância de <strong>${Utilidades.formatarMoeda(valor)}</strong>, referente à ${textoReferencia}.</p>
            <p>Por ser expressão da verdade, firmo o presente dando plena e total quitação pelo serviço prestado.</p>
        `,
        rotuloAssinatura: 'Assinatura do(a) Palestrante',
        nomeAssinatura: nomePalestrante
    });
}
