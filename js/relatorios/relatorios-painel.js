function criarCardMetrica(titulo, valor, classe = '', icone = '', acao = '') {
    const iconeHtml = icone ? `<span class="icone-metrica" data-icone="${Utilidades.escaparHtml(icone)}"></span>` : '';
    const atributos = acao ? ` role="button" tabindex="0" onclick="${Utilidades.escaparHtml(acao)}" onkeydown="if(event.key==='Enter'){${Utilidades.escaparHtml(acao)}}"` : '';
    const classeCursor = acao ? ' cursor-apontador' : '';

    return `
        <div class="cartao-metrica ${classe}${classeCursor}"${atributos}>
            ${iconeHtml}
            <span>${Utilidades.escaparHtml(titulo)}</span>
            <strong>${Utilidades.escaparHtml(valor)}</strong>
        </div>
    `;
}

function criarGradeMetricas(itens = [], colunas = 3) {
    const classeColunas = `grade-${colunas}-colunas`;
    const conteudo = itens.map(item => {
        if (typeof item === 'string') return item;
        return criarCardMetrica(item.titulo, item.valor, item.classe || '', item.icone || '', item.acao || '');
    }).join('');

    return `<div class="grade-metricas-painel ${classeColunas}">${conteudo}</div>`;
}

function criarMetricasRelatorio(itens = []) {
    return `
        <div class="grade-metricas-relatorio">
            ${itens.map(item => `
                <div class="metrica-relatorio">
                    <span>${Utilidades.escaparHtml(item.rotulo)}</span>
                    <strong>${Utilidades.escaparHtml(item.valor)}</strong>
                </div>
            `).join('')}
        </div>
    `;
}

function renderizarPainelRelatorios(contexto) {
    return `
        ${renderizarCardsResumo(contexto)}
        ${renderizarBlocoGraficos(contexto)}
        ${renderizarBlocoRelatoriosPDF()}
    `;
}

function renderizarCardsResumo(contexto = {}) {
    const academico = calcularEstatisticasAcademicas(contexto.participantes || [], contexto.frequencias || [], contexto.atividades || []);
    const financeiro = calcularEstatisticasFinanceiras(contexto.participantesTodosCurso || contexto.participantes || [], contexto.pagamentos || [], contexto.financas || [], contexto.cursos || [], contexto.disciplinas || [], contexto.frequencias || []);

    const cardAtividadesStatus = `
        <div class="mini-cards-painel">
            <div class="cartao-metrica primario mini-card-painel">
                <span>Atividades</span>
                <strong>${Utilidades.escaparHtml(academico.entregasTotal)}</strong>
            </div>
            <div class="cartao-metrica primario mini-card-painel">
                <span>Status</span>
                <strong>${Utilidades.escaparHtml(`${academico.totalParticipantes} ativos`)}</strong>
            </div>
        </div>
    `;

    return criarGradeMetricas([
        { titulo: 'Participantes', valor: academico.totalParticipantes, classe: 'primario' },
        { titulo: 'Frequência Média', valor: `${academico.frequenciaMedia}%`, classe: 'primario' },
        cardAtividadesStatus,
        { titulo: 'Entradas', valor: Utilidades.formatarMoeda(financeiro.totalEntradas), classe: 'sucesso' },
        { titulo: 'Saldo', valor: Utilidades.formatarMoeda(financeiro.saldo), classe: financeiro.saldo >= 0 ? 'sucesso' : 'erro' },
        { titulo: 'Previsão', valor: Utilidades.formatarMoeda(financeiro.previsaoArrecadacao), classe: 'primario' }
    ], 3);
}

function renderizarBlocoGraficos(contexto = {}) {
    return `
        <div class="painel-relatorio">
            <div class="area-grafico-relatorio">${criarGradeGraficos([montarGraficoFrequencia(contexto.participantes || [], contexto.frequencias || [])])}</div>
            <div class="area-grafico-relatorio">${criarGradeGraficos([montarGraficoPagamentos(contexto.participantesTodosCurso || contexto.participantes || [], contexto.pagamentos || [], contexto.cursos || [], contexto.disciplinas || [], contexto.frequencias || [])])}</div>
        </div>
    `;
}

function renderizarBlocoRelatoriosPDF() {
    return `
        <div class="lista-relatorios-painel">
            <div class="cartao-geracao-relatorio">
                <div class="cabecalho-relatorio">
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Relatório de Frequência</h3>
                    ${criarBotao('Gerar Relatório', 'gerarPDFFrequencia()', 'contorno', 'botao-pequeno')}
                </div>
            </div>
            <div class="cartao-geracao-relatorio">
                <div class="cabecalho-relatorio">
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Financeiro</h3>
                    ${criarBotao('Gerar Relatório', 'gerarPDFMensalidades()', 'contorno', 'botao-pequeno')}
                </div>
            </div>
        </div>
    `;
}

function renderizarAbasPainelRelatorios(contexto) {
    return `
        <div id="sub-aba-academico" class="sub-aba-relatorio">
            ${renderizarPainelAcademico(contexto.participantes, contexto.frequencias, contexto.atividades, contexto.disciplinas, contexto.curso)}
        </div>
        <div id="sub-aba-financeiro" class="sub-aba-relatorio oculto">
            ${renderizarPainelFinanceiro(contexto.participantesTodosCurso || contexto.participantes, contexto.pagamentos, contexto.financas, contexto.cursos, contexto.disciplinas, contexto.frequencias)}
        </div>
    `;
}
