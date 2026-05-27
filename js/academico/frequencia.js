async function renderizarFrequencia(conteudo) {
    const [cursos, disciplinas, frequencias] = await Promise.all([
        bd.obterTodos('cursos'),
        bd.obterTodos('disciplinas'),
        bd.obterTodos('frequencias')
    ]);

    cursos.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    let codigo = '<div class="pagina-conteudo">';
    codigo += criarCabecalhoSecao('Frequência');
    codigo += '<div class="flex flex-linha md-flex-coluna gap-md mb-lg itens-fim">';
    codigo += '<div class="flex-1 w-total">' + criarSeletor('Curso', 'freq-curso', cursos.map(curso => ({ id: curso.id, nome: curso.nome })), '') + '</div>';
    codigo += '<div class="flex-1 w-total" id="recipiente-disciplina-frequencia">' + criarSeletor('Disciplina', 'freq-disciplina', [{ id: '', nome: 'Selecione um curso primeiro...' }], '') + '</div>';
    const dataAula = new Date().toISOString().split('T')[0];
    codigo += '<input type="hidden" id="freq-data" value="' + dataAula + '">';
    codigo += '<div class="flex-1">' + criarCampoSomenteLeitura('Data da Aula', 'freq-data-visual', Utilidades.formatarData(dataAula)) + '</div>';
    codigo += '<div class="flex-1 w-total flex gap-sm md-flex-coluna mb-md">';
    codigo += criarBotao('Iniciar Chamada', 'abrirChamada()', 'primario', 'w-total');
    codigo += criarBotao('Imprimir Lista Física', 'gerarListaFisicaFrequencia()', 'secundario', 'w-total');
    codigo += '</div></div>';
    codigo += '<div class="pt-md"><h3 class="texto-md peso-bold cor-texto-primario mb-sm mt-sm">Histórico de Diários Lançados</h3>';
    codigo += frequencias.length ? renderizarTabelaFrequencias(frequencias, cursos, disciplinas) : criarMensagemVazia('Nenhum diário de classe foi lançado até o momento.');
    codigo += '</div></div>';

    conteudo.innerHTML = codigo;
    SeletorDinamico.vincular('freq-curso', 'recipiente-disciplina-frequencia', 'Disciplina', 'freq-disciplina', disciplinas, 'id_curso', 'Selecione a disciplina...');
}

async function abrirChamada() {
    const idCurso = document.getElementById('freq-curso')?.value || '';
    const idDisciplina = document.getElementById('freq-disciplina')?.value || '';
    const data = document.getElementById('freq-data')?.value || '';

    if (!idCurso) return Utilidades.notificacao('Selecione um curso para iniciar a chamada.', 'erro');
    if (!idDisciplina) return Utilidades.notificacao('Selecione uma disciplina.', 'erro');
    if (!data) return Utilidades.notificacao('Informe a data da aula.', 'erro');

    const participantes = await obterParticipantesDoCurso(idCurso);
    if (participantes.length === 0) return Utilidades.notificacao('Nenhum participante ativo matriculado neste curso.', 'aviso');

    AppEstado.frequenciaAtual = {
        id: null,
        id_curso: idCurso,
        id_disciplina: idDisciplina,
        data,
        participantes,
        presencas: Object.fromEntries(participantes.map(participante => [participante.id, true]))
    };

    await abrirJanelaFrequencia();
}

async function editarFrequencia(id) {
    const registro = await bd.obter('frequencias', id);
    if (!registro) return Utilidades.notificacao('Frequência não encontrada.', 'erro');

    const participantes = await obterParticipantesDoCurso(registro.id_curso);
    const presencas = Object.fromEntries(participantes.map(participante => [participante.id, false]));

    (registro.presencas || []).forEach(item => {
        presencas[item.id_participante] = Boolean(item.presente);
    });

    AppEstado.frequenciaAtual = {
        id: registro.id,
        id_curso: registro.id_curso,
        id_disciplina: registro.id_disciplina,
        data: registro.data,
        participantes,
        presencas
    };

    await abrirJanelaFrequencia();
}

async function salvarFrequencia() {
    if (!AppEstado.frequenciaAtual?.id_curso || !AppEstado.frequenciaAtual?.id_disciplina || !AppEstado.frequenciaAtual?.data) {
        return Utilidades.notificacao('Dados da chamada incompletos.', 'erro');
    }

    const registro = montarRegistroFrequencia(
        AppEstado.frequenciaAtual.id_curso,
        AppEstado.frequenciaAtual.id_disciplina,
        AppEstado.frequenciaAtual.data,
        AppEstado.frequenciaAtual.participantes,
        AppEstado.frequenciaAtual.presencas,
        AppEstado.frequenciaAtual.id
    );

    await bd.salvar('frequencias', registro);
    Utilidades.notificacao(AppEstado.frequenciaAtual.id ? 'Frequência atualizada com sucesso!' : 'Diário salvo com sucesso!', 'sucesso');
    AppEstado.frequenciaAtual = null;
    Interface.fecharJanela('janela-formulario');
    await renderizarAbaAtual();
}

