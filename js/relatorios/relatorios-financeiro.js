function renderizarControlesFinanceiro() {
    return '';
}

function renderizarDashboardFinanceiro(participantes = [], pagamentos = [], financas = [], cursos = []) {
    const hoje = new Date();
    const dataHoje = hoje.toISOString().split('T')[0];
    const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
    const estatisticas = calcularEstatisticasFinanceiras(participantes, pagamentos, financas, cursos);
    const resumoMensalidades = calcularResumoMensalidades(participantes, pagamentos, cursos);

    let painel = criarGradeMetricas([
        { titulo: 'Taxa de Inadimplência', valor: `${estatisticas.taxaInadimplencia}%`, classe: estatisticas.taxaInadimplencia > 20 ? 'erro' : (estatisticas.taxaInadimplencia > 10 ? 'aviso' : 'sucesso'), icone: 'pagamentos' },
        { titulo: 'Saldo', valor: Utilidades.formatarMoeda(estatisticas.saldo), classe: estatisticas.saldo >= 0 ? 'sucesso' : 'erro', icone: 'financas' },
        { titulo: 'Previsão de Arrecadação', valor: Utilidades.formatarMoeda(resumoMensalidades.previsaoArrecadacao), classe: 'primario', icone: 'pagamentos' }
    ], 3);

    const htmlGraficoPagamentos = criarGradeGraficos([montarGraficoPagamentos(participantes, pagamentos, cursos)]);
    const htmlGraficoCaixa = criarGradeGraficos([montarGraficoEntradasSaidas(estatisticas)]);

    const htmlRelatorios = `
        <div class="lista-relatorios-dashboard">
            <div class="cartao-geracao-relatorio">
                <div class="cabecalho-relatorio">
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Livro Caixa</h3>
                    ${criarBotao('Gerar Relatório', 'gerarPDFLivroCaixa()', 'contorno', 'botao-pequeno')}
                </div>
                <div class="flex gap-sm md-flex-coluna w-total mt-xs">
                    <div class="flex-1 w-total">${criarCampoFormulario('Início', 'date', 'filtro-data-inicio', dataInicio, '', false)}</div>
                    <div class="flex-1 w-total">${criarCampoFormulario('Fim', 'date', 'filtro-data-fim', dataHoje, '', false)}</div>
                </div>
            </div>

            <div class="cartao-geracao-relatorio">
                <div class="cabecalho-relatorio">
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Mensalidades</h3>
                    ${criarBotao('Gerar Relatório', 'gerarPDFMensalidades()', 'contorno', 'botao-pequeno')}
                </div>
                ${criarMetricasRelatorio([
                    { rotulo: 'Inadimplentes', valor: resumoMensalidades.inadimplentes },
                    { rotulo: 'A receber', valor: resumoMensalidades.mensalidadesRestantes }
                ])}
            </div>
        </div>
    `;

    painel += `
        <div class="painel-dashboard-relatorio">
            <div class="area-grafico-relatorio">${htmlGraficoPagamentos}</div>
            <div class="area-grafico-relatorio">${htmlGraficoCaixa}</div>
            <div class="coluna-relatorios-dashboard">${htmlRelatorios}</div>
        </div>
    `;

    painel += '<div class="flex flex-coluna gap-sm mb-md w-total mt-lg">';
    painel += '<h3 class="texto-md peso-bold cor-texto-primario m-zero">Resumo de Inadimplência</h3>';
    painel += '<div class="w-total">' + criarCampoFormulario('', 'text', 'busca-tabela-fin', '', 'Pesquisar por participante...', false) + '</div>';
    painel += '</div>';
    painel += renderizarTabelaResumoFinanceiro(participantes, pagamentos, cursos);

    setTimeout(() => Busca.vincularFiltro('busca-tabela-fin', 'corpo-tabela-fin'), 0);
    return painel;
}

