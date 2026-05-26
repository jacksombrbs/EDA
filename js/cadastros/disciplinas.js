async function renderizarDisciplinas(conteudo) {
    const disciplinas = await bd.obterTodos('disciplinas');
    const cursos = await bd.obterTodos('cursos');
    const palestrantes = await bd.obterTodos('palestrantes');

    disciplinas.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    let codigo = '<div class="pagina-conteudo">';
    codigo += criarCabecalhoSecao('Disciplinas Cadastradas', criarBotao('+ Nova Disciplina', 'abrirFormularioDisciplina()'));
    codigo += Busca.criarCampoBusca('busca-disciplinas', 'Buscar por nome...');
    codigo += disciplinas.length
        ? renderizarTabelaDisciplinas(disciplinas, cursos, palestrantes)
        : criarMensagemVazia('Nenhuma disciplina cadastrada ainda.');
    codigo += '</div>';

    conteudo.innerHTML = codigo;
    Busca.vincularFiltro('busca-disciplinas', 'corpo-tabela-disciplinas');
}

async function abrirFormularioDisciplina(id = null) {
    AppEstado.modoEdicao = 'disciplinas';
    AppEstado.registroEmEdicao = id;

    const cursos = await bd.obterTodos('cursos');
    const palestrantes = await bd.obterTodos('palestrantes');
    const disciplina = id ? await bd.obter('disciplinas', id) : { ids_palestrantes: [] };
    if (!Array.isArray(disciplina.ids_palestrantes)) disciplina.ids_palestrantes = [];

    const opcoesCursos = cursos
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
        .map(curso => ({ id: curso.id, nome: curso.nome }));

    palestrantes.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    document.getElementById('titulo-janela').textContent = id ? 'Editar Disciplina' : 'Nova Disciplina';

    let formulario = '<form id="formulario-disciplina" class="flex flex-coluna gap-md w-total" onsubmit="salvarDisciplina(event)">';
    formulario += '<div class="flex gap-md md-flex-coluna">';
    formulario += '<div class="flex-1 w-total">' + criarCampoFormulario('Nome da Disciplina', 'text', 'nome', disciplina?.nome || '', 'Ex: História da Igreja', true) + '</div>';
    formulario += '<div class="flex-1 w-total">' + criarSeletor('Curso', 'id_curso', opcoesCursos, disciplina?.id_curso || '', true) + '</div>';
    formulario += '</div>';

    formulario += '<div class="fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm p-md mt-sm flex flex-coluna">';
    formulario += '<h3 class="texto-md peso-bold cor-texto-primario mb-sm">Equipe de Palestrantes</h3>';
    formulario += Busca.criarCampoBusca('filtro-palestrantes-modal', 'Buscar palestrante...');
    formulario += '<div id="recipiente-opcoes-palestrantes" class="lista-selecao flex flex-coluna gap-xs">';

    if (palestrantes.length === 0) {
        formulario += '<p class="texto-sm cor-texto-claro p-sm m-zero">Nenhum palestrante cadastrado no sistema.</p>';
    } else {
        formulario += palestrantes.map(palestrante => {
            const marcado = disciplina.ids_palestrantes.map(String).includes(String(palestrante.id)) ? 'checked' : '';
            return `
                <label class="flex itens-centro gap-sm p-sm fundo-branco hover-fundo-superficie-2 raio-xxs cursor-apontador transicao item-marcador-palestrante" data-nome="${Utilidades.escaparHtml((palestrante.nome || '').toLowerCase())}">
                    <input type="checkbox" value="${palestrante.id}" class="marcador-palestrante checkbox-padrao cursor-apontador" ${marcado}>
                    <span class="texto-md cor-texto-escuro peso-medium">${Utilidades.escaparHtml(palestrante.nome)}</span>
                </label>
            `;
        }).join('');
    }

    formulario += '</div>';
    formulario += '</div>';
    formulario += criarRodapeFormulario('', id ? 'Atualizar Disciplina' : 'Salvar Disciplina', { tipoSalvar: 'submit' });
    formulario += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formulario;
    Interface.abrirJanela('janela-formulario');

    document.getElementById('filtro-palestrantes-modal')?.addEventListener('input', filtrarPalestrantesModal);
}

