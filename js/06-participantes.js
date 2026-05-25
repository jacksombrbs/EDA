async function renderizarParticipantes(conteudo) {
    const participantes = await bd.obterTodos('participantes');
    const paroquias = await bd.obterTodos('paroquias');
    
    participantes.sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));
    
    let codigoEstrutura = '<div class="pagina-conteudo">';
    const botoesCabecalho = '<div class="flex gap-sm md-flex-coluna md-w-total">'
        + criarBotao('Importar Dados', 'abrirModalImportacao()', 'secundario', 'md-w-total')
        + criarBotao('Imprimir Cartões', 'abrirModalCartoesParticipantes()', 'secundario', 'md-w-total')
        + criarBotao('+ Novo Participante', 'abrirFormularioParticipante()', 'primario', 'md-w-total')
        + '</div>';
    codigoEstrutura += criarCabecalhoSecao('Participantes Cadastrados', botoesCabecalho);

    codigoEstrutura += Busca.criarCampoBusca('busca-participantes', 'Buscar por nome...');

    if (participantes.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhum participante cadastrado ainda.</p>';
    } else {
        let linhasParticipantes = '';

        participantes.forEach((participante, index) => {
            const paroquia = paroquias.find(p => p.id_paroquia === participante.id_paroquia);
            const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
            
            let statusBadge = '<span class="cor-texto-escuro peso-bold">Ativo</span>';
            if (participante.status_participante === 'Desistente') {
                statusBadge = '<span class="cor-texto-claro peso-bold">Desistente</span>';
            }

            linhasParticipantes += `<tr class="${classeFundo} transicao hover-fundo-superficie-3">
                    <td class="p-md texto-esquerda peso-bold cor-texto-escuro">${participante.nome_participante}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${participante.codigo_acesso || '-'}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${paroquia ? paroquia.nome_paroquia : '-'}</td>
                    <td class="p-md texto-esquerda">${statusBadge}</td>
                    <td class="p-md texto-esquerda">
                        ${criarAcoesTabela([
                            { rotulo: 'Cartão', acao: `imprimirCartaoParticipante('${participante.id_participante}')` },
                            { rotulo: 'Editar', acao: `editarParticipante('${participante.id_participante}')` },
                            { rotulo: 'Excluir', acao: `excluirParticipante('${participante.id_participante}')`, perigo: true }
                        ])}
                    </td>
                </tr>`;
        });

        codigoEstrutura += criarContainerTabela(
            ['Nome', 'Código', 'Paróquia', 'Status', 'Ações'],
            linhasParticipantes,
            'tabela-participantes',
            'corpo-tabela-participantes'
        );
    }
    codigoEstrutura += '</div>';

    conteudo.innerHTML = codigoEstrutura;

    Busca.vincularFiltro('busca-participantes', 'corpo-tabela-participantes');
}