function renderizarTabelaResumoFinanceiro(participantes, pagamentos, cursos) {
    let linhas = '';

    if (participantes.length === 0) {
        linhas = '<tr><td colspan="4" class="p-md texto-centro cor-texto-claro">Nenhum participante cadastrado.</td></tr>';
    } else {
        participantes.forEach((participante, indice) => {
            const curso = cursos.find(item => String(item.id) === String(participante.id_curso));
            const status = calcularStatusPagamentoParticipante(participante, pagamentos, cursos);
            const textoInscricao = status.inscricao ? 'Paga' : 'Pendente';
            const classeInscricao = status.inscricao ? 'cor-texto-sucesso' : 'cor-texto-erro';
            const quantidadeCurso = Number(curso?.quantidade_mensalidades || 0);
            const emDia = status.mensalidadesRestantes <= 0;
            const textoSituacao = emDia ? 'Em Dia' : `Pendente (${status.mensalidadesRestantes})`;
            const classeSituacao = emDia ? 'cor-texto-sucesso' : 'cor-texto-erro';
            const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            linhas += `<tr class="linha-participante-fin ${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml((participante.nome || '').toLowerCase())}">
                <td class="p-md texto-esquerda peso-bold cor-texto-escuro coluna-nome-tabela">${Utilidades.escaparHtml(participante.nome || '-')}</td>
                <td class="p-md texto-centro peso-bold ${classeInscricao}">${textoInscricao}</td>
                <td class="p-md texto-centro cor-texto-escuro">${status.mensalidadesPagas} de ${quantidadeCurso}</td>
                <td class="p-md texto-esquerda peso-bold ${classeSituacao}">${textoSituacao}</td>
            </tr>`;
        });
    }

    return criarContainerTabela(
        [
            { rotulo: 'Nome do Participante', classes: 'coluna-nome-tabela' },
            'Inscrição',
            'Mensalidades Pagas',
            'Situação Financeira'
        ],
        linhas,
        '',
        'corpo-tabela-fin'
    );
}

function calcularEstatisticasFinanceiras(participantes = [], pagamentos = [], financas = [], cursos = []) {
    if (!Array.isArray(participantes) && participantes) {
        cursos = participantes.cursos || [];
        financas = participantes.financas || [];
        pagamentos = participantes.pagamentos || [];
        participantes = participantes.participantes || [];
    }

    const totalEntradas = calcularReceitas(pagamentos, [], financas);
    const totalSaidas = calcularDespesas(financas);
    const inadimplentes = calcularInadimplencia(participantes, pagamentos, cursos);
    const taxaInadimplencia = participantes.length > 0 ? Math.round((inadimplentes.length / participantes.length) * 100) : 0;
    const statusSaude = taxaInadimplencia <= 10 ? 'saudavel' : (taxaInadimplencia <= 20 ? 'atencao' : 'critico');

    return {
        participantes: participantes.length,
        pagamentos: pagamentos.length,
        receitas: totalEntradas,
        despesas: totalSaidas,
        saldo: totalEntradas - totalSaidas,
        totalEntradas,
        totalSaidas,
        inadimplentes: inadimplentes.length,
        taxaInadimplencia,
        statusSaude,
        previsaoArrecadacao: calcularPrevisaoArrecadacao(participantes, pagamentos, cursos)
    };
}

function calcularStatusPagamentoParticipante(participante, pagamentos = [], cursos = []) {
    const curso = cursos.find(item => String(item.id) === String(participante.id_curso));
    const pagamentosParticipante = pagamentos.filter(pagamento => String(pagamento.id_participante) === String(participante.id));
    const inscricao = pagamentosParticipante.some(pagamento => pagamento.tipo === 'Inscrição');
    const mensalidadesPagas = calcularMensalidadesPagasParticipante(participante.id, pagamentos);
    const mensalidadesRestantes = calcularMensalidadesRestantesParticipante(participante, pagamentos, curso);
    const temPagamento = pagamentosParticipante.length > 0;

    return { inscricao, mensalidadesPagas, mensalidadesRestantes, temPagamento };
}

function calcularInadimplencia(participantes = [], pagamentos = [], cursos = []) {
    return participantes.filter(participante => {
        const status = calcularStatusPagamentoParticipante(participante, pagamentos, cursos);
        return !status.inscricao || status.mensalidadesRestantes > 0;
    });
}

