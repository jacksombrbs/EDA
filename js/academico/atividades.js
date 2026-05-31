async function renderizarAtividades(conteudo) {
    const [atividades, disciplinas, cursos] = await Promise.all([
        bd.obterTodos('atividades'),
        bd.obterTodos('disciplinas'),
        bd.obterTodos('cursos')
    ]);

    cursos.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));

    const dataEntrega = new Date().toISOString().split('T')[0];
    let codigo = '<div class="pagina-conteudo">';
    codigo += criarCabecalhoSecao('Atividades');
    codigo += '<div class="flex flex-linha md-flex-coluna gap-md mb-lg itens-fim">';
    codigo += '<div class="flex-1 w-total">' + criarSeletor('Curso', 'atividade-curso', cursos.map(curso => ({ id: curso.id, nome: curso.nome })), '') + '</div>';
    codigo += '<div class="flex-1 w-total" id="recipiente-disciplina-atividade">' + criarSeletor('Disciplina', 'atividade-disciplina', [{ id: '', nome: 'Selecione um curso primeiro...' }], '') + '</div>';
    codigo += '<input type="hidden" id="atividade-data" value="' + dataEntrega + '">';
    codigo += '<div class="flex-1">' + criarCampoSomenteLeitura('Data de Entrega', 'atividade-data-visual', Utilidades.formatarData(dataEntrega)) + '</div>';
    codigo += '<div class="flex-1 w-total flex gap-sm md-flex-coluna mb-md">';
    codigo += criarBotao('Lançar Atividades', 'abrirLancamentoAtividades()', 'primario', 'w-total');
    codigo += '</div></div>';
    codigo += Busca.criarCampoBusca('busca-atividades', 'Buscar por curso ou disciplina...');
    codigo += atividades.length
        ? renderizarTabelaAtividades(atividades, disciplinas, cursos)
        : criarMensagemVazia('Nenhum lançamento de atividades registrado ainda.');
    codigo += '</div>';

    conteudo.innerHTML = codigo;
    Busca.vincularFiltro('busca-atividades', 'corpo-tabela-atividades');
    SeletorDinamico.vincular('atividade-curso', 'recipiente-disciplina-atividade', 'Disciplina', 'atividade-disciplina', disciplinas, 'id_curso', 'Selecione a disciplina...');
}

async function abrirLancamentoAtividades(idLancamento = '') {
    const atividadeExistente = idLancamento ? await bd.obter('atividades', idLancamento) : null;
    const dadosBase = await obterDadosLancamentoAtividades(atividadeExistente);

    if (!validarLancamentoAtividades(dadosBase)) return;

    const participantes = await obterParticipantesAtivosAtividade(dadosBase.id_curso);
    if (participantes.length === 0) {
        Utilidades.notificacao('Nenhum participante ativo matriculado neste curso.', 'aviso');
        return;
    }

    const atividade = atividadeExistente || await obterLancamentoAtividadeExistente(dadosBase);
    AppEstado.atividadeAtual = montarEstadoLancamentoAtividades(dadosBase, participantes, atividade);

    await abrirJanelaLancamentoAtividades();
}

async function obterDadosLancamentoAtividades(atividadeExistente = null) {
    return {
        id: atividadeExistente?.id || null,
        id_curso: atividadeExistente?.id_curso || document.getElementById('atividade-curso')?.value || '',
        id_disciplina: atividadeExistente?.id_disciplina || document.getElementById('atividade-disciplina')?.value || '',
        data_entrega: atividadeExistente?.data_entrega || document.getElementById('atividade-data')?.value || new Date().toISOString().split('T')[0]
    };
}

async function obterLancamentoAtividadeExistente(dadosBase) {
    const atividades = await bd.obterTodos('atividades');
    return filtrarAtividadesDoLancamento(
        atividades,
        dadosBase.id_curso,
        dadosBase.id_disciplina,
        dadosBase.data_entrega
    )[0] || null;
}

