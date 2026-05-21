async function renderizarAtividades(conteudo) {
    const atividades = await bd.obterTodos('atividades');
    const participantes = await bd.obterTodos('participantes');
    const disciplinas = await bd.obterTodos('disciplinas');
    atividades.sort((a, b) => {
        const disciplinaA = disciplinas.find(d => d.id_disciplina === a.id_disciplina);
        const disciplinaB = disciplinas.find(d => d.id_disciplina === b.id_disciplina);
        const nomeDiscA = disciplinaA ? (disciplinaA.nome_disciplina || '') : '';
        const nomeDiscB = disciplinaB ? (disciplinaB.nome_disciplina || '') : '';
        const cmpDisc = nomeDiscA.localeCompare(nomeDiscB);
        if (cmpDisc !== 0) return cmpDisc;

        const alunoA = participantes.find(p => p.id_participante === a.id_participante);
        const alunoB = participantes.find(p => p.id_participante === b.id_participante);
        const nomeAlunoA = alunoA ? (alunoA.nome_participante || '') : '';
        const nomeAlunoB = alunoB ? (alunoB.nome_participante || '') : '';
        return nomeAlunoA.localeCompare(nomeAlunoB);
    });
    let codigoEstrutura = '<div class="fundo-branco borda-padrao raio-md p-md mb-lg"><div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Atividades Registradas</h2>';
    codigoEstrutura += '<button class="btn btn-primario" onclick="abrirFormularioAtividade()">+ Registrar Atividade</button>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += Busca.criarCampoBusca('busca-atividades', 'Buscar por aluno ou disciplina...');

    if (atividades.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhuma atividade registrada ainda.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-padrao raio-md fundo-branco"><table class="tabela-base" id="tabela-atividades"><thead><tr>';
        codigoEstrutura += '<th>Aluno</th><th>Disciplina</th><th>Data Entrega</th><th>Comentários</th><th>Ações</th></tr></thead><tbody>';

        atividades.forEach((atividade) => {
            const aluno = participantes.find(p => p.id_participante === atividade.id_participante);
            const disciplina = disciplinas.find(d => d.id_disciplina === atividade.id_disciplina);

            const nomeAluno = aluno ? aluno.nome_participante : '<span class="texto-italico cor-texto-claro">Desconhecido</span>';
            const nomeDisciplina = disciplina ? disciplina.nome_disciplina : '<span class="texto-italico cor-texto-claro">Desconhecida</span>';

            codigoEstrutura += `<tr>
                    <td class="peso-bold cor-texto-escuro">${nomeAluno}</td>
                    <td class="cor-texto-escuro">${nomeDisciplina}</td>
                    <td class="cor-texto-escuro">${Utilidades.formatarData(atividade.data_entrega)}</td>
                    <td class="cor-texto-escuro">${atividade.comentarios || '-'}</td>
                    <td>
                        <div class="flex gap-sm">
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="editarAtividade('${atividade.id_atividade}')">Editar</button>
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="excluirAtividade('${atividade.id_atividade}')">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });

        codigoEstrutura += '</tbody></table></div>';
    }
    codigoEstrutura += '</div>';

    conteudo.innerHTML = codigoEstrutura;

    document.getElementById('busca-atividades')?.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        const linhas = document.querySelectorAll('#tabela-atividades tbody tr');
        linhas.forEach(linha => {
            const texto = linha.textContent.toLowerCase();
            linha.classList.toggle('oculto', !texto.includes(termo));
        });
    });
}

function abrirFormularioAtividade() {
    modoEdicao = 'atividades';
    registroEmEdicao = null;
    document.getElementById('titulo-janela').textContent = 'Registrar Atividade';

    Promise.all([bd.obterTodos('participantes'), bd.obterTodos('disciplinas')]).then(([participantes, disciplinas]) => {
        participantes.sort((a, b) => a.nome_participante.localeCompare(b.nome_participante));
        disciplinas.sort((a, b) => a.nome_disciplina.localeCompare(b.nome_disciplina));

        const opcoesParticipantes = participantes.map(p => ({ id: p.id_participante, nome: p.nome_participante }));
        const opcoesDisciplinas = disciplinas.map(d => ({ id: d.id_disciplina, nome: d.nome_disciplina }));

        let codigoEstrutura = '<form id="formulario-atividade" class="grid grid-auto-adaptavel gap-md">';
        
        codigoEstrutura += criarSeletor('Aluno', 'id_participante', opcoesParticipantes, '', true);
        codigoEstrutura += criarSeletor('Disciplina', 'id_disciplina', opcoesDisciplinas, '', true);
        
        codigoEstrutura += criarCampoFormulario('Data de Entrega', 'date', 'data_entrega', new Date().toISOString().split('T')[0], '', true);
        codigoEstrutura += criarAreaTexto('Comentários', 'comentarios', '', 3, false);
        
        codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
        codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
        codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarAtividade()">Salvar</button>';
        codigoEstrutura += '</div>';

        codigoEstrutura += '</form>';

        document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
        Interface.abrirJanela('janela-formulario');
    });
}

async function editarAtividade(idAtividade) {
    const atividade = await bd.obter('atividades', idAtividade);
    if (atividade) {
        const participantes = await bd.obterTodos('participantes');
        const disciplinas = await bd.obterTodos('disciplinas');

        participantes.sort((a, b) => a.nome_participante.localeCompare(b.nome_participante));
        disciplinas.sort((a, b) => a.nome_disciplina.localeCompare(b.nome_disciplina));

        const opcoesParticipantes = participantes.map(p => ({ id: p.id_participante, nome: p.nome_participante }));
        const opcoesDisciplinas = disciplinas.map(d => ({ id: d.id_disciplina, nome: d.nome_disciplina }));

        modoEdicao = 'atividades';
        registroEmEdicao = idAtividade;
        document.getElementById('titulo-janela').textContent = 'Editar Atividade';

        let codigoEstrutura = '<form id="formulario-atividade" class="grid grid-auto-adaptavel gap-md">';
        
        codigoEstrutura += criarSeletor('Aluno', 'id_participante', opcoesParticipantes, atividade.id_participante, true);
        codigoEstrutura += criarSeletor('Disciplina', 'id_disciplina', opcoesDisciplinas, atividade.id_disciplina, true);
        
        codigoEstrutura += criarCampoFormulario('Data de Entrega', 'date', 'data_entrega', atividade.data_entrega, '', true);
        codigoEstrutura += criarAreaTexto('Comentários', 'comentarios', atividade.comentarios || '', 3, false);
        
        codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
        codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
        codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarAtividade()">Atualizar</button>';
        codigoEstrutura += '</div>';

        codigoEstrutura += '</form>';

        document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
        Interface.abrirJanela('janela-formulario');
    }
}

async function salvarAtividade() {

    const id_participante = document.getElementById('id_participante').value;
    const id_disciplina = document.getElementById('id_disciplina').value;
    const data_entrega = document.getElementById('data_entrega').value;
    const comentarios = document.getElementById('comentarios').value.trim();
    
    if (!id_participante) {
        Utilidades.notificacao('Selecione um aluno.', 'erro');
        return;
    }
    if (!id_disciplina) {
        Utilidades.notificacao('Selecione uma disciplina.', 'erro');
        return;
    }
    if (!data_entrega) {
        Utilidades.notificacao('A data de entrega é obrigatória.', 'erro');
        return;
    }

    const atividade = {
        id_atividade: registroEmEdicao || Utilidades.gerarId(),
        id_participante,
        id_disciplina,
        data_entrega,
        comentarios
    };

    await bd.salvar('atividades', atividade);
    Utilidades.notificacao(registroEmEdicao ? 'Atividade atualizada!' : 'Atividade registrada com sucesso!', 'sucesso');
    
    fecharJanela('janela-formulario');
    renderizarAbaAtual();
}

async function excluirAtividade(idAtividade) {
    if (confirm('Deseja realmente excluir este registro de atividade?')) {
        await bd.excluir('atividades', idAtividade);
        Utilidades.notificacao('Atividade excluída com sucesso!', 'sucesso');
        renderizarAbaAtual();
    }
}