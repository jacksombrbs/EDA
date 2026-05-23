async function renderizarParticipantes(conteudo) {
    const participantes = await bd.obterTodos('participantes');
    const paroquias = await bd.obterTodos('paroquias');
    
    participantes.sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));
    
    let codigoEstrutura = '<div class="fundo-branco borda-1 borda-solida borda-cor-padrao raio-md p-md mb-lg">';
    codigoEstrutura += '<div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Participantes Cadastrados</h2>';
    
    codigoEstrutura += '<div class="flex gap-sm md-flex-coluna md-w-total">';
    codigoEstrutura += '<button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-medium transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3 md-w-total" onclick="abrirModalImportacao()">Importar Dados</button>';
    codigoEstrutura += '<button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-medium transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 hover-fundo-marca-escuro md-w-total" onclick="abrirFormularioParticipante()">+ Novo Participante</button>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += '</div>';

    codigoEstrutura += Busca.criarCampoBusca('busca-participantes', 'Buscar por nome...');

    if (participantes.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhum participante cadastrado ainda.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-1 borda-solida borda-cor-padrao raio-md overflow-hidden pos-relativa"><table class="w-total borda-colapso texto-md" id="tabela-participantes"><thead><tr>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Nome</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Código</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Paróquia</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Status</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Ações</th></tr></thead><tbody>';

        participantes.forEach((participante, index) => {
            const paroquia = paroquias.find(p => p.id_paroquia === participante.id_paroquia);
            const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
            
            let statusBadge = '<span class="cor-texto-escuro peso-bold">Ativo</span>';
            if (participante.status_participante === 'Desistente') {
                statusBadge = '<span class="cor-texto-claro peso-bold">Desistente</span>';
            }

            codigoEstrutura += `<tr class="${classeFundo} transicao hover-fundo-superficie-3">
                    <td class="p-md texto-esquerda peso-bold cor-texto-escuro">${participante.nome_participante}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${participante.codigo_acesso || '-'}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${paroquia ? paroquia.nome_paroquia : '-'}</td>
                    <td class="p-md texto-esquerda">${statusBadge}</td>
                    <td class="p-md texto-esquerda">
                        <div class="flex gap-sm">
                            <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-escuro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="editarParticipante('${participante.id_participante}')">Editar</button>
                            <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-erro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="excluirParticipante('${participante.id_participante}')">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });

        codigoEstrutura += '</tbody></table></div>';
    }
    codigoEstrutura += '</div>';

    conteudo.innerHTML = codigoEstrutura;

    document.getElementById('busca-participantes')?.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        const linhas = document.querySelectorAll('#tabela-participantes tbody tr');
        linhas.forEach(linha => {
            const texto = linha.textContent.toLowerCase();
            linha.classList.toggle('oculto', !texto.includes(termo));
        });
    });
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
    formHTML += '<div class="flex-1">' + criarSeletor('Status', 'status_participante', opcoesStatus, p.status_participante || 'Ativo', true) + '</div>';
    formHTML += '</div>';

    formHTML += '<div class="flex gap-md md-flex-coluna">';
    formHTML += '<div class="flex-1">' + criarSeletor('Paróquia de Origem', 'id_paroquia', paroquias.map(pq => ({ id: pq.id_paroquia, nome: pq.nome_paroquia })), p.id_paroquia || '', true) + '</div>';
    formHTML += '<div class="flex-1" id="recipiente-seletor-capela">';
    formHTML += criarSeletor('Capela / Comunidade', 'capela', [], '', true);
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
    formHTML += '<div class="flex-1">' + criarCampoFormulario('Nascimento', 'date', 'data_nascimento', p.data_nascimento || '', '', true) + '</div>';
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
        formHTML += `<div class="p-md fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm mt-xs">Código de Acesso do Aluno: <strong>${p.codigo_acesso || '-'}</strong></div>`;
    }

    formHTML += '<div class="flex justifica-fim gap-md pt-md w-total">';
    formHTML += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-regular transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3" onclick="Interface.fecharJanela(\'janela-formulario\')">Cancelar</button>';
    formHTML += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-regular transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 sombra-1 hover-fundo-marca-escuro" onclick="salvarParticipante()">' + (idParticipante ? 'Atualizar' : 'Salvar') + '</button>';
    formHTML += '</div>';

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
        recipienteCapela.innerHTML = criarSeletor('Capela / Comunidade', 'capela', [], capelaSelecionada, true);
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

        recipienteCapela.innerHTML = criarSeletor('Capela / Comunidade', 'capela', opcoesCapelas, capelaSelecionada, true);
        
    } catch (erro) {
        console.error('Erro ao buscar capelas:', erro);
        recipienteCapela.innerHTML = criarSeletor('Capela / Comunidade', 'capela', [], capelaSelecionada, true);
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

async function salvarParticipante() {
    const nome_participante = document.getElementById('nome_participante').value.trim();

    if (!nome_participante) {
        Utilidades.notificacao('O nome do participante é obrigatório.', 'erro');
        return;
    }

    const participante = {
        id_participante: registroEmEdicaoParticipante || Utilidades.gerarId(),
        nome_participante,
        cpf: document.getElementById('cpf').value,
        rg: document.getElementById('rg').value,
        data_nascimento: document.getElementById('data_nascimento').value,
        email: document.getElementById('email').value,
        telefone: document.getElementById('telefone').value,
        endereco: document.getElementById('endereco').value,
        bairro: document.getElementById('bairro').value,
        cidade: document.getElementById('cidade').value,
        estado: document.getElementById('estado').value,
        status_participante: document.getElementById('status_participante').value,
        id_paroquia: document.getElementById('id_paroquia').value,
        capela: document.getElementById('capela')?.value || '',
        id_curso: document.getElementById('id_curso').value,
        codigo_acesso: registroEmEdicaoParticipante ? undefined : Math.floor(100000 + Math.random() * 900000).toString()
    };

    if (registroEmEdicaoParticipante) {
        const pAntigo = await bd.obter('participantes', registroEmEdicaoParticipante);
        if (pAntigo) participante.codigo_acesso = pAntigo.codigo_acesso;
    }

    await bd.salvar('participantes', participante);
    Utilidades.notificacao(registroEmEdicaoParticipante ? 'Participante atualizado!' : 'Participante salvo com sucesso!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}

function abrirModalImportacao() {
    document.getElementById('titulo-janela').textContent = 'Importar Participantes (Excel/CSV)';
    
    let codigoEstrutura = `
        <div class="flex flex-coluna gap-md">
            
            <div class="p-md fundo-branco borda-1 borda-solida borda-cor-padrao raio-sm texto-md">
                <p class="peso-bold mb-xs cor-texto-primario">Instruções para a sua planilha:</p>
                <p class="mb-sm cor-texto-escuro">A primeira linha deve conter <strong>exatamente</strong> os seguintes cabeçalhos (respeite a grafia e não use acentos):</p>
                <p class="mb-xs"><strong class="cor-texto-erro">Obrigatórios:</strong> <code class="fundo-superficie-2 p-xs raio-xxs borda-1 borda-solida borda-cor-padrao">Nome</code>, <code class="fundo-superficie-2 p-xs raio-xxs borda-1 borda-solida borda-cor-padrao">Curso</code>, <code class="fundo-superficie-2 p-xs raio-xxs borda-1 borda-solida borda-cor-padrao">Paroquia</code></p>
                <p class="texto-sm cor-texto-claro"><strong class="cor-texto-escuro">Opcionais:</strong> <code class="fundo-superficie-2 p-xs raio-xxs borda-1 borda-solida borda-cor-padrao">CPF</code>, <code class="fundo-superficie-2 p-xs raio-xxs borda-1 borda-solida borda-cor-padrao">RG</code>, <code class="fundo-superficie-2 p-xs raio-xxs borda-1 borda-solida borda-cor-padrao">Nascimento</code>, <code class="fundo-superficie-2 p-xs raio-xxs borda-1 borda-solida borda-cor-padrao">Email</code>, <code class="fundo-superficie-2 p-xs raio-xxs borda-1 borda-solida borda-cor-padrao">Telefone</code>, <code class="fundo-superficie-2 p-xs raio-xxs borda-1 borda-solida borda-cor-padrao">Endereco</code>, <code class="fundo-superficie-2 p-xs raio-xxs borda-1 borda-solida borda-cor-padrao">Bairro</code>, <code class="fundo-superficie-2 p-xs raio-xxs borda-1 borda-solida borda-cor-padrao">Cidade</code>, <code class="fundo-superficie-2 p-xs raio-xxs borda-1 borda-solida borda-cor-padrao">Estado</code>, <code class="fundo-superficie-2 p-xs raio-xxs borda-1 borda-solida borda-cor-padrao">Capela</code>, <code class="fundo-superficie-2 p-xs raio-xxs borda-1 borda-solida borda-cor-padrao">Status</code></p>
            </div>
            
            <div class="flex itens-centro md-flex-coluna gap-md p-md fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm mt-xs mb-xs">
                <label for="arquivo-excel" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-medium transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 hover-fundo-marca-escuro sombra-1 w-total max-w-240 md-max-w-total">
                    <span class="icone-inline">&#xE8E5;</span> Escolher Arquivo
                </label>
                <input type="file" id="arquivo-excel" accept=".xlsx, .xls, .csv" class="oculto" onchange="atualizarRotuloArquivo(this)" />
                <span id="texto-arquivo-selecionado" class="texto-md cor-texto-escuro peso-medium md-texto-centro">Nenhum arquivo selecionado</span>
            </div>
            
            <div id="resultado-validacao" class="oculto"></div>

            <div class="flex justifica-fim gap-md mt-lg md-flex-coluna" id="container-botoes-importacao">
                <button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-regular transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3 md-w-total" onclick="Interface.fecharJanela('janela-formulario')">Cancelar</button>
                <button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 hover-fundo-marca-escuro md-w-total" id="btn-processar-excel" onclick="processarPlanilha()">Validar Planilha</button>
            </div>
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
                    Pronto para incluir <strong>${novos}</strong> novos participantes e atualizar <strong>${atualizacoes}</strong> registros já existentes.
                </p>
            </div>
        `;
    } else {
        html += '<p class="texto-sm cor-texto-erro">Nenhum registro válido encontrado para importar.</p>';
    }

    divResultado.innerHTML = html;

    const containerBotoes = document.getElementById('container-botoes-importacao');
    if (validos.length > 0) {
        dadosImportacaoPendentesParticipantes = validos;
        containerBotoes.innerHTML = `
            <button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-regular transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3 md-w-total" onclick="Interface.fecharJanela('janela-formulario')">Cancelar</button>
            <button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-branco fundo-sucesso hover-fundo-sucesso-escuro md-w-total" onclick="efetivarImportacaoExcelParticipantes()">Confirmar Importação de ${validos.length} alunos</button>
        `;
    } else {
        containerBotoes.innerHTML = `
            <button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-regular transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3 md-w-total" onclick="Interface.fecharJanela('janela-formulario')">Fechar</button>
        `;
    }
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