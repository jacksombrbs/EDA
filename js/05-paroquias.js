let registroEmEdicaoParoquia = null;

async function renderizarParoquias(conteudo) {
    const paroquias = await bd.obterTodos('paroquias');    
    paroquias.sort((a, b) => (a.nome_paroquia || '').localeCompare(b.nome_paroquia || ''));
    
    let codigoEstrutura = '<div class="pagina-conteudo">';
    const botoesCabecalho = '<div class="flex gap-sm md-flex-coluna md-w-total">'
        + criarBotao('Importar Dados', 'abrirModalImportacaoParoquias()', 'secundario', 'md-w-total')
        + criarBotao('+ Nova Paróquia', 'abrirFormularioParoquia()', 'primario', 'md-w-total')
        + '</div>';
    codigoEstrutura += criarCabecalhoSecao('Paróquias Cadastradas', botoesCabecalho);

    codigoEstrutura += Busca.criarCampoBusca('busca-paroquias', 'Buscar por nome...');

    if (paroquias.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhuma paróquia cadastrada ainda.</p>';
    } else {
        let linhasParoquias = '';

        paroquias.forEach((paroquia, index) => {
            const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
            const nomeParoquia = paroquia.nome_paroquia || 'Sem Nome';
            const setor = paroquia.setor || '-';
            
            let capelasBadge = '<span class="cor-texto-claro">Nenhuma</span>';
            if (paroquia.capelas && Array.isArray(paroquia.capelas) && paroquia.capelas.length > 0) {
                capelasBadge = `<span>${paroquia.capelas.length} capela(s)</span>`;
            }

            linhasParoquias += `<tr class="${classeFundo} transicao hover-fundo-superficie-3">
                    <td class="p-md texto-esquerda peso-bold cor-texto-escuro">${nomeParoquia}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${setor}</td>
                    <td class="p-md texto-esquerda">${capelasBadge}</td>
                    <td class="p-md texto-esquerda">
                        ${criarAcoesTabela([
                            { rotulo: 'Editar', acao: `editarParoquia('${paroquia.id_paroquia}')` },
                            { rotulo: 'Excluir', acao: `excluirParoquia('${paroquia.id_paroquia}')`, perigo: true }
                        ])}
                    </td>
                </tr>`;
        });

        codigoEstrutura += criarContainerTabela(
            ['Paróquia', 'Setor', 'Capelas', 'Ações'],
            linhasParoquias,
            'tabela-paroquias',
            'corpo-tabela-paroquias'
        );
    }
    codigoEstrutura += '</div>';

    conteudo.innerHTML = codigoEstrutura;

    Busca.vincularFiltro('busca-paroquias', 'corpo-tabela-paroquias');
}

async function abrirFormularioParoquia(idParoquia = null) {
    modoEdicao = 'paroquias';
    registroEmEdicaoParoquia = idParoquia;
    
    document.getElementById('titulo-janela').textContent = idParoquia ? 'Editar Paróquia' : 'Nova Paróquia';

    let p = { capelas: [] };
    if (idParoquia) {
        const dadosP = await bd.obter('paroquias', idParoquia);
        if (dadosP) {
            p = dadosP;
            if (!p.capelas) p.capelas = [];
        }
    }

    let formHTML = '<form id="formulario-paroquia" class="flex flex-coluna gap-md w-total">';
    
    formHTML += '<div class="flex gap-md md-flex-coluna">';
    formHTML += '<div class="flex-1 w-total">' + criarCampoFormulario('Nome da Paróquia', 'text', 'nome_paroquia', p.nome_paroquia || '', 'Ex: Paróquia São José', true) + '</div>';
    formHTML += '<div class="flex-1 w-total">' + criarCampoFormulario('Setor', 'text', 'setor', p.setor || '', 'Ex: Setor Portão') + '</div>';
    formHTML += '</div>';

    formHTML += '<div class="fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm p-md mt-sm">';
    formHTML += '<h3 class="texto-md peso-bold cor-texto-primario mb-sm">Capelas / Comunidades</h3>';
    
    formHTML += '<div class="flex gap-sm mb-md md-flex-coluna">';
    formHTML += '<input type="text" id="nova_capela" class="campo-padrao" placeholder="Nome da nova capela">';
    formHTML += criarBotao('Adicionar', 'adicionarCapelaNaInterface()');
    formHTML += '</div>';

    formHTML += '<div id="lista-capelas" class="flex flex-coluna gap-xs lista-rolagem-media">';
    
    if (p.capelas.length === 0) {
        formHTML += '<p class="texto-sm cor-texto-claro" id="msg-sem-capelas">Nenhuma capela adicionada.</p>';
    } else {
        p.capelas.forEach((capela, index) => {
            formHTML += criarItemCapela(capela, index);
        });
    }
    
    formHTML += '</div>';
    formHTML += '</div>';

    formHTML += criarRodapeFormulario('salvarParoquia()', idParoquia ? 'Atualizar Paróquia' : 'Salvar Paróquia');

    formHTML += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formHTML;
    
    window._capelasAtuais = [...p.capelas];
    
    Interface.abrirJanela('janela-formulario');
}

