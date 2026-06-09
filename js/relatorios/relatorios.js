async function renderizarRelatorios(conteudo) {
    const contexto = await carregarContextoRelatorios();
    const { cursos, curso, participantes, participantesTodosCurso, disciplinas, frequencias, atividades, pagamentos, financas } = contexto;
    const titulo = curso ? `Painéis e Relatórios - ${curso.nome || 'Curso sem nome'}` : 'Painel de Cursos';
    const botoesCabecalho = curso
        ? criarBotao('Painel de Cursos', 'limparCursoRelatorio()', 'secundario')
        : '';

    let codigo = '<div class="pagina-conteudo pagina-relatorios">';
    codigo += criarCabecalhoSecao(titulo, botoesCabecalho);

    if (cursos.length === 0) {
        codigo += '<p class="p-md texto-centro cor-texto-claro fundo-superficie-2 raio-sm">Cadastre um curso antes de gerar relatórios.</p>';
        codigo += '</div>';
        conteudo.innerHTML = codigo;
        return;
    }

    if (!curso) {
        codigo += renderizarPainelCursosRelatorio(contexto);
        codigo += '</div>';
        conteudo.innerHTML = codigo;
        return;
    }

    codigo += '<div class="flex gap-sm mb-lg md-flex-coluna pb-sm">';
    codigo += criarBotao('Módulo Acadêmico', "alternarAbaRelatorio('academico')", 'primario', 'botao-aba-relatorio', 'button', 'id="aba-rel-academico"');
    codigo += criarBotao('Módulo Financeiro', "alternarAbaRelatorio('financeiro')", 'secundario', 'botao-aba-relatorio', 'button', 'id="aba-rel-financeiro"');
    codigo += criarBotao('Ficha Individual', "alternarAbaRelatorio('ficha')", 'secundario', 'botao-aba-relatorio', 'button', 'id="aba-rel-ficha"');
    codigo += '</div>';

    codigo += '<div id="sub-aba-academico" class="sub-aba-relatorio">';
    codigo += renderizarPainelAcademico(participantes, frequencias, atividades, disciplinas, curso);
    codigo += '</div>';

    codigo += '<div id="sub-aba-financeiro" class="sub-aba-relatorio oculto">';
    codigo += renderizarPainelFinanceiro(participantesTodosCurso || participantes, pagamentos, financas, cursos, disciplinas, frequencias);
    codigo += '</div>';

    codigo += '<div id="sub-aba-ficha" class="sub-aba-relatorio oculto">';
    codigo += await renderizarSecaoFichaParticipante(contexto);
    codigo += '</div>';

    codigo += '</div>';
    conteudo.innerHTML = codigo;
}

function renderizarPainelCursosRelatorio(contexto = {}) {
    const cursosOrdenados = [...(contexto.cursos || [])].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    let html = '<div class="flex flex-coluna gap-md">';
    html += '<div class="grade-metricas-painel grade-2-colunas">';
    html += cursosOrdenados.map(curso => montarCardCursoRelatorio(curso, contexto)).join('');
    html += '</div></div>';

    return html;
}

function montarCardCursoRelatorio(curso, contexto = {}) {
    const contextoCurso = montarContextoCursoRelatorio({ ...contexto, curso }, curso);
    const participantesCurso = contextoCurso.participantesTodosCurso || [];
    const participantesAtivos = contextoCurso.participantes || [];
    const desistentes = participantesCurso.length - participantesAtivos.length;
    const percentualMinimo = obterPercentualMinimoCurso(curso);
    const academico = calcularEstatisticasAcademicas(participantesAtivos, contextoCurso.frequencias, contextoCurso.atividades, percentualMinimo);
    const financeiro = calcularEstatisticasFinanceiras(participantesCurso, contextoCurso.pagamentos, contextoCurso.financas, contexto.cursos, contextoCurso.disciplinas, contextoCurso.frequencias);
    const subtitulo = [curso.ano, obterTipoCobrancaCurso(curso)].filter(Boolean).join(' · ');

    return `
        <div class="cartao-geracao-relatorio cursor-apontador" role="button" tabindex="0" onclick="selecionarCursoRelatorio('${Utilidades.escaparHtml(curso.id)}')" onkeydown="if(event.key==='Enter'){selecionarCursoRelatorio('${Utilidades.escaparHtml(curso.id)}')}">
            <div class="flex itens-centro justifica-espaco gap-sm mb-sm">
                <div>
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">${Utilidades.escaparHtml(curso.nome || 'Curso sem nome')}</h3>
                    <p class="texto-sm cor-texto-claro m-zero">${Utilidades.escaparHtml(subtitulo || 'Curso')}</p>
                </div>
                <span class="texto-sm cor-texto-claro">Abrir relatórios</span>
            </div>
            ${criarMetricasRelatorio([
                { rotulo: 'Ativos', valor: participantesAtivos.length },
                { rotulo: 'Desistentes', valor: desistentes },
                { rotulo: 'Frequência', valor: `${academico.frequenciaMedia}%` },
                { rotulo: 'Recebido', valor: Utilidades.formatarMoeda(financeiro.totalRecebido) },
                { rotulo: 'Pendente', valor: Utilidades.formatarMoeda(financeiro.valorPendente) },
                { rotulo: 'Atraso', valor: Utilidades.formatarMoeda(financeiro.valorEmAtraso) }
            ])}
        </div>
    `;
}

async function limparCursoRelatorio() {
    AppEstado.cursoSelecionado = '';
    await renderizarAbaAtual();
}

async function selecionarCursoRelatorio(idCurso = '') {
    AppEstado.cursoSelecionado = idCurso;
    await renderizarAbaAtual();
}