function calcularReceitas(pagamentos = [], lotes = [], financas = []) {
    const idsLotes = new Set(lotes.map(lote => String(lote.id)));
    const receitasPagamentos = pagamentos
        .filter(pagamento => !pagamento.id_lote || !idsLotes.has(String(pagamento.id_lote)))
        .reduce((total, pagamento) => total + Utilidades.normalizarValorMonetario(pagamento.valor), 0);
    const receitasLotes = lotes
        .reduce((total, lote) => total + Utilidades.normalizarValorMonetario(lote.valor_total), 0);
    const receitasManuais = financas
        .filter(financa => financa.tipo === 'Entrada')
        .reduce((total, financa) => total + Utilidades.normalizarValorMonetario(financa.valor), 0);

    return receitasPagamentos + receitasLotes + receitasManuais;
}

function calcularDespesas(financas = []) {
    return financas
        .filter(financa => financa.tipo === 'Saída')
        .reduce((total, financa) => total + Utilidades.normalizarValorMonetario(financa.valor), 0);
}

function calcularMensalidadesPagasParticipante(idParticipante, pagamentos = []) {
    return pagamentos
        .filter(pagamento => String(pagamento.id_participante) === String(idParticipante) && pagamento.tipo === 'Mensalidade')
        .reduce((total, pagamento) => total + (Number(pagamento.quantidade) || 1), 0);
}

function calcularMensalidadesRestantesParticipante(participante, pagamentos = [], curso = null) {
    const quantidadeCurso = Number(curso?.quantidade_mensalidades || 0);
    const pagas = calcularMensalidadesPagasParticipante(participante.id, pagamentos);
    return Math.max(quantidadeCurso - pagas, 0);
}

function calcularResumoMensalidades(participantes = [], pagamentos = [], cursos = []) {
    return participantes.reduce((resumo, participante) => {
        const curso = cursos.find(item => String(item.id) === String(participante.id_curso));
        const status = calcularStatusPagamentoParticipante(participante, pagamentos, cursos);
        const valorMensalidade = Utilidades.normalizarValorMonetario(curso?.valor_mensalidade || 0);

        resumo.participantes++;
        resumo.mensalidadesPagas += status.mensalidadesPagas;
        resumo.mensalidadesRestantes += status.mensalidadesRestantes;
        resumo.previsaoArrecadacao += status.mensalidadesRestantes * valorMensalidade;
        if (!status.inscricao || status.mensalidadesRestantes > 0) resumo.inadimplentes++;

        return resumo;
    }, {
        participantes: 0,
        inadimplentes: 0,
        mensalidadesPagas: 0,
        mensalidadesRestantes: 0,
        previsaoArrecadacao: 0
    });
}

function calcularPrevisaoArrecadacao(participantes = [], pagamentos = [], cursos = []) {
    return calcularResumoMensalidades(participantes, pagamentos, cursos).previsaoArrecadacao;
}

function agruparPagamentosPorStatus(participantes = [], pagamentos = [], cursos = []) {
    const status = { 'Em Dia': 0, 'Parcial': 0, 'Pendente': 0 };

    participantes.forEach(participante => {
        const situacao = calcularStatusPagamentoParticipante(participante, pagamentos, cursos);
        if (situacao.inscricao && situacao.mensalidadesRestantes <= 0) status['Em Dia']++;
        else if (situacao.temPagamento) status.Parcial++;
        else status.Pendente++;
    });

    return status;
}

