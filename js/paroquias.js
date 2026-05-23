let registroEmEdicaoParoquia = null;

async function renderizarParoquias(conteudo) {
    const paroquias = await bd.obterTodos('paroquias');    
    paroquias.sort((a, b) => (a.nome_paroquia || '').localeCompare(b.nome_paroquia || ''));
    
    let codigoEstrutura = '<div class="fundo-branco borda-1 borda-solida borda-cor-padrao raio-md p-md mb-lg">';
    codigoEstrutura += '<div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Paróquias Cadastradas</h2>';
    
    codigoEstrutura += '<div class="flex gap-sm md-flex-coluna md-w-total">';
    codigoEstrutura += '<button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-medium transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3 md-w-total" onclick="abrirModalImportacaoParoquias()">Importar Dados</button>';
    codigoEstrutura += '<button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-medium transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 hover-fundo-marca-escuro md-w-total" onclick="abrirFormularioParoquia()">+ Nova Paróquia</button>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += '</div>';

    codigoEstrutura += Busca.criarCampoBusca('busca-paroquias', 'Buscar por nome...');

    if (paroquias.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhuma paróquia cadastrada ainda.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-1 borda-solida borda-cor-padrao raio-md overflow-hidden pos-relativa"><table class="w-total borda-colapso texto-md" id="tabela-paroquias"><thead><tr>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Paróquia</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Setor</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Capelas</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Ações</th></tr></thead><tbody>';

        paroquias.forEach((paroquia, index) => {
            const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
            const nomeParoquia = paroquia.nome_paroquia || 'Sem Nome';
            const setor = paroquia.setor || '-';
            
            let capelasBadge = '<span class="cor-texto-claro">Nenhuma</span>';
            if (paroquia.capelas && Array.isArray(paroquia.capelas) && paroquia.capelas.length > 0) {
                capelasBadge = `<span class="inline-flex itens-centro justifica-centro px-sm py-xs raio-xxs texto-sm peso-medium fundo-marca-700 cor-texto-branco">${paroquia.capelas.length} capela(s)</span>`;
            }

            codigoEstrutura += `<tr class="${classeFundo} transicao hover-fundo-superficie-3">
                    <td class="p-md texto-esquerda peso-bold cor-texto-escuro">${nomeParoquia}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${setor}</td>
                    <td class="p-md texto-esquerda">${capelasBadge}</td>
                    <td class="p-md texto-esquerda">
                        <div class="flex gap-sm">
                            <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-escuro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="editarParoquia('${paroquia.id_paroquia}')">Editar</button>
                            <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-erro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="excluirParoquia('${paroquia.id_paroquia}')">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });

        codigoEstrutura += '</tbody></table></div>';
    }
    codigoEstrutura += '</div>';

    conteudo.innerHTML = codigoEstrutura;

    document.getElementById('busca-paroquias')?.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        const linhas = document.querySelectorAll('#tabela-paroquias tbody tr');
        linhas.forEach(linha => {
            const texto = linha.textContent.toLowerCase();
            linha.classList.toggle('oculto', !texto.includes(termo));
        });
    });
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
    formHTML += '<input type="text" id="nova_capela" class="p-sm borda-1 borda-solida borda-cor-padrao raio-xxs texto-md fundo-branco transicao focus-borda-marca-700 focus-sombra-marca w-total" placeholder="Nome da nova capela">';
    formHTML += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-md peso-medium transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 hover-fundo-marca-escuro" onclick="adicionarCapelaNaInterface()">Adicionar</button>';
    formHTML += '</div>';

    formHTML += '<div id="lista-capelas" class="flex flex-coluna gap-xs max-altura-rolagem" style="max-height: 200px; overflow-y: auto;">';
    
    if (p.capelas.length === 0) {
        formHTML += '<p class="texto-sm cor-texto-claro" id="msg-sem-capelas">Nenhuma capela adicionada.</p>';
    } else {
        p.capelas.forEach((capela, index) => {
            formHTML += criarItemCapela(capela, index);
        });
    }
    
    formHTML += '</div>';
    formHTML += '</div>';

    formHTML += '<div class="flex justifica-fim gap-md pt-md w-total">';
    formHTML += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-regular transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3" onclick="Interface.fecharJanela(\'janela-formulario\')">Cancelar</button>';
    formHTML += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-regular transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 sombra-1 hover-fundo-marca-escuro" onclick="salvarParoquia()">' + (idParoquia ? 'Atualizar Paróquia' : 'Salvar Paróquia') + '</button>';
    formHTML += '</div>';

    formHTML += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formHTML;
    
    window._capelasAtuais = [...p.capelas];
    
    Interface.abrirJanela('janela-formulario');
}

function criarItemCapela(nomeCapela, index) {
    return `
        <div class="flex justifica-espaco itens-centro p-sm fundo-branco borda-1 borda-solida borda-cor-padrao raio-xxs item-capela" data-index="${index}">
            <span class="texto-md cor-texto-escuro peso-medium">${nomeCapela}</span>
            <button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-sm raio-xxs texto-sm peso-medium transicao sem-borda cursor-apontador cor-texto-erro fundo-superficie-2 hover-fundo-superficie-3" onclick="removerCapelaDaInterface(${index})">
                Remover
            </button>
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

    if (!nome_paroquia) {
        Utilidades.notificacao('Por favor, preencha o nome da paróquia.', 'erro');
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
                <p class="mb-xs"><strong class="cor-texto-erro">Obrigatórios:</strong> <code class="fundo-superficie-2 p-xs raio-xxs borda-1 borda-solida borda-cor-padrao">Paroquia</code></p>
                <p class="texto-sm cor-texto-claro"><strong class="cor-texto-escuro">Opcionais:</strong> <code class="fundo-superficie-2 p-xs raio-xxs borda-1 borda-solida borda-cor-padrao">Setor</code> e <code class="fundo-superficie-2 p-xs raio-xxs borda-1 borda-solida borda-cor-padrao">Capelas</code> (separadas por vírgula)</p>
            </div>
            
            <div class="flex itens-centro md-flex-coluna gap-md p-md fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm mt-xs mb-xs">
                <label for="arquivo-excel-paroquia" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-medium transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 hover-fundo-marca-escuro sombra-1 w-total max-w-240 md-max-w-total">
                    <span class="icone-inline">&#xE8E5;</span> Escolher Arquivo
                </label>
                <input type="file" id="arquivo-excel-paroquia" accept=".xlsx, .xls, .csv" class="oculto" onchange="atualizarRotuloArquivoParoquia(this)" />
                <span id="texto-arquivo-selecionado-paroquia" class="texto-md cor-texto-escuro peso-medium md-texto-centro">Nenhum arquivo selecionado</span>
            </div>
            
            <div id="resultado-validacao-paroquia" class="oculto"></div>

            <div class="flex justifica-fim gap-md mt-lg md-flex-coluna" id="container-botoes-importacao-paroquias">
                <button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-regular transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3 md-w-total" onclick="Interface.fecharJanela('janela-formulario')">Cancelar</button>
                <button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 hover-fundo-marca-escuro md-w-total" id="btn-processar-excel" onclick="processarPlanilhaParoquias()">Validar Planilha</button>
            </div>
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
                    <div class="p-md fundo-branco raio-sm mb-md borda-1 borda-solida borda-erro" style="border-left-width: 4px;">
                        <h4 class="cor-texto-erro peso-bold mb-sm">Atenção: ${erros.length} erros encontrados</h4>
                        <ul class="cor-texto-escuro texto-sm max-altura-rolagem" style="max-height: 150px; overflow-y: auto; padding-left: 1.5rem; list-style-type: disc;">
                            ${erros.map(e => `<li>${e}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }

            if (validos.length > 0) {
                const novos = validos.filter(v => !v._isUpdate).length;
                const atualizacoes = validos.filter(v => v._isUpdate).length;
                
                html += `
                    <div class="p-md fundo-branco raio-sm borda-1 borda-solida borda-sucesso" style="border-left-width: 4px;">
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

            const containerBotoes = document.getElementById('container-botoes-importacao-paroquias');
            
            if (validos.length > 0) {
                window._dadosImportacaoParoquiasPendentes = validos;
                containerBotoes.innerHTML = `
                    <button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-regular transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3 md-w-total" onclick="Interface.fecharJanela('janela-formulario')">Cancelar</button>
                    <button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-branco fundo-sucesso hover-fundo-sucesso-escuro md-w-total" onclick="efetivarImportacaoExcelParoquias()">Confirmar Importação de ${validos.length} registros</button>
                `;
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