function criarItemCapela(nomeCapela, index) {
    return `
        <div class="flex justifica-espaco itens-centro p-sm fundo-branco borda-1 borda-solida borda-cor-padrao raio-xxs item-capela" data-index="${index}">
            <span class="texto-md cor-texto-escuro peso-medium">${nomeCapela}</span>
            ${criarBotao('Remover', `removerCapelaDaInterface(${index})`, 'perigo', 'botao-pequeno')}
        </div>
    `;
}

function adicionarCapelaNaInterface() {
    const input = document.getElementById('nova_capela');
    const nome = input.value.trim();
    
    if (!nome) {
        Utilidades.notificacao('Digite o nome da capela.', 'aviso');
        return;
    }
    
    if (!window._capelasAtuais) window._capelasAtuais = [];
    
    if (window._capelasAtuais.includes(nome)) {
        Utilidades.notificacao('Esta capela já foi adicionada.', 'aviso');
        return;
    }
    
    window._capelasAtuais.push(nome);
    input.value = '';
    
    atualizarListaCapelasNaInterface();
}

function removerCapelaDaInterface(index) {
    if (window._capelasAtuais && window._capelasAtuais.length > index) {
        window._capelasAtuais.splice(index, 1);
        atualizarListaCapelasNaInterface();
    }
}

function atualizarListaCapelasNaInterface() {
    const listaDiv = document.getElementById('lista-capelas');
    if (!listaDiv) return;
    
    if (!window._capelasAtuais || window._capelasAtuais.length === 0) {
        listaDiv.innerHTML = '<p class="texto-sm cor-texto-claro" id="msg-sem-capelas">Nenhuma capela adicionada.</p>';
        return;
    }
    
    let html = '';
    window._capelasAtuais.forEach((capela, index) => {
        html += criarItemCapela(capela, index);
    });
    
    listaDiv.innerHTML = html;
}

async function editarParoquia(idParoquia) {
    await abrirFormularioParoquia(idParoquia);
}

async function excluirParoquia(idParoquia) {
    if (confirm('Deseja realmente excluir esta paróquia?')) {
        await bd.excluir('paroquias', idParoquia);
        Utilidades.notificacao('Paróquia excluída!', 'sucesso');
        renderizarAbaAtual();
    }
}

