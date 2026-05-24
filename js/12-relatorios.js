async function renderizarRelatorios(conteudo) {
    const participantes = await bd.obterTodos('participantes');
    const disciplinas = await bd.obterTodos('disciplinas');
    const cursos = await bd.obterTodos('cursos');
    const pagamentos = await bd.obterTodos('pagamentos');
    const despesas = await bd.obterTodos('financas');
    const frequencias = await bd.obterTodos('frequencia');
    const atividades = await bd.obterTodos('atividades');

    participantes.sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));
    disciplinas.sort((a, b) => (a.nome_disciplina || '').localeCompare(b.nome_disciplina || ''));

    const cursoAtual = cursos.find(curso => String(curso.id_curso) === String(cursoSelecionado));

    let codigoEstrutura = '<div class="cartao-padrao mb-lg">';
    codigoEstrutura += '<div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario m-zero">Painéis e Relatórios</h2>';
    codigoEstrutura += criarBotao('Selecionar Curso', 'abrirJanelaSelecaoCursoRelatorio()', 'secundario');
    codigoEstrutura += '</div>';

    if (cursos.length === 0) {
        codigoEstrutura += '<p class="p-md texto-centro cor-texto-claro fundo-superficie-2 raio-sm">Cadastre um curso antes de gerar relatórios.</p>';
        codigoEstrutura += '</div>';
        conteudo.innerHTML = codigoEstrutura;
        return;
    }

    if (!cursoAtual) {
        codigoEstrutura += '<p class="p-md texto-centro cor-texto-claro fundo-superficie-2 raio-sm">Selecione um curso para carregar os relatórios acadêmicos e financeiros.</p>';
        codigoEstrutura += '</div>';
        conteudo.innerHTML = codigoEstrutura;
        setTimeout(() => abrirJanelaSelecaoCursoRelatorio(), 100);
        return;
    }

    const disciplinasCurso = disciplinas.filter(disciplina => String(disciplina.id_curso) === String(cursoAtual.id_curso));
    const participantesCurso = participantes.filter(participante => String(participante.id_curso) === String(cursoAtual.id_curso));
    const idsDisciplinasCurso = new Set(disciplinasCurso.map(disciplina => String(disciplina.id_disciplina)));
    const idsParticipantesCurso = new Set(participantesCurso.map(participante => String(participante.id_participante)));
    const frequenciasCurso = frequencias.filter(frequencia => {
        const pertenceAoCurso = String(frequencia.id_curso || '') === String(cursoAtual.id_curso);
        const pertenceADisciplina = idsDisciplinasCurso.has(String(frequencia.id_disciplina || ''));
        return pertenceAoCurso || pertenceADisciplina;
    });
    const atividadesCurso = atividades.filter(atividade => {
        return idsParticipantesCurso.has(String(atividade.id_participante || '')) &&
            idsDisciplinasCurso.has(String(atividade.id_disciplina || ''));
    });

    codigoEstrutura += `<div class="fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm p-md mb-lg">
        <span class="texto-sm cor-texto-claro">Curso selecionado</span>
        <h3 class="texto-lg peso-bold cor-texto-primario m-zero">${cursoAtual.nome_curso || 'Curso sem nome'}</h3>
    </div>`;

    codigoEstrutura += '<div class="flex gap-sm mb-lg md-flex-coluna borda-vazada-inferior pb-sm">';
    codigoEstrutura += criarBotao('Módulo Acadêmico', "alternarAbaRelatorio('academico')", 'primario', 'botao-aba-relatorio', 'button', 'id="aba-rel-academico"');
    codigoEstrutura += criarBotao('Módulo Financeiro', "alternarAbaRelatorio('financeiro')", 'secundario', 'botao-aba-relatorio', 'button', 'id="aba-rel-financeiro"');
    codigoEstrutura += '</div>';

    codigoEstrutura += '<div id="sub-aba-academico" class="sub-aba-relatorio">';
    codigoEstrutura += renderizarControlesAcademico(disciplinasCurso);
    codigoEstrutura += renderizarDashboardAcademico(participantesCurso, frequenciasCurso, atividadesCurso, disciplinasCurso);
    codigoEstrutura += '</div>';

    codigoEstrutura += '<div id="sub-aba-financeiro" class="sub-aba-relatorio oculto">';
    codigoEstrutura += renderizarControlesFinanceiro();
    codigoEstrutura += renderizarDashboardFinanceiro(participantesCurso, pagamentos, despesas, cursos);
    codigoEstrutura += '</div>';

    codigoEstrutura += '</div>';
    conteudo.innerHTML = codigoEstrutura;
}

