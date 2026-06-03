function renderizarPainelFinanceiro(participantes = [], pagamentos = [], financas = [], cursos = [], disciplinas = [], frequencias = []) {
    const estatisticas = calcularEstatisticasFinanceiras(participantes, pagamentos, financas, cursos, disciplinas, frequencias);
    const tituloCobrancas = 'A receber';

    let painel = criarGradeMetricas([
        { titulo: 'Taxa de Atraso', valor: `${estatisticas.taxaInadimplencia}%`, classe: estatisticas.taxaInadimplencia > 20 ? 'erro' : (estatisticas.taxaInadimplencia > 10 ? 'aviso' : 'sucesso'), icone: 'pagamentos', acao: "filtrarTabelaFinanceira('atraso')" },
        { titulo: 'Saldo', valor: Utilidades.formatarMoeda(estatisticas.saldo), classe: estatisticas.saldo >= 0 ? 'sucesso' : 'erro', icone: 'financas' },
        { titulo: tituloCobrancas, valor: Utilidades.formatarMoeda(estatisticas.valorAPagar), classe: 'primario', icone: 'pagamentos', acao: "filtrarTabelaFinanceira('pendente')" }
    ], 3);

    const htmlGraficoPagamentos = criarGradeGraficos([montarGraficoPagamentos(participantes, pagamentos, cursos, disciplinas, frequencias)]);
    const htmlGraficoCaixa = criarGradeGraficos([montarGraficoEntradasSaidas(estatisticas)]);

    const htmlRelatorios = `
        <div class="lista-relatorios-painel">
            <div class="cartao-geracao-relatorio">
                <div class="cabecalho-relatorio">
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Cobranças</h3>
                    ${criarBotao('Gerar Relatório', 'gerarPDFMensalidades()', 'contorno', 'botao-pequeno')}
                </div>
                ${criarMetricasRelatorio([
                    { rotulo: 'Participantes', valor: estatisticas.participantes },
                    { rotulo: 'Em atraso', valor: estatisticas.inadimplentes },
                    { rotulo: 'A receber', valor: Utilidades.formatarMoeda(estatisticas.valorAPagar) }
                ])}
            </div>
            <div class="cartao-geracao-relatorio">
                <div class="cabecalho-relatorio">
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Livro Caixa</h3>
                    ${criarBotao('Gerar Livro', 'gerarPDFLivroCaixa()', 'contorno', 'botao-pequeno')}
                </div>
                <div class="flex gap-md md-flex-coluna w-total mt-sm">
                    <div class="flex-1">${criarCampoFormulario('Data Início', 'date', 'filtro-data-inicio', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])}</div>
                    <div class="flex-1">${criarCampoFormulario('Data Fim', 'date', 'filtro-data-fim', new Date().toISOString().split('T')[0])}</div>
                </div>
            </div>
        </div>
    `;

    painel += `
        <div class="painel-relatorio">
            <div class="area-grafico-relatorio">${htmlGraficoPagamentos}${htmlGraficoCaixa}</div>
            <div class="coluna-relatorios-painel">${htmlRelatorios}</div>
        </div>
    `;

    painel += '<div class="flex flex-coluna gap-sm mb-md w-total">';
    painel += '<h3 class="texto-md peso-bold cor-texto-primario m-zero">Resumo Financeiro por Participante</h3>';
    painel += '<div class="w-total">' + criarCampoFormulario('', 'text', 'busca-tabela-fin', '', 'Pesquisar por participante, status ou cobrança...', false) + '</div>';
    painel += '</div>';
    painel += renderizarTabelaResumoFinanceiro(participantes, pagamentos, cursos, disciplinas, frequencias);

    setTimeout(() => Busca.vincularFiltro('busca-tabela-fin', 'corpo-tabela-fin'), 0);
    return painel;
}

function filtrarTabelaFinanceira(termo = '') {
    const campo = document.getElementById('busca-tabela-fin');
    if (!campo) return;
    campo.value = termo;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    campo.focus();
}