async function salvarParoquia() {
    const nome_paroquia = document.getElementById('nome_paroquia').value.trim();
    const setor = document.getElementById('setor').value.trim();

    if (!Validacao.notificarCamposObrigatorios([{ nome: 'Nome da Paróquia', valor: nome_paroquia }])) {
        return;
    }

    const paroquia = {
        id_paroquia: registroEmEdicaoParoquia || Utilidades.gerarId(),
        nome_paroquia,
        setor,
        capelas: window._capelasAtuais || []
    };

    await bd.salvar('paroquias', paroquia);
    Utilidades.notificacao(registroEmEdicaoParoquia ? 'Paróquia atualizada!' : 'Paróquia salva com sucesso!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}

function abrirModalImportacaoParoquias() {
    document.getElementById('titulo-janela').textContent = 'Importar Paróquias (Excel/CSV)';
    
    let codigoEstrutura = `
        <div class="flex flex-coluna gap-md">
            
            <div class="p-md fundo-branco borda-1 borda-solida borda-cor-padrao raio-sm texto-md">
                <p class="peso-bold mb-xs cor-texto-primario">Instruções para a sua planilha:</p>
                <p class="mb-sm cor-texto-escuro">A primeira linha deve conter <strong>exatamente</strong> os seguintes cabeçalhos (respeite a grafia e não use acentos):</p>
                <div class="grupo-cabecalhos-planilha">
                    <div class="linha-cabecalhos-planilha">
                        <strong class="cor-texto-erro">Obrigatórios:</strong>
                        <div class="lista-cabecalhos-planilha">
                            <span class="cabecalho-planilha">Paroquia</span>
                        </div>
                    </div>
                    <div class="linha-cabecalhos-planilha texto-sm cor-texto-claro">
                        <strong class="cor-texto-escuro">Opcionais:</strong>
                        <div>
                            <div class="lista-cabecalhos-planilha mb-xs">
                                <span class="cabecalho-planilha">Setor</span>
                                <span class="cabecalho-planilha">Capelas</span>
                            </div>
                            <span>Capelas separadas por vírgula.</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="flex itens-centro md-flex-coluna gap-md p-md fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm mt-xs mb-xs">
                <label for="arquivo-excel-paroquia" class="botao-padrao botao-primario w-total max-w-240 md-max-w-total">
                    ${criarIcone('escolher-arquivo')} Escolher Arquivo
                </label>
                <input type="file" id="arquivo-excel-paroquia" accept=".xlsx, .xls, .csv" class="oculto" onchange="atualizarRotuloArquivoParoquia(this)" />
                <span id="texto-arquivo-selecionado-paroquia" class="texto-md cor-texto-escuro peso-medium md-texto-centro">Nenhum arquivo selecionado</span>
            </div>
            
            <div id="resultado-validacao-paroquia" class="oculto"></div>

            ${criarRodapeFormulario('processarPlanilhaParoquias()', 'Validar Planilha', {
                id: 'recipiente-botoes-importacao-paroquias',
                classesExtras: 'mt-lg md-flex-coluna',
                atributosSalvar: 'id="botao-processar-excel"'
            })}
        </div>
    `;

    document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
    Interface.abrirJanela('janela-formulario');
}

function atualizarRotuloArquivoParoquia(input) {
    const span = document.getElementById('texto-arquivo-selecionado-paroquia');
    if (input.files && input.files.length > 0) {
        span.innerHTML = '<strong>Arquivo:</strong> ' + input.files[0].name;
    } else {
        span.textContent = 'Nenhum arquivo selecionado';
    }
}

async function processarPlanilhaParoquias() {
    const inputArquivo = document.getElementById('arquivo-excel-paroquia');
    if (!inputArquivo.files || inputArquivo.files.length === 0) {
        Utilidades.notificacao('Selecione um ficheiro Excel/CSV primeiro.', 'erro');
        return;
    }

    const arquivo = inputArquivo.files[0];
    const leitor = new FileReader();

    leitor.onload = async function(e) {
        try {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const nomePrimeiraAba = workbook.SheetNames[0];
            const planilha = workbook.Sheets[nomePrimeiraAba];
            const linhasExcel = XLSX.utils.sheet_to_json(planilha);

            if (linhasExcel.length === 0) {
                Utilidades.notificacao('A planilha parece estar vazia.', 'aviso');
                return;
            }

            const paroquiasExistentes = await bd.obterTodos('paroquias');
            const validos = [];
            const erros = [];

            linhasExcel.forEach((linha, index) => {
                const linhaNum = index + 2; 
                const nomePlanilha = linha.Paroquia || linha.Paróquia || linha.PAROQUIA;
                const setorPlanilha = linha.Setor || linha.SETOR || '';
                const capelasTexto = linha.Capelas || linha.CAPELAS || '';

                if (!nomePlanilha) {
                    erros.push(`Linha ${linhaNum}: Coluna 'Paroquia' está em branco.`);
                    return;
                }

                let capelasArray = [];
                if (capelasTexto) {
                    capelasArray = capelasTexto.toString().split(',').map(c => c.trim()).filter(c => c !== '');
                }

                const existente = paroquiasExistentes.find(p => p.nome_paroquia.toLowerCase() === nomePlanilha.toString().toLowerCase());

                validos.push({
                    id_paroquia: existente ? existente.id_paroquia : Utilidades.gerarId(),
                    nome_paroquia: nomePlanilha.toString(),
                    setor: setorPlanilha.toString(),
                    capelas: capelasArray,
                    _isUpdate: !!existente
                });
            });

            const resultadoDiv = document.getElementById('resultado-validacao-paroquia');
            resultadoDiv.classList.remove('oculto');
            
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
                            Pronto para incluir <strong>${novos}</strong> novas paróquias e atualizar <strong>${atualizacoes}</strong> registros já existentes.
                        </p>
                    </div>
                `;
            } else {
                html += '<p class="texto-sm cor-texto-erro">Nenhum registro válido encontrado.</p>';
            }

            resultadoDiv.innerHTML = html;

            const recipienteBotoes = document.getElementById('recipiente-botoes-importacao-paroquias');
            
            if (validos.length > 0) {
                window._dadosImportacaoParoquiasPendentes = validos;
                recipienteBotoes.outerHTML = criarRodapeFormulario(
                    'efetivarImportacaoExcelParoquias()',
                    `Confirmar Importação de ${validos.length} registros`,
                    {
                        id: 'recipiente-botoes-importacao-paroquias',
                        classesExtras: 'mt-lg md-flex-coluna',
                        varianteSalvar: 'sucesso'
                    }
                );
                Interface.decorarBotoesModal();
            }

        } catch (erro) {
            document.getElementById('resultado-validacao-paroquia').innerHTML = '<p class="cor-texto-erro">Erro ao processar o arquivo. Verifique o formato.</p>';
            document.getElementById('resultado-validacao-paroquia').classList.remove('oculto');
        }
    };
    leitor.readAsBinaryString(arquivo);
}

async function efetivarImportacaoExcelParoquias() {
    const dados = window._dadosImportacaoParoquiasPendentes;
    if (!dados || dados.length === 0) return;
    
    let processadosComSucesso = 0;
    for (const paroquia of dados) {
        try {
            await bd.salvar('paroquias', {
                id_paroquia: paroquia.id_paroquia,
                nome_paroquia: paroquia.nome_paroquia,
                setor: paroquia.setor,
                capelas: paroquia.capelas
            });
            processadosComSucesso++;
        } catch (e) {
            console.error("Erro ao salvar paróquia", paroquia, e);
        }
    }
    
    window._dadosImportacaoParoquiasPendentes = null;
    Utilidades.notificacao(`${processadosComSucesso} paróquias processadas com sucesso!`, 'sucesso');
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}
