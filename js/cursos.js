async function renderizarCursos(conteudo) {
    const cursos = await bd.obterTodos('cursos');
    cursos.sort((a, b) => (a.nome_curso || '').localeCompare(b.nome_curso || ''));
    
    let codigoEstrutura = '<div class="fundo-branco borda-1 borda-solida borda-cor-padrao raio-md p-md mb-lg">';
    
    codigoEstrutura += '<div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Cursos Cadastrados</h2>';
    codigoEstrutura += '<button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-medium transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 hover-fundo-marca-escuro" onclick="abrirFormularioCurso()">+ Novo Curso</button>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += Busca.criarCampoBusca('busca-cursos', 'Buscar por nome...');

    if (cursos.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhum curso cadastrado ainda.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-1 borda-solida borda-cor-padrao raio-md overflow-hidden pos-relativa"><table class="w-total borda-colapso texto-md" id="tabela-cursos"><thead><tr>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Nome</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Ano</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Inscrição</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Mensalidade</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Meses</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Ações</th></tr></thead><tbody id="corpo-tabela-cursos">';
        
        codigoEstrutura += gerarLinhasTabelaCursos(cursos);
        
        codigoEstrutura += '</tbody></table></div>';
    }
    
    codigoEstrutura += '</div>';
    conteudo.innerHTML = codigoEstrutura;

    const campoBusca = document.getElementById('busca-cursos');
    if (campoBusca) {
        campoBusca.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const linhas = document.querySelectorAll('#tabela-cursos tbody tr');
            linhas.forEach(linha => {
                const textoNome = linha.querySelector('td').textContent.toLowerCase();
                if (textoNome.includes(termo)) {
                    linha.classList.remove('oculto');
                } else {
                    linha.classList.add('oculto');
                }
            });
        });
    }
}

function gerarLinhasTabelaCursos(cursos) {
    let linhas = '';
    cursos.forEach((curso, index) => {
        const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
        linhas += `<tr class="${classeFundo} transicao hover-fundo-superficie-3">
            <td class="p-md texto-esquerda"><strong>${curso.nome_curso}</strong></td>
            <td class="p-md texto-esquerda">${curso.ano_curso}</td>
            <td class="p-md texto-esquerda">${Utilidades.formatarMoeda(curso.valor_inscricao)}</td>
            <td class="p-md texto-esquerda">${Utilidades.formatarMoeda(curso.valor_mensalidade)}</td>
            <td class="p-md texto-esquerda">${curso.quantidade_mensalidades}</td>
            <td class="p-md texto-esquerda">
                <div class="flex gap-sm">
                    <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-escuro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="editarCurso('${curso.id_curso}')">Editar</button>
                    <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-erro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="excluirCurso('${curso.id_curso}')">Excluir</button>
                </div>
            </td>
        </tr>`;
    });
    return linhas;
}

async function abrirFormularioCurso(idCurso = null) {
    registroEmEdicao = idCurso;
    let curso = {};

    if (idCurso) {
        curso = await bd.obter('cursos', idCurso);
        document.getElementById('titulo-janela').textContent = 'Editar Curso';
    } else {
        document.getElementById('titulo-janela').textContent = 'Novo Curso';
        const dataAtual = new Date();
        curso = {
            ano_curso: dataAtual.getFullYear(),
            quantidade_mensalidades: 12
        };
    }

    let formHTML = '<form id="form-curso" class="flex flex-coluna w-total" onsubmit="salvarCurso(event)">';
    formHTML += criarCampoFormulario('Nome do Curso', 'text', 'nome_curso', curso.nome_curso || '', 'Ex: Teologia Básica', true);
    
    formHTML += '<div class="flex gap-md md-flex-coluna mb-md">';
    formHTML += '<div class="flex-1">' + criarCampoFormulario('Ano', 'number', 'ano_curso', curso.ano_curso || '', 'Ex: 2024', true) + '</div>';
    formHTML += '<div class="flex-1">' + criarCampoFormulario('Valor da Inscrição (R$)', 'number', 'valor_inscricao', curso.valor_inscricao || '', 'Ex: 50.00') + '</div>';
    formHTML += '</div>';

    formHTML += '<div class="flex gap-md md-flex-coluna mb-md">';
    formHTML += '<div class="flex-1">' + criarCampoFormulario('Valor da Mensalidade (R$)', 'number', 'valor_mensalidade', curso.valor_mensalidade || '', 'Ex: 100.00') + '</div>';
    formHTML += '<div class="flex-1">' + criarCampoFormulario('Quantidade de Mensalidades', 'number', 'quantidade_mensalidades', curso.quantidade_mensalidades || '', 'Ex: 12', true) + '</div>';
    formHTML += '</div>';

    formHTML += criarAreaTexto('Descrição / Detalhes', 'descricao', curso.descricao || '', 3);

    formHTML += '<div class="flex justifica-fim gap-md pt-md w-total">';
    formHTML += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-medium transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3" onclick="Interface.fecharJanela(\'janela-formulario\')">Cancelar</button>';
    formHTML += '<button type="submit" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-medium transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 hover-fundo-marca-escuro">Salvar</button>';
    formHTML += '</div>';
    formHTML += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formHTML;
    
    const campoInscricao = document.getElementById('valor_inscricao');
    const campoMensalidade = document.getElementById('valor_mensalidade');
    if (campoInscricao) campoInscricao.setAttribute('step', '0.01');
    if (campoMensalidade) campoMensalidade.setAttribute('step', '0.01');

    Interface.abrirJanela('janela-formulario');
}

async function editarCurso(idCurso) {
    await abrirFormularioCurso(idCurso);
}

async function salvarCurso(evento) {
    evento.preventDefault();
    const inputNome = document.getElementById('nome_curso');
    const inputAno = document.getElementById('ano_curso');
    const inputInscricao = document.getElementById('valor_inscricao');
    const inputMensalidade = document.getElementById('valor_mensalidade');
    const inputQuantidade = document.getElementById('quantidade_mensalidades');
    const inputDescricao = document.getElementById('descricao');

    const nome_curso = inputNome ? inputNome.value.trim() : '';
    const ano_curso = inputAno ? parseInt(inputAno.value) : new Date().getFullYear();
    const valor_inscricao = inputInscricao ? parseFloat(inputInscricao.value.replace(',', '.')) || 0 : 0;
    const valor_mensalidade = inputMensalidade ? parseFloat(inputMensalidade.value.replace(',', '.')) || 0 : 0;
    const quantidade_mensalidades = inputQuantidade ? parseInt(inputQuantidade.value) : 0;
    const descricao = inputDescricao ? inputDescricao.value.trim() : '';

    if (!nome_curso || !ano_curso) {
        Utilidades.notificacao('Por favor, preencha os campos obrigatórios.', 'erro');
        return;
    }

    const dadosCurso = {
        id_curso: registroEmEdicao || Utilidades.gerarId(),
        nome_curso,
        ano_curso,
        valor_inscricao,
        valor_mensalidade,
        quantidade_mensalidades,
        descricao
    };

    await bd.salvar('cursos', dadosCurso);
    Utilidades.notificacao(registroEmEdicao ? 'Curso atualizado com sucesso!' : 'Curso cadastrado com sucesso!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}

async function excluirCurso(idCurso) {
    if (confirm('Deseja realmente excluir este curso? Esta ação não pode ser desfeita.')) {
        await bd.excluir('cursos', idCurso);
        Utilidades.notificacao('Curso excluído com sucesso!', 'sucesso');
        renderizarAbaAtual();
    }
}