async function abrirFormularioParticipante(idParticipante = null) {
    modoEdicao = 'participantes';
    registroEmEdicaoParticipante = idParticipante;
    
    document.getElementById('titulo-janela').textContent = idParticipante ? 'Editar Participante' : 'Novo Participante';

    const [paroquias, cursos] = await Promise.all([bd.obterTodos('paroquias'), bd.obterTodos('cursos')]);
    
    let p = {};
    if (idParticipante) {
        p = await bd.obter('participantes', idParticipante);
    }

    const opcoesStatus = [
        { id: 'Ativo', nome: 'Ativo' },
        { id: 'Desistente', nome: 'Desistente' }
    ];

    let formHTML = '<form id="formulario-participante" class="flex flex-coluna gap-md w-total">';

    formHTML += '<div class="flex gap-md md-flex-coluna">';
    formHTML += '<div class="flex-1">' + criarCampoFormulario('Nome Completo', 'text', 'nome_participante', p.nome_participante || '', '', true) + '</div>';
    formHTML += '<div class="flex-1">' + criarSeletor('Status', 'status_participante', opcoesStatus, p.status_participante || 'Ativo') + '</div>';
    formHTML += '</div>';

    formHTML += '<div class="flex gap-md md-flex-coluna">';
    formHTML += '<div class="flex-1">' + criarSeletor('Paróquia de Origem', 'id_paroquia', paroquias.map(pq => ({ id: pq.id_paroquia, nome: pq.nome_paroquia })), p.id_paroquia || '', true) + '</div>';
    formHTML += '<div class="flex-1" id="recipiente-seletor-capela">';
    formHTML += criarSeletor('Capela / Comunidade', 'capela', [], '');
    formHTML += '</div>';
    formHTML += '<div class="flex-1">' + criarSeletor('Curso Matriculado', 'id_curso', cursos.map(c => ({ id: c.id_curso, nome: c.nome_curso })), p.id_curso || '', true) + '</div>';
    formHTML += '</div>';

    formHTML += '<div class="flex gap-md md-flex-coluna">';
    formHTML += '<div class="flex-1">' + criarCampoFormulario('Email', 'email', 'email', p.email || '', 'exemplo@email.com') + '</div>';
    formHTML += '<div class="flex-1">' + criarCampoFormulario('Telefone', 'tel', 'telefone', p.telefone || '', 'Ex: 41999999999') + '</div>';
    formHTML += '</div>';

    formHTML += '<div class="flex gap-md md-flex-coluna">';
    formHTML += '<div class="flex-1">' + criarCampoFormulario('CPF', 'text', 'cpf', p.cpf || '', '000.000.000-00') + '</div>';
    formHTML += '<div class="flex-1">' + criarCampoFormulario('RG', 'text', 'rg', p.rg || '') + '</div>';
    formHTML += '<div class="flex-1">' + criarCampoFormulario('Nascimento', 'date', 'data_nascimento', p.data_nascimento || '') + '</div>';
    formHTML += '</div>';

    formHTML += '<div class="flex gap-md md-flex-coluna">';
    formHTML += '<div class="flex-1">' + criarCampoFormulario('Endereço', 'text', 'endereco', p.endereco || '') + '</div>';
    formHTML += '<div class="flex-1">' + criarCampoFormulario('Bairro', 'text', 'bairro', p.bairro || '') + '</div>';
    formHTML += '</div>';

    formHTML += '<div class="flex gap-md md-flex-coluna">';
    formHTML += '<div class="flex-1">' + criarCampoFormulario('Cidade', 'text', 'cidade', p.cidade || 'Curitiba') + '</div>';
    formHTML += '<div class="flex-1">' + criarCampoFormulario('Estado (UF)', 'text', 'estado', p.estado || 'PR') + '</div>';
    formHTML += '</div>';

    if (idParticipante) {
        formHTML += `<div class="p-md fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm mt-xs">Código de Acesso do Participante: <strong>${p.codigo_acesso || '-'}</strong></div>`;
    }

    formHTML += criarRodapeFormulario('salvarParticipante()', idParticipante ? 'Atualizar Participante' : 'Salvar Participante', {
        botoesExtras: criarBotao('Salvar e Imprimir Cartão', 'salvarEImprimirCartaoParticipante()', 'secundario', 'md-w-total')
    });

    formHTML += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formHTML;

    setTimeout(() => {
        const seletorParoquia = document.getElementById('id_paroquia');
        if (seletorParoquia) {
            seletorParoquia.addEventListener('change', () => {
                if(typeof atualizarSeletorCapelas === 'function') atualizarSeletorCapelas();
            });
        }
        if (typeof atualizarSeletorCapelas === 'function') {
            atualizarSeletorCapelas(p.capela || '');
        }
    }, 100);

    Interface.abrirJanela('janela-formulario');
}

async function atualizarSeletorCapelas(capelaSelecionada = '') {
    const idParoquia = document.getElementById('id_paroquia').value;
    const recipienteCapela = document.getElementById('recipiente-seletor-capela');
    
    if (!idParoquia) {
        recipienteCapela.innerHTML = criarSeletor('Capela / Comunidade', 'capela', [], capelaSelecionada);
        return;
    }

    try {
        const paroquia = await bd.obter('paroquias', idParoquia);
        let opcoesCapelas = [];

        if (paroquia && paroquia.capelas) {
            opcoesCapelas = paroquia.capelas.map(capela => {
                return typeof capela === 'string' 
                    ? { id: capela, nome: capela } 
                    : { id: capela.id || capela.nome, nome: capela.nome };
            });
        }

        recipienteCapela.innerHTML = criarSeletor('Capela / Comunidade', 'capela', opcoesCapelas, capelaSelecionada);
        
    } catch (erro) {
        console.error('Erro ao buscar capelas:', erro);
        recipienteCapela.innerHTML = criarSeletor('Capela / Comunidade', 'capela', [], capelaSelecionada);
    }
}

