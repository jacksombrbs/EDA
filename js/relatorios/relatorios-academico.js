function filtrarAtividadesEntreguesRelatorio(atividades = []) {
    return listarRegistrosAtividadesEntregues(atividades);
}

function renderizarDashboardAcademico(participantes = [], frequencias = [], atividades = [], disciplinas = []) {
    const atividadesEntregues = filtrarAtividadesEntreguesRelatorio(atividades);
    const estatisticas = calcularEstatisticasAcademicas(participantes, frequencias, atividadesEntregues);

    let painel = criarGradeMetricas([
        { titulo: 'Total de Participantes', valor: estatisticas.totalParticipantes, classe: 'primario', icone: 'participantes' },
        { titulo: 'Frequência Média', valor: `${estatisticas.frequenciaMedia}%`, classe: estatisticas.frequenciaMedia >= 75 ? 'sucesso' : (estatisticas.frequenciaMedia >= 50 ? 'aviso' : 'erro'), icone: 'frequencia' },
        { titulo: 'Em Risco (<75%)', valor: estatisticas.participantesEmRisco, classe: estatisticas.participantesEmRisco > 0 ? 'erro' : 'sucesso', icone: 'frequencia' },
        { titulo: 'Total de Entregas', valor: estatisticas.entregasTotal, classe: 'primario', icone: 'atividades' }
    ], 4);

    const htmlGrafico = criarGradeGraficos([montarGraficoFrequencia(participantes, frequencias)]);

    const htmlRelatorios = `
        <div class="lista-relatorios-dashboard">
            <div class="cartao-geracao-relatorio">
                <div class="cabecalho-relatorio">
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Relatório de Frequência</h3>
                    ${criarBotao('Gerar Relatório', 'gerarPDFFrequencia()', 'contorno', 'botao-pequeno')}
                </div>
                <div class="flex gap-md md-flex-coluna w-total mt-sm">
                    <div class="flex-1 w-total">${criarSeletor('Tipo', 'filtro-tipo-frequencia', [{ id: 'geral', nome: 'Geral (Todos)' }, { id: 'disciplina', nome: 'Por Disciplina' }], 'geral', false)}</div>
                    <div id="recipiente-filtro-disciplina-frequencia" class="oculto flex-1 w-total">${criarSeletor('Disciplina', 'filtro-disciplina-freq', disciplinas.map(disciplina => ({ id: disciplina.id, nome: disciplina.nome })), '', false)}</div>
                </div>
            </div>

            <div class="cartao-geracao-relatorio">
                <div class="cabecalho-relatorio">
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Relatório de Atividades</h3>
                    ${criarBotao('Gerar Relatório', 'gerarPDFAtividades()', 'contorno', 'botao-pequeno')}
                </div>
                ${criarMetricasRelatorio([
                    { rotulo: 'Disciplinas', valor: disciplinas.length },
                    { rotulo: 'Entregas', valor: atividadesEntregues.length }
                ])}
            </div>
        </div>
    `;

    painel += `
        <div class="painel-dashboard-relatorio">
            <div class="area-grafico-relatorio">${htmlGrafico}</div>
            <div class="coluna-relatorios-dashboard">${htmlRelatorios}</div>
        </div>
    `;

    painel += '<div class="flex flex-coluna gap-sm mb-md w-total">';
    painel += '<h3 class="texto-md peso-bold cor-texto-primario m-zero">Resumo Geral Acadêmico</h3>';
    painel += '<div class="w-total">' + criarCampoFormulario('', 'text', 'busca-tabela-acad', '', 'Pesquisar por participante...', false) + '</div>';
    painel += '</div>';
    painel += renderizarTabelaResumoAcademico(participantes, frequencias, atividades, disciplinas);

    setTimeout(() => {
        Busca.vincularFiltro('busca-tabela-acad', 'corpo-tabela-acad');

        const tipoFrequencia = document.getElementById('filtro-tipo-frequencia');
        if (!tipoFrequencia) return;

        tipoFrequencia.addEventListener('change', evento => {
            const recipienteFiltro = document.getElementById('recipiente-filtro-disciplina-frequencia');
            if (!recipienteFiltro) return;

            if (evento.target.value === 'disciplina') {
                recipienteFiltro.classList.remove('oculto');
                return;
            }

            recipienteFiltro.classList.add('oculto');
            if (window.limparSeletorCustomizado) window.limparSeletorCustomizado('filtro-disciplina-freq');
        });
    }, 0);

    return painel;
}

