

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
                    ${criarBotao('Gerar Relatório', 'gerarPDFMensalidadesFinanceiro()', 'contorno', 'botao-pequeno')}
                </div>
                ${criarMetricasRelatorio([
                    { rotulo: 'Participantes', valor: estatisticas.participantes },
                    { rotulo: 'Em atraso', valor: estatisticas.inadimplentes },
                    { rotulo: 'A receber', valor: Utilidades.formatarMoeda(estatisticas.valorAPagar) }
                ])}
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
    const totalRecebido = resumos.reduce((total, resumo) => total + resumo.pago, 0);
    const valorEmAtraso = resumos.reduce((total, resumo) => total + resumo.atrasado, 0);
    const valorPendente = resumos.reduce((total, resumo) => total + resumo.pendente, 0);
    const valorAPagar = valorEmAtraso + valorPendente;

    return {
        participantes: participantesConsiderados.length,
        inadimplentes,
        totalRecebido,
        valorPendente,
        valorEmAtraso,
        valorAPagar,
        previsaoArrecadacao: valorAPagar,
        totalEntradas,
        totalSaidas,
        saldo: totalEntradas - totalSaidas,
        taxaInadimplencia: participantesConsiderados.length ? Math.round((inadimplentes / participantesConsiderados.length) * 100) : 0
    };
}

function agruparValoresFinanceiros(participantes = [], pagamentos = [], cursos = [], disciplinas = [], frequencias = []) {
    const valores = { 'Recebido': 0, 'Atraso': 0, 'Pendente': 0 };

    participantes.forEach(participante => {
        const curso = cursos.find(item => String(item.id) === String(participante.id_curso));
        const disciplinasCurso = disciplinas.filter(disciplina => String(disciplina.id_curso) === String(curso?.id));
        const frequenciasCurso = frequencias.filter(frequencia => String(frequencia.id_curso || '') === String(curso?.id));
        const obrigacoes = calcularObrigacoesFinanceirasParticipante(participante, curso, disciplinasCurso, frequenciasCurso, pagamentos);
        const resumo = ajustarResumoObrigacoesPorStatusParticipante(participante, calcularResumoObrigacoes(obrigacoes));

        valores.Recebido += resumo.pago;
        valores.Atraso += resumo.atrasado;
        valores.Pendente += resumo.pendente;
    });

    return valores;
}

async function gerarPDFMensalidadesFinanceiro() {
    const dadosRelatorio = await obterDadosCursoRelatorio();
    if (!dadosRelatorio) return;

    const { curso, participantesTodosCurso, participantes, paroquias, pagamentos, disciplinas, frequencias } = dadosRelatorio;
    const baseParticipantes = participantesTodosCurso || participantes;
    const paroquiasMap = {};
    paroquias.forEach(paroquia => { paroquiasMap[paroquia.id] = paroquia.nome; });
    const gruposParoquia = ordenarGruposParoquiaRelatorio(Object.values(agruparParticipantesPorParoquia(baseParticipantes)), paroquiasMap);
    const obrigacoesCurso = montarObrigacoesModeloCurso(curso, disciplinas, frequencias);
    const totalColunas = obrigacoesCurso.length + 3;

    let html = montarCabecalhoRelatorioImpresso('COBRANÇAS', [
        { rotulo: 'Curso', valor: curso.nome || '-' },
        { rotulo: 'Tipo de Cobrança', valor: obterTipoCobrancaCurso(curso) },
        { rotulo: 'Data de Emissão', valor: Utilidades.formatarData(Utilidades.obterDataAtual()) }
    ]);
    if (cursoCobraPorEncontro(curso)) {
        html += '<p><strong>Legenda:</strong> data = pagamento registrado; C = compareceu sem pagamento; F = faltou</p>';
    }

    gruposParoquia.forEach((grupo, indiceGrupo) => {
        const nomeParoquia = paroquiasMap[grupo.idParoquia] || 'Participantes Sem Vínculo Paroquial';
        html += abrirGrupoParoquiaRelatorio(nomeParoquia, indiceGrupo);
        html += '<table><thead><tr><th class="coluna-nome-documento">Nome do Participante</th>';
        obrigacoesCurso.forEach(obrigacao => { html += `<th class="texto-centro">${Utilidades.escaparHtml(obrigacao.rotulo)}</th>`; });
        html += '<th class="texto-centro">A pagar</th><th class="texto-centro">Atraso</th></tr></thead><tbody>';

        agruparParticipantesPorCapelaRelatorio(grupo.participantes).forEach(grupoCapela => {
            html += montarLinhaCapelaRelatorio(grupoCapela.capela, totalColunas);
            grupoCapela.participantes.forEach(participante => {
                const obrigacoes = calcularObrigacoesFinanceirasParticipante(participante, curso, disciplinas, frequencias, pagamentos);
                const desistente = !Utilidades.participanteEstaAtivo(participante);
                const resumo = ajustarResumoObrigacoesPorStatusParticipante(participante, calcularResumoObrigacoes(obrigacoes));
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
        });

        html += '</tbody></table>' + fecharGrupoParoquiaRelatorio();
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

    let html = montarCabecalhoRelatorioImpresso('LIVRO CAIXA', [
        { rotulo: 'Data de Emissão', valor: Utilidades.formatarData(Utilidades.obterDataAtual()) },
        { rotulo: 'Período de Referência', valor: `${Utilidades.formatarData(dataInicio)} - ${Utilidades.formatarData(dataFim)}` }
    ]);
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