async function excluirFrequencia(id) {
    if (!confirm('Deseja realmente excluir este registro de frequência?')) return;

    await bd.excluir('frequencias', id);
    Utilidades.notificacao('Frequência excluída com sucesso!', 'sucesso');
    await renderizarAbaAtual();
}

async function abrirJanelaFrequencia() {
    const [curso, disciplina] = await Promise.all([
        bd.obter('cursos', AppEstado.frequenciaAtual.id_curso),
        bd.obter('disciplinas', AppEstado.frequenciaAtual.id_disciplina)
    ]);

    document.getElementById('titulo-janela').textContent = AppEstado.frequenciaAtual.id ? 'Editar Diário de Classe' : 'Novo Diário de Classe';

    let html = `
        <div class="mb-md p-md fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm flex justifica-espaco md-flex-coluna gap-sm">
            <div>
                <p class="texto-md cor-texto-escuro mb-xs"><strong>Curso:</strong> ${Utilidades.escaparHtml(curso?.nome || '-')}</p>
                <p class="texto-md cor-texto-escuro"><strong>Disciplina:</strong> ${Utilidades.escaparHtml(disciplina?.nome || '-')}</p>
            </div>
            <div class="md-texto-esquerda texto-direita">
                <p class="texto-md cor-texto-escuro"><strong>Data:</strong> ${Utilidades.formatarData(AppEstado.frequenciaAtual.data)}</p>
            </div>
        </div>
    `;

    const linhas = AppEstado.frequenciaAtual.participantes.map((participante, indice) => {
        const presente = Boolean(AppEstado.frequenciaAtual.presencas[participante.id]);
        const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
        const texto = presente ? 'Compareceu' : 'Faltou';
        const classes = presente ? 'fundo-sucesso hover-fundo-sucesso-escuro cor-texto-branco' : 'fundo-erro hover-fundo-erro-escuro cor-texto-branco';

        return `
            <tr class="${classeFundo} transicao hover-fundo-superficie-3">
                <td class="p-md texto-esquerda texto-md peso-medium cor-texto-escuro">${Utilidades.escaparHtml(participante.nome)}</td>
                <td class="p-md texto-direita">
                    ${criarBotao(texto, `alternarFrequenciaParticipante('${participante.id}')`, 'neutro', `botao-pequeno w-total ${classes}`, 'button', `id="botao-frequencia-${participante.id}"`)}
                </td>
            </tr>
        `;
    }).join('');

    html += criarContainerTabela(['Nome do Participante', 'Presença'], linhas, '', '', 'lista-rolagem-modal mb-md');
    html += criarRodapeFormulario('salvarFrequencia()', AppEstado.frequenciaAtual.id ? 'Atualizar Frequência' : 'Salvar Frequência');

    document.getElementById('conteudo-formulario').innerHTML = html;
    Interface.abrirJanela('janela-formulario');
}

function alternarFrequenciaParticipante(idParticipante) {
    if (!AppEstado.frequenciaAtual) return;

    AppEstado.frequenciaAtual.presencas[idParticipante] = !AppEstado.frequenciaAtual.presencas[idParticipante];
    const botao = document.getElementById(`botao-frequencia-${idParticipante}`);
    if (!botao) return;

    const presente = Boolean(AppEstado.frequenciaAtual.presencas[idParticipante]);
    botao.textContent = presente ? 'Compareceu' : 'Faltou';
    botao.classList.toggle('fundo-sucesso', presente);
    botao.classList.toggle('hover-fundo-sucesso-escuro', presente);
    botao.classList.toggle('fundo-erro', !presente);
    botao.classList.toggle('hover-fundo-erro-escuro', !presente);
}

function renderizarTabelaFrequencias(frequencias, cursos, disciplinas) {
    const linhas = frequencias
        .sort((a, b) => new Date(b.data) - new Date(a.data))
        .map((registro, indice) => {
            const curso = cursos.find(item => String(item.id) === String(registro.id_curso));
            const disciplina = disciplinas.find(item => String(item.id) === String(registro.id_disciplina));
            const resumo = calcularResumoFrequencia(registro);
            const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            return `<tr class="${classeFundo} transicao hover-fundo-superficie-3">
                <td class="p-md peso-medium">${Utilidades.formatarData(registro.data)}</td>
                <td class="p-md">${Utilidades.escaparHtml(curso?.nome || 'Não encontrado')}</td>
                <td class="p-md peso-bold">${Utilidades.escaparHtml(disciplina?.nome || 'Não encontrada')}</td>
                <td class="p-md">${resumo.presentes}/${resumo.total} (${resumo.percentual}%)</td>
                <td class="p-md">${criarAcoesTabela([
                    { rotulo: 'Editar', acao: `editarFrequencia('${registro.id}')` },
                    { rotulo: 'Excluir', acao: `excluirFrequencia('${registro.id}')`, perigo: true }
                ])}</td>
            </tr>`;
        }).join('');

    return criarContainerTabela(['Data', 'Curso', 'Disciplina', 'Presenças', 'Ações'], linhas);
}

async function iniciarNovaChamada() {
    await abrirChamada();
}

async function salvarDiarioFrequencia() {
    await salvarFrequencia();
}
