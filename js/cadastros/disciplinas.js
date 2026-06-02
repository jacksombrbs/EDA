async function renderizarDisciplinas(conteudo) {
    const disciplinas = await bd.obterTodos('disciplinas');
    const cursos = await bd.obterTodos('cursos');
    const palestrantes = await bd.obterTodos('palestrantes');

    disciplinas.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    cursos.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    let codigo = '<div class="pagina-conteudo">';
    codigo += criarCabecalhoSecao('Disciplinas Cadastradas', criarBotao('+ Nova Disciplina', 'abrirFormularioDisciplina()'));
    codigo += Busca.criarCampoBusca('busca-disciplinas', 'Buscar por curso, disciplina ou palestrante...');
    codigo += disciplinas.length
        ? renderizarDisciplinasPorCurso(disciplinas, cursos, palestrantes)
        : criarMensagemVazia('Nenhuma disciplina cadastrada ainda.');
    codigo += '</div>';

    conteudo.innerHTML = codigo;
    cursos.forEach(curso => Busca.vincularFiltro('busca-disciplinas', `corpo-tabela-disciplinas-${curso.id}`));
    Busca.vincularFiltro('busca-disciplinas', 'corpo-tabela-disciplinas-sem-curso');
}

async function abrirFormularioDisciplina(id = null) {
    AppEstado.modoEdicao = 'disciplinas';
    AppEstado.registroEmEdicao = id;

    const cursos = await bd.obterTodos('cursos');
    const palestrantes = await bd.obterTodos('palestrantes');
    const disciplina = id ? await bd.obter('disciplinas', id) : { ids_palestrantes: [] };
    if (!Array.isArray(disciplina.ids_palestrantes)) disciplina.ids_palestrantes = [];

    cursos.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    AppEstado.cursosFormularioDisciplina = cursos;
    const opcoesCursos = cursos.map(curso => ({ id: curso.id, nome: curso.nome }));

    palestrantes.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    document.getElementById('titulo-janela').textContent = id ? 'Editar Disciplina' : 'Nova Disciplina';

    let formulario = '<form id="formulario-disciplina" class="flex flex-coluna gap-md w-total" onsubmit="salvarDisciplina(event)">';
    formulario += '<div class="flex gap-md md-flex-coluna">';
    formulario += '<div class="flex-1 w-total">' + criarCampoFormulario('Nome da Disciplina', 'text', 'nome', disciplina?.nome || '', 'Ex: História da Igreja', true) + '</div>';
    formulario += '<div class="flex-1 w-total">' + criarSeletor('Curso', 'id_curso', opcoesCursos, disciplina?.id_curso || '', true) + '</div>';
    formulario += '</div>';
    formulario += '<div class="flex gap-md md-flex-coluna">';
    formulario += '<div class="flex-1 w-total">' + criarCampoFormulario('Carga Horária', 'number', 'carga_horaria', disciplina?.carga_horaria || '', 'Ex: 8', true) + '</div>';
    formulario += '<div id="recipiente-cobranca-disciplina" class="flex-1 w-total"></div>';
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
    document.getElementById('carga_horaria')?.setAttribute('step', '0.5');
    document.getElementById('id_curso')?.addEventListener('change', () => atualizarCamposCobrancaDisciplina(disciplina));
    atualizarCamposCobrancaDisciplina(disciplina);
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
        carga_horaria: normalizarCargaHoraria(document.getElementById('carga_horaria')?.value || 0),
        valor_disciplina: document.getElementById('valor_disciplina')?.value || '0',
        quantidade_encontros: Number(document.getElementById('quantidade_encontros')?.value || 1),
        encontros_gratuitos: Number(document.getElementById('encontros_gratuitos')?.value || 0),
        curso_cobra_por_disciplina: cursoSelecionadoCobraPorDisciplina(),
        curso_cobra_por_encontro: cursoSelecionadoCobraPorEncontro(),
        ids_palestrantes: Array.from(document.querySelectorAll('.marcador-palestrante:checked')).map(marcador => marcador.value)
    };
}