function renderizarTabelaResumoFinanceiro(participantes = [], pagamentos = [], cursos = [], disciplinas = [], frequencias = []) {
    const linhas = participantes.length
        ? participantes.map((participante, indice) => montarLinhaResumoFinanceiro(participante, pagamentos, cursos, disciplinas, frequencias, indice)).join('')
        : '<tr><td colspan="6" class="p-md texto-centro cor-texto-claro">Nenhum participante cadastrado.</td></tr>';

    return criarContainerTabela(
        ['Participante', 'Tipo do Curso', 'Cobranças', 'Pago', 'A pagar', 'Atraso'],
        linhas,
        '',
        'corpo-tabela-fin'
    );
}

function montarLinhaResumoFinanceiro(participante, pagamentos, cursos, disciplinas, frequencias, indice) {
    const curso = cursos.find(item => String(item.id) === String(participante.id_curso));
    const disciplinasCurso = disciplinas.filter(disciplina => String(disciplina.id_curso) === String(curso?.id));
    const frequenciasCurso = frequencias.filter(frequencia => String(frequencia.id_curso || '') === String(curso?.id));
    const obrigacoes = calcularObrigacoesFinanceirasParticipante(participante, curso, disciplinasCurso, frequenciasCurso, pagamentos);
    const resumo = ajustarResumoObrigacoesPorStatusParticipante(participante, calcularResumoObrigacoes(obrigacoes));
    const emAtraso = resumo.atrasos > 0;
    const aPagar = resumo.obrigacoesAPagar > 0;
    const desistente = !Utilidades.participanteEstaAtivo(participante);
    const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
    const busca = `${participante.nome || ''} ${desistente ? 'desistente' : 'ativo'} ${emAtraso ? 'atraso inadimplente' : (aPagar ? 'pendente' : 'em dia')} ${obrigacoes.filter(o => !o.pago).map(o => o.descricao).join(' ')}`;

    return `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml(busca.toLowerCase())}">
        <td class="p-md texto-esquerda peso-bold cor-texto-escuro">${Utilidades.escaparHtml(participante.nome || '-')}${desistente ? ' <span class="cor-texto-erro">(Desistente)</span>' : ''}</td>
        <td class="p-md texto-centro">${Utilidades.escaparHtml(obterTipoCobrancaCurso(curso))}</td>
        <td class="p-md texto-centro">${obrigacoes.filter(item => item.pago).length}/${obrigacoes.length}</td>
        <td class="p-md texto-centro cor-texto-sucesso peso-bold">${Utilidades.formatarMoeda(resumo.pago)}</td>
        <td class="p-md texto-centro ${aPagar ? 'cor-texto-primario' : 'cor-texto-sucesso'} peso-bold">${resumo.aPagar > 0 ? Utilidades.formatarMoeda(resumo.aPagar) : '-'}</td>
        <td class="p-md texto-centro ${emAtraso ? 'cor-texto-erro' : 'cor-texto-sucesso'} peso-bold">${resumo.atrasado > 0 ? Utilidades.formatarMoeda(resumo.atrasado) : '-'}</td>
    </tr>`;
}