async function editarParticipante(idParticipante) {
    await abrirFormularioParticipante(idParticipante);
}

async function excluirParticipante(idParticipante) {
    if (confirm('Deseja realmente excluir este participante?')) {
        await bd.excluir('participantes', idParticipante);
        Utilidades.notificacao('Participante excluído!');
        renderizarAbaAtual();
    }
}

async function gerarCodigoAcessoUnico(idParticipanteAtual = '') {
    const participantes = await bd.obterTodos('participantes');
    const codigosExistentes = new Set(
        participantes
            .filter(participante => String(participante.id_participante) !== String(idParticipanteAtual))
            .map(participante => participante.codigo_acesso)
            .filter(Boolean)
    );

    let codigo = '';
    do {
        codigo = Math.floor(100000 + Math.random() * 900000).toString();
    } while (codigosExistentes.has(codigo));

    return codigo;
}

async function salvarParticipante(opcoes = {}) {
    const nome_participante = document.getElementById('nome_participante').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const data_nascimento = document.getElementById('data_nascimento').value;
    const email = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const status_participante = document.getElementById('status_participante').value || 'Ativo';
    const id_paroquia = document.getElementById('id_paroquia').value;
    const campoCapela = document.getElementById('capela');
    const capela = campoCapela?.value || '';
    const id_curso = document.getElementById('id_curso').value;

    const camposObrigatorios = [
        { nome: 'Nome Completo', valor: nome_participante },
        { nome: 'Paróquia de Origem', valor: id_paroquia },
        { nome: 'Curso Matriculado', valor: id_curso }
    ];

    if (!Validacao.notificarCamposObrigatorios(camposObrigatorios)) {
        return null;
    }

    if (cpf && !Validacao.validarCPF(cpf)) {
        Utilidades.notificacao('Informe um CPF válido.', 'erro');
        return null;
    }

    if (email && !Validacao.validarEmail(email)) {
        Utilidades.notificacao('Informe um email válido.', 'erro');
        return null;
    }

    if (telefone && !Validacao.validarTelefone(telefone)) {
        Utilidades.notificacao('Informe um telefone válido.', 'erro');
        return null;
    }

    if (data_nascimento && !Validacao.validarCampoData(data_nascimento, 'Nascimento')) return null;

    const idParticipante = registroEmEdicaoParticipante || Utilidades.gerarId();
    const participante = {
        id_participante: idParticipante,
        nome_participante,
        cpf,
        rg: document.getElementById('rg').value,
        data_nascimento,
        email,
        telefone,
        endereco: document.getElementById('endereco').value,
        bairro: document.getElementById('bairro').value,
        cidade: document.getElementById('cidade').value,
        estado: document.getElementById('estado').value,
        status_participante,
        id_paroquia,
        capela,
        id_curso,
        codigo_acesso: ''
    };

    if (registroEmEdicaoParticipante) {
        const pAntigo = await bd.obter('participantes', registroEmEdicaoParticipante);
        if (pAntigo) participante.codigo_acesso = pAntigo.codigo_acesso;
    }

    if (!participante.codigo_acesso) {
        participante.codigo_acesso = await gerarCodigoAcessoUnico(idParticipante);
    }

    await bd.salvar('participantes', participante);
    if (opcoes.notificar !== false) {
        Utilidades.notificacao(registroEmEdicaoParticipante ? 'Participante atualizado!' : 'Participante salvo com sucesso!', 'sucesso');
    }
    if (opcoes.fecharJanela !== false) Interface.fecharJanela('janela-formulario');
    if (opcoes.renderizar !== false) renderizarAbaAtual();
    return participante;
}