function renderizarTabelaResumoAcademico(participantes, frequencias, atividades, disciplinas) {
    let linhas = '';

    if (participantes.length === 0) {
        linhas = '<tr><td colspan="4" class="p-md texto-centro cor-texto-claro">Nenhum participante cadastrado.</td></tr>';
    } else {
        participantes.forEach((participante, indice) => {
            const frequencia = calcularFrequenciaParticipante(participante.id, frequencias);
            const classeTaxa = frequencia.percentual >= 75 ? 'cor-texto-sucesso' : 'cor-texto-erro';
            const entregas = listarAtividadesPorParticipante(participante.id, atividades);
            const ultimaEntrega = obterTextoUltimaAtividade(entregas, disciplinas);
            const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            linhas += `<tr class="linha-participante-acad ${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml((participante.nome || '').toLowerCase())}">
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
            'Frequência (%)',
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

function calcularEstatisticasAcademicas(participantes = [], frequencias = [], atividades = []) {
    atividades = filtrarAtividadesEntreguesRelatorio(atividades);

    if (!Array.isArray(participantes) && participantes) {
        atividades = filtrarAtividadesEntreguesRelatorio(participantes.atividades || []);
        frequencias = participantes.frequencias || [];
        participantes = participantes.participantes || [];
    }

    participantes = participantes.filter(participante => Utilidades.participanteEstaAtivo(participante));

    let totalRegistros = 0;
    let totalPresencas = 0;
    let participantesEmRisco = 0;

    participantes.forEach(participante => {
        const frequencia = calcularFrequenciaParticipante(participante.id, frequencias);
        totalRegistros += frequencia.total;
        totalPresencas += frequencia.presentes;
        if (frequencia.total > 0 && frequencia.percentual < 75) participantesEmRisco++;
    });

    return {
        totalParticipantes: participantes.length,
        participantes: participantes.length,
        frequenciaMedia: totalRegistros > 0 ? Math.round((totalPresencas / totalRegistros) * 100) : 100,
        percentualFrequencia: totalRegistros > 0 ? Math.round((totalPresencas / totalRegistros) * 100) : 100,
        participantesEmRisco,
        entregasTotal: atividades.length,
        atividades: atividades.length
    };
}

function calcularFrequenciaParticipante(idParticipante, frequencias = []) {
    let total = 0;
    let presentes = 0;

    frequencias.forEach(frequencia => {
        const presenca = obterPresencaParticipante(frequencia, idParticipante);
        if (presenca === null) return;

        total++;
        if (presenca) presentes++;
    });

    return {
        total,
        presentes,
        faltas: total - presentes,
        percentual: total > 0 ? Math.round((presentes / total) * 100) : 100
    };
}

function agruparFrequenciasPorFaixa(participantes = [], frequencias = []) {
    const faixas = { '0-49%': 0, '50-74%': 0, '75-100%': 0 };
    const participantesConsiderados = participantes.filter(participante => Utilidades.participanteEstaAtivo(participante));

    participantesConsiderados.forEach(participante => {
        const frequencia = calcularFrequenciaParticipante(participante.id, frequencias);
        if (frequencia.percentual < 50) faixas['0-49%']++;
        else if (frequencia.percentual < 75) faixas['50-74%']++;
        else faixas['75-100%']++;
    });

    return faixas;
}

function calcularAtividadesParticipante(idParticipante, atividades = []) {
    return listarAtividadesEntreguesPorParticipante(idParticipante, atividades).length;
}

function listarAtividadesPorParticipante(idParticipante, atividades = []) {
    return listarAtividadesEntreguesPorParticipante(idParticipante, atividades);
}

function obterPresencaParticipante(frequencia, idParticipante) {
    const presencas = frequencia?.presencas;
    if (!presencas) return null;

    if (Array.isArray(presencas)) {
        const registro = presencas.find(item => String(item.id_participante) === String(idParticipante));
        if (!registro) return null;
        return normalizarPresenca(registro.presente);
    }

    if (Object.prototype.hasOwnProperty.call(presencas, idParticipante)) {
        return normalizarPresenca(presencas[idParticipante]);
    }

    return null;
}

function normalizarPresenca(valor) {
    if (typeof valor === 'boolean') return valor;
    const texto = String(valor || '').trim().toUpperCase();
    return ['C', 'P', 'PRESENTE', 'TRUE', 'SIM'].includes(texto);
}

async function gerarPDFFrequenciaAcademico() {
    const tipoRelatorio = document.getElementById('filtro-tipo-frequencia')?.value || 'geral';
    const idDisciplina = document.getElementById('filtro-disciplina-freq')?.value || '';

    if (tipoRelatorio === 'disciplina' && !idDisciplina) {
        Utilidades.notificacao('Selecione uma disciplina para o relatório.', 'erro');
        return;
    }

    const dadosRelatorio = await obterDadosCursoRelatorio();
    if (!dadosRelatorio) return;

    const { curso, disciplinas, participantes, frequencias, paroquias } = dadosRelatorio;
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const paroquiasMap = criarMapaParoquias(paroquias);

    let html = `<h2>RELATÓRIO DE FREQUÊNCIA</h2>`;
    html += `<p><strong>Curso:</strong> ${Utilidades.escaparHtml(curso.nome || '-')}</p>`;
    html += `<p><strong>Data de Emissão:</strong> ${dataHoje}</p>`;

    if (tipoRelatorio === 'geral') {
        html += montarHtmlFrequenciaGeral(participantes, disciplinas, frequencias, paroquiasMap);
        dispararImpressao('Relatório de Frequência Geral', html);
        return;
    }

    html += montarHtmlFrequenciaPorDisciplina(idDisciplina, participantes, disciplinas, frequencias);
    const disciplina = disciplinas.find(item => String(item.id) === String(idDisciplina));
    dispararImpressao(`Relatório de Frequência - ${disciplina?.nome || 'Disciplina'}`, html);
}

function montarHtmlFrequenciaGeral(participantes, disciplinas, frequencias, paroquiasMap) {
    if (disciplinas.length === 0) return '<p>Nenhuma disciplina cadastrada.</p>';

    const disciplinasOrdenadas = [...disciplinas].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    const agrupados = agruparParticipantesPorParoquia(participantes);
    let html = '';

    Object.keys(agrupados).sort((a, b) => (paroquiasMap[a] || 'Sem Vínculo').localeCompare(paroquiasMap[b] || 'Sem Vínculo')).forEach((idParoquia, indice) => {
        const participantesGrupo = agrupados[idParoquia].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        const nomeParoquia = paroquiasMap[idParoquia] || 'Participantes Sem Vínculo Paroquial';
        const quebra = indice > 0 ? ' class="quebra-pagina-antes"' : '';

        html += `<div${quebra}><h3>Paróquia: ${Utilidades.escaparHtml(nomeParoquia)}</h3>`;
        html += '<table><thead><tr><th class="coluna-nome-documento">Participante</th>';
        disciplinasOrdenadas.forEach(disciplina => { html += `<th class="texto-centro">${Utilidades.escaparHtml(disciplina.nome)}</th>`; });
        html += '</tr></thead><tbody>';

        participantesGrupo.forEach(participante => {
            html += `<tr><td><strong>${Utilidades.escaparHtml(participante.nome || '-')}</strong></td>`;
            disciplinasOrdenadas.forEach(disciplina => {
                const resultado = calcularResultadoDisciplinaParticipante(participante.id, disciplina.id, frequencias);
                html += `<td class="texto-centro ${resultado === 'C' ? 'cor-texto-sucesso peso-bold' : (resultado === 'F' ? 'cor-texto-erro peso-bold' : '')}">${resultado}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table></div>';
    });

    return html;
}

function montarHtmlFrequenciaPorDisciplina(idDisciplina, participantes, disciplinas, frequencias) {
    const disciplina = disciplinas.find(item => String(item.id) === String(idDisciplina));
    const registrosDisciplina = frequencias.filter(item => String(item.id_disciplina) === String(idDisciplina));
    const presentes = new Set();
    const ausentes = new Set();

    registrosDisciplina.forEach(frequencia => {
        participantes.forEach(participante => {
            const presenca = obterPresencaParticipante(frequencia, participante.id);
            if (presenca === null) return;

            if (presenca) {
                presentes.add(participante.nome || participante.id);
                ausentes.delete(participante.nome || participante.id);
            } else if (!presentes.has(participante.nome || participante.id)) {
                ausentes.add(participante.nome || participante.id);
            }
        });
    });

    let html = `<h3>Disciplina: ${Utilidades.escaparHtml(disciplina?.nome || '')}</h3>`;
    html += `<table><thead><tr><th>Participantes Presentes (${presentes.size})</th></tr></thead><tbody>`;
    html += presentes.size > 0
        ? [...presentes].sort().map(nome => `<tr><td><strong class="cor-texto-sucesso">C</strong> &nbsp; ${Utilidades.escaparHtml(nome)}</td></tr>`).join('')
        : '<tr><td class="texto-centro">Nenhum participante presente registrado.</td></tr>';
    html += '</tbody></table>';

    html += `<table><thead><tr><th>Participantes Ausentes (${ausentes.size})</th></tr></thead><tbody>`;
    html += ausentes.size > 0
        ? [...ausentes].sort().map(nome => `<tr><td><strong class="cor-texto-erro">F</strong> &nbsp; ${Utilidades.escaparHtml(nome)}</td></tr>`).join('')
        : '<tr><td class="texto-centro">Nenhum participante ausente registrado.</td></tr>';
    html += '</tbody></table>';

    return html;
}

function calcularResultadoDisciplinaParticipante(idParticipante, idDisciplina, frequencias) {
    let presencas = 0;
    let faltas = 0;

    frequencias.forEach(frequencia => {
        if (String(frequencia.id_disciplina) !== String(idDisciplina)) return;
        const presenca = obterPresencaParticipante(frequencia, idParticipante);
        if (presenca === null) return;
        if (presenca) presencas++;
        else faltas++;
    });

    if (presencas + faltas === 0) return '';
    return faltas > presencas ? 'F' : 'C';
}

async function gerarPDFAtividadesAcademico() {
    const dadosRelatorio = await obterDadosCursoRelatorio();
    if (!dadosRelatorio) return;

    const { curso, disciplinas, participantes, atividades, paroquias } = dadosRelatorio;
    const atividadesEntregues = filtrarAtividadesEntreguesRelatorio(atividades);
    const disciplinasOrdenadas = [...disciplinas].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    const paroquiasMap = criarMapaParoquias(paroquias);
    const agrupados = agruparParticipantesPorParoquiaECapela(participantes);

    let html = `<h2>RELATÓRIO GERAL DE ATIVIDADES (ENTREGAS)</h2>`;
    html += `<p><strong>Curso:</strong> ${Utilidades.escaparHtml(curso.nome || '-')}</p>`;
    html += `<p><strong>Data de Emissão:</strong> ${Utilidades.formatarData(new Date().toISOString().split('T')[0])}</p>`;

    if (disciplinasOrdenadas.length === 0) {
        html += '<p>Nenhuma disciplina cadastrada.</p>';
        dispararImpressao('Atividades', html);
        return;
    }

    Object.values(agrupados).sort((a, b) => {
        const nomeA = paroquiasMap[a.idParoquia] || 'Sem Vínculo';
        const nomeB = paroquiasMap[b.idParoquia] || 'Sem Vínculo';
        const comparacaoParoquia = nomeA.localeCompare(nomeB);
        if (comparacaoParoquia !== 0) return comparacaoParoquia;
        return a.capela.localeCompare(b.capela);
    }).forEach((grupo, indice) => {
        const participantesGrupo = grupo.participantes.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        const nomeParoquia = paroquiasMap[grupo.idParoquia] || 'Participantes Sem Vínculo Paroquial';
        const quebra = indice > 0 ? ' class="quebra-pagina-antes"' : '';

        html += `<div${quebra}><h3>Paróquia: ${Utilidades.escaparHtml(nomeParoquia)} / Capela: ${Utilidades.escaparHtml(grupo.capela)}</h3>`;
        html += '<table><thead><tr><th class="coluna-nome-documento">Nome do Participante</th>';
        disciplinasOrdenadas.forEach(disciplina => { html += `<th class="texto-centro">${Utilidades.escaparHtml(disciplina.nome)}</th>`; });
        html += '</tr></thead><tbody>';

        participantesGrupo.forEach(participante => {
            html += `<tr><td><strong>${Utilidades.escaparHtml(participante.nome || '-')}</strong></td>`;
            disciplinasOrdenadas.forEach(disciplina => {
                const entregou = atividadesEntregues.some(atividade =>
                    String(atividade.id_participante) === String(participante.id)
                    && String(atividade.id_disciplina) === String(disciplina.id)
                );
                html += `<td class="texto-centro"><strong>${entregou ? 'X' : ''}</strong></td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table></div>';
    });

    dispararImpressao('Relatório Geral de Atividades', html);
}

function criarMapaParoquias(paroquias = []) {
    const mapa = {};
    paroquias.forEach(paroquia => { mapa[paroquia.id] = paroquia.nome; });
    return mapa;
}

function agruparParticipantesPorParoquia(participantes = []) {
    return participantes.reduce((grupos, participante) => {
        const idParoquia = participante.id_paroquia || 'sem_paroquia';
        if (!grupos[idParoquia]) grupos[idParoquia] = [];
        grupos[idParoquia].push(participante);
        return grupos;
    }, {});
}

function agruparParticipantesPorParoquiaECapela(participantes = []) {
    return participantes.reduce((grupos, participante) => {
        const idParoquia = participante.id_paroquia || 'sem_paroquia';
        const capela = participante.capela ? participante.capela.trim() : 'Sem Capela';
        const chave = `${idParoquia}||${capela}`;
        if (!grupos[chave]) grupos[chave] = { idParoquia, capela, participantes: [] };
        grupos[chave].participantes.push(participante);
        return grupos;
    }, {});
}
