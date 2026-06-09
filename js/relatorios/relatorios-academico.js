function filtrarAtividadesEntreguesRelatorio(atividades = []) {
    const lista = Array.isArray(atividades) ? atividades : [];
    const possuiLancamentos = lista.some(atividade => Array.isArray(atividade.registros));

    if (possuiLancamentos) {
        return listarRegistrosAtividadesEntregues(lista);
    }

    return lista.filter(registro => atividadeEstaEntregue(registro));
}

function renderizarPainelAcademico(participantes = [], frequencias = [], atividades = [], disciplinas = [], curso = null, opcoes = {}) {
    const atividadesEntregues = filtrarAtividadesPorParticipantesRelatorio(atividades, participantes);
    const percentualMinimo = obterPercentualMinimoCurso(curso);
    const estatisticas = calcularEstatisticasAcademicas(participantes, frequencias, atividadesEntregues, percentualMinimo);

    let painel = criarGradeMetricas([
        { titulo: 'Participantes Ativos', valor: participantes.length, classe: 'primario', icone: 'participantes' },
        { titulo: 'Frequência Média', valor: `${estatisticas.frequenciaMedia}%`, classe: estatisticas.frequenciaMedia >= percentualMinimo ? 'sucesso' : (estatisticas.frequenciaMedia >= Math.floor(percentualMinimo / 2) ? 'aviso' : 'erro'), icone: 'frequencia' },
        { titulo: `Em Risco (<${percentualMinimo}%)`, valor: estatisticas.participantesEmRisco, classe: estatisticas.participantesEmRisco > 0 ? 'erro' : 'sucesso', icone: 'frequencia', acao: "filtrarTabelaAcademica('risco')" },
        { titulo: 'Entregas', valor: atividadesEntregues.length, classe: 'primario', icone: 'atividades' }
    ], 4);

    if (!opcoes.somenteConsulta) {
        painel += `
            <div class="lista-relatorios-painel mb-lg">
                <div class="cartao-geracao-relatorio">
                    <div class="cabecalho-relatorio">
                        <h3 class="texto-md peso-bold cor-texto-primario m-zero">Relatório de Frequência</h3>
                        ${criarBotao('Gerar Relatório', 'gerarPDFFrequenciaAcademico()', 'secundario', 'botao-pequeno', 'button', '')}
                    </div>
                </div>
                <div class="grade-metricas-painel grade-2-colunas">
                    <div class="cartao-geracao-relatorio">
                        <div class="cabecalho-relatorio">
                            <h3 class="texto-md peso-bold cor-texto-primario m-zero">Atividades</h3>
                            ${criarBotao('Gerar Relatório', 'gerarPDFAtividadesAcademico()', 'secundario', 'botao-pequeno', 'button', '')}
                        </div>
                    </div>
                    <div class="cartao-geracao-relatorio">
                        <div class="cabecalho-relatorio">
                            <h3 class="texto-md peso-bold cor-texto-primario m-zero">Status</h3>
                            ${criarBotao('Gerar Relatório', 'gerarPDFStatusParticipantesAcademico()', 'secundario', 'botao-pequeno', 'button', '')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    painel += '<div class="flex flex-coluna gap-sm mb-md w-total">';
    painel += '<h3 class="texto-md peso-bold cor-texto-primario m-zero">Resumo Geral Acadêmico</h3>';
    painel += '<div class="w-total">' + criarCampoFormulario('', 'text', 'busca-tabela-acad', '', 'Pesquisar por participante...', false) + '</div>';
    painel += '</div>';
    painel += renderizarTabelaResumoAcademico(participantes, frequencias, atividades, disciplinas, percentualMinimo);

    setTimeout(() => Busca.vincularFiltro('busca-tabela-acad', 'corpo-tabela-acad'), 0);

    return painel;
}

function filtrarAtividadesPorParticipantesRelatorio(atividades = [], participantes = []) {
    const idsParticipantes = new Set(participantes.map(participante => String(participante.id)));
    return filtrarAtividadesEntreguesRelatorio(atividades)
        .filter(atividade => idsParticipantes.has(String(atividade.id_participante || '')));
}

function formatarParticipanteDocumento(participante, mostrarStatus = false) {
    const nome = `<strong>${Utilidades.escaparHtml(participante.nome || '-')}</strong>`;
    if (!mostrarStatus || Utilidades.participanteEstaAtivo(participante)) return nome;
    return `${nome} <span class="cor-texto-erro peso-bold">(Desistente)</span>`;
}

function renderizarTabelaResumoAcademico(participantes, frequencias, atividades, disciplinas, percentualMinimo = PERCENTUAL_MINIMO_FREQUENCIA_PADRAO) {
    let linhas = '';

    if (participantes.length === 0) {
        linhas = '<tr><td colspan="4" class="p-md texto-centro cor-texto-claro">Nenhum participante cadastrado.</td></tr>';
    } else {
        participantes.forEach((participante, indice) => {
            const frequencia = calcularFrequenciaParticipante(participante.id, frequencias);
            const classeTaxa = obterClassePercentualFrequencia(frequencia.percentual, percentualMinimo);
            const entregas = listarAtividadesPorParticipante(participante.id, atividades);
            const ultimaEntrega = obterTextoUltimaAtividade(entregas, disciplinas);
            const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
            const termosBusca = `${participante.nome || ''} ${frequencia.percentual < percentualMinimo ? 'risco' : 'regular'} ${entregas.length > 0 ? 'com-atividade' : 'sem-atividade'}`.toLowerCase();

            linhas += `<tr class="linha-participante-acad ${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml(termosBusca)}">
                <td class="p-md texto-esquerda peso-bold cor-texto-escuro coluna-nome-tabela">${Utilidades.escaparHtml(participante.nome || '-')}</td>
                <td class="p-md texto-centro peso-bold ${classeTaxa}">${frequencia.percentual}%</td>
                <td class="p-md texto-centro peso-bold cor-texto-escuro">${entregas.length}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.escaparHtml(ultimaEntrega)}</td>
            </tr>`;
        });
    }

    return criarContainerTabela(
        [
            { rotulo: 'Nome do Participante', classes: 'coluna-nome-tabela' },
            'Frequência por horas (%)',
            'Entregas (Total)',
            'Última Atividade'
        ],
        linhas,
        '',
        'corpo-tabela-acad'
    );
}

function obterTextoUltimaAtividade(atividades = [], disciplinas = []) {
    if (atividades.length === 0) return '-';

    const ordenadas = [...atividades].sort((a, b) => new Date(b.data_entrega) - new Date(a.data_entrega));
    const ultima = ordenadas[0];
    const disciplina = disciplinas.find(item => String(item.id) === String(ultima.id_disciplina));
    const data = ultima.data_entrega ? Utilidades.formatarData(ultima.data_entrega) : '-';

    return `${disciplina ? disciplina.nome : 'Atividade'} (${data})`;
}

function calcularEstatisticasAcademicas(participantes = [], frequencias = [], atividades = [], percentualMinimo = PERCENTUAL_MINIMO_FREQUENCIA_PADRAO) {
    atividades = filtrarAtividadesEntreguesRelatorio(atividades);

    if (!Array.isArray(participantes) && participantes) {
        percentualMinimo = obterPercentualMinimoCurso(participantes.curso) || percentualMinimo;
        atividades = filtrarAtividadesEntreguesRelatorio(participantes.atividades || []);
        frequencias = participantes.frequencias || [];
        participantes = participantes.participantes || [];
    }

    participantes = participantes.filter(participante => Utilidades.participanteEstaAtivo(participante));

    let horasPrevistas = 0;
    let horasPresentes = 0;
    let participantesEmRisco = 0;

    participantes.forEach(participante => {
        const frequencia = calcularFrequenciaParticipante(participante.id, frequencias);
        horasPrevistas += frequencia.horasPrevistas;
        horasPresentes += frequencia.horasPresentes;
        if (frequencia.horasPrevistas > 0 && frequencia.percentual < percentualMinimo) participantesEmRisco++;
    });

    const frequenciaMedia = horasPrevistas > 0 ? Math.round((horasPresentes / horasPrevistas) * 100) : 100;

    return {
        totalParticipantes: participantes.length,
        participantes: participantes.length,
        frequenciaMedia,
        percentualFrequencia: frequenciaMedia,
        participantesEmRisco,
        entregasTotal: atividades.length,
        atividades: atividades.length
    };
}

function calcularFrequenciaParticipante(idParticipante, frequencias = []) {
    let total = 0;
    let comparecimentos = 0;
    let faltas = 0;
    let horasPrevistas = 0;
    let horasPresentes = 0;

    frequencias.forEach(frequencia => {
        const presenca = obterPresencaParticipante(frequencia, idParticipante);
        if (presenca === null) return;

        total++;
        horasPrevistas += obterCargaHorariaFrequencia(frequencia);
        horasPresentes += presenca.horas;

        if (presencaContaComoComparecimento(presenca)) comparecimentos++;
        if (presenca.estado === ESTADOS_FREQUENCIA.FALTOU) faltas++;
    });

    return {
        total,
        comparecimentos,
        presentes: comparecimentos,
        faltas,
        horasPrevistas,
        horasPresentes,
        percentual: horasPrevistas > 0 ? Math.round((horasPresentes / horasPrevistas) * 100) : 100
    };
}

function listarAtividadesPorParticipante(idParticipante, atividades = []) {
    return listarAtividadesEntreguesPorParticipante(idParticipante, atividades);
}

async function gerarPDFFrequenciaAcademico() {
    const tipoRelatorio = document.getElementById('filtro-tipo-frequencia')?.value || 'geral';
    const organizacao = document.getElementById('filtro-organizacao-frequencia')?.value || 'paroquia';
    const idDisciplina = document.getElementById('filtro-disciplina-freq')?.value || '';

    if (tipoRelatorio === 'disciplina' && !idDisciplina) {
        Utilidades.notificacao('Selecione uma disciplina para o relatório.', 'erro');
        return;
    }

    const dadosRelatorio = await obterDadosCursoRelatorio();
    if (!dadosRelatorio) return;

    const { curso, disciplinas, participantes, participantesTodosCurso, frequencias, paroquias } = dadosRelatorio;
    const participantesRelatorio = Utilidades.ordenarParticipantesPorNome(participantesTodosCurso || participantes);
    const mostrarTodos = true;
    const dataHoje = Utilidades.formatarData(Utilidades.obterDataAtual());
    const paroquiasMap = criarMapaParoquias(paroquias);

    let html = montarCabecalhoRelatorioImpresso('RELATÓRIO DE FREQUÊNCIA', [
        { rotulo: 'Curso', valor: curso.nome || '-' },
        { rotulo: 'Data de Emissão', valor: dataHoje }
    ]);

    if (tipoRelatorio === 'geral') {
        html += organizacao === 'alfabetica'
            ? montarHtmlFrequenciaGeralAlfabetica(participantesRelatorio, disciplinas, frequencias, curso, mostrarTodos)
            : montarHtmlFrequenciaGeral(participantesRelatorio, disciplinas, frequencias, paroquiasMap, curso, mostrarTodos);
        dispararImpressao('Relatório de Frequência Geral', html, { orientacao: 'paisagem' });
        return;
    }

    html += montarHtmlFrequenciaPorDisciplina(idDisciplina, participantesRelatorio, disciplinas, frequencias, mostrarTodos);
    const disciplina = disciplinas.find(item => String(item.id) === String(idDisciplina));
    dispararImpressao(`Relatório de Frequência - ${disciplina?.nome || 'Disciplina'}`, html);
}

function montarHtmlFrequenciaGeral(participantes, disciplinas, frequencias, paroquiasMap, curso = null, mostrarStatus = false) {
    if (disciplinas.length === 0) return '<p>Nenhuma disciplina cadastrada.</p>';

    const disciplinasOrdenadas = [...disciplinas].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    const gruposParoquia = ordenarGruposParoquiaRelatorio(Object.values(agruparParticipantesPorParoquia(participantes)), paroquiasMap);
    const totalColunas = disciplinasOrdenadas.length + 2;
    let html = '';

    gruposParoquia.forEach((grupo, indice) => {
        const nomeParoquia = paroquiasMap[grupo.idParoquia] || 'Participantes Sem Vínculo Paroquial';
        html += abrirGrupoParoquiaRelatorio(nomeParoquia, indice);
        html += '<table><thead><tr><th class="coluna-nome-documento">Participante</th>';
        disciplinasOrdenadas.forEach(disciplina => { html += `<th class="texto-centro">${Utilidades.escaparHtml(disciplina.nome)}</th>`; });
        html += '<th class="texto-centro">Total</th></tr></thead><tbody>';

        agruparParticipantesPorCapelaRelatorio(grupo.participantes).forEach(grupoCapela => {
            html += montarLinhaCapelaRelatorio(grupoCapela.capela, totalColunas);
            grupoCapela.participantes.forEach(participante => {
                const totalParticipante = calcularFrequenciaParticipante(participante.id, frequencias);
                html += `<tr><td>${formatarParticipanteDocumento(participante, mostrarStatus)}</td>`;
                disciplinasOrdenadas.forEach(disciplina => {
                    const resumoDisciplina = calcularResumoDisciplinaParticipante(participante.id, disciplina.id, frequencias);
                    html += `<td class="texto-centro">${formatarResumoHorasFrequencia(resumoDisciplina)}</td>`;
                });
                html += `<td class="texto-centro peso-bold ${obterClassePercentualFrequencia(totalParticipante.percentual, obterPercentualMinimoCurso(curso))}">${formatarResumoTotalFrequencia(totalParticipante)}</td>`;
                html += '</tr>';
            });
        });

        html += '</tbody></table>' + fecharGrupoParoquiaRelatorio();
    });

    return html;
}

function montarHtmlFrequenciaGeralAlfabetica(participantes, disciplinas, frequencias, curso = null, mostrarStatus = false) {
    if (disciplinas.length === 0) return '<p>Nenhuma disciplina cadastrada.</p>';

    const disciplinasOrdenadas = [...disciplinas].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    const participantesOrdenados = Utilidades.ordenarParticipantesPorNome(participantes);
    const totalColunas = disciplinasOrdenadas.length + 2;
    let html = '';

    html += '<div><h3>Ordem alfabética</h3>';
    html += '<table><thead><tr><th class="coluna-nome-documento">Participante</th>';
    disciplinasOrdenadas.forEach(disciplina => { html += `<th class="texto-centro">${Utilidades.escaparHtml(disciplina.nome)}</th>`; });
    html += '<th class="texto-centro">Total</th></tr></thead><tbody>';

    if (!participantesOrdenados.length) {
        html += `<tr><td colspan="${totalColunas}" class="texto-centro">Nenhum participante encontrado.</td></tr>`;
    }

    participantesOrdenados.forEach(participante => {
        const totalParticipante = calcularFrequenciaParticipante(participante.id, frequencias);
        html += `<tr><td>${formatarParticipanteDocumento(participante, mostrarStatus)}</td>`;
        disciplinasOrdenadas.forEach(disciplina => {
            const resumoDisciplina = calcularResumoDisciplinaParticipante(participante.id, disciplina.id, frequencias);
            html += `<td class="texto-centro">${formatarResumoHorasFrequencia(resumoDisciplina)}</td>`;
        });
        html += `<td class="texto-centro peso-bold ${obterClassePercentualFrequencia(totalParticipante.percentual, obterPercentualMinimoCurso(curso))}">${formatarResumoTotalFrequencia(totalParticipante)}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>' + fecharGrupoParoquiaRelatorio();
    return html;
}

