async function renderizarAtividades(conteudo) {
    const [atividades, participantes, disciplinas, cursos] = await Promise.all([
        bd.obterTodos('atividades'),
        bd.obterTodos('participantes'),
        bd.obterTodos('disciplinas'),
        bd.obterTodos('cursos')
    ]);

    let codigo = '<div class="pagina-conteudo">';
    codigo += criarCabecalhoSecao('Atividades Entregues', criarBotao('+ Nova Atividade', 'abrirFormularioAtividade()'));
    codigo += Busca.criarCampoBusca('busca-atividades', 'Buscar por participante ou disciplina...');
    codigo += atividades.length
        ? renderizarTabelaAtividades(atividades, participantes, disciplinas, cursos)
        : criarMensagemVazia('Nenhuma atividade registrada ainda.');
    codigo += '</div>';

    conteudo.innerHTML = codigo;
    Busca.vincularFiltro('busca-atividades', 'corpo-tabela-atividades');
}

async function abrirFormularioAtividade(id = null) {
    AppEstado.modoEdicao = 'atividades';
    AppEstado.registroEmEdicao = id;

    const [participantes, disciplinas, cursos, atividade] = await Promise.all([
        bd.obterTodos('participantes'),
        bd.obterTodos('disciplinas'),
        bd.obterTodos('cursos'),
        id ? bd.obter('atividades', id) : Promise.resolve(null)
    ]);

    document.getElementById('titulo-janela').textContent = id ? 'Editar Atividade' : 'Nova Atividade';

    const dataPadrao = new Date().toISOString().split('T')[0];
    const dados = atividade || { data_entrega: dataPadrao };

    let formulario = '<form id="formulario-atividade" class="flex flex-coluna gap-md" onsubmit="salvarAtividade(event)">';
    formulario += '<div class="w-total">' + criarSeletor('Curso', 'id_curso', cursos.map(curso => ({ id: curso.id, nome: curso.nome })), dados.id_curso || '', true) + '</div>';
    formulario += '<div class="flex flex-linha md-flex-coluna gap-md">';
    formulario += '<div class="flex-1 w-total" id="recipiente-participante-atividade">' + criarSeletor('Participante', 'id_participante', [{ id: '', nome: 'Selecione um curso primeiro...' }], '') + '</div>';
    formulario += '<div class="flex-1 w-total" id="recipiente-disciplina-atividade">' + criarSeletor('Disciplina', 'id_disciplina', [{ id: '', nome: 'Selecione um curso primeiro...' }], '') + '</div>';
    formulario += '</div>';
    formulario += `<input type="hidden" id="data_entrega" value="${dados.data_entrega || dataPadrao}">`;
    formulario += criarCampoSomenteLeitura('Data de Entrega', 'data_entrega_visual', Utilidades.formatarData(dados.data_entrega || dataPadrao), { real: dados.data_entrega || dataPadrao });
    formulario += criarAreaTexto('Comentários / Observações', 'observacoes', dados.observacoes || '', 3);
    formulario += criarRodapeFormulario('', id ? 'Atualizar Atividade' : 'Salvar Atividade', { tipoSalvar: 'submit' });
    formulario += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formulario;
    Interface.abrirJanela('janela-formulario');

    const participantesDisponiveis = participantes.filter(participante =>
        Utilidades.participanteEstaAtivo(participante) || String(participante.id) === String(dados.id_participante || '')
    );
    SeletorDinamico.vincular('id_curso', 'recipiente-participante-atividade', 'Participante', 'id_participante', participantesDisponiveis, 'id_curso', 'Selecione o participante...', dados.id_participante);
    SeletorDinamico.vincular('id_curso', 'recipiente-disciplina-atividade', 'Disciplina', 'id_disciplina', disciplinas, 'id_curso', 'Selecione a disciplina...', dados.id_disciplina);
}

async function salvarAtividade(evento) {
    if (evento) evento.preventDefault();

    const dados = obterDadosFormularioAtividade();
    if (!validarAtividade(dados)) return;

    await bd.salvar('atividades', montarAtividade(dados, AppEstado.registroEmEdicao));
    Utilidades.notificacao(AppEstado.registroEmEdicao ? 'Atividade atualizada com sucesso!' : 'Atividade registrada com sucesso!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    await renderizarAbaAtual();
}

async function editarAtividade(id) {
    await abrirFormularioAtividade(id);
}

async function excluirAtividade(id) {
    if (!confirm('Deseja realmente excluir esta atividade?')) return;

    await bd.excluir('atividades', id);
    Utilidades.notificacao('Atividade excluída!', 'sucesso');
    await renderizarAbaAtual();
}

function renderizarTabelaAtividades(atividades, participantes, disciplinas, cursos) {
    const linhas = atividades
        .sort((a, b) => new Date(b.data_entrega) - new Date(a.data_entrega))
        .map((atividade, indice) => {
            const participante = participantes.find(item => String(item.id) === String(atividade.id_participante));
            const disciplina = disciplinas.find(item => String(item.id) === String(atividade.id_disciplina));
            const curso = cursos.find(item => String(item.id) === String(atividade.id_curso));
            const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            return `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml(`${participante?.nome || ''} ${disciplina?.nome || ''} ${curso?.nome || ''}`)}">
                <td class="p-md texto-esquerda cor-texto-escuro peso-bold">${Utilidades.escaparHtml(participante?.nome || 'Desconhecido')}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.escaparHtml(curso?.nome || 'Desconhecido')}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.escaparHtml(disciplina?.nome || 'Desconhecida')}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.formatarData(atividade.data_entrega)}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.escaparHtml(atividade.observacoes || '-')}</td>
                <td class="p-md texto-esquerda">${criarAcoesTabela([
                    { rotulo: 'Editar', acao: `editarAtividade('${atividade.id}')` },
                    { rotulo: 'Excluir', acao: `excluirAtividade('${atividade.id}')`, perigo: true }
                ])}</td>
            </tr>`;
        }).join('');

    return criarContainerTabela(
        ['Participante', 'Curso', 'Disciplina', 'Data de Entrega', 'Comentários', 'Ações'],
        linhas,
        '',
        'corpo-tabela-atividades'
    );
}
