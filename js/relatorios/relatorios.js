async function renderizarRelatorios(conteudo) {
    const contexto = await carregarContextoRelatorios();
    const { cursos, curso, participantes, disciplinas, frequencias, atividades, pagamentos, financas } = contexto;
    const titulo = curso ? `Painéis e Relatórios - ${curso.nome || 'Curso sem nome'}` : 'Painéis e Relatórios';

    let codigo = '<div class="pagina-conteudo pagina-relatorios">';
    codigo += criarCabecalhoSecao(titulo, criarBotao('Selecionar Curso', 'abrirJanelaSelecaoCursoRelatorio()', 'secundario'));

    if (cursos.length === 0) {
        codigo += '<p class="p-md texto-centro cor-texto-claro fundo-superficie-2 raio-sm">Cadastre um curso antes de gerar relatórios.</p>';
        codigo += '</div>';
        conteudo.innerHTML = codigo;
        return;
    }

    if (!curso) {
        codigo += '<p class="p-md texto-centro cor-texto-claro fundo-superficie-2 raio-sm">Selecione um curso para carregar os relatórios acadêmicos e financeiros.</p>';
        codigo += '</div>';
        conteudo.innerHTML = codigo;
        setTimeout(() => abrirJanelaSelecaoCursoRelatorio(), 100);
        return;
    }

    codigo += '<div class="flex gap-sm mb-lg md-flex-coluna pb-sm">';
    codigo += criarBotao('Módulo Acadêmico', "alternarAbaRelatorio('academico')", 'primario', 'botao-aba-relatorio', 'button', 'id="aba-rel-academico"');
    codigo += criarBotao('Módulo Financeiro', "alternarAbaRelatorio('financeiro')", 'secundario', 'botao-aba-relatorio', 'button', 'id="aba-rel-financeiro"');
    codigo += criarBotao('Ficha Individual', "alternarAbaRelatorio('ficha')", 'secundario', 'botao-aba-relatorio', 'button', 'id="aba-rel-ficha"');
    codigo += '</div>';

    codigo += '<div id="sub-aba-academico" class="sub-aba-relatorio">';
    codigo += renderizarDashboardAcademico(participantes, frequencias, atividades, disciplinas);
    codigo += '</div>';

    codigo += '<div id="sub-aba-financeiro" class="sub-aba-relatorio oculto">';
    codigo += renderizarDashboardFinanceiro(participantes, pagamentos, financas, cursos);
    codigo += '</div>';

    codigo += '<div id="sub-aba-ficha" class="sub-aba-relatorio oculto">';
    codigo += await renderizarSecaoFichaParticipante(contexto);
    codigo += '</div>';

    codigo += '</div>';
    conteudo.innerHTML = codigo;
}

async function abrirJanelaSelecaoCursoRelatorio() {
    const cursos = await bd.obterTodos('cursos');
    cursos.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    document.getElementById('titulo-janela').textContent = 'Selecionar Curso';

    let codigo = '<div class="flex flex-coluna gap-sm">';
    codigo += criarSeletor(
        'Curso',
        'relatorio-curso-selecionado',
        cursos.map(curso => ({ id: curso.id, nome: `${curso.nome || 'Curso'}${curso.ano ? ' - ' + curso.ano : ''}` })),
        AppEstado.cursoSelecionado || '',
        true
    );
    codigo += criarRodapeFormulario('confirmarCursoRelatorio()', 'Confirmar');
    codigo += '</div>';

    document.getElementById('conteudo-formulario').innerHTML = codigo;
    Interface.abrirJanela('janela-formulario');
}

function confirmarCursoRelatorio() {
    const seletorCurso = document.getElementById('relatorio-curso-selecionado');
    const idCurso = seletorCurso ? seletorCurso.value : '';

    if (!idCurso) {
        Utilidades.notificacao('Selecione um curso para gerar os relatórios.', 'aviso');
        return;
    }

    selecionarCursoRelatorio(idCurso);
}

async function selecionarCursoRelatorio(idCurso = '') {
    AppEstado.cursoSelecionado = idCurso;
    Interface.fecharJanela('janela-formulario');
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

    const idCurso = contexto.curso.id;
    const disciplinas = contexto.disciplinas.filter(item => String(item.id_curso) === String(idCurso));
    const participantesCurso = contexto.participantes.filter(item => String(item.id_curso) === String(idCurso));
    const participantes = participantesCurso.filter(participante => Utilidades.participanteEstaAtivo(participante));
    const idsDisciplinas = new Set(disciplinas.map(item => String(item.id)));
    const idsParticipantesAtivos = new Set(participantes.map(item => String(item.id)));
    const idsParticipantesCurso = new Set(participantesCurso.map(item => String(item.id)));
    const frequencias = contexto.frequencias.filter(item => {
        const pertenceAoCurso = String(item.id_curso || '') === String(idCurso);
        const pertenceADisciplina = idsDisciplinas.has(String(item.id_disciplina || ''));
        return pertenceAoCurso || pertenceADisciplina;
    });
    const atividades = contexto.atividades.filter(item => {
        const pertenceAoCurso = String(item.id_curso || '') === String(idCurso);
        const pertenceADisciplina = idsDisciplinas.has(String(item.id_disciplina || ''));
        const possuiParticipanteAtivo = obterRegistrosAtividade(item)
            .some(registro => idsParticipantesAtivos.has(String(registro.id_participante || '')));

        return (pertenceAoCurso || pertenceADisciplina) && possuiParticipanteAtivo;
    });
    const pagamentos = contexto.pagamentos.filter(item => idsParticipantesCurso.has(String(item.id_participante || '')));
    const pagamentos_lote = contexto.pagamentos_lote.filter(lote =>
        Array.isArray(lote.ids_participantes)
        && lote.ids_participantes.some(idParticipante => idsParticipantesCurso.has(String(idParticipante)))
    );

    return {
        ...contexto,
        disciplinas,
        participantes,
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