function montarHtmlFrequenciaPorDisciplina(idDisciplina, participantes, disciplinas, frequencias, mostrarStatus = false) {
    const disciplina = disciplinas.find(item => String(item.id) === String(idDisciplina));
    const registrosDisciplina = frequencias.filter(item => String(item.id_disciplina) === String(idDisciplina));

    let html = `<h3>Disciplina: ${Utilidades.escaparHtml(disciplina?.nome || '')}</h3>`;
    html += `<p><strong>Carga horária:</strong> ${formatarHorasFrequencia(obterCargaHorariaDisciplina(disciplina))}</p>`;

    if (registrosDisciplina.length === 0) {
        return html + '<p>Nenhuma frequência registrada para esta disciplina.</p>';
    }

    const grupos = participantes.reduce((resultado, participante) => {
        const resumo = calcularResumoDisciplinaParticipante(participante.id, idDisciplina, frequencias);
        const chave = resumo.comparecimentos > 0 ? 'compareceram' : 'naoCompareceram';
        resultado[chave].push({ participante, resumo });
        return resultado;
    }, { compareceram: [], naoCompareceram: [] });

    const montarTabelaGrupo = (titulo, itens, classeSituacao, textoSituacao) => {
        let tabela = `<h3>${titulo} (${itens.length})</h3>`;
        tabela += '<table><thead><tr><th class="coluna-nome-documento">Participante</th><th class="texto-centro">Horas</th><th class="texto-centro">Situação</th></tr></thead><tbody>';
        tabela += itens.length ? itens.map(({ participante, resumo }) => `
            <tr>
                <td>${formatarParticipanteDocumento(participante, mostrarStatus)}</td>
                <td class="texto-centro">${formatarResumoHorasFrequencia(resumo)}</td>
                <td class="texto-centro ${classeSituacao}">${textoSituacao}</td>
            </tr>
        `).join('') : '<tr><td colspan="3" class="texto-centro">Nenhum participante neste grupo.</td></tr>';
        tabela += '</tbody></table>';
        return tabela;
    };

    html += montarTabelaGrupo('Compareceram', grupos.compareceram, 'cor-texto-sucesso', 'Compareceu');
    html += montarTabelaGrupo('Não compareceram', grupos.naoCompareceram, 'cor-texto-erro', 'Não compareceu');
    return html;
}

