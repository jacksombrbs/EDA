async function renderizarCursos(conteudo) {
    const cursos = await bd.obterTodos('cursos');    cursos.sort((a, b) => (a.nome_curso || '').localeCompare(b.nome_curso || ''));
    let codigoEstrutura = '<div class="fundo-branco borda-padrao raio-md p-md mb-lg">';
    
    codigoEstrutura += '<div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Cursos Cadastrados</h2>';
    codigoEstrutura += '<button class="btn btn-primario" onclick="abrirFormularioCurso()">+ Novo Curso</button>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += Busca.criarCampoBusca('busca-cursos', 'Buscar por nome...');

    if (cursos.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhum curso cadastrado ainda.</p>';
    } else {

        codigoEstrutura += '<div class="rolagem-x borda-padrao raio-md fundo-branco"><table class="tabela-base" id="tabela-cursos"><thead><tr>';
        codigoEstrutura += '<th>Nome</th><th>Ano</th><th>Inscrição</th><th>Mensalidade</th><th>Meses</th><th>Ações</th></tr></thead><tbody>';

        cursos.forEach((curso) => {
            codigoEstrutura += `<tr>
                    <td class="peso-bold cor-texto-escuro">${curso.nome_curso}</td>
                    <td>${curso.ano_curso}</td>
                    <td>${Utilidades.formatarMoeda(curso.valor_inscricao)}</td>
                    <td>${Utilidades.formatarMoeda(curso.valor_mensalidade)}</td>
                    <td>${curso.quantidade_mensalidades}</td>
                    <td>
                        <div class="flex gap-sm md-flex-coluna">
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="editarCurso('${curso.id_curso}')">Editar</button>
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="excluirCurso('${curso.id_curso}')">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });

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

function abrirFormularioCurso() {
    modoEdicao = 'cursos';
    registroEmEdicao = null;
    document.getElementById('titulo-janela').textContent = 'Novo Curso';
 
    let codigoEstrutura = '<form id=\"formulario-curso\" class=\"grade-formulario\">';
    codigoEstrutura += criarCampoFormulario('Nome do Curso', 'text', 'nome_curso', '', 'Ex: Teologia Fundamental', true);
    codigoEstrutura += criarCampoFormulario('Ano', 'number', 'ano_curso', new Date().getFullYear(), '', true);
    codigoEstrutura += criarCampoFormulario('Valor da Inscrição (R$)', 'text', 'valor_inscricao', '0');
    codigoEstrutura += criarCampoFormulario('Valor da Mensalidade (R$)', 'text', 'valor_mensalidade', '0');
    codigoEstrutura += criarCampoFormulario('Quantidade de Mensalidades', 'number', 'quantidade_mensalidades', '1', '', true);
    codigoEstrutura += criarAreaTexto('Descrição', 'descricao', '', 3);
    
    codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
    codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
    codigoEstrutura += '<button type="submit" class="btn btn-primario">Salvar Curso</button>';
    codigoEstrutura += '</div>';
    codigoEstrutura += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
    Interface.abrirJanela('janela-formulario');

    document.getElementById('formulario-curso').addEventListener('submit', salvarCurso);
}

async function editarCurso(idCurso) {
    const curso = await bd.obter('cursos', idCurso);
    if (curso) {
        modoEdicao = 'cursos';
        registroEmEdicao = idCurso;
        document.getElementById('titulo-janela').textContent = 'Editar Curso';

        let codigoEstrutura = '<form id=\"formulario-curso\" class=\"grade-formulario\">';
        codigoEstrutura += criarCampoFormulario('Nome do Curso', 'text', 'nome_curso', curso.nome_curso, '', true);
        codigoEstrutura += criarCampoFormulario('Ano', 'number', 'ano_curso', curso.ano_curso, '', true);
        codigoEstrutura += criarCampoFormulario('Valor da Inscrição (R$)', 'text', 'valor_inscricao', curso.valor_inscricao || '0');
        codigoEstrutura += criarCampoFormulario('Valor da Mensalidade (R$)', 'text', 'valor_mensalidade', curso.valor_mensalidade || '0');
        codigoEstrutura += criarCampoFormulario('Quantidade de Mensalidades', 'number', 'quantidade_mensalidades', curso.quantidade_mensalidades, '', true);
        codigoEstrutura += criarAreaTexto('Descrição', 'descricao', curso.descricao || '', 3);
        
        codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
        codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
        codigoEstrutura += '<button type="submit" class="btn btn-primario">Atualizar Curso</button>';
        codigoEstrutura += '</div>';
        codigoEstrutura += '</form>';

        document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
        Interface.abrirJanela('janela-formulario');

        document.getElementById('formulario-curso').addEventListener('submit', salvarCurso);
    }
}

async function salvarCurso(evento) {
    evento.preventDefault();

    const nome_curso = document.getElementById('nome_curso').value.trim();
    const ano_curso = parseInt(document.getElementById('ano_curso').value);
    const valor_inscricao = parseFloat(document.getElementById('valor_inscricao').value.replace(',', '.')) || 0;
    const valor_mensalidade = parseFloat(document.getElementById('valor_mensalidade').value.replace(',', '.')) || 0;
    const quantidade_mensalidades = parseInt(document.getElementById('quantidade_mensalidades').value);
    const descricao = document.getElementById('descricao').value.trim();

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
        Utilidades.notificacao('Curso removido com sucesso!', 'sucesso');
        renderizarAbaAtual();
    }
}