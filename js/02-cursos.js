async function renderizarCursos(conteudo) {
    const cursos = await bd.obterTodos('cursos');
    cursos.sort((a, b) => (a.nome_curso || '').localeCompare(b.nome_curso || ''));
    
    let codigoEstrutura = '<div class="cartao-padrao mb-lg">';
    codigoEstrutura += criarCabecalhoSecao('Cursos Cadastrados', criarBotao('+ Novo Curso', 'abrirFormularioCurso()'));
    
    codigoEstrutura += Busca.criarCampoBusca('busca-cursos', 'Buscar por nome...');

    if (cursos.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhum curso cadastrado ainda.</p>';
    } else {
        codigoEstrutura += criarContainerTabela(
            ['Nome', 'Ano', 'Inscrição', 'Mensalidade', 'Meses', 'Ações'],
            gerarLinhasTabelaCursos(cursos),
            'tabela-cursos',
            'corpo-tabela-cursos'
        );
    }
    
    codigoEstrutura += '</div>';
    conteudo.innerHTML = codigoEstrutura;

    Busca.vincularFiltro('busca-cursos', 'corpo-tabela-cursos');
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
                ${criarAcoesTabela([
                    { rotulo: 'Editar', acao: `editarCurso('${curso.id_curso}')` },
                    { rotulo: 'Excluir', acao: `excluirCurso('${curso.id_curso}')`, perigo: true }
                ])}
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

    formHTML += criarRodapeFormulario('', 'Salvar', { tipoSalvar: 'submit' });
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
    const quantidade_mensalidades = inputQuantidade ? parseInt(inputQuantidade.value) : 0;
    const descricao = inputDescricao ? inputDescricao.value.trim() : '';

    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Nome do Curso', valor: nome_curso },
        { nome: 'Ano', valor: ano_curso },
        { nome: 'Quantidade de Mensalidades', valor: quantidade_mensalidades }
    ])) {
        return;
    }

    if (ano_curso < 2000 || ano_curso > 2100) {
        Utilidades.notificacao('Informe um ano válido para o curso.', 'erro');
        return;
    }

    if (quantidade_mensalidades <= 0) {
        Utilidades.notificacao('A quantidade de mensalidades deve ser maior que zero.', 'erro');
        return;
    }

    const inscricaoValidada = Validacao.validarCampoMonetario(inputInscricao ? (inputInscricao.value || '0') : '0', 'Valor da inscrição', true);
    if (!inscricaoValidada.valido) return;

    const mensalidadeValidada = Validacao.validarCampoMonetario(inputMensalidade ? (inputMensalidade.value || '0') : '0', 'Valor da mensalidade', true);
    if (!mensalidadeValidada.valido) return;

    const dadosCurso = {
        id_curso: registroEmEdicao || Utilidades.gerarId(),
        nome_curso,
        ano_curso,
        valor_inscricao: inscricaoValidada.valor,
        valor_mensalidade: mensalidadeValidada.valor,
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