function montarEstadoLancamentoAtividades(dadosBase, participantes = [], atividade = null) {
    const registrosExistentes = obterRegistrosAtividade(atividade);
    const registros = Object.fromEntries(participantes.map(participante => {
        const registro = registrosExistentes.find(item => String(item.id_participante) === String(participante.id));
        return [participante.id, {
            estado: registro?.estado || ESTADO_ATIVIDADE_NAO_ENTREGUE,
            observacoes: registro?.observacoes || ''
        }];
    }));

    return {
        id: atividade?.id || dadosBase.id || null,
        id_curso: dadosBase.id_curso,
        id_disciplina: dadosBase.id_disciplina,
        data_entrega: dadosBase.data_entrega,
        participantes,
        registros
    };
}

async function abrirJanelaLancamentoAtividades() {
    if (!AppEstado.atividadeAtual) {
        Utilidades.notificacao('Nenhum lançamento de atividades aberto.', 'erro');
        return;
    }

    const [curso, disciplina] = await Promise.all([
        bd.obter('cursos', AppEstado.atividadeAtual.id_curso),
        bd.obter('disciplinas', AppEstado.atividadeAtual.id_disciplina)
    ]);

    document.getElementById('titulo-janela').textContent = AppEstado.atividadeAtual.id ? 'Editar Lançamento de Atividades' : 'Lançar Atividades';

    let html = `
        <div class="mb-md p-md fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm flex justifica-espaco md-flex-coluna gap-sm">
            <div>
                <p class="texto-md cor-texto-escuro mb-xs"><strong>Curso:</strong> ${Utilidades.escaparHtml(curso?.nome || '-')}</p>
                <p class="texto-md cor-texto-escuro"><strong>Disciplina:</strong> ${Utilidades.escaparHtml(disciplina?.nome || '-')}</p>
            </div>
            <div class="md-texto-esquerda texto-direita">
                <p class="texto-md cor-texto-escuro"><strong>Data:</strong> ${Utilidades.formatarData(AppEstado.atividadeAtual.data_entrega)}</p>
            </div>
        </div>
    `;

    const linhas = AppEstado.atividadeAtual.participantes.map((participante, indice) => criarLinhaLancamentoAtividade(participante, indice)).join('');
    html += criarContainerTabela(['Nome', 'Status', 'Observações'], linhas, '', '', 'lista-rolagem-modal mb-md');
    html += criarRodapeFormulario('salvarLancamentoAtividades()', 'Salvar Atividades');

    document.getElementById('conteudo-formulario').innerHTML = html;
    Interface.abrirJanela('janela-formulario');
}

function criarLinhaLancamentoAtividade(participante, indice) {
    const registro = AppEstado.atividadeAtual.registros[participante.id] || {};
    const entregue = normalizarEstadoAtividade(registro.estado) === ESTADO_ATIVIDADE_ENTREGUE;
    const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
    const texto = entregue ? 'Entregue' : 'Não Ent.';
    const classes = entregue ? 'fundo-sucesso hover-fundo-sucesso-escuro cor-texto-branco' : 'fundo-erro hover-fundo-erro-escuro cor-texto-branco';

    return `
        <tr class="${classeFundo} transicao hover-fundo-superficie-3">
            <td class="p-md texto-esquerda texto-md peso-medium cor-texto-escuro">${Utilidades.escaparHtml(participante.nome || '-')}</td>
            <td class="p-md texto-esquerda">
                ${criarBotao(texto, `alternarEstadoAtividadeParticipante('${participante.id}')`, 'neutro', `botao-pequeno w-total ${classes}`, 'button', `id="botao-atividade-${participante.id}"`)}
            </td>
            <td class="p-md texto-esquerda">
                <textarea id="observacoes-atividade-${participante.id}" class="campo-padrao" rows="2" placeholder="Observações...">${Utilidades.escaparHtml(registro.observacoes || '')}</textarea>
            </td>
        </tr>
    `;
}