async function carregarContextoRelatorios() {
    const [cursos, disciplinas, participantes, frequencias, atividades, pagamentos, pagamentos_lote, financas, paroquias] = await Promise.all([
        bd.obterTodos('cursos'),
        bd.obterTodos('disciplinas'),
        bd.obterTodos('participantes'),
        bd.obterTodos('frequencias'),
        bd.obterTodos('atividades'),
        bd.obterTodos('pagamentos'),
        bd.obterTodos('pagamentos_lote'),
        bd.obterTodos('financas'),
        bd.obterTodos('paroquias')
    ]);

    cursos.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    disciplinas.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    participantes.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    const curso = cursos.find(item => String(item.id) === String(AppEstado.cursoSelecionado)) || null;
    return filtrarDadosPorCurso({ cursos, curso, disciplinas, participantes, frequencias, atividades, pagamentos, pagamentos_lote, financas, paroquias });
}

function filtrarDadosPorCurso(contexto) {
    if (!contexto.curso) return contexto;
    return montarContextoCursoRelatorio(contexto, contexto.curso);
}

function montarContextoCursoRelatorio(contexto, curso) {
    const idCurso = curso?.id;
    const disciplinas = contexto.disciplinas.filter(item => String(item.id_curso) === String(idCurso));
    const participantesCurso = contexto.participantes.filter(item => String(item.id_curso) === String(idCurso));
    const participantes = participantesCurso.filter(participante => Utilidades.participanteEstaAtivo(participante));
    const participantesTodosCurso = participantesCurso;
    const idsDisciplinas = new Set(disciplinas.map(item => String(item.id)));
    const idsParticipantesCurso = new Set(participantesCurso.map(item => String(item.id)));
    const frequencias = contexto.frequencias.filter(item => {
        const pertenceAoCurso = String(item.id_curso || '') === String(idCurso);
        const pertenceADisciplina = idsDisciplinas.has(String(item.id_disciplina || ''));
        return pertenceAoCurso || pertenceADisciplina;
    });
    const atividades = contexto.atividades.filter(item => {
        const pertenceAoCurso = String(item.id_curso || '') === String(idCurso);
        const pertenceADisciplina = idsDisciplinas.has(String(item.id_disciplina || ''));
        const possuiParticipanteDoCurso = obterRegistrosAtividade(item)
            .some(registro => idsParticipantesCurso.has(String(registro.id_participante || '')));

        return (pertenceAoCurso || pertenceADisciplina) && possuiParticipanteDoCurso;
    });
    const pagamentos = contexto.pagamentos.filter(item => idsParticipantesCurso.has(String(item.id_participante || '')));
    const pagamentos_lote = contexto.pagamentos_lote.filter(lote =>
        Array.isArray(lote.ids_participantes)
        && lote.ids_participantes.some(idParticipante => idsParticipantesCurso.has(String(idParticipante)))
    );

    return {
        ...contexto,
        curso,
        disciplinas,
        participantes,
        participantesTodosCurso,
        frequencias,
        atividades,
        pagamentos,
        pagamentos_lote
    };
}

async function obterDadosCursoRelatorio() {
    const contexto = await carregarContextoRelatorios();

    if (!contexto.curso) {
        Utilidades.notificacao('Selecione um curso para gerar este relatório.', 'aviso');
        return null;
    }

    return contexto;
}

function alternarAbaRelatorio(abaAlvo) {
    document.querySelectorAll('.sub-aba-relatorio').forEach(elemento => elemento.classList.add('oculto'));
    document.querySelectorAll('.botao-aba-relatorio').forEach(elemento => {
        elemento.className = 'botao-padrao botao-secundario botao-aba-relatorio';
    });

    const containerAlvo = document.getElementById(`sub-aba-${abaAlvo}`);
    const botaoAlvo = document.getElementById(`aba-rel-${abaAlvo}`);

    if (containerAlvo) containerAlvo.classList.remove('oculto');
    if (botaoAlvo) botaoAlvo.className = 'botao-padrao botao-primario botao-aba-relatorio';
}

function dispararImpressao(titulo, htmlConteudo, opcoes = {}) {
    abrirDocumentoImpressao(titulo, htmlConteudo, opcoes);
}


function agruparParticipantesPorParoquia(participantes = []) {
    return participantes.reduce((grupos, participante) => {
        const idParoquia = participante.id_paroquia || 'sem_paroquia';
        if (!grupos[idParoquia]) grupos[idParoquia] = { idParoquia, participantes: [] };
        grupos[idParoquia].participantes.push(participante);
        return grupos;
    }, {});
}

function ordenarGruposParoquiaRelatorio(grupos = [], paroquiasMap = {}) {
    return [...grupos].sort((a, b) => {
        const nomeA = paroquiasMap[a.idParoquia] || 'Sem Vínculo';
        const nomeB = paroquiasMap[b.idParoquia] || 'Sem Vínculo';
        return nomeA.localeCompare(nomeB);
    });
}

function agruparParticipantesPorCapelaRelatorio(participantes = []) {
    const grupos = participantes.reduce((resultado, participante) => {
        const capela = participante.capela ? participante.capela.trim() : 'Sem Capela';
        if (!resultado[capela]) resultado[capela] = { capela, participantes: [] };
        resultado[capela].participantes.push(participante);
        return resultado;
    }, {});

    return Object.values(grupos)
        .sort((a, b) => a.capela.localeCompare(b.capela))
        .map(grupo => ({
            ...grupo,
            participantes: Utilidades.ordenarParticipantesPorNome(grupo.participantes)
        }));
}

function montarLinhaCapelaRelatorio(capela = '', colunas = 1) {
    return `<tr><td colspan="${colunas}" class="peso-bold cor-texto-primario fundo-superficie-2">Capela: ${Utilidades.escaparHtml(capela || 'Sem Capela')}</td></tr>`;
}