async function salvarEImprimirCartaoParticipante() {
    const participante = await salvarParticipante({ fecharJanela: true, renderizar: true });
    if (participante) await imprimirCartaoParticipante(participante.id_participante);
}

async function garantirCodigoAcessoParticipante(participante) {
    if (participante.codigo_acesso) return participante;
    participante.codigo_acesso = await gerarCodigoAcessoUnico(participante.id_participante);
    await bd.salvar('participantes', participante);
    return participante;
}

async function obterDadosCartaoParticipante(participante) {
    const [curso, paroquia] = await Promise.all([
        participante.id_curso ? bd.obter('cursos', participante.id_curso) : Promise.resolve(null),
        participante.id_paroquia ? bd.obter('paroquias', participante.id_paroquia) : Promise.resolve(null)
    ]);

    return {
        participante,
        curso: curso ? curso.nome_curso : '-',
        paroquia: paroquia ? paroquia.nome_paroquia : '-'
    };
}

function criarEstilosCartoesAcesso(individual = false) {
    return `
        @page { size: A4 landscape; margin: 8mm; }
        body { margin: 0; background: #ffffff; }
        .grade-cartoes-acesso {
            display: grid;
            grid-template-columns: repeat(2, 9.9cm);
            gap: 6mm;
            justify-content: center;
            align-content: start;
        }
        .folha-cartao-individual {
            min-height: 190mm;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding-top: 18mm;
        }
        .cartao-acesso {
            width: 9.9cm;
            height: 5.58cm;
            padding: 4mm;
            overflow: hidden;
            border: 1mm solid var(--cor-documento-vinho);
            border-radius: 3mm;
            background: #ffffff;
            page-break-inside: avoid;
            break-inside: avoid;
            font-family: var(--fonte-documento);
        }
        .topo-cartao-acesso {
            display: flex;
            align-items: center;
            gap: 2.5mm;
            margin-bottom: 1.6mm;
            padding-bottom: 1.4mm;
            border-bottom: 0.4mm solid var(--cor-documento-dourado);
        }
        .logo-cartao-acesso {
            width: 9mm;
            height: 9mm;
            object-fit: contain;
        }
        .marca-cartao-acesso {
            margin: 0;
            color: var(--cor-documento-vinho);
            font-size: 7.8pt;
            font-weight: 800;
            text-transform: uppercase;
        }
        .submarca-cartao-acesso {
            margin: 1mm 0 0;
            color: var(--cor-documento-azul);
            font-size: 6pt;
            font-weight: 700;
            text-transform: uppercase;
        }
        .nome-cartao-acesso {
            margin: 0 0 1.8mm;
            color: var(--cor-documento-azul);
            font-size: 15pt;
            font-weight: 900;
            line-height: 1.08;
            text-transform: uppercase;
        }
        .linha-cartao-acesso {
            margin: 1.2mm 0;
            color: var(--cor-documento-texto);
            font-size: 8pt;
            line-height: 1.25;
        }
        .linha-paroquia-cartao {
            font-size: 10.8pt;
            font-weight: 800;
        }
        .linha-curso-cartao {
            font-size: 8.5pt;
        }
        .linha-cartao-acesso strong {
            color: var(--cor-documento-vinho);
        }
        .codigo-cartao-acesso {
            margin-top: 2mm;
            padding: 1.5mm 2.5mm;
            border-radius: 2mm;
            background: #ffffff;
            color: var(--cor-documento-vinho);
            font-size: 13pt;
            font-weight: 900;
            text-align: center;
            letter-spacing: 1.5pt;
        }
        @media print {
            body { margin: 0; }
            .cartao-acesso { box-shadow: none; }
            ${individual ? '.cartao-acesso { page-break-after: always; }' : ''}
        }
    `;
}