async function editarDisciplina(id) {
    await abrirFormularioDisciplina(id);
}

async function salvarDisciplina(evento) {
    if (evento) evento.preventDefault();

    const dados = obterDadosFormularioDisciplina();
    const validacao = validarDisciplina(dados);
    if (!validacao.valido) return;

    await bd.salvar('disciplinas', montarDisciplina(validacao.dados, AppEstado.registroEmEdicao));
    Utilidades.notificacao(AppEstado.registroEmEdicao ? 'Disciplina atualizada!' : 'Disciplina salva com sucesso!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    await renderizarAbaAtual();
}

async function excluirDisciplina(id) {
    if (!confirm('Deseja realmente excluir esta disciplina?')) return;

    await bd.excluir('disciplinas', id);
    Utilidades.notificacao('Disciplina excluída!', 'sucesso');
    await renderizarAbaAtual();
}

function obterDadosFormularioDisciplina() {
    return {
        nome: document.getElementById('nome')?.value.trim() || '',
        id_curso: document.getElementById('id_curso')?.value || '',
        ids_palestrantes: Array.from(document.querySelectorAll('.marcador-palestrante:checked')).map(marcador => marcador.value)
    };
}

function validarDisciplina(dados) {
    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Nome da Disciplina', valor: dados.nome },
        { nome: 'Curso', valor: dados.id_curso }
    ])) {
        return { valido: false };
    }

    if (!Validacao.listaNaoVazia(dados.ids_palestrantes)) {
        Utilidades.notificacao('Selecione ao menos um palestrante para a equipe.', 'erro');
        return { valido: false };
    }

    return { valido: true, dados };
}

function montarDisciplina(dados, id = null) {
    return {
        id: id || Utilidades.gerarId(),
        nome: dados.nome,
        id_curso: dados.id_curso,
        ids_palestrantes: dados.ids_palestrantes
    };
}

function renderizarTabelaDisciplinas(disciplinas, cursos, palestrantes) {
    const linhas = disciplinas.map((disciplina, indice) => {
        const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
        const curso = cursos.find(item => String(item.id) === String(disciplina.id_curso));
        const nomesPalestrantes = disciplina.ids_palestrantes?.length
            ? disciplina.ids_palestrantes.map(id => {
                const palestrante = palestrantes.find(item => String(item.id) === String(id));
                return palestrante ? Utilidades.escaparHtml(palestrante.nome) : 'Não encontrado';
            }).join(', ')
            : '<span class="cor-texto-claro">Nenhum</span>';

        return `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml(`${disciplina.nome || ''} ${curso?.nome || ''} ${nomesPalestrantes}`)}">
            <td class="p-md texto-esquerda"><strong>${Utilidades.escaparHtml(disciplina.nome)}</strong></td>
            <td class="p-md texto-esquerda">${Utilidades.escaparHtml(curso?.nome || 'Não encontrado')}</td>
            <td class="p-md texto-esquerda">${nomesPalestrantes}</td>
            <td class="p-md texto-esquerda">
                ${criarAcoesTabela([
                    { rotulo: 'Editar', acao: `editarDisciplina('${disciplina.id}')` },
                    { rotulo: 'Excluir', acao: `excluirDisciplina('${disciplina.id}')`, perigo: true }
                ])}
            </td>
        </tr>`;
    }).join('');

    return criarContainerTabela(
        ['Nome', 'Curso', 'Palestrantes', 'Ações'],
        linhas,
        'tabela-disciplinas',
        'corpo-tabela-disciplinas'
    );
}

function filtrarPalestrantesModal() {
    const termo = document.getElementById('filtro-palestrantes-modal')?.value.toLowerCase() || '';
    document.querySelectorAll('.item-marcador-palestrante').forEach(item => {
        const nome = item.getAttribute('data-nome') || '';
        item.classList.toggle('oculto', !nome.includes(termo));
    });
}