function validarDisciplina(dados) {
    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Nome da Disciplina', valor: dados.nome },
        { nome: 'Curso', valor: dados.id_curso },
        { nome: 'Carga Horária', valor: dados.carga_horaria }
    ])) {
        return { valido: false };
    }

    if (!Number.isFinite(dados.carga_horaria) || dados.carga_horaria <= 0) {
        Utilidades.notificacao('Informe uma carga horária maior que zero.', 'erro');
        return { valido: false };
    }

    if (!Validacao.listaNaoVazia(dados.ids_palestrantes)) {
        Utilidades.notificacao('Selecione ao menos um palestrante para a equipe.', 'erro');
        return { valido: false };
    }

    let valorDisciplina = { valido: true, valor: 0 };
    if (dados.curso_cobra_por_disciplina) {
        valorDisciplina = Validacao.validarCampoMonetario(dados.valor_disciplina, 'Valor da disciplina', true);
        if (!valorDisciplina.valido) return { valido: false };
        if (valorDisciplina.valor < 0) {
            Utilidades.notificacao('O valor da disciplina não pode ser negativo.', 'erro');
            return { valido: false };
        }
    }

    const quantidadeEncontros = dados.curso_cobra_por_encontro ? Number(dados.quantidade_encontros || 0) : 1;
    const encontrosGratuitos = dados.curso_cobra_por_encontro ? Number(dados.encontros_gratuitos || 0) : 0;

    if (dados.curso_cobra_por_encontro && (!Number.isInteger(quantidadeEncontros) || quantidadeEncontros <= 0)) {
        Utilidades.notificacao('Informe a quantidade de encontros da disciplina.', 'erro');
        return { valido: false };
    }

    if (dados.curso_cobra_por_encontro && (!Number.isInteger(encontrosGratuitos) || encontrosGratuitos < 0 || encontrosGratuitos > quantidadeEncontros)) {
        Utilidades.notificacao('Informe uma quantidade de encontros gratuitos entre 0 e o total de encontros.', 'erro');
        return { valido: false };
    }

    return { valido: true, dados: { ...dados, valor_disciplina: valorDisciplina.valor, quantidade_encontros: quantidadeEncontros, encontros_gratuitos: encontrosGratuitos } };
}

function montarDisciplina(dados, id = null) {
    return {
        id: id || Utilidades.gerarId(),
        nome: dados.nome,
        id_curso: dados.id_curso,
        carga_horaria: dados.carga_horaria,
        valor_disciplina: dados.valor_disciplina,
        quantidade_encontros: dados.quantidade_encontros,
        encontros_gratuitos: dados.encontros_gratuitos,
        ids_palestrantes: dados.ids_palestrantes
    };
}

function renderizarDisciplinasPorCurso(disciplinas, cursos, palestrantes) {
    const grupos = cursos.map(curso => ({
        curso,
        disciplinas: disciplinas.filter(disciplina => String(disciplina.id_curso) === String(curso.id))
    })).filter(grupo => grupo.disciplinas.length > 0);

    const disciplinasSemCurso = disciplinas.filter(disciplina => !cursos.some(curso => String(curso.id) === String(disciplina.id_curso)));
    if (disciplinasSemCurso.length > 0) grupos.push({ curso: { id: 'sem-curso', nome: 'Sem curso vinculado' }, disciplinas: disciplinasSemCurso });

    return grupos.map(grupo => {
        const idCorpo = grupo.curso.id === 'sem-curso' ? 'corpo-tabela-disciplinas-sem-curso' : `corpo-tabela-disciplinas-${grupo.curso.id}`;
        const cargaTotal = grupo.disciplinas.reduce((total, disciplina) => total + normalizarCargaHoraria(disciplina.carga_horaria, 0), 0);

        return `
            <div class="cartao-suave mb-md">
                <div class="flex itens-centro justifica-espaco gap-md md-flex-coluna md-itens-esquerda mb-sm">
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">${Utilidades.escaparHtml(grupo.curso.nome || 'Curso')}</h3>
                    <span class="texto-sm cor-texto-claro">${grupo.disciplinas.length} disciplina(s) · ${formatarHorasCargaHoraria(cargaTotal)}</span>
                </div>
                ${renderizarTabelaDisciplinas(grupo.disciplinas, cursos, palestrantes, idCorpo)}
            </div>
        `;
    }).join('');
}

