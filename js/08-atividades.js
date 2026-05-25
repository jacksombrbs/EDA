async function renderizarAtividades(conteudo) {
    const atividades = await bd.obterTodos('atividades');
    const participantes = await bd.obterTodos('participantes');
    const disciplinas = await bd.obterTodos('disciplinas');
    const cursos = await bd.obterTodos('cursos');

    atividades.sort((a, b) => {
        const disciplinaA = disciplinas.find(d => String(d.id_disciplina) === String(a.id_disciplina));
        const disciplinaB = disciplinas.find(d => String(d.id_disciplina) === String(b.id_disciplina));
        const nomeDiscA = disciplinaA ? (disciplinaA.nome_disciplina || '') : '';
        const nomeDiscB = disciplinaB ? (disciplinaB.nome_disciplina || '') : '';
        const cmpDisc = nomeDiscA.localeCompare(nomeDiscB);
        if (cmpDisc !== 0) return cmpDisc;

        const participanteA = participantes.find(p => String(p.id_participante) === String(a.id_participante));
        const participanteB = participantes.find(p => String(p.id_participante) === String(b.id_participante));
        const nomeParticipanteA = participanteA ? (participanteA.nome_participante || '') : '';
        const nomeParticipanteB = participanteB ? (participanteB.nome_participante || '') : '';
        return nomeParticipanteA.localeCompare(nomeParticipanteB);
    });

    let codigoEstrutura = '<div class="cartao-padrao mb-lg">';
    codigoEstrutura += criarCabecalhoSecao('Atividades Entregues', criarBotao('+ Nova Atividade', 'abrirFormularioAtividade()'));
    
    codigoEstrutura += Busca.criarCampoBusca('busca-atividades', 'Buscar por participante ou disciplina...');

    if (atividades.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhuma atividade registrada ainda.</p>';
    } else {
        let linhasAtividades = '';

        atividades.forEach((atv, index) => {
            const participante = participantes.find(p => String(p.id_participante) === String(atv.id_participante));
            const disciplina = disciplinas.find(d => String(d.id_disciplina) === String(atv.id_disciplina));
            
            let idCursoTemp = atv.id_curso;
            if (!idCursoTemp && disciplina) idCursoTemp = disciplina.id_curso;
            
            const curso = cursos.find(c => String(c.id_curso) === String(idCursoTemp));

            const nomeParticipante = participante ? (participante.nome_participante || participante.nome) : 'Desconhecido';
            const nomeCurso = curso ? curso.nome_curso : 'Desconhecido';
            const nomeDisciplina = disciplina ? disciplina.nome_disciplina : 'Desconhecida';
            
            const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            linhasAtividades += `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${nomeParticipante.toLowerCase()} ${nomeDisciplina.toLowerCase()} ${nomeCurso.toLowerCase()}">
                <td class="p-md texto-esquerda cor-texto-escuro peso-bold">${nomeParticipante}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${nomeCurso}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${nomeDisciplina}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.formatarData(atv.data_entrega)}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${atv.comentarios || '-'}</td>
                <td class="p-md texto-esquerda">
                    ${criarAcoesTabela([
                        { rotulo: 'Editar', acao: `editarAtividade('${atv.id_atividade}')` },
                        { rotulo: 'Excluir', acao: `excluirAtividade('${atv.id_atividade}')`, perigo: true }
                    ])}
                </td>
            </tr>`;
        });

        codigoEstrutura += criarContainerTabela(
            ['Participante', 'Curso', 'Disciplina', 'Data de Entrega', 'Comentários', 'Ações'],
            linhasAtividades,
            '',
            'tabela-corpo-atividades'
        );
    }
    codigoEstrutura += '</div>';
    conteudo.innerHTML = codigoEstrutura;

    Busca.vincularFiltro('busca-atividades', 'tabela-corpo-atividades');
}