function montarHtmlCartoesAcesso(dadosCartoes, individual = false) {
    const caminhoMarca = new URL(CAMINHO_MARCA_INSTITUCIONAL, window.location.href).href;
    const classeFolha = individual ? 'folha-cartao-individual' : 'grade-cartoes-acesso';

    const cartoes = dadosCartoes.map(({ participante, curso, paroquia }) => `
        <article class="cartao-acesso">
            <div class="topo-cartao-acesso">
                <img src="${caminhoMarca}" alt="${Utilidades.escaparHtml(NOME_INSTITUCIONAL)}" class="logo-cartao-acesso">
                <div>
                    <p class="marca-cartao-acesso">${Utilidades.escaparHtml(NOME_INSTITUCIONAL)}</p>
                    <p class="submarca-cartao-acesso">${Utilidades.escaparHtml(SUBTITULO_INSTITUCIONAL)}</p>
                </div>
            </div>
            <h1 class="nome-cartao-acesso">${Utilidades.escaparHtml(participante.nome_participante || '-')}</h1>
            <p class="linha-cartao-acesso linha-paroquia-cartao"><strong>Paróquia:</strong> ${Utilidades.escaparHtml(paroquia)}</p>
            <p class="linha-cartao-acesso linha-curso-cartao"><strong>Curso:</strong> ${Utilidades.escaparHtml(curso)}</p>
            <div class="codigo-cartao-acesso">${Utilidades.escaparHtml(participante.codigo_acesso || '-')}</div>
        </article>
    `).join('');

    return `<section class="${classeFolha}">${cartoes}</section>`;
}

async function imprimirCartaoParticipante(idParticipante) {
    let participante = await bd.obter('participantes', idParticipante);
    if (!participante) {
        Utilidades.notificacao('Participante não encontrado.', 'erro');
        return;
    }

    participante = await garantirCodigoAcessoParticipante(participante);
    const dadosCartao = await obterDadosCartaoParticipante(participante);
    abrirDocumentoImpressao(
        `Cartão de Acesso - ${participante.nome_participante || 'Participante'}`,
        montarHtmlCartoesAcesso([dadosCartao], true),
        { incluirCabecalho: false, estilosExtras: criarEstilosCartoesAcesso(true) }
    );
}

async function abrirModalCartoesParticipantes() {
    const cursos = await bd.obterTodos('cursos');
    cursos.sort((a, b) => (a.nome_curso || '').localeCompare(b.nome_curso || ''));

    document.getElementById('titulo-janela').textContent = 'Imprimir Cartões de Acesso';
    let html = '<form class="flex flex-coluna gap-md w-total" onsubmit="event.preventDefault();">';
    html += criarSeletor('Curso', 'id_curso_cartoes', cursos.map(curso => ({ id: curso.id_curso, nome: curso.nome_curso })), '', true);
    html += '<label class="flex itens-centro gap-sm cursor-apontador cartao-suave">';
    html += '<input type="checkbox" id="somente_ativos_cartoes" class="checkbox-padrao" checked>';
    html += '<span class="texto-md cor-texto-escuro">Imprimir somente participantes ativos</span>';
    html += '</label>';
    html += criarRodapeFormulario('imprimirCartoesParticipantesEmLote()', 'Imprimir Cartões', {
        varianteSalvar: 'secundario'
    });
    html += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = html;
    Interface.abrirJanela('janela-formulario');
}

async function imprimirCartoesParticipantesEmLote() {
    const idCurso = document.getElementById('id_curso_cartoes').value;
    const somenteAtivos = document.getElementById('somente_ativos_cartoes')?.checked;

    if (!idCurso) {
        Utilidades.notificacao('Selecione um curso para imprimir os cartões.', 'erro');
        return;
    }

    const participantes = await bd.obterTodos('participantes');
    const participantesCurso = participantes
        .filter(participante => String(participante.id_curso) === String(idCurso))
        .filter(participante => !somenteAtivos || (participante.status_participante || 'Ativo') === 'Ativo')
        .sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));

    if (participantesCurso.length === 0) {
        Utilidades.notificacao('Nenhum participante encontrado para este curso.', 'aviso');
        return;
    }

    const dadosCartoes = [];
    for (const participanteOriginal of participantesCurso) {
        const participante = await garantirCodigoAcessoParticipante(participanteOriginal);
        dadosCartoes.push(await obterDadosCartaoParticipante(participante));
    }

    Interface.fecharJanela('janela-formulario');
    abrirDocumentoImpressao(
        'Cartões de Acesso',
        montarHtmlCartoesAcesso(dadosCartoes, false),
        { incluirCabecalho: false, estilosExtras: criarEstilosCartoesAcesso(false) }
    );
}