function calcularResumoDisciplinaParticipante(idParticipante, idDisciplina, frequencias = []) {
    let total = 0;
    let comparecimentos = 0;
    let faltas = 0;
    let horasPrevistas = 0;
    let horasPresentes = 0;

    frequencias.forEach(frequencia => {
        if (String(frequencia.id_disciplina) !== String(idDisciplina)) return;

        const presenca = obterPresencaParticipante(frequencia, idParticipante);
        if (presenca === null) return;

        total++;
        horasPrevistas += obterCargaHorariaFrequencia(frequencia);
        horasPresentes += presenca.horas;

        if (presencaContaComoComparecimento(presenca)) comparecimentos++;
        if (presenca.estado === ESTADOS_FREQUENCIA.FALTOU) faltas++;
    });

    return {
        total,
        comparecimentos,
        faltas,
        horasPrevistas,
        horasPresentes,
        percentual: horasPrevistas > 0 ? Math.round((horasPresentes / horasPrevistas) * 100) : 0
    };
}

function formatarResumoHorasFrequencia(resumo) {
    if (!resumo || resumo.total === 0) return '-';
    return `${formatarHorasFrequencia(resumo.horasPresentes)}/${formatarHorasFrequencia(resumo.horasPrevistas)}`;
}

function formatarResumoTotalFrequencia(resumo) {
    if (!resumo || resumo.total === 0) return '-';
    return `${formatarHorasFrequencia(resumo.horasPresentes)}/${formatarHorasFrequencia(resumo.horasPrevistas)} (${resumo.percentual}%)`;
}