function alternarEstadoAtividadeParticipante(idParticipante) {
    if (!AppEstado.atividadeAtual?.registros?.[idParticipante]) return;

    const registro = AppEstado.atividadeAtual.registros[idParticipante];
    const entregue = normalizarEstadoAtividade(registro.estado) !== ESTADO_ATIVIDADE_ENTREGUE;
    registro.estado = entregue ? ESTADO_ATIVIDADE_ENTREGUE : ESTADO_ATIVIDADE_NAO_ENTREGUE;

    const botao = document.getElementById(`botao-atividade-${idParticipante}`);
    if (!botao) return;

    botao.textContent = entregue ? 'Entregue' : 'Não Ent.';
    botao.classList.toggle('fundo-sucesso', entregue);
    botao.classList.toggle('hover-fundo-sucesso-escuro', entregue);
    botao.classList.toggle('fundo-erro', !entregue);
    botao.classList.toggle('hover-fundo-erro-escuro', !entregue);
}

async function salvarLancamentoAtividades() {
    const lancamento = AppEstado.atividadeAtual;
    if (!lancamento) return Utilidades.notificacao('Nenhum lançamento de atividades aberto.', 'erro');
    if (!validarLancamentoAtividades(lancamento)) return;

    const registros = lancamento.participantes.map(participante => {
        const registro = lancamento.registros[participante.id] || {};
        const observacoes = document.getElementById(`observacoes-atividade-${participante.id}`)?.value.trim() || '';
        return montarRegistroAtividade(participante.id, registro.estado, observacoes);
    });

    const atividade = montarAtividade({
        id_curso: lancamento.id_curso,
        id_disciplina: lancamento.id_disciplina,
        data_entrega: lancamento.data_entrega,
        registros
    }, lancamento.id);

    await bd.salvar('atividades', atividade);
    await removerLancamentosAtividadesDuplicados(atividade);

    Utilidades.notificacao('Atividades salvas com sucesso!', 'sucesso');
    AppEstado.atividadeAtual = null;
    Interface.fecharJanela('janela-formulario');
    await renderizarAbaAtual();
}

async function removerLancamentosAtividadesDuplicados(atividadeMantida) {
    const atividades = await bd.obterTodos('atividades');
    const duplicadas = filtrarAtividadesDoLancamento(
        atividades,
        atividadeMantida.id_curso,
        atividadeMantida.id_disciplina,
        atividadeMantida.data_entrega
    ).filter(item => String(item.id) !== String(atividadeMantida.id));

    for (const duplicada of duplicadas) {
        await bd.excluir('atividades', duplicada.id);
    }
}

async function editarAtividade(id) {
    await abrirLancamentoAtividades(id);
}

async function excluirAtividade(id) {
    if (!confirm('Deseja realmente excluir este lançamento de atividades?')) return;

    await bd.excluir('atividades', id);
    Utilidades.notificacao('Lançamento de atividades excluído!', 'sucesso');
    await renderizarAbaAtual();
}

function renderizarTabelaAtividades(atividades, disciplinas, cursos) {
    const linhas = atividades
        .sort((a, b) => new Date(b.data_entrega) - new Date(a.data_entrega))
        .map((atividade, indice) => {
            const disciplina = disciplinas.find(item => String(item.id) === String(atividade.id_disciplina));
            const curso = cursos.find(item => String(item.id) === String(atividade.id_curso));
            const resumo = calcularResumoLancamentoAtividade(atividade);
            const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            return `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml(`${disciplina?.nome || ''} ${curso?.nome || ''}`)}">
                <td class="p-md texto-esquerda cor-texto-escuro peso-medium">${Utilidades.formatarData(atividade.data_entrega)}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.escaparHtml(curso?.nome || 'Desconhecido')}</td>
                <td class="p-md texto-esquerda cor-texto-escuro peso-bold">${Utilidades.escaparHtml(disciplina?.nome || 'Desconhecida')}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${resumo.entregues}/${resumo.total}</td>
                <td class="p-md texto-esquerda cor-texto-erro peso-bold">${resumo.naoEntregues}</td>
                <td class="p-md texto-esquerda">${criarAcoesTabela([
                    { rotulo: 'Editar', acao: `editarAtividade('${atividade.id}')` },
                    { rotulo: 'Excluir', acao: `excluirAtividade('${atividade.id}')`, perigo: true }
                ])}</td>
            </tr>`;
        }).join('');

    return criarContainerTabela(
        ['Data', 'Curso', 'Disciplina', 'Entregues', 'Não Ent.', 'Ações'],
        linhas,
        '',
        'corpo-tabela-atividades'
    );
}