function abrirModalImportacao() {
    document.getElementById('titulo-janela').textContent = 'Importar Participantes (Excel/CSV)';
    
    let codigoEstrutura = `
        <div class="flex flex-coluna gap-md">
            
            <div class="p-md fundo-branco borda-1 borda-solida borda-cor-padrao raio-sm texto-md">
                <p class="peso-bold mb-xs cor-texto-primario">Instruções para a sua planilha:</p>
                <p class="mb-sm cor-texto-escuro">A primeira linha deve conter <strong>exatamente</strong> os seguintes cabeçalhos (respeite a grafia e não use acentos):</p>
                <div class="grupo-cabecalhos-planilha">
                    <div class="linha-cabecalhos-planilha">
                        <strong class="cor-texto-erro">Obrigatórios:</strong>
                        <div class="lista-cabecalhos-planilha">
                            <span class="cabecalho-planilha">Nome</span>
                            <span class="cabecalho-planilha">Curso</span>
                            <span class="cabecalho-planilha">Paroquia</span>
                        </div>
                    </div>
                    <div class="linha-cabecalhos-planilha texto-sm cor-texto-claro">
                        <strong class="cor-texto-escuro">Opcionais:</strong>
                        <div class="lista-cabecalhos-planilha">
                            <span class="cabecalho-planilha">CPF</span>
                            <span class="cabecalho-planilha">RG</span>
                            <span class="cabecalho-planilha">Nascimento</span>
                            <span class="cabecalho-planilha">Email</span>
                            <span class="cabecalho-planilha">Telefone</span>
                            <span class="cabecalho-planilha">Endereco</span>
                            <span class="cabecalho-planilha">Bairro</span>
                            <span class="cabecalho-planilha">Cidade</span>
                            <span class="cabecalho-planilha">Estado</span>
                            <span class="cabecalho-planilha">Capela</span>
                            <span class="cabecalho-planilha">Status</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="flex itens-centro md-flex-coluna gap-md p-md fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm mt-xs mb-xs">
                <label for="arquivo-excel" class="botao-padrao botao-primario w-total max-w-240 md-max-w-total">
                    ${criarIcone('escolher-arquivo')} Escolher Arquivo
                </label>
                <input type="file" id="arquivo-excel" accept=".xlsx, .xls, .csv" class="oculto" onchange="atualizarRotuloArquivo(this)" />
                <span id="texto-arquivo-selecionado" class="texto-md cor-texto-escuro peso-medium md-texto-centro">Nenhum arquivo selecionado</span>
            </div>
            
            <div id="resultado-validacao" class="oculto"></div>

            ${criarRodapeFormulario('processarPlanilha()', 'Validar Planilha', {
                id: 'recipiente-botoes-importacao',
                classesExtras: 'mt-lg md-flex-coluna',
                atributosSalvar: 'id="botao-processar-excel"'
            })}
        </div>
    `;

    document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
    Interface.abrirJanela('janela-formulario');
}

function atualizarRotuloArquivo(input) {
    const span = document.getElementById('texto-arquivo-selecionado');
    if (input.files && input.files.length > 0) {
        span.innerHTML = '<strong>Arquivo:</strong> ' + input.files[0].name;
    } else {
        span.textContent = 'Nenhum arquivo selecionado';
    }
}

async function processarPlanilha() {
    const inputArquivo = document.getElementById('arquivo-excel');
    if (!inputArquivo.files.length) {
        Utilidades.notificacao('Selecione um arquivo Excel primeiro.', 'erro');
        return;
    }

    const arquivo = inputArquivo.files[0];
    const leitor = new FileReader();

    leitor.onload = async (e) => {
        try {
            const dados = new Uint8Array(e.target.result);
            const workbook = XLSX.read(dados, { type: 'array' });
            const nomePrimeiraAba = workbook.SheetNames[0];
            const planilha = workbook.Sheets[nomePrimeiraAba];
            
            const linhas = XLSX.utils.sheet_to_json(planilha);

            if (linhas.length === 0) {
                Utilidades.notificacao('A planilha está vazia.', 'aviso');
                return;
            }

            await validarDadosPlanilha(linhas);

        } catch (erro) {
            console.error(erro);
            Utilidades.notificacao('Erro ao ler a planilha. Verifique o formato.', 'erro');
        }
    };

    leitor.readAsArrayBuffer(arquivo);
}

