async function renderizarAtividades(conteudo) {
    const atividades = await bd.obterTodos('atividades');
    const participantes = await bd.obterTodos('participantes');
    const disciplinas = await bd.obterTodos('disciplinas');

    atividades.sort((a, b) => {
        const disciplinaA = disciplinas.find(d => String(d.id_disciplina) === String(a.id_disciplina));
        const disciplinaB = disciplinas.find(d => String(d.id_disciplina) === String(b.id_disciplina));
        const nomeDiscA = disciplinaA ? (disciplinaA.nome_disciplina || '') : '';
        const nomeDiscB = disciplinaB ? (disciplinaB.nome_disciplina || '') : '';
        const cmpDisc = nomeDiscA.localeCompare(nomeDiscB);
        if (cmpDisc !== 0) return cmpDisc;

        const alunoA = participantes.find(p => String(p.id_participante) === String(a.id_participante));
        const alunoB = participantes.find(p => String(p.id_participante) === String(b.id_participante));
        const nomeAlunoA = alunoA ? (alunoA.nome_participante || '') : '';
        const nomeAlunoB = alunoB ? (alunoB.nome_participante || '') : '';
        return nomeAlunoA.localeCompare(nomeAlunoB);
    });

    let codigoEstrutura = '<div class="fundo-branco borda-1 borda-solida borda-cor-padrao raio-md p-md mb-lg">';
    codigoEstrutura += '<div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Atividades Entregues</h2>';
    codigoEstrutura += '<button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-medium transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 hover-fundo-marca-escuro" onclick="abrirFormularioAtividade()">+ Nova Atividade</button>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += Busca.criarCampoBusca('busca-atividades', 'Buscar por aluno ou disciplina...');

    if (atividades.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhuma atividade registrada ainda.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-1 borda-solida borda-cor-padrao raio-md overflow-hidden pos-relativa"><table class="w-total borda-colapso texto-md"><thead><tr>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Aluno</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Disciplina</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Data de Entrega</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Comentários</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Ações</th></tr></thead><tbody id="tabela-corpo-atividades">';

        atividades.forEach((atv, index) => {
            const aluno = participantes.find(p => String(p.id_participante) === String(atv.id_participante));
            const disciplina = disciplinas.find(d => String(d.id_disciplina) === String(atv.id_disciplina));
            const nomeAluno = aluno ? (aluno.nome_participante || aluno.nome) : 'Desconhecido';
            const nomeDisciplina = disciplina ? disciplina.nome_disciplina : 'Desconhecida';
            
            const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            codigoEstrutura += `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${nomeAluno.toLowerCase()} ${nomeDisciplina.toLowerCase()}">
                <td class="p-md texto-esquerda cor-texto-escuro peso-bold">${nomeAluno}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${nomeDisciplina}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.formatarData(atv.data_entrega)}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${atv.comentarios || '-'}</td>
                <td class="p-md texto-esquerda">
                    <div class="flex gap-sm">
                        <button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-escuro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="editarAtividade('${atv.id_atividade}')">Editar</button>
                        <button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-erro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="excluirAtividade('${atv.id_atividade}')">Excluir</button>
                    </div>
                </td>
            </tr>`;
        });

        codigoEstrutura += '</tbody></table></div>';
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

    participantes.sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));
    disciplinas.sort((a, b) => (a.nome_disciplina || '').localeCompare(b.nome_disciplina || ''));

    const hojeIso = new Date().toISOString().split('T')[0];
    let atv = { id_atividade: '', id_participante: '', id_disciplina: '', data_entrega: hojeIso, comentarios: '' };
    
    if (idAtividade) {
        try {
            const encontrada = await bd.obter('atividades', idAtividade);
            if (encontrada) {
                atv = encontrada;
                if (!atv.data_entrega) atv.data_entrega = hojeIso;
            }
        } catch (err) {
            atv.data_entrega = hojeIso;
        }
    }

    let formHTML = '<form id="form-atividade" class="flex flex-coluna gap-md" onsubmit="event.preventDefault();">';

    formHTML += `<input type="hidden" id="id_atividade" value="${atv.id_atividade || ''}">`;
    
    formHTML += '<div class="w-total">' + criarSeletor('Aluno / Participante', 'id_participante', participantes.map(p => ({ id: p.id_participante, nome: p.nome_participante || p.nome })), atv.id_participante) + '</div>';

    formHTML += '<div class="flex flex-linha md-flex-coluna gap-md">';
    
    formHTML += '<div class="flex-1">';
    formHTML += criarSeletor('Disciplina', 'id_disciplina', disciplinas.map(d => ({ id: d.id_disciplina, nome: d.nome_disciplina })), atv.id_disciplina);
    formHTML += '</div>';

    formHTML += '<div class="flex flex-coluna flex-2">';
    formHTML += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Data de Entrega</label>';
    let dataFormatada = '';
    try {
        dataFormatada = Utilidades.formatarData(atv.data_entrega || hojeIso);
    } catch (e) {
        dataFormatada = atv.data_entrega || hojeIso;
    }
    formHTML += `<input type="text" id="data_entrega" data-real="${atv.data_entrega || hojeIso}" value="${dataFormatada}" readonly class="w-total p-sm px-md min-h-44 fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm cor-texto-claro texto-md sem-outline" style="cursor: not-allowed;">`;
    formHTML += '</div>';
    
    formHTML += '</div>';

    formHTML += '<div class="flex flex-coluna w-total">';
    formHTML += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Comentários / Observações</label>';
    formHTML += `<textarea id="comentarios" rows="3" class="w-total p-sm px-md fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm cor-texto-escuro texto-md transicao focus-sem-outline focus-borda-marca" style="resize: vertical;">${atv.comentarios || ''}</textarea>`;
    formHTML += '</div>';

    formHTML += '<div class="flex justifica-fim gap-sm pt-sm md-flex-coluna">';
    formHTML += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3 md-w-total" onclick="Interface.fecharJanela(\'janela-formulario\')">Cancelar</button>';
    formHTML += `<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 sombra-1 hover-fundo-marca-escuro md-w-total" onclick="salvarAtividade()">${idAtividade ? 'Atualizar Atividade' : 'Salvar Atividade'}</button>`;
    formHTML += '</div>';
    formHTML += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formHTML;
    Interface.abrirJanela('janela-formulario');
}