function renderizarTabelaDisciplinas(disciplinas, cursos, palestrantes, idCorpo = 'corpo-tabela-disciplinas') {
    const linhas = disciplinas.map((disciplina, indice) => {
        const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
        const curso = cursos.find(item => String(item.id) === String(disciplina.id_curso));
        const valorDisciplina = cursoCobraPorDisciplina(curso) ? formatarValorDisciplina(disciplina) : '-';
        const encontros = cursoCobraPorEncontro(curso) ? formatarEncontrosDisciplina(disciplina) : '-';
        const nomesPalestrantes = disciplina.ids_palestrantes?.length
            ? disciplina.ids_palestrantes.map(id => {
                const palestrante = palestrantes.find(item => String(item.id) === String(id));
                return palestrante ? Utilidades.escaparHtml(palestrante.nome) : 'Não encontrado';
            }).join(', ')
            : '<span class="cor-texto-claro">Nenhum</span>';

        return `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml(`${disciplina.nome || ''} ${curso?.nome || ''} ${nomesPalestrantes}`)}">
            <td class="p-md texto-esquerda"><strong>${Utilidades.escaparHtml(disciplina.nome)}</strong></td>
            <td class="p-md texto-esquerda">${formatarHorasCargaHoraria(disciplina.carga_horaria)}</td>
            <td class="p-md texto-esquerda">${valorDisciplina}</td>
            <td class="p-md texto-esquerda">${encontros}</td>
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
        ['Nome', 'Carga Horária', 'Valor', 'Encontros', 'Palestrantes', 'Ações'],
        linhas,
        '',
        idCorpo
    );
}


function obterCursoFormularioDisciplina() {
    const idCurso = document.getElementById('id_curso')?.value || '';
    return (AppEstado.cursosFormularioDisciplina || []).find(curso => String(curso.id) === String(idCurso)) || null;
}

function cursoSelecionadoCobraPorDisciplina() {
    return cursoCobraPorDisciplina(obterCursoFormularioDisciplina());
}

function cursoSelecionadoCobraPorEncontro() {
    return cursoCobraPorEncontro(obterCursoFormularioDisciplina());
}

function atualizarCamposCobrancaDisciplina(disciplina = null) {
    const recipiente = document.getElementById('recipiente-cobranca-disciplina');
    if (!recipiente) return;

    recipiente.classList.remove('oculto');

    if (cursoSelecionadoCobraPorDisciplina()) {
        const valorAtual = document.getElementById('valor_disciplina')?.value || disciplina?.valor_disciplina || '';
        recipiente.innerHTML = `
            ${criarCampoFormulario('Valor da Disciplina (R$)', 'number', 'valor_disciplina', valorAtual, 'Ex: 80.00', false)}
            <input type="hidden" id="quantidade_encontros" value="1">
            <input type="hidden" id="encontros_gratuitos" value="0">
            <p class="texto-sm cor-texto-claro m-zero mt-xs">Deixe 0 para disciplina gratuita, como encontros cobertos pela inscrição.</p>
        `;
        document.getElementById('valor_disciplina')?.setAttribute('step', '0.01');
        return;
    }

    if (cursoSelecionadoCobraPorEncontro()) {
        const quantidadeAtual = document.getElementById('quantidade_encontros')?.value || disciplina?.quantidade_encontros || 1;
        const gratuitosAtual = document.getElementById('encontros_gratuitos')?.value || disciplina?.encontros_gratuitos || 0;
        recipiente.innerHTML = `
            <input type="hidden" id="valor_disciplina" value="0">
            <div class="flex gap-md md-flex-coluna">
                <div class="flex-1 w-total">${criarCampoFormulario('Quant. de Encontros', 'number', 'quantidade_encontros', quantidadeAtual, 'Ex: 3', true)}</div>
                <div class="flex-1 w-total">${criarCampoFormulario('Encontros Gratuitos', 'number', 'encontros_gratuitos', gratuitosAtual, 'Ex: 1')}</div>
            </div>
            <p class="texto-sm cor-texto-claro m-zero mt-xs">Use encontros gratuitos para itens cobertos pela inscrição. Eles não geram cobrança no pagamento.</p>
        `;
        document.getElementById('quantidade_encontros')?.setAttribute('step', '1');
        document.getElementById('encontros_gratuitos')?.setAttribute('step', '1');
        return;
    }

    recipiente.classList.add('oculto');
    recipiente.innerHTML = '<input type="hidden" id="valor_disciplina" value="0"><input type="hidden" id="quantidade_encontros" value="1"><input type="hidden" id="encontros_gratuitos" value="0">';
}

function formatarEncontrosDisciplina(disciplina = null) {
    const total = Math.max(Number(disciplina?.quantidade_encontros || 1), 1);
    const gratuitos = Math.min(Math.max(Number(disciplina?.encontros_gratuitos || 0), 0), total);
    if (gratuitos <= 0) return `${total} encontro(s)`;
    return `${total} encontro(s), ${gratuitos} gratuito(s)`;
}

function formatarValorDisciplina(disciplina = null) {
    const valor = Utilidades.normalizarValorMonetario(disciplina?.valor_disciplina || 0);
    return valor > 0 ? Utilidades.formatarMoeda(valor) : '<span class="cor-texto-claro">Gratuita</span>';
}

function filtrarPalestrantesModal() {
    const termo = document.getElementById('filtro-palestrantes-modal')?.value.toLowerCase() || '';
    document.querySelectorAll('.item-marcador-palestrante').forEach(item => {
        const nome = item.getAttribute('data-nome') || '';
        item.classList.toggle('oculto', !nome.includes(termo));
    });
}
