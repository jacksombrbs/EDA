async function renderizarCursos(conteudo) {
    const cursos = await bd.obterTodos('cursos');
    cursos.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    let codigo = '<div class="pagina-conteudo">';
    codigo += criarCabecalhoSecao('Cursos Cadastrados', criarBotao('+ Novo Curso', 'abrirFormularioCurso()'));
    codigo += Busca.criarCampoBusca('busca-cursos', 'Buscar por nome...');
    codigo += cursos.length
        ? renderizarTabelaCursos(cursos)
        : criarMensagemVazia('Nenhum curso cadastrado ainda.');
    codigo += '</div>';

    conteudo.innerHTML = codigo;
    Busca.vincularFiltro('busca-cursos', 'corpo-tabela-cursos');
}

async function abrirFormularioCurso(id = null) {
    AppEstado.registroEmEdicao = id;
    AppEstado.modoEdicao = 'cursos';

    const curso = id
        ? await bd.obter('cursos', id)
        : { ano: new Date().getFullYear(), quantidade_mensalidades: 12 };

    document.getElementById('titulo-janela').textContent = id ? 'Editar Curso' : 'Novo Curso';

    let formulario = '<form id="formulario-curso" class="flex flex-coluna w-total" onsubmit="salvarCurso(event)">';
    formulario += criarCampoFormulario('Nome do Curso', 'text', 'nome', curso?.nome || '', 'Ex: Teologia Básica', true);

    formulario += '<div class="flex gap-md md-flex-coluna mb-md">';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Ano', 'number', 'ano', curso?.ano || '', 'Ex: 2026', true) + '</div>';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Valor da Inscrição (R$)', 'number', 'valor_inscricao', curso?.valor_inscricao || '', 'Ex: 50.00') + '</div>';
    formulario += '</div>';

    formulario += '<div class="flex gap-md md-flex-coluna mb-md">';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Valor da Mensalidade (R$)', 'number', 'valor_mensalidade', curso?.valor_mensalidade || '', 'Ex: 100.00') + '</div>';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Quantidade de Mensalidades', 'number', 'quantidade_mensalidades', curso?.quantidade_mensalidades || '', 'Ex: 12', true) + '</div>';
    formulario += '</div>';

    formulario += criarRodapeFormulario('', id ? 'Atualizar Curso' : 'Salvar Curso', { tipoSalvar: 'submit' });
    formulario += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formulario;

    document.getElementById('valor_inscricao')?.setAttribute('step', '0.01');
    document.getElementById('valor_mensalidade')?.setAttribute('step', '0.01');

    Interface.abrirJanela('janela-formulario');
}

async function editarCurso(id) {
    await abrirFormularioCurso(id);
}

async function salvarCurso(evento) {
    if (evento) evento.preventDefault();

    const dados = obterDadosFormularioCurso();
    const validacao = validarCurso(dados);
    if (!validacao.valido) return;

    await bd.salvar('cursos', montarCurso(validacao.dados, AppEstado.registroEmEdicao));

    Utilidades.notificacao(AppEstado.registroEmEdicao ? 'Curso atualizado com sucesso!' : 'Curso cadastrado com sucesso!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    await renderizarAbaAtual();
}

async function excluirCurso(id) {
    if (!confirm('Deseja realmente excluir este curso? Esta ação não pode ser desfeita.')) return;

    await bd.excluir('cursos', id);
    Utilidades.notificacao('Curso excluído com sucesso!', 'sucesso');
    await renderizarAbaAtual();
}

function obterDadosFormularioCurso() {
    return {
        nome: document.getElementById('nome')?.value.trim() || '',
        ano: Number(document.getElementById('ano')?.value || new Date().getFullYear()),
        valor_inscricao: document.getElementById('valor_inscricao')?.value || '0',
        valor_mensalidade: document.getElementById('valor_mensalidade')?.value || '0',
        quantidade_mensalidades: Number(document.getElementById('quantidade_mensalidades')?.value || 0)
    };
}

function validarCurso(dados) {
    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Nome do Curso', valor: dados.nome },
        { nome: 'Ano', valor: dados.ano },
        { nome: 'Quantidade de Mensalidades', valor: dados.quantidade_mensalidades }
    ])) {
        return { valido: false };
    }

    if (!Validacao.numeroInteiro(dados.ano, 2000) || dados.ano > 2100) {
        Utilidades.notificacao('Informe um ano válido para o curso.', 'erro');
        return { valido: false };
    }

    if (!Validacao.numeroInteiro(dados.quantidade_mensalidades, 1)) {
        Utilidades.notificacao('A quantidade de mensalidades deve ser um número inteiro maior que zero.', 'erro');
        return { valido: false };
    }

    const inscricao = Validacao.validarCampoMonetario(dados.valor_inscricao, 'Valor da inscrição', true);
    if (!inscricao.valido) return { valido: false };

    const mensalidade = Validacao.validarCampoMonetario(dados.valor_mensalidade, 'Valor da mensalidade', true);
    if (!mensalidade.valido) return { valido: false };

    return {
        valido: true,
        dados: {
            ...dados,
            valor_inscricao: inscricao.valor,
            valor_mensalidade: mensalidade.valor
        }
    };
}

function montarCurso(dados, id = null) {
    return {
        id: id || Utilidades.gerarId(),
        nome: dados.nome,
        ano: dados.ano,
        valor_inscricao: dados.valor_inscricao,
        valor_mensalidade: dados.valor_mensalidade,
        quantidade_mensalidades: dados.quantidade_mensalidades
    };
}

function renderizarTabelaCursos(cursos) {
    const linhas = cursos.map((curso, indice) => {
        const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

        return `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml(curso.nome || '')}">
            <td class="p-md texto-esquerda"><strong>${Utilidades.escaparHtml(curso.nome)}</strong></td>
            <td class="p-md texto-esquerda">${curso.ano || '-'}</td>
            <td class="p-md texto-esquerda">${Utilidades.formatarMoeda(curso.valor_inscricao)}</td>
            <td class="p-md texto-esquerda">${Utilidades.formatarMoeda(curso.valor_mensalidade)}</td>
            <td class="p-md texto-esquerda">${curso.quantidade_mensalidades || 0}</td>
            <td class="p-md texto-esquerda">
                ${criarAcoesTabela([
                    { rotulo: 'Editar', acao: `editarCurso('${curso.id}')` },
                    { rotulo: 'Excluir', acao: `excluirCurso('${curso.id}')`, perigo: true }
                ])}
            </td>
        </tr>`;
    }).join('');

    return criarContainerTabela(
        ['Nome', 'Ano', 'Inscrição', 'Mensalidade', 'Meses', 'Ações'],
        linhas,
        'tabela-cursos',
        'corpo-tabela-cursos'
    );
}