async function editarAtividade(idAtividade) {
    await abrirFormularioAtividade(idAtividade);
}

async function salvarAtividade() {
    const id_field = document.getElementById('id_atividade');
    const id_atividade = id_field && id_field.value ? id_field.value : (registroEmEdicao || Utilidades.gerarId());

    const id_participante = document.getElementById('id_participante').value;
    const id_disciplina = document.getElementById('id_disciplina').value;
    const data_entrega_elem = document.getElementById('data_entrega');
    const data_entrega = (data_entrega_elem && data_entrega_elem.dataset && data_entrega_elem.dataset.real) ? data_entrega_elem.dataset.real : new Date().toISOString().split('T')[0];
    const comentarios = document.getElementById('comentarios').value.trim();
    
    if (!id_participante) return Utilidades.notificacao('Selecione um aluno.', 'erro');
    if (!id_disciplina) return Utilidades.notificacao('Selecione uma disciplina.', 'erro');
    if (!data_entrega) return Utilidades.notificacao('A data de entrega é obrigatória.', 'erro');

    const atividade = {
        id_atividade,
        id_participante,
        id_disciplina,
        data_entrega,
        comentarios
    };

    try {
        await bd.salvar('atividades', atividade);
        Utilidades.notificacao(id_field && id_field.value ? 'Atividade atualizada com sucesso!' : 'Atividade registada com sucesso!', 'sucesso');
        Interface.fecharJanela('janela-formulario');
        renderizarAbaAtual();
    } catch (e) {
        Utilidades.notificacao('Erro ao salvar atividade.', 'erro');
    }
}

async function excluirAtividade(idAtividade) {
    if (confirm('Deseja realmente excluir esta atividade?')) {
        try {
            await bd.excluir('atividades', idAtividade);
            Utilidades.notificacao('Atividade excluída!', 'sucesso');
            renderizarAbaAtual();
        } catch (erro) {
            Utilidades.notificacao('Não foi possível excluir a atividade.', 'erro');
        }
    }
}
