async function renderizarParoquias(conteudo) {
    const paroquias = await bd.obterTodos('paroquias');    
    paroquias.sort((a, b) => (a.nome_paroquia || '').localeCompare(b.nome_paroquia || ''));
    
    let codigoEstrutura = '<div class="fundo-branco borda-padrao raio-md p-md mb-lg">';
    codigoEstrutura += '<div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Paróquias Cadastradas</h2>';
    
    codigoEstrutura += '<div class="flex gap-sm">';
    codigoEstrutura += '<button class="btn btn-secundario" onclick="abrirModalImportacaoParoquias()">Importar Dados</button>';
    codigoEstrutura += '<button class="btn btn-primario" onclick="abrirFormularioParoquia()">+ Nova Paróquia</button>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += '</div>';
    
    codigoEstrutura += Busca.criarCampoBusca('busca-paroquias', 'Buscar por nome ou setor...');

    if (paroquias.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhuma paróquia cadastrada ainda.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-padrao raio-md fundo-branco"><table class="tabela-base" id="tabela-paroquias"><thead><tr>';
        codigoEstrutura += '<th>Nome da Paróquia</th><th>Setor</th><th>Capelas</th><th>Ações</th></tr></thead><tbody>';

        paroquias.forEach((paroquia) => {
            const capelasTxt = Array.isArray(paroquia.capelas) ? paroquia.capelas.join(', ') : (paroquia.capelas || '-');
            
            codigoEstrutura += `<tr>
                    <td class="peso-bold cor-texto-escuro">${paroquia.nome_paroquia}</td>
                    <td class="cor-texto-escuro">${paroquia.setor || '-'}</td>
                    <td class="cor-texto-escuro">${capelasTxt}</td>
                    <td>
                        <div class="flex gap-sm">
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="editarParoquia('${paroquia.id_paroquia}')">Editar</button>
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="excluirParoquia('${paroquia.id_paroquia}')">Excluir</button>
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

function abrirFormularioParoquia() {
    modoEdicao = 'paroquias';
    registroEmEdicao = null;
    document.getElementById('titulo-janela').textContent = 'Nova Paróquia';

    let codigoEstrutura = '<form id="formulario-paroquia" class="grid gap-md" style="grid-template-columns: 1fr;">';
    codigoEstrutura += criarCampoFormulario('Nome da Paróquia', 'text', 'nome_paroquia', '', 'Ex: Paróquia São José', true);
    codigoEstrutura += criarCampoFormulario('Setor', 'text', 'setor', '', 'Ex: Setor Portão');
    codigoEstrutura += criarAreaTexto('Capelas e Comunidades (separadas por vírgula)', 'capelas', '', 3);

    codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md">';
    codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
    codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarParoquia()">Salvar</button>';
    codigoEstrutura += '</div>';
    codigoEstrutura += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
    Interface.abrirJanela('janela-formulario');
}

async function editarParoquia(idParoquia) {
    const paroquia = await bd.obter('paroquias', idParoquia);
    if (paroquia) {
        modoEdicao = 'paroquias';
        registroEmEdicao = idParoquia;
        document.getElementById('titulo-janela').textContent = 'Editar Paróquia';

        const capelasFormatadas = Array.isArray(paroquia.capelas) ? paroquia.capelas.join(', ') : (paroquia.capelas || '');

        let codigoEstrutura = '<form id="formulario-paroquia" class="grid gap-md" style="grid-template-columns: 1fr;">';
        codigoEstrutura += criarCampoFormulario('Nome da Paróquia', 'text', 'nome_paroquia', paroquia.nome_paroquia, '', true);
        codigoEstrutura += criarCampoFormulario('Setor', 'text', 'setor', paroquia.setor || '', 'Ex: Setor Portão');
        codigoEstrutura += criarAreaTexto('Capelas e Comunidades (separadas por vírgula)', 'capelas', capelasFormatadas, 3);

        codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md">';
        codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
        codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarParoquia()">Atualizar</button>';
        codigoEstrutura += '</div>';
        codigoEstrutura += '</form>';

        document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
        Interface.abrirJanela('janela-formulario');
    }
}

async function excluirParoquia(idParoquia) {
    if (confirm('Deseja realmente excluir esta paróquia?')) {
        await bd.excluir('paroquias', idParoquia);
        Utilidades.notificacao('Paróquia excluída com sucesso!', 'sucesso');
        renderizarAbaAtual();
    }
}

async function salvarParoquia() {
    const nome_paroquia = document.getElementById('nome_paroquia').value.trim();
    const setor = document.getElementById('setor').value.trim();
    const capelasRaw = document.getElementById('capelas').value.trim();

    if (!nome_paroquia) {
        Utilidades.notificacao('O nome da paróquia é obrigatório.', 'erro');
        return;
    }

    const capelasArray = capelasRaw ? capelasRaw.split(/[,;]/).map(c => c.trim()).filter(c => c) : [];

    const paroquia = {
        id_paroquia: registroEmEdicao || Utilidades.gerarId(),
        nome_paroquia,
        setor,
        capelas: capelasArray
    };

    await bd.salvar('paroquias', paroquia);
    Utilidades.notificacao(registroEmEdicao ? 'Paróquia atualizada!' : 'Paróquia salva com sucesso!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}

window.atualizarSeletorCapelas = async function(capelaSelecionada = '') {
    const seletorParoquia = document.getElementById('id_paroquia');
    const containerCapela = document.getElementById('recipiente-seletor-capela');
    
    if (!seletorParoquia || !containerCapela) return;
    
    const idParoquia = seletorParoquia.value;
    let opcoes = [];
    
    if (idParoquia) {
        const paroquia = await bd.obter('paroquias', idParoquia);
        if (paroquia && paroquia.capelas) {
            const capelasArray = Array.isArray(paroquia.capelas) ? paroquia.capelas : paroquia.capelas.split(/[,;]/).map(c => c.trim()).filter(c => c);
            opcoes = capelasArray.map(c => ({ id: c, nome: c }));
        }
    }
    
    if (typeof criarSeletor === 'function') {
        containerCapela.innerHTML = criarSeletor('Capela / Comunidade', 'capela', opcoes, capelaSelecionada, true);
    }
};

function abrirModalImportacaoParoquias() {
    document.getElementById('titulo-janela').textContent = 'Importar Paróquias';
    
    let codigoEstrutura = `
        <div class="flex flex-coluna gap-md">
            <div class="p-md fundo-secundario borda-padrao raio-sm texto-sm">
                <p class="peso-bold mb-xs cor-texto-escuro">Instruções para importação:</p>
                <ul style="padding-left: 1.5rem; list-style-type: disc; margin-top: 8px; margin-bottom: 0;">
                    <li style="margin-bottom: 4px;">Coluna <strong>obrigatória</strong>: <code>Paroquia</code> (ou Matriz / Nome).</li>
                    <li style="margin-bottom: 4px;">Colunas opcionais: <code>Setor</code> e <code>Capelas</code>.</li>
                    <li>Na mesma célula, separe as capelas por vírgula (ex: <i>"São José, Santa Luzia"</i>).</li>
                </ul>
            </div>
            
            <div class="mt-sm mb-sm">
                <input type="file" id="arquivo-excel-paroquias" accept=".xlsx, .xls" style="display: none;" onchange="window.atualizarRotuloArquivoParoquia(this)" />
                <label for="arquivo-excel-paroquias" class="btn btn-secundario largura-total">
                    <span id="texto-arquivo-paroquias-selecionado">Selecione um arquivo para importação</span>
                </label>
            </div>
            
            <div id="resultado-validacao-paroquias" class="oculto"></div>

            <div class="flex justifica-fim gap-md pt-md borda-topo mt-sm">
                <button type="button" class="btn btn-secundario" onclick="Interface.fecharJanela('janela-formulario')">Cancelar</button>
                <button type="button" class="btn btn-primario" id="btn-processar-excel-paroquias" onclick="processarPlanilhaParoquias()">Validar Planilha</button>
            </div>
        </div>
    `;

    document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
    Interface.abrirJanela('janela-formulario');
}

window.atualizarRotuloArquivoParoquia = function(input) {
    const span = document.getElementById('texto-arquivo-paroquias-selecionado');
    if (input.files && input.files.length > 0) {
        span.innerHTML = '<strong>Arquivo selecionado:</strong> ' + input.files[0].name;
    } else {
        span.textContent = 'Selecione um arquivo para importação';
    }
};

function normalizarTextoParoquia(texto) {
    if (!texto) return "";
    return texto.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function processarPlanilhaParoquias() {
    const inputArquivo = document.getElementById('arquivo-excel-paroquias');
    if (!inputArquivo.files.length) {
        Utilidades.notificacao('Primeiro selecione um arquivo Excel.', 'erro');
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

            await validarDadosPlanilhaParoquias(linhas);

        } catch (erro) {
            console.error(erro);
            Utilidades.notificacao('Erro ao ler planilha. Verifique o formato.', 'erro');
        }
    };

    leitor.readAsArrayBuffer(arquivo);
}

async function validarDadosPlanilhaParoquias(linhasExcel) {
    const paroquiasExistentes = await bd.obterTodos('paroquias');
    const mapaParoquias = new Map(paroquiasExistentes.map(p => [normalizarTextoParoquia(p.nome_paroquia), p]));

    const registrosValidos = [];
    const erros = [];
    const avisos = [];

    linhasExcel.forEach((linha, index) => {
        const linhaNum = index + 2; 
        
        const nomePlanilha = linha.Paroquia || linha.PAROQUIA || linha.paroquia || linha['Paróquia'] || linha.Matriz || linha.Nome || linha.nome;
        const setorPlanilha = linha.Setor || linha.SETOR || linha.setor || '';
        const capelasPlanilha = linha.Capelas || linha.CAPELAS || linha.capelas || linha.Capela || linha.capela || linha.Comunidades;

        if (!nomePlanilha) {
            erros.push(`Linha ${linhaNum}: Nome da paróquia/matriz não foi informado.`);
            return;
        }

        let listaCapelasNessaLinha = [];
        if (capelasPlanilha) {
            listaCapelasNessaLinha = capelasPlanilha.toString().split(/[,;]/).map(c => c.trim()).filter(c => c);
        }

        const paroquiaExistente = mapaParoquias.get(normalizarTextoParoquia(nomePlanilha));

        if (paroquiaExistente) {
            let capelasAtuais = Array.isArray(paroquiaExistente.capelas) 
                ? paroquiaExistente.capelas 
                : (paroquiaExistente.capelas ? [paroquiaExistente.capelas] : []);
            
            const novasCapelas = listaCapelasNessaLinha.filter(c => 
                !capelasAtuais.some(atual => normalizarTextoParoquia(atual) === normalizarTextoParoquia(c))
            );
            
            const atualizarSetor = setorPlanilha && setorPlanilha.toString().trim() !== (paroquiaExistente.setor || '');

            if (novasCapelas.length > 0 || atualizarSetor) {
                registrosValidos.push({
                    id_paroquia: paroquiaExistente.id_paroquia,
                    nome_paroquia: paroquiaExistente.nome_paroquia,
                    setor: setorPlanilha || paroquiaExistente.setor,
                    capelas: [...capelasAtuais, ...novasCapelas],
                    _isUpdate: true
                });
            } else {
                avisos.push(`Linha ${linhaNum}: A paróquia "${nomePlanilha.trim()}" (e capelas/setor) já consta no sistema, de forma idêntica.`);
            }
        } else {
            registrosValidos.push({
                id_paroquia: Utilidades.gerarId(),
                nome_paroquia: nomePlanilha.toString().trim(),
                setor: setorPlanilha ? setorPlanilha.toString().trim() : '',
                capelas: listaCapelasNessaLinha,
                _isUpdate: false
            });
        }
    });

    exibirResultadoValidacaoParoquias(registrosValidos, erros, avisos);
}

function exibirResultadoValidacaoParoquias(validos, erros, avisos) {
    const divResultado = document.getElementById('resultado-validacao-paroquias');
    divResultado.classList.remove('oculto');
    
    let html = '';

    if (erros.length > 0) {
        html += `
            <div class="p-md borda-erro fundo-branco raio-sm mb-md borda-esquerda-grossa">
                <h4 class="texto-erro peso-bold mb-sm">Atenção: ${erros.length} erros encontrados</h4>
                <ul class="cor-texto-escuro texto-sm max-altura-rolagem" style="max-height: 120px; overflow-y: auto; padding-left: 1.5rem; list-style-type: disc;">
                    ${erros.map(e => `<li>${e}</li>`).join('')}
                </ul>
                <p class="texto-sm mt-sm">Corrija estes erros e tente novamente.</p>
            </div>
        `;
    }

    if (avisos.length > 0) {
        html += `
            <div class="p-md borda-aviso fundo-branco raio-sm mb-md borda-esquerda-grossa">
                <h4 class="texto-aviso peso-bold mb-sm">Notas informativas: ${avisos.length} linhas ignoradas</h4>
                <ul class="cor-texto-escuro texto-sm max-altura-rolagem" style="max-height: 100px; overflow-y: auto; padding-left: 1.5rem; list-style-type: disc;">
                    ${avisos.map(a => `<li>${a}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    if (validos.length > 0) {
        const novos = validos.filter(v => !v._isUpdate).length;
        const atualizacoes = validos.filter(v => v._isUpdate).length;

        html += `
            <div class="p-md borda-sucesso fundo-branco raio-sm borda-esquerda-grossa">
                <h4 class="texto-sucesso peso-bold mb-sm">Planilha validada com sucesso!</h4>
                <p class="texto-sm cor-texto-escuro">
                    Pronto para incluir <strong>${novos}</strong> paróquias e atualizar <strong>${atualizacoes}</strong> registros já existentes.
                </p>
            </div>
        `;
    }

    divResultado.innerHTML = html;

    const containerBotoes = divResultado.nextElementSibling;
    if (validos.length > 0) {
        window._dadosImportacaoParoquiasPendentes = validos;
        containerBotoes.innerHTML = `
            <button type="button" class="btn btn-secundario" onclick="Interface.fecharJanela('janela-formulario')">Cancelar</button>
            <button type="button" class="btn btn-sucesso" onclick="efetivarImportacaoExcelParoquias()">Confirmar Importação de ${validos.length} Paróquias</button>
        `;
    } else {
        containerBotoes.innerHTML = `
            <button type="button" class="btn btn-secundario" onclick="Interface.fecharJanela('janela-formulario')">Fechar</button>
        `;
    }
}

async function efetivarImportacaoExcelParoquias() {
    const dados = window._dadosImportacaoParoquiasPendentes;
    if (!dados || dados.length === 0) return;

    let processadosComSucesso = 0;

    for (const paroquia of dados) {
        try {
            const dadosParaSalvar = {
                id_paroquia: paroquia.id_paroquia,
                nome_paroquia: paroquia.nome_paroquia,
                setor: paroquia.setor,
                capelas: paroquia.capelas
            };
            
            await bd.salvar('paroquias', dadosParaSalvar);
            processadosComSucesso++;
        } catch (e) {
            console.error("Erro ao salvar paróquia via importação:", paroquia, e);
        }
    }

    window._dadosImportacaoParoquiasPendentes = null;
    Utilidades.notificacao(`${processadosComSucesso} paróquias atualizadas com sucesso!`, 'sucesso');
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual(); 
}