async function gerarPDFLivroCaixaFinanceiro() {
    const dataInicio = document.getElementById('filtro-data-inicio')?.value || '';
    const dataFim = document.getElementById('filtro-data-fim')?.value || '';

    if (!dataInicio || !dataFim) {
        Utilidades.notificacao('Selecione o intervalo de datas.', 'aviso');
        return;
    }

    const transacoes = await montarLivroCaixa();
    const estaNoIntervalo = data => data >= dataInicio && data <= dataFim;
    const filtradas = transacoes.filter(transacao => transacao.data && estaNoIntervalo(transacao.data));
    const entradas = filtradas.filter(transacao => transacao.tipo === 'Entrada').sort((a, b) => (a.data || '').localeCompare(b.data || ''));
    const saidas = filtradas.filter(transacao => transacao.tipo === 'Saída').sort((a, b) => (a.data || '').localeCompare(b.data || ''));
    const totalEntradas = entradas.reduce((total, item) => total + Utilidades.normalizarValorMonetario(item.valor), 0);
    const totalSaidas = saidas.reduce((total, item) => total + Utilidades.normalizarValorMonetario(item.valor), 0);

    let html = '<h2>LIVRO CAIXA DOS ATIVOS FINANCEIROS</h2>';
    html += `<p><strong>Data de Emissão:</strong> ${Utilidades.formatarData(new Date().toISOString().split('T')[0])}</p>`;
    html += `<p><strong>Período de Referência:</strong> ${Utilidades.formatarData(dataInicio)} - ${Utilidades.formatarData(dataFim)}</p>`;

    html += '<h3>ENTRADAS (RECEBIMENTOS)</h3>';
    html += '<table><thead><tr><th>Data</th><th>Descrição</th><th class="alinhado-direita">Valor</th></tr></thead><tbody>';
    html += entradas.length
        ? entradas.map(item => `<tr><td>${Utilidades.formatarData(item.data)}</td><td>${Utilidades.escaparHtml(item.descricao)}</td><td class="alinhado-direita">${Utilidades.formatarMoeda(item.valor)}</td></tr>`).join('')
        : '<tr><td colspan="3" class="texto-centro">Nenhum recebimento registrado neste mês.</td></tr>';
    html += `<tr class="linha-total"><td colspan="2">Total de Entradas</td><td class="alinhado-direita">${Utilidades.formatarMoeda(totalEntradas)}</td></tr>`;
    html += '</tbody></table>';

    html += '<h3 class="espaco-topo-grande">SAÍDAS (DESPESAS)</h3>';
    html += '<table><thead><tr><th>Data</th><th>Descrição</th><th class="alinhado-direita">Valor</th></tr></thead><tbody>';
    html += saidas.length
        ? saidas.map(item => `<tr><td>${Utilidades.formatarData(item.data)}</td><td>${Utilidades.escaparHtml(`${item.descricao} [${item.categoria || 'Geral'}]`)}</td><td class="alinhado-direita">${Utilidades.formatarMoeda(item.valor)}</td></tr>`).join('')
        : '<tr><td colspan="3" class="texto-centro">Nenhuma despesa de saída registrada neste mês.</td></tr>';
    html += `<tr class="linha-total"><td colspan="2">Total de Saídas</td><td class="alinhado-direita">${Utilidades.formatarMoeda(totalSaidas)}</td></tr>`;
    html += '</tbody></table>';

    html += '<div class="bloco-resumo">';
    html += `<p><strong>Total de Entradas:</strong> ${Utilidades.formatarMoeda(totalEntradas)}</p>`;
    html += `<p><strong>Total de Saídas:</strong> ${Utilidades.formatarMoeda(totalSaidas)}</p>`;
    html += `<p><strong>Saldo Corrente Mensal:</strong> <span class="${totalEntradas - totalSaidas >= 0 ? 'texto-sucesso' : 'texto-erro'}">${Utilidades.formatarMoeda(totalEntradas - totalSaidas)}</span></p>`;
    html += '</div>';

    dispararImpressao('Livro Caixa', html);
}

