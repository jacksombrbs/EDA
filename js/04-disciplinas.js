let registroEmEdicaoDisciplina = null;

async function renderizarDisciplinas(conteudo) {
    const disciplinas = await bd.obterTodos('disciplinas');
    const cursos = await bd.obterTodos('cursos');
    const palestrantes = await bd.obterTodos('palestrantes');    
    
    disciplinas.sort((a, b) => (a.nome_disciplina || '').localeCompare(b.nome_disciplina || ''));
    
    let codigoEstrutura = '<div class="cartao-padrao mb-lg">';
    codigoEstrutura += criarCabecalhoSecao('Disciplinas Cadastradas', criarBotao('+ Nova Disciplina', 'abrirFormularioDisciplina()'));
    
    codigoEstrutura += Busca.criarCampoBusca('busca-disciplinas', 'Buscar por nome...');

    if (disciplinas.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhuma disciplina cadastrada ainda.</p>';
    } else {
        codigoEstrutura += criarContainerTabela(
            ['Nome', 'Curso', 'Palestrantes', 'Ações'],
            gerarLinhasTabelaDisciplinas(disciplinas, cursos, palestrantes),
            'tabela-disciplinas',
            'corpo-tabela-disciplinas'
        );
    }
    
    codigoEstrutura += '</div>';
    conteudo.innerHTML = codigoEstrutura;

    Busca.vincularFiltro('busca-disciplinas', 'corpo-tabela-disciplinas');
}

function gerarLinhasTabelaDisciplinas(disciplinas, cursos, palestrantes) {
    let linhas = '';
    disciplinas.forEach((disciplina, index) => {
        const curso = cursos.find(c => c.id_curso === disciplina.id_curso) || { nome_curso: 'Não encontrado' };
        
        const idsPalestrantes = disciplina.id_palestrantes && disciplina.id_palestrantes.length > 0 
            ? disciplina.id_palestrantes 
            : (disciplina.id_palestrante ? [disciplina.id_palestrante] : []);

        let nomesPalestrantes = '<span class="cor-texto-claro">Nenhum</span>';

        if (idsPalestrantes.length > 0) {
            nomesPalestrantes = idsPalestrantes
                .map(id => {
                    const p = palestrantes.find(pal => String(pal.id_palestrante) === String(id));
                    return p ? p.nome_palestrante : 'Não encontrado';
                })
                .join(', ');
        }

        const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

        linhas += `<tr class="${classeFundo} transicao hover-fundo-superficie-3">
            <td class="p-md texto-esquerda"><strong>${disciplina.nome_disciplina}</strong></td>
            <td class="p-md texto-esquerda">${curso.nome_curso}</td>
            <td class="p-md texto-esquerda">${nomesPalestrantes}</td>
            <td class="p-md texto-esquerda">
                ${criarAcoesTabela([
                    { rotulo: 'Editar', acao: `editarDisciplina('${disciplina.id_disciplina}')` },
                    { rotulo: 'Excluir', acao: `excluirDisciplina('${disciplina.id_disciplina}')`, perigo: true }
                ])}
            </td>
        </tr>`;
    });
    return linhas;
}