function formatarHorasFrequencia(valor) {
    const numero = Number(valor || 0);
    return `${Number.isInteger(numero) ? numero : numero.toFixed(1).replace('.', ',')}h`;
}

function obterClassePercentualFrequencia(percentual, percentualMinimo = PERCENTUAL_MINIMO_FREQUENCIA_PADRAO) {
    return percentual >= percentualMinimo ? 'cor-texto-sucesso' : 'cor-texto-erro';
}

async function gerarPDFAtividadesAcademico() {
    const dadosRelatorio = await obterDadosCursoRelatorio();
    if (!dadosRelatorio) return;

    const { curso, disciplinas, participantes, participantesTodosCurso, atividades, paroquias } = dadosRelatorio;
    const participantesRelatorio = Utilidades.ordenarParticipantesPorNome(participantesTodosCurso || participantes);
    const mostrarTodos = true;
    const atividadesEntregues = filtrarAtividadesPorParticipantesRelatorio(atividades, participantesRelatorio);
    const disciplinasOrdenadas = [...disciplinas].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    const paroquiasMap = criarMapaParoquias(paroquias);
    const gruposParoquia = ordenarGruposParoquiaRelatorio(Object.values(agruparParticipantesPorParoquia(participantesRelatorio)), paroquiasMap);

    let html = montarCabecalhoRelatorioImpresso('RELATÓRIO GERAL DE ATIVIDADES (ENTREGAS)', [
        { rotulo: 'Curso', valor: curso.nome || '-' },
        { rotulo: 'Data de Emissão', valor: Utilidades.formatarData(Utilidades.obterDataAtual()) }
    ]);

    if (disciplinasOrdenadas.length === 0) {
        html += '<p>Nenhuma disciplina cadastrada.</p>';
        dispararImpressao('Atividades', html, { orientacao: 'paisagem' });
        return;
    }

    const totalColunas = disciplinasOrdenadas.length + 1;
    gruposParoquia.forEach((grupo, indice) => {
        const nomeParoquia = paroquiasMap[grupo.idParoquia] || 'Participantes Sem Vínculo Paroquial';
        html += abrirGrupoParoquiaRelatorio(nomeParoquia, indice);
        html += '<table><thead><tr><th class="coluna-nome-documento">Nome do Participante</th>';
        disciplinasOrdenadas.forEach(disciplina => { html += `<th class="texto-centro">${Utilidades.escaparHtml(disciplina.nome)}</th>`; });
        html += '</tr></thead><tbody>';

        agruparParticipantesPorCapelaRelatorio(grupo.participantes).forEach(grupoCapela => {
            html += montarLinhaCapelaRelatorio(grupoCapela.capela, totalColunas);
            grupoCapela.participantes.forEach(participante => {
                html += `<tr><td>${formatarParticipanteDocumento(participante, mostrarTodos)}</td>`;
                disciplinasOrdenadas.forEach(disciplina => {
                    const entrega = atividadesEntregues.find(atividade =>
                        String(atividade.id_participante) === String(participante.id)
                        && String(atividade.id_disciplina) === String(disciplina.id)
                    );
                    html += `<td class="texto-centro"><strong>${entrega ? Utilidades.formatarData(entrega.data_entrega) : ''}</strong></td>`;
                });
                html += '</tr>';
            });
        });

        html += '</tbody></table>' + fecharGrupoParoquiaRelatorio();
    });

    dispararImpressao('Relatório Geral de Atividades', html, { orientacao: 'paisagem' });
}