async function abrirJanelaSelecaoCursoRelatorio() {
    const cursos = await bd.obterTodos('cursos');
    document.getElementById('titulo-janela').textContent = 'Selecionar Curso';

    let codigoEstrutura = '<div class="flex flex-coluna gap-sm">';
    codigoEstrutura += criarSeletor(
        'Curso',
        'relatorio-curso-selecionado',
        cursos.map(curso => ({ id: curso.id_curso, nome: `${curso.nome_curso || 'Curso'}${curso.ano_curso ? ' - ' + curso.ano_curso : ''}` })),
        cursoSelecionado,
        true
    );
    codigoEstrutura += criarRodapeFormulario('confirmarCursoRelatorio()', 'Confirmar');
    codigoEstrutura += '</div>';

    document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
    Interface.abrirJanela('janela-formulario');
}

function confirmarCursoRelatorio() {
    const seletorCurso = document.getElementById('relatorio-curso-selecionado');
    const idCurso = seletorCurso ? seletorCurso.value : '';

    if (!idCurso) {
        Utilidades.notificacao('Selecione um curso para gerar os relatórios.', 'aviso');
        return;
    }

    cursoSelecionado = idCurso;
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}

async function obterDadosCursoRelatorio() {
    const [cursos, disciplinas, participantes, frequencias, atividades, paroquias] = await Promise.all([
        bd.obterTodos('cursos'),
        bd.obterTodos('disciplinas'),
        bd.obterTodos('participantes'),
        bd.obterTodos('frequencia'),
        bd.obterTodos('atividades'),
        bd.obterTodos('paroquias')
    ]);

    const curso = cursos.find(item => String(item.id_curso) === String(cursoSelecionado));
    if (!curso) {
        Utilidades.notificacao('Selecione um curso para gerar este relatório.', 'aviso');
        return null;
    }

    const disciplinasCurso = disciplinas.filter(item => String(item.id_curso) === String(curso.id_curso));
    const participantesCurso = participantes.filter(item => String(item.id_curso) === String(curso.id_curso));
    const idsDisciplinasCurso = new Set(disciplinasCurso.map(item => String(item.id_disciplina)));
    const idsParticipantesCurso = new Set(participantesCurso.map(item => String(item.id_participante)));
    const frequenciasCurso = frequencias.filter(item => {
        const pertenceAoCurso = String(item.id_curso || '') === String(curso.id_curso);
        const pertenceADisciplina = idsDisciplinasCurso.has(String(item.id_disciplina || ''));
        return pertenceAoCurso || pertenceADisciplina;
    });
    const atividadesCurso = atividades.filter(item => {
        return idsParticipantesCurso.has(String(item.id_participante || '')) &&
            idsDisciplinasCurso.has(String(item.id_disciplina || ''));
    });

    return {
        curso,
        paroquias,
        disciplinas: disciplinasCurso,
        participantes: participantesCurso,
        frequencias: frequenciasCurso,
        atividades: atividadesCurso
    };
}

function alternarAbaRelatorio(abaAlvo) {
    document.querySelectorAll('.sub-aba-relatorio').forEach(el => el.classList.add('oculto'));
    document.querySelectorAll('.botao-aba-relatorio').forEach(el => {
        el.className = 'botao-padrao botao-secundario botao-aba-relatorio';
    });

    const containerAlvo = document.getElementById(`sub-aba-${abaAlvo}`);
    const botaoAlvo = document.getElementById(`aba-rel-${abaAlvo}`);

    if (containerAlvo) containerAlvo.classList.remove('oculto');
    if (botaoAlvo) botaoAlvo.className = 'botao-padrao botao-primario botao-aba-relatorio';
}

function dispararImpressao(titulo, htmlConteudo) {
    abrirDocumentoImpressao(titulo, htmlConteudo);
}