function calcularEstatisticasFinanceiras(participantes = [], pagamentos = [], financas = [], cursos = [], disciplinas = [], frequencias = []) {
    const participantesConsiderados = participantes || [];
    const resumos = participantesConsiderados.map(participante => {
        const curso = cursos.find(item => String(item.id) === String(participante.id_curso));
        const disciplinasCurso = disciplinas.filter(disciplina => String(disciplina.id_curso) === String(curso?.id));
        const frequenciasCurso = frequencias.filter(frequencia => String(frequencia.id_curso || '') === String(curso?.id));
        const obrigacoes = calcularObrigacoesFinanceirasParticipante(participante, curso, disciplinasCurso, frequenciasCurso, pagamentos);
        return ajustarResumoObrigacoesPorStatusParticipante(participante, calcularResumoObrigacoes(obrigacoes));
    });

    const totalEntradas = pagamentos.reduce((total, pagamento) => total + Utilidades.normalizarValorMonetario(pagamento.valor), 0)
        + financas.filter(item => item.tipo === 'Entrada').reduce((total, item) => total + Utilidades.normalizarValorMonetario(item.valor), 0);
    const totalSaidas = financas.filter(item => item.tipo === 'Saída').reduce((total, item) => total + Utilidades.normalizarValorMonetario(item.valor), 0);
    const inadimplentes = resumos.filter(resumo => resumo.atrasos > 0).length;
    const valorPendente = resumos.reduce((total, resumo) => total + resumo.atrasado, 0);
    const valorAPagar = resumos.reduce((total, resumo) => total + resumo.aPagar, 0);

    return {
        participantes: participantesConsiderados.length,
        inadimplentes,
        valorPendente,
        valorAPagar,
        previsaoArrecadacao: valorAPagar,
        totalEntradas,
        totalSaidas,
        saldo: totalEntradas - totalSaidas,
        taxaInadimplencia: participantesConsiderados.length ? Math.round((inadimplentes / participantesConsiderados.length) * 100) : 0
    };
}

function calcularInadimplencia(participantes = [], pagamentos = [], cursos = [], disciplinas = [], frequencias = []) {
    return participantes.filter(participante => {
        const curso = cursos.find(item => String(item.id) === String(participante.id_curso));
        const disciplinasCurso = disciplinas.filter(disciplina => String(disciplina.id_curso) === String(curso?.id));
        const frequenciasCurso = frequencias.filter(frequencia => String(frequencia.id_curso || '') === String(curso?.id));
        return ajustarResumoObrigacoesPorStatusParticipante(participante, calcularResumoObrigacoes(calcularObrigacoesFinanceirasParticipante(participante, curso, disciplinasCurso, frequenciasCurso, pagamentos))).atrasos > 0;
    });
}

function calcularPrevisaoArrecadacao(participantes = [], pagamentos = [], cursos = [], disciplinas = [], frequencias = []) {
    return calcularEstatisticasFinanceiras(participantes, pagamentos, [], cursos, disciplinas, frequencias).valorAPagar;
}

function agruparPagamentosPorStatus(participantes = [], pagamentos = [], cursos = [], disciplinas = [], frequencias = []) {
    const status = { 'Em Dia': 0, 'Pendente': 0, 'Atraso': 0, 'Desistente': 0 };

    participantes.forEach(participante => {
        if (!Utilidades.participanteEstaAtivo(participante)) {
            status.Desistente++;
            return;
        }

        const curso = cursos.find(item => String(item.id) === String(participante.id_curso));
        const disciplinasCurso = disciplinas.filter(disciplina => String(disciplina.id_curso) === String(curso?.id));
        const frequenciasCurso = frequencias.filter(frequencia => String(frequencia.id_curso || '') === String(curso?.id));
        const obrigacoes = calcularObrigacoesFinanceirasParticipante(participante, curso, disciplinasCurso, frequenciasCurso, pagamentos);
        const resumo = calcularResumoObrigacoes(obrigacoes);

        if (resumo.atrasos > 0) status.Atraso++;
        else if (resumo.obrigacoesAPagar > 0) status.Pendente++;
        else status['Em Dia']++;
    });

    return status;
}

