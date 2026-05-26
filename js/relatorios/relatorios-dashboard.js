function criarCardMetrica(titulo, valor, classe = '', icone = '') {
    const iconeHtml = icone ? `<span class="icone-metrica" data-icone="${Utilidades.escaparHtml(icone)}"></span>` : '';

    return `
        <div class="cartao-metrica ${classe}">
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
        return criarCardMetrica(item.titulo, item.valor, item.classe || '', item.icone || '');
    }).join('');

    return `<div class="grade-metricas-dashboard ${classeColunas}">${conteudo}</div>`;
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

function renderizarDashboardRelatorios(contexto) {
    return `
        ${renderizarCardsResumo(contexto)}
        ${renderizarBlocoGraficos(contexto)}
        ${renderizarBlocoRelatoriosPDF()}
    `;
}

function renderizarCardsResumo(contexto = {}) {
    const academico = calcularEstatisticasAcademicas(contexto.participantes || [], contexto.frequencias || [], contexto.atividades || []);
    const financeiro = calcularEstatisticasFinanceiras(contexto.participantes || [], contexto.pagamentos || [], contexto.financas || [], contexto.cursos || []);

    return criarGradeMetricas([
        { titulo: 'Participantes', valor: academico.totalParticipantes, classe: 'primario' },
        { titulo: 'Frequência Média', valor: `${academico.frequenciaMedia}%`, classe: 'primario' },
        { titulo: 'Entregas', valor: academico.entregasTotal, classe: 'primario' },
        { titulo: 'Entradas', valor: Utilidades.formatarMoeda(financeiro.totalEntradas), classe: 'sucesso' },
        { titulo: 'Saldo', valor: Utilidades.formatarMoeda(financeiro.saldo), classe: financeiro.saldo >= 0 ? 'sucesso' : 'erro' },
        { titulo: 'Previsão', valor: Utilidades.formatarMoeda(financeiro.previsaoArrecadacao), classe: 'primario' }
    ], 3);
}

function renderizarBlocoGraficos(contexto = {}) {
    return `
        <div class="painel-dashboard-relatorio">
            <div class="area-grafico-relatorio">${criarGradeGraficos([montarGraficoFrequencia(contexto.participantes || [], contexto.frequencias || [])])}</div>
            <div class="area-grafico-relatorio">${criarGradeGraficos([montarGraficoPagamentos(contexto.participantes || [], contexto.pagamentos || [], contexto.cursos || [])])}</div>
        </div>
    `;
}

function renderizarBlocoRelatoriosPDF() {
    return `
        <div class="lista-relatorios-dashboard">
            <div class="cartao-geracao-relatorio">
                <div class="cabecalho-relatorio">
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Relatório de Frequência</h3>
                    ${criarBotao('Gerar Relatório', 'gerarPDFFrequencia()', 'contorno', 'botao-pequeno')}
                </div>
            </div>
            <div class="cartao-geracao-relatorio">
                <div class="cabecalho-relatorio">
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Mensalidades</h3>
                    ${criarBotao('Gerar Relatório', 'gerarPDFMensalidades()', 'contorno', 'botao-pequeno')}
                </div>
            </div>
        </div>
    `;
}

function renderizarAbasDashboardRelatorios(contexto) {
    return `
        <div id="sub-aba-academico" class="sub-aba-relatorio">
            ${renderizarDashboardAcademico(contexto.participantes, contexto.frequencias, contexto.atividades, contexto.disciplinas)}
        </div>
        <div id="sub-aba-financeiro" class="sub-aba-relatorio oculto">
            ${renderizarDashboardFinanceiro(contexto.participantes, contexto.pagamentos, contexto.financas, contexto.cursos)}
        </div>
    `;
}