async function gerarPDFStatusParticipantesAcademico() {
    const dadosRelatorio = await obterDadosCursoRelatorio();
    if (!dadosRelatorio) return;

    const { curso, participantesTodosCurso, participantes, frequencias, pagamentos, disciplinas, paroquias } = dadosRelatorio;
    const participantesRelatorio = Utilidades.ordenarParticipantesPorNome(participantesTodosCurso || participantes);
    const paroquiasMap = criarMapaParoquias(paroquias);
    const gruposParoquia = ordenarGruposParoquiaRelatorio(Object.values(agruparParticipantesPorParoquia(participantesRelatorio)), paroquiasMap);

    let html = montarCabecalhoRelatorioImpresso('RELATÓRIO CONSOLIDADO DO STATUS DOS PARTICIPANTES', [
        { rotulo: 'Curso', valor: curso.nome || '-' },
        { rotulo: 'Data de Emissão', valor: Utilidades.formatarData(Utilidades.obterDataAtual()) }
    ]);

    gruposParoquia.forEach((grupo, indice) => {
        const nomeParoquia = paroquiasMap[grupo.idParoquia] || 'Participantes Sem Vínculo Paroquial';
        html += abrirGrupoParoquiaRelatorio(nomeParoquia, indice);
        html += '<table><thead><tr><th class="coluna-nome-documento">Participante</th><th class="texto-centro">Status</th><th class="texto-centro">Frequência</th><th class="texto-centro">A pagar</th><th class="texto-centro">Atraso</th></tr></thead><tbody>';

        agruparParticipantesPorCapelaRelatorio(grupo.participantes).forEach(grupoCapela => {
            html += montarLinhaCapelaRelatorio(grupoCapela.capela, 5);
            grupoCapela.participantes.forEach(participante => {
                const frequencia = calcularFrequenciaParticipante(participante.id, frequencias);
                const obrigacoes = calcularObrigacoesFinanceirasParticipante(participante, curso, disciplinas, frequencias, pagamentos);
                const resumo = ajustarResumoObrigacoesPorStatusParticipante(participante, calcularResumoObrigacoes(obrigacoes), curso);
                const desistente = !Utilidades.participanteEstaAtivo(participante);
                const classeStatus = desistente ? 'cor-texto-erro' : 'cor-texto-sucesso';
                html += `<tr>
                    <td><strong>${Utilidades.escaparHtml(participante.nome || '-')}</strong></td>
                    <td class="texto-centro ${classeStatus}"><strong>${desistente ? 'Desistente' : 'Ativo'}</strong></td>
                    <td class="texto-centro ${obterClassePercentualFrequencia(frequencia.percentual, obterPercentualMinimoCurso(curso))}"><strong>${frequencia.percentual}%</strong></td>
                    <td class="texto-centro ${resumo.aPagar > 0 ? 'cor-texto-primario' : 'cor-texto-sucesso'}"><strong>${resumo.aPagar > 0 ? Utilidades.formatarMoeda(resumo.aPagar) : '-'}</strong></td>
                    <td class="texto-centro ${resumo.atrasado > 0 ? 'cor-texto-erro' : 'cor-texto-sucesso'}"><strong>${resumo.atrasado > 0 ? Utilidades.formatarMoeda(resumo.atrasado) : '-'}</strong></td>
                </tr>`;
            });
        });

        html += '</tbody></table>' + fecharGrupoParoquiaRelatorio();
    });

    dispararImpressao('Status dos Participantes', html);
}

function criarMapaParoquias(paroquias = []) {
    const mapa = {};
    paroquias.forEach(paroquia => { mapa[paroquia.id] = paroquia.nome; });
    return mapa;
}

function filtrarTabelaAcademica(termo = '') {
    const campo = document.getElementById('busca-tabela-acad');
    if (!campo) return;
    campo.value = termo;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    campo.focus();
}