async function gerarPDFMensalidadesFinanceiro() {
    const dadosRelatorio = await obterDadosCursoRelatorio();
    if (!dadosRelatorio) return;

    const { curso, participantesTodosCurso, participantes, paroquias, pagamentos, disciplinas, frequencias } = dadosRelatorio;
    const baseParticipantes = participantesTodosCurso || participantes;
    const paroquiasMap = {};
    paroquias.forEach(paroquia => { paroquiasMap[paroquia.id] = paroquia.nome; });
    const agrupados = agruparParticipantesMensalidades(baseParticipantes);
    const obrigacoesCurso = montarObrigacoesModeloCurso(curso, disciplinas, frequencias);

    let html = '<h2>COBRANÇAS</h2>';
    html += `<p><strong>Curso:</strong> ${Utilidades.escaparHtml(curso.nome || '-')}</p>`;
    html += `<p><strong>Tipo de Cobrança:</strong> ${Utilidades.escaparHtml(obterTipoCobrancaCurso(curso))}</p>`;
    html += `<p><strong>Data de Emissão:</strong> ${Utilidades.formatarData(new Date().toISOString().split('T')[0])}</p>`;
    if (cursoCobraPorEncontro(curso)) {
        html += '<p><strong>Legenda:</strong> data = pagamento registrado; C = compareceu sem pagamento, portanto valor em atraso; F = faltou, sem cobrança.</p>';
    }

    Object.values(agrupados).sort((a, b) => {
        const nomeA = paroquiasMap[a.idParoquia] || 'Sem Vínculo';
        const nomeB = paroquiasMap[b.idParoquia] || 'Sem Vínculo';
        const comparacaoParoquia = nomeA.localeCompare(nomeB);
        if (comparacaoParoquia !== 0) return comparacaoParoquia;
        return a.capela.localeCompare(b.capela);
    }).forEach((grupo, indiceGrupo) => {
        const nomeParoquia = paroquiasMap[grupo.idParoquia] || 'Participantes Sem Vínculo Paroquial';
        const quebra = indiceGrupo > 0 ? ' class="quebra-pagina-antes"' : '';

        html += `<div${quebra}><h3>Paróquia: ${Utilidades.escaparHtml(nomeParoquia)} / Capela: ${Utilidades.escaparHtml(grupo.capela)}</h3>`;
        html += '<table><thead><tr><th class="coluna-nome-documento">Nome do Participante</th>';
        obrigacoesCurso.forEach(obrigacao => { html += `<th class="texto-centro">${Utilidades.escaparHtml(obrigacao.rotulo)}</th>`; });
        html += '<th class="texto-centro">A pagar</th><th class="texto-centro">Atraso</th></tr></thead><tbody>';

        grupo.participantes.sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).forEach(participante => {
            const obrigacoes = calcularObrigacoesFinanceirasParticipante(participante, curso, disciplinas, frequencias, pagamentos);
            const desistente = !Utilidades.participanteEstaAtivo(participante);
            const resumo = ajustarResumoObrigacoesPorStatusParticipante(participante, calcularResumoObrigacoes(obrigacoes));
            const emAtraso = resumo.atrasos > 0;
            const aPagar = resumo.obrigacoesAPagar > 0;
            html += `<tr><td><strong>${Utilidades.escaparHtml(participante.nome || '-')}</strong>${desistente ? ' <span class="cor-texto-erro">(Desistente)</span>' : ''}</td>`;
            obrigacoesCurso.forEach(modelo => {
                const chaveModelo = obterChaveCobrancaFinanceira(modelo.tipo, modelo.referencia_id, modelo.referencia_indice);
                const obrigacao = obrigacoes.find(item => obterChaveObrigacaoFinanceira(item) === chaveModelo);
                html += `<td class="texto-centro ${obterClassePagamentoObrigacaoRelatorio(obrigacao)}"><strong>${formatarPagamentoObrigacaoRelatorio(obrigacao)}</strong></td>`;
            });
            html += `<td class="texto-centro ${resumo.aPagar > 0 ? 'cor-texto-primario' : 'cor-texto-sucesso'}"><strong>${resumo.aPagar > 0 ? Utilidades.formatarMoeda(resumo.aPagar) : '-'}</strong></td>`;
            html += `<td class="texto-centro ${resumo.atrasado > 0 ? 'cor-texto-erro' : 'cor-texto-sucesso'}"><strong>${resumo.atrasado > 0 ? Utilidades.formatarMoeda(resumo.atrasado) : '-'}</strong></td>`;
            html += '</tr>';
        });

        html += '</tbody></table></div>';
    });

    dispararImpressao('Cobranças', html, { orientacao: 'paisagem' });
}