const normalizarTexto = (texto) => {
    if (!texto) return "";
    return texto.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

async function validarDadosPlanilha(linhasExcel) {
    const cursos = await bd.obterTodos('cursos');
    const paroquias = await bd.obterTodos('paroquias');
    const participantesExistentes = await bd.obterTodos('participantes');

    const mapaCursos = new Map(cursos.map(c => [normalizarTexto(c.nome_curso), c.id_curso]));
    const mapaParoquias = new Map(paroquias.map(p => [normalizarTexto(p.nome_paroquia), p.id_paroquia]));

    const registrosValidos = [];
    const erros = [];

    linhasExcel.forEach((linha, index) => {
        const linhaNum = index + 2; 
        
        const nomePlanilha = linha.Nome;
        const cursoPlanilha = linha.Curso;
        const paroquiaPlanilha = linha.Paroquia;

        if (!nomePlanilha) {
            erros.push(`Linha ${linhaNum}: Coluna 'Nome' do participante em branco ou não encontrada.`);
            return;
        }
        if (!cursoPlanilha) {
            erros.push(`Linha ${linhaNum}: (${nomePlanilha}) Coluna 'Curso' não encontrada ou em branco.`);
            return;
        }
        if (!paroquiaPlanilha) {
            erros.push(`Linha ${linhaNum}: (${nomePlanilha}) Coluna 'Paroquia' não encontrada ou em branco.`);
            return;
        }

        if (linha.CPF && !Validacao.validarCPF(linha.CPF)) {
            erros.push(`Linha ${linhaNum}: CPF inválido para "${nomePlanilha}".`);
            return;
        }

        if (linha.Email && !Validacao.validarEmail(linha.Email)) {
            erros.push(`Linha ${linhaNum}: Email inválido para "${nomePlanilha}".`);
            return;
        }

        if (linha.Telefone && !Validacao.validarTelefone(String(linha.Telefone))) {
            erros.push(`Linha ${linhaNum}: Telefone inválido para "${nomePlanilha}".`);
            return;
        }

        const idCursoLocalizado = mapaCursos.get(normalizarTexto(cursoPlanilha));
        const idParoquiaLocalizada = mapaParoquias.get(normalizarTexto(paroquiaPlanilha));

        if (!idCursoLocalizado) {
            erros.push(`Linha ${linhaNum}: Curso "${cursoPlanilha}" não encontrado no sistema.`);
            return;
        }
        if (!idParoquiaLocalizada) {
            erros.push(`Linha ${linhaNum}: Paróquia "${paroquiaPlanilha}" não encontrada no sistema.`);
            return;
        }

        const participanteExistente = participantesExistentes.find(p => {
            const temCPFIgual = linha.CPF && p.cpf && String(linha.CPF).replace(/\D/g, '') === p.cpf.replace(/\D/g, '');
            const mesmoNomeECurso = normalizarTexto(p.nome_participante) === normalizarTexto(nomePlanilha) && p.id_curso === idCursoLocalizado;
            return temCPFIgual || mesmoNomeECurso;
        });

        if (participanteExistente) {
            registrosValidos.push({
                id_participante: participanteExistente.id_participante,
                nome_participante: nomePlanilha,
                cpf: linha.CPF || participanteExistente.cpf || '',
                rg: linha.RG || participanteExistente.rg || '',
                data_nascimento: linha.Nascimento || participanteExistente.data_nascimento || '',
                email: linha.Email || participanteExistente.email || '',
                telefone: linha.Telefone ? String(linha.Telefone).replace(/\D/g, '') : (participanteExistente.telefone || ''),
                endereco: linha.Endereco || participanteExistente.endereco || '',
                bairro: linha.Bairro || participanteExistente.bairro || '',
                cidade: linha.Cidade || participanteExistente.cidade || 'Curitiba',
                estado: linha.Estado || participanteExistente.estado || 'PR',
                status_participante: linha.Status || participanteExistente.status_participante || 'Ativo',
                id_paroquia: idParoquiaLocalizada,
                capela: linha.Capela || participanteExistente.capela || '',
                id_curso: idCursoLocalizado,
                codigo_acesso: participanteExistente.codigo_acesso,
                _isUpdate: true
            });
        } else {
            registrosValidos.push({
                id_participante: Utilidades.gerarId(),
                nome_participante: nomePlanilha,
                cpf: linha.CPF || '',
                rg: linha.RG || '',
                data_nascimento: linha.Nascimento || '',
                email: linha.Email || '',
                telefone: linha.Telefone ? String(linha.Telefone).replace(/\D/g, '') : '',
                endereco: linha.Endereco || '',
                bairro: linha.Bairro || '',
                cidade: linha.Cidade || 'Curitiba',
                estado: linha.Estado || 'PR',
                status_participante: linha.Status || 'Ativo',
                id_paroquia: idParoquiaLocalizada,
                capela: linha.Capela || '',
                id_curso: idCursoLocalizado,
                codigo_acesso: Math.floor(100000 + Math.random() * 900000).toString(),
                _isUpdate: false
            });
        }
    });

    exibirResultadoValidacao(registrosValidos, erros);
}

function exibirResultadoValidacao(validos, erros) {
    const divResultado = document.getElementById('resultado-validacao');
    divResultado.classList.remove('oculto');
    
    let html = '';

    if (erros.length > 0) {
        html += `
            <div class="p-md fundo-branco raio-sm mb-md borda-1 borda-solida borda-destaque-erro">
                <h4 class="cor-texto-erro peso-bold mb-sm">Atenção: ${erros.length} erros encontrados</h4>
                <ul class="cor-texto-escuro texto-sm lista-rolagem-pequena">
                    ${erros.map(e => `<li>${e}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    if (validos.length > 0) {
        const novos = validos.filter(v => !v._isUpdate).length;
        const atualizacoes = validos.filter(v => v._isUpdate).length;

        html += `
            <div class="p-md fundo-branco raio-sm borda-1 borda-solida borda-destaque-sucesso">
                <h4 class="cor-texto-sucesso peso-bold mb-sm">Planilha validada com sucesso!</h4>
                <p class="texto-sm cor-texto-escuro">
                    Pronto para incluir <strong>${novos}</strong> novos participantes e atualizar <strong>${atualizacoes}</strong> registros já existentes.
                </p>
            </div>
        `;
    } else {
        html += '<p class="texto-sm cor-texto-erro">Nenhum registro válido encontrado para importar.</p>';
    }

    divResultado.innerHTML = html;

    const recipienteBotoes = document.getElementById('recipiente-botoes-importacao');
    if (validos.length > 0) {
        dadosImportacaoPendentesParticipantes = validos;
        recipienteBotoes.outerHTML = criarRodapeFormulario(
            'efetivarImportacaoExcelParticipantes()',
            `Confirmar Importação de ${validos.length} participantes`,
            {
                id: 'recipiente-botoes-importacao',
                classesExtras: 'mt-lg md-flex-coluna',
                varianteSalvar: 'sucesso'
            }
        );
    } else {
        recipienteBotoes.outerHTML = criarRodapeModal([
            { rotulo: 'Fechar', acao: "Interface.fecharJanela('janela-formulario')", variante: 'secundario' }
        ], {
            id: 'recipiente-botoes-importacao',
            classesExtras: 'mt-lg md-flex-coluna'
        });
    }

    Interface.decorarBotoesModal();
}

async function efetivarImportacaoExcelParticipantes() {
    const dados = dadosImportacaoPendentesParticipantes;
    if (!dados || dados.length === 0) return;

    let salvosComSucesso = 0;

    for (const participante of dados) {
        try {
            const { _isUpdate, ...dadosLimpos } = participante;
            await bd.salvar('participantes', dadosLimpos);
            salvosComSucesso++;
        } catch (e) {
            console.error("Erro ao salvar participante", participante, e);
        }
    }

    dadosImportacaoPendentesParticipantes = null;
    Utilidades.notificacao(`${salvosComSucesso} participantes processados com sucesso!`, 'sucesso');
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}