async function abrirFormularioDisciplina(idDisciplina = null) {
    modoEdicao = 'disciplinas';
    registroEmEdicaoDisciplina = idDisciplina;
    
    const cursos = await bd.obterTodos('cursos');
    const palestrantes = await bd.obterTodos('palestrantes');
    
    const opcoesCursos = cursos.map(c => ({id: c.id_curso, nome: c.nome_curso}));
    palestrantes.sort((a, b) => (a.nome_palestrante || '').localeCompare(b.nome_palestrante || ''));

    let disciplina = { id_palestrantes: [] };
    if (idDisciplina) {
        const dadosObtidos = await bd.obter('disciplinas', idDisciplina);
        if (dadosObtidos) {
            disciplina = dadosObtidos;
            if (!disciplina.id_palestrantes || disciplina.id_palestrantes.length === 0) {
                disciplina.id_palestrantes = disciplina.id_palestrante ? [String(disciplina.id_palestrante)] : [];
            } else {
                disciplina.id_palestrantes = disciplina.id_palestrantes.map(id => String(id));
            }
        }
        document.getElementById('titulo-janela').textContent = 'Editar Disciplina';
    } else {
        document.getElementById('titulo-janela').textContent = 'Nova Disciplina';
    }

    let formHTML = '<form id="formulario-disciplina" class="flex flex-coluna gap-md w-total">';
    
    formHTML += '<div class="flex gap-md md-flex-coluna">';
    formHTML += '<div class="flex-1 w-total">' + criarCampoFormulario('Nome da Disciplina', 'text', 'nome_disciplina', disciplina.nome_disciplina || '', 'Ex: História da Igreja', true) + '</div>';
    formHTML += '<div class="flex-1 w-total">' + criarSeletor('Curso', 'id_curso', opcoesCursos, disciplina.id_curso || '', true) + '</div>';
    formHTML += '</div>';

    formHTML += '<div class="fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm p-md mt-sm flex flex-coluna">';
    formHTML += '  <h3 class="texto-md peso-bold cor-texto-primario mb-sm">Equipe de Palestrantes</h3>';
    
    formHTML += Busca.criarCampoBusca('filtro-palestrantes-modal', 'Buscar palestrante...');

    formHTML += '  <div id="recipiente-opcoes-palestrantes" class="lista-selecao flex flex-coluna gap-xs">';
    
    if (palestrantes.length === 0) {
        formHTML += '    <p class="texto-sm cor-texto-claro p-sm m-zero">Nenhum palestrante cadastrado no sistema.</p>';
    } else {
        palestrantes.forEach(p => {
            const estaMarcado = disciplina.id_palestrantes.includes(String(p.id_palestrante)) ? 'checked' : '';
            formHTML += `
                <label class="flex itens-centro gap-sm p-sm fundo-branco hover-fundo-superficie-2 raio-xxs cursor-apontador transicao item-marcador-palestrante" data-nome="${p.nome_palestrante.toLowerCase()}">
                    <input type="checkbox" value="${p.id_palestrante}" class="marcador-palestrante checkbox-padrao cursor-apontador" ${estaMarcado}>
                    <span class="texto-md cor-texto-escuro peso-medium">${p.nome_palestrante}</span>
                </label>
            `;
        });
    }
    
    formHTML += '  </div>';
    formHTML += '</div>';

    formHTML += criarRodapeFormulario('salvarDisciplina()', idDisciplina ? 'Atualizar Disciplina' : 'Salvar Disciplina');
    formHTML += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formHTML;
    Interface.abrirJanela('janela-formulario');

    const campoBuscaModal = document.getElementById('filtro-palestrantes-modal');
    if (campoBuscaModal) {
        campoBuscaModal.addEventListener('input', filtrarPalestrantesModal);
    }
}

function filtrarPalestrantesModal() {
    const termo = document.getElementById('filtro-palestrantes-modal').value.toLowerCase();
    const itens = document.querySelectorAll('.item-marcador-palestrante');
    itens.forEach(item => {
        const nome = item.getAttribute('data-nome');
        item.classList.toggle('oculto', !nome.includes(termo));
    });
}

async function editarDisciplina(idDisciplina) {
    await abrirFormularioDisciplina(idDisciplina);
}

async function excluirDisciplina(idDisciplina) {
    if (confirm('Deseja realmente excluir esta disciplina?')) {
        await bd.excluir('disciplinas', idDisciplina);
        Utilidades.notificacao('Disciplina excluída!', 'sucesso');
        renderizarAbaAtual();
    }
}

async function salvarDisciplina() {
    const nome_disciplina = document.getElementById('nome_disciplina').value.trim();
    const id_curso = document.getElementById('id_curso').value;
    
    const marcadores = document.querySelectorAll('.marcador-palestrante:checked');
    const id_palestrantes = Array.from(marcadores).map(marcador => marcador.value);
    
    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Nome da Disciplina', valor: nome_disciplina },
        { nome: 'Curso', valor: id_curso }
    ])) return;

    if (id_palestrantes.length === 0) return Utilidades.notificacao('Selecione ao menos um palestrante para a equipe.', 'erro');

    const disciplina = {
        id_disciplina: registroEmEdicaoDisciplina || Utilidades.gerarId(),
        nome_disciplina,
        id_curso,
        id_palestrantes: id_palestrantes,
        id_palestrante: id_palestrantes[0] || '' 
    };

    await bd.salvar('disciplinas', disciplina);
    Utilidades.notificacao(registroEmEdicaoDisciplina ? 'Disciplina atualizada!' : 'Disciplina salva com sucesso!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}