function montarObrigacoesModeloCurso(curso, disciplinas = [], frequencias = []) {
    const modelos = [];
    if (Utilidades.normalizarValorMonetario(curso?.valor_inscricao || 0) > 0) modelos.push({ tipo: 'Inscrição', referencia_id: 'inscricao', rotulo: 'Insc' });

    if (cursoCobraPorMensalidade(curso)) {
        const quantidade = Number(curso.quantidade_mensalidades || 0);
        const valor = Utilidades.normalizarValorMonetario(curso.valor_mensalidade || 0);
        for (let indice = 1; indice <= quantidade; indice++) {
            if (valor > 0) modelos.push({ tipo: 'Mensalidade', referencia_id: `mensalidade-${indice}`, referencia_indice: indice, rotulo: `P${indice}` });
        }
    } else if (cursoCobraPorDisciplina(curso)) {
        disciplinas
            .filter(disciplina => Utilidades.normalizarValorMonetario(disciplina.valor_disciplina) > 0)
            .sort((a, b) => compararTextoFinanceiro(a.nome, b.nome))
            .forEach(disciplina => modelos.push({ tipo: 'Disciplina', referencia_id: disciplina.id, rotulo: disciplina.nome || 'Disciplina' }));
    } else if (cursoCobraPorEncontro(curso)) {
        const valor = Utilidades.normalizarValorMonetario(curso.valor_encontro || 0);
        disciplinas
            .filter(disciplina => String(disciplina.id_curso) === String(curso.id))
            .sort((a, b) => compararTextoFinanceiro(a.nome, b.nome))
            .forEach(disciplina => {
                const quantidadeEncontros = Math.max(Number(disciplina.quantidade_encontros || 1), 1);
                for (let indice = 1; indice <= quantidadeEncontros; indice++) {
                    if (valor <= 0 || encontroDisciplinaEhGratuito(disciplina, indice)) continue;
                    modelos.push({
                        tipo: 'Encontro',
                        referencia_id: `${disciplina.id}-encontro-${indice}`,
                        referencia_indice: indice,
                        rotulo: `${disciplina.nome || 'Disciplina'} — E${indice}`
                    });
                }
            });
    }

    return ordenarObrigacoesFinanceiras(modelos);
}

function formatarPagamentoObrigacaoRelatorio(obrigacao) {
    if (!obrigacao) return '';
    if (obrigacao.pago) return Utilidades.formatarData(obrigacao.data_pagamento);
    if (obrigacao.tipo === 'Encontro' && obrigacao.situacao_encontro === 'faltou') return 'F';
    if (obrigacao.tipo === 'Encontro' && obrigacao.situacao_encontro === 'compareceu') return 'C';
    return '';
}

function obterClassePagamentoObrigacaoRelatorio(obrigacao) {
    if (!obrigacao || obrigacao.pago || obrigacao.tipo !== 'Encontro') return '';
    if (obrigacao.situacao_encontro === 'compareceu') return 'cor-texto-sucesso';
    if (obrigacao.situacao_encontro === 'faltou') return 'cor-texto-erro';
    return '';
}

async function gerarPDFPagamentosFinanceiro() {
    await gerarPDFMensalidadesFinanceiro();
}

async function gerarPDFInadimplentesFinanceiro() {
    const dadosRelatorio = await obterDadosCursoRelatorio();
    if (!dadosRelatorio) return;

    const { participantesTodosCurso, participantes, pagamentos, cursos, disciplinas, frequencias } = dadosRelatorio;
    const inadimplentes = calcularInadimplencia(participantesTodosCurso || participantes, pagamentos, cursos, disciplinas, frequencias);
    const linhas = inadimplentes.map(participante => {
        const curso = cursos.find(item => String(item.id) === String(participante.id_curso));
        const disciplinasCurso = disciplinas.filter(disciplina => String(disciplina.id_curso) === String(curso?.id));
        const frequenciasCurso = frequencias.filter(frequencia => String(frequencia.id_curso || '') === String(curso?.id));
        const resumo = ajustarResumoObrigacoesPorStatusParticipante(participante, calcularResumoObrigacoes(calcularObrigacoesFinanceirasParticipante(participante, curso, disciplinasCurso, frequenciasCurso, pagamentos)));
        return `<tr><td>${Utilidades.escaparHtml(participante.nome || '-')}</td><td>${Utilidades.escaparHtml(obterTipoCobrancaCurso(curso))}</td><td>${Utilidades.formatarMoeda(resumo.atrasado)}</td></tr>`;
    }).join('');

    dispararImpressao('Atrasos', montarHtmlPDF('ATRASOS', `
        <p><strong>Curso:</strong> ${Utilidades.escaparHtml(dadosRelatorio.curso?.nome || '-')}</p>
        <table><thead><tr><th>Participante</th><th>Tipo de cobrança</th><th>Atraso</th></tr></thead><tbody>${linhas}</tbody></table>
    `));
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

    let html = '<h2>LIVRO CAIXA</h2>';
    html += `<p><strong>Data de Emissão:</strong> ${Utilidades.formatarData(new Date().toISOString().split('T')[0])}</p>`;
    html += `<p><strong>Período de Referência:</strong> ${Utilidades.formatarData(dataInicio)} - ${Utilidades.formatarData(dataFim)}</p>`;
    html += '<h3 class="cor-texto-sucesso">ENTRADAS (RECEBIMENTOS)</h3>';
    html += '<table><thead><tr><th>Data</th><th>Descrição</th><th class="alinhado-direita">Valor</th></tr></thead><tbody>';
    html += entradas.length ? entradas.map(item => `<tr><td>${Utilidades.formatarData(item.data)}</td><td>${Utilidades.escaparHtml(item.descricao)}</td><td class="alinhado-direita">${Utilidades.formatarMoeda(item.valor)}</td></tr>`).join('') : '<tr><td colspan="3" class="texto-centro">Nenhum recebimento registrado neste período.</td></tr>';
    html += `<tr class="linha-total cor-texto-sucesso"><td colspan="2">Total de Entradas</td><td class="alinhado-direita">${Utilidades.formatarMoeda(totalEntradas)}</td></tr>`;
    html += '</tbody></table>';
    html += '<h3 class="espaco-topo-grande cor-texto-erro">SAÍDAS (DESPESAS)</h3>';
    html += '<table><thead><tr><th>Data</th><th>Descrição</th><th class="alinhado-direita">Valor</th></tr></thead><tbody>';
    html += saidas.length ? saidas.map(item => `<tr><td>${Utilidades.formatarData(item.data)}</td><td>${Utilidades.escaparHtml(`${item.descricao} [${item.categoria || 'Geral'}]`)}</td><td class="alinhado-direita">${Utilidades.formatarMoeda(item.valor)}</td></tr>`).join('') : '<tr><td colspan="3" class="texto-centro">Nenhuma despesa registrada neste período.</td></tr>';
    html += `<tr class="linha-total cor-texto-erro"><td colspan="2">Total de Saídas</td><td class="alinhado-direita">${Utilidades.formatarMoeda(totalSaidas)}</td></tr>`;
    html += '</tbody></table>';
    html += `<div class="bloco-resumo"><p class="${totalEntradas - totalSaidas >= 0 ? 'cor-texto-sucesso' : 'cor-texto-erro'}"><strong>Saldo:</strong> ${Utilidades.formatarMoeda(totalEntradas - totalSaidas)}</p></div>`;
    dispararImpressao('Livro Caixa', html);
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