async function gerarPDFMensalidadesFinanceiro() {
    const dadosRelatorio = await obterDadosCursoRelatorio();
    if (!dadosRelatorio) return;

    const { curso, participantes, paroquias } = dadosRelatorio;
    const pagamentos = await bd.obterTodos('pagamentos');
    const paroquiasMap = {};
    paroquias.forEach(paroquia => { paroquiasMap[paroquia.id] = paroquia.nome; });
    const agrupados = agruparParticipantesMensalidades(participantes);
    const maxMensalidades = Number(curso.quantidade_mensalidades || 0);

    let html = '<h2>FICHA DE ACOMPANHAMENTO DE MENSALIDADES</h2>';
    html += `<p><strong>Curso:</strong> ${Utilidades.escaparHtml(curso.nome || '-')}</p>`;
    html += `<p><strong>Data de Emissão:</strong> ${Utilidades.formatarData(new Date().toISOString().split('T')[0])}</p>`;

    Object.values(agrupados).sort((a, b) => {
        const nomeA = paroquiasMap[a.idParoquia] || 'Sem Vínculo';
        const nomeB = paroquiasMap[b.idParoquia] || 'Sem Vínculo';
        const comparacaoParoquia = nomeA.localeCompare(nomeB);
        if (comparacaoParoquia !== 0) return comparacaoParoquia;
        return a.capela.localeCompare(b.capela);
    }).forEach((grupo, indice) => {
        const nomeParoquia = paroquiasMap[grupo.idParoquia] || 'Participantes Sem Vínculo Paroquial';
        const colunasControle = ['Insc', ...Array.from({ length: maxMensalidades }, (_, indiceParcela) => `P${indiceParcela + 1}`)];
        const quebra = indice > 0 ? ' class="quebra-pagina-antes"' : '';

        html += `<div${quebra}><h3>Paróquia: ${Utilidades.escaparHtml(nomeParoquia)} / Capela: ${Utilidades.escaparHtml(grupo.capela)}</h3>`;
        html += '<table><thead><tr><th class="coluna-nome-documento">Nome do Participante</th>';
        colunasControle.forEach(coluna => { html += `<th class="texto-centro">${coluna}</th>`; });
        html += '</tr></thead><tbody>';

        grupo.participantes.sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).forEach(participante => {
            const pagamentosParticipante = pagamentos.filter(pagamento => String(pagamento.id_participante) === String(participante.id));
            const temInscricao = pagamentosParticipante.some(pagamento => pagamento.tipo === 'Inscrição');
            const parcelasPagas = [];

            pagamentosParticipante
                .filter(pagamento => pagamento.tipo === 'Mensalidade')
                .sort((a, b) => (a.data || '').localeCompare(b.data || ''))
                .forEach(pagamento => {
                    const quantidade = Number(pagamento.quantidade || 1);
                    for (let indiceParcela = 0; indiceParcela < quantidade; indiceParcela++) parcelasPagas.push(pagamento);
                });

            html += `<tr><td><strong>${Utilidades.escaparHtml(participante.nome || '-')}</strong></td>`;
            html += `<td class="texto-centro"><strong>${temInscricao ? 'X' : ' '}</strong></td>`;

            for (let indiceParcela = 0; indiceParcela < maxMensalidades; indiceParcela++) {
                html += `<td class="texto-centro"><strong>${parcelasPagas[indiceParcela] ? 'X' : ' '}</strong></td>`;
            }

            html += '</tr>';
        });

        html += '</tbody></table></div>';
    });

    dispararImpressao('Ficha de Mensalidades', html);
}

async function gerarPDFPagamentosFinanceiro() {
    await gerarPDFMensalidadesFinanceiro();
}

async function gerarPDFInadimplentesFinanceiro() {
    const dadosRelatorio = await obterDadosCursoRelatorio();
    if (!dadosRelatorio) return;

    const inadimplentes = calcularInadimplencia(dadosRelatorio.participantes, dadosRelatorio.pagamentos, dadosRelatorio.cursos);
    const linhas = inadimplentes.map(participante => {
        const status = calcularStatusPagamentoParticipante(participante, dadosRelatorio.pagamentos, dadosRelatorio.cursos);
        return `<tr><td>${Utilidades.escaparHtml(participante.nome || '-')}</td><td>${status.inscricao ? 'Sim' : 'Não'}</td><td>${status.mensalidadesRestantes}</td></tr>`;
    }).join('');

    dispararImpressao('Relatório de Inadimplentes', montarHtmlPDF('RELATÓRIO DE INADIMPLENTES', `
        <p><strong>Curso:</strong> ${Utilidades.escaparHtml(dadosRelatorio.curso?.nome || '-')}</p>
        <table><thead><tr><th>Participante</th><th>Inscrição paga</th><th>Mensalidades restantes</th></tr></thead><tbody>${linhas}</tbody></table>
    `));
}

function agruparParticipantesMensalidades(participantes = []) {
    return participantes.reduce((grupos, participante) => {
        const idParoquia = participante.id_paroquia || 'sem_paroquia';
        const capela = participante.capela ? participante.capela.trim() : 'Sem Capela';
        const chave = `${idParoquia}||${capela}`;
        if (!grupos[chave]) grupos[chave] = { idParoquia, capela, participantes: [] };
        grupos[chave].participantes.push(participante);
        return grupos;
    }, {});
}