async function abrirFormularioAtividade(idAtividade = null) {
    modoEdicao = 'atividades';
    registroEmEdicao = idAtividade;
    document.getElementById('titulo-janela').textContent = idAtividade ? 'Editar Atividade' : 'Nova Atividade';

    const participantes = await bd.obterTodos('participantes');
    const disciplinas = await bd.obterTodos('disciplinas');
    const cursos = await bd.obterTodos('cursos');

    participantes.sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));
    disciplinas.sort((a, b) => (a.nome_disciplina || '').localeCompare(b.nome_disciplina || ''));
    cursos.sort((a, b) => (a.nome_curso || '').localeCompare(b.nome_curso || ''));

    const hojeIso = new Date().toISOString().split('T')[0];
    let atv = { id_atividade: '', id_participante: '', id_curso: '', id_disciplina: '', data_entrega: hojeIso, comentarios: '' };
    
    if (idAtividade) {
        const encontrada = await bd.obter('atividades', idAtividade);
        if (encontrada) {
            atv = encontrada;
            if (!atv.id_curso && atv.id_disciplina) {
                const disc = disciplinas.find(d => String(d.id_disciplina) === String(atv.id_disciplina));
                if (disc) atv.id_curso = disc.id_curso;
            }
        }
    }

    let formHTML = '<form id="form-atividade" class="flex flex-coluna gap-md" onsubmit="event.preventDefault();">';
    formHTML += `<input type="hidden" id="id_atividade" value="${atv.id_atividade || ''}">`;
    
    formHTML += '<div class="w-total mb-md">' + criarSeletor('Curso', 'id_curso', cursos.map(c => ({ id: c.id_curso, nome: c.nome_curso })), atv.id_curso) + '</div>';

    formHTML += '<div class="flex flex-linha md-flex-coluna gap-md mb-md">';
    
    formHTML += '<div class="flex-1 w-total" id="recipiente-participante-atividade">';
    formHTML += criarSeletor('Participante', 'id_participante', [{id: '', nome: 'Selecione um curso primeiro...'}], '');
    formHTML += '</div>';

    formHTML += '<div class="flex-1 w-total" id="recipiente-disciplina-atividade">';
    formHTML += criarSeletor('Disciplina', 'id_disciplina', [{id: '', nome: 'Selecione um curso primeiro...'}], '');
    formHTML += '</div>';
    
    formHTML += '</div>';

    formHTML += '<div class="flex flex-coluna w-total mb-md">';
    formHTML += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Data de Entrega</label>';
    let dataFormatada = Utilidades.formatarData(atv.data_entrega || hojeIso);
    formHTML += `<input type="text" id="data_entrega" data-real="${atv.data_entrega || hojeIso}" value="${dataFormatada}" readonly class="campo-somente-leitura">`;
    formHTML += '</div>';

    formHTML += '<div class="flex flex-coluna w-total">';
    formHTML += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Comentários / Observações</label>';
    formHTML += `<textarea id="comentarios" rows="3" class="campo-padrao area-texto-padrao">${atv.comentarios || ''}</textarea>`;
    formHTML += '</div>';

    formHTML += criarRodapeFormulario('salvarAtividade()', idAtividade ? 'Atualizar Atividade' : 'Salvar Atividade');
    formHTML += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formHTML;
    Interface.abrirJanela('janela-formulario');

    setTimeout(() => {
        SeletorDinamico.vincular('id_curso', 'recipiente-participante-atividade', 'Participante', 'id_participante', participantes, 'id_curso', 'Selecione o participante...', atv.id_participante);
        SeletorDinamico.vincular('id_curso', 'recipiente-disciplina-atividade', 'Disciplina', 'id_disciplina', disciplinas, 'id_curso', 'Selecione a disciplina...', atv.id_disciplina);
    }, 50);
}

async function editarAtividade(idAtividade) {
    await abrirFormularioAtividade(idAtividade);
}

async function salvarAtividade() {
    const id_field = document.getElementById('id_atividade');
    const id_atividade = id_field && id_field.value ? id_field.value : (registroEmEdicao || Utilidades.gerarId());

    const id_participante = document.getElementById('id_participante').value;
    const id_curso = document.getElementById('id_curso').value;
    const id_disciplina = document.getElementById('id_disciplina').value;
    
    const data_entrega_elem = document.getElementById('data_entrega');
    const data_entrega = (data_entrega_elem && data_entrega_elem.dataset && data_entrega_elem.dataset.real) ? data_entrega_elem.dataset.real : new Date().toISOString().split('T')[0];
    const comentarios = document.getElementById('comentarios').value.trim();
    
    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Curso', valor: id_curso },
        { nome: 'Participante', valor: id_participante },
        { nome: 'Disciplina', valor: id_disciplina },
        { nome: 'Data de Entrega', valor: data_entrega }
    ])) return;

    if (!Validacao.validarCampoData(data_entrega, 'Data de Entrega')) return;

    const atividade = { id_atividade, id_participante, id_curso, id_disciplina, data_entrega, comentarios };

    await bd.salvar('atividades', atividade);
    Utilidades.notificacao(id_field && id_field.value ? 'Atividade atualizada com sucesso!' : 'Atividade registrada com sucesso!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}

async function excluirAtividade(idAtividade) {
    if (confirm('Deseja realmente excluir esta atividade?')) {
        await bd.excluir('atividades', idAtividade);
        Utilidades.notificacao('Atividade excluída!', 'sucesso');
        renderizarAbaAtual();
    }
}
