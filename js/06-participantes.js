async function renderizarParticipantes(conteudo) {
    const participantes = await bd.obterTodos('participantes');
    const paroquias = await bd.obterTodos('paroquias');    
    participantes.sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));
    
    let codigoEstrutura = '<div class="fundo-branco borda-padrao raio-md p-md mb-lg"><div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Participantes Cadastrados</h2>';
    
    codigoEstrutura += '<div class="flex gap-sm">';
    codigoEstrutura += '<button class="btn btn-secundario" onclick="abrirModalImportacao()">Importar Dados</button>';
    codigoEstrutura += '<button class="btn btn-primario" onclick="abrirFormularioParticipante()">+ Novo Participante</button>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += '</div>';

    codigoEstrutura += Busca.criarCampoBusca('busca-participantes', 'Buscar por nome...');

    if (participantes.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhum participante cadastrado ainda.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-padrao raio-md fundo-branco"><table class="tabela-base" id="tabela-participantes"><thead><tr>';
        codigoEstrutura += '<th>Nome</th><th>Código</th><th>Paróquia</th><th>Estado</th><th>Ações</th></tr></thead><tbody>';

        participantes.forEach((participante) => {
            const paroquia = paroquias.find(p => p.id_paroquia === participante.id_paroquia);
            codigoEstrutura += `<tr>
                    <td class="peso-bold cor-texto-escuro">${participante.nome_participante}</td>
                    <td class="cor-texto-escuro"><strong>${participante.codigo_acesso || '-'}</strong></td>
                    <td class="cor-texto-escuro">${paroquia ? paroquia.nome_paroquia : '-'}</td>
                    <td class="cor-texto-escuro">${participante.estado || '-'}</td>
                    <td>
                        <div class="flex gap-sm">
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="editarParticipante('${participante.id_participante}')">Editar</button>
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="excluirParticipante('${participante.id_participante}')">Excluir</button>
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

function abrirFormularioParticipante() {
    modoEdicao = 'participantes';
    registroEmEdicao = null;
    document.getElementById('titulo-janela').textContent = 'Novo Participante';

    Promise.all([bd.obterTodos('paroquias'), bd.obterTodos('cursos')]).then(([paroquias, cursos]) => {
        let codigoEstrutura = '<form id="formulario-participante" class="grid grid-auto-adaptavel gap-md">';
        codigoEstrutura += criarCampoFormulario('Nome Completo', 'text', 'nome_participante', '', '', true);
        codigoEstrutura += criarCampoFormulario('CPF', 'text', 'cpf', '', '000.000.000-00');
        codigoEstrutura += criarCampoFormulario('RG', 'text', 'rg', '');
        codigoEstrutura += criarCampoFormulario('Data de Nascimento', 'date', 'data_nascimento', '', '', true);
        codigoEstrutura += criarCampoFormulario('Email', 'email', 'email', 'exemplo@email.com');
        codigoEstrutura += criarCampoFormulario('Telefone / WhatsApp', 'tel', 'telefone', '(00) 00000-0000');
        codigoEstrutura += criarCampoFormulario('Endereço (Rua, Nº)', 'text', 'endereco', '');
        codigoEstrutura += criarCampoFormulario('Bairro', 'text', 'bairro', '');
        codigoEstrutura += criarCampoFormulario('Cidade', 'text', 'cidade', 'Curitiba');
        codigoEstrutura += criarCampoFormulario('Estado (UF)', 'text', 'estado', 'PR');
        codigoEstrutura += criarSeletor('Paróquia de Origem', 'id_paroquia', paroquias.map(p => ({ id: p.id_paroquia, nome: p.nome_paroquia })), '', true);
        codigoEstrutura += `<div id="recipiente-seletor-capela">`;
        codigoEstrutura += criarSeletor('Capela / Comunidade', 'capela', [], '', true);
        codigoEstrutura += `</div>`;
        codigoEstrutura += criarSeletor('Curso / Turma Matriculada', 'id_curso', cursos.map(c => ({ id: c.id_curso, nome: c.nome_curso })), '', true);
        codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
        codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
        codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarParticipante()">Salvar</button>';
        codigoEstrutura += '</div>';

        codigoEstrutura += '</form>';

        document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;

        setTimeout(() => {
            const seletorParoquia = document.getElementById('id_paroquia');
            if (seletorParoquia) {
                seletorParoquia.addEventListener('change', () => window.atualizarSeletorCapelas());
            }
        }, 50);

        Interface.abrirJanela('janela-formulario');
    });
}

async function editarParticipante(idParticipante) {
    const participante = await bd.obter('participantes', idParticipante);
    if (participante) {
        const [paroquias, cursos] = await Promise.all([bd.obterTodos('paroquias'), bd.obterTodos('cursos')]);

        modoEdicao = 'participantes';
        registroEmEdicao = idParticipante;
        document.getElementById('titulo-janela').textContent = 'Editar Participante';
        let codigoEstrutura = '<form id="formulario-participante" class="grid grid-auto-adaptavel gap-md">';
        codigoEstrutura += criarCampoFormulario('Nome Completo', 'text', 'nome_participante', participante.nome_participante, '', true);
        codigoEstrutura += criarCampoFormulario('CPF', 'text', 'cpf', participante.cpf || '');
        codigoEstrutura += criarCampoFormulario('RG', 'text', 'rg', participante.rg || '');
        codigoEstrutura += criarCampoFormulario('Data de Nascimento', 'date', 'data_nascimento', participante.data_nascimento || '', '', true);
        codigoEstrutura += criarCampoFormulario('Email', 'email', 'email', participante.email || '');
        codigoEstrutura += criarCampoFormulario('Telefone / WhatsApp', 'tel', 'telefone', participante.telefone || '');
        codigoEstrutura += criarCampoFormulario('Endereço (Rua, Nº)', 'text', 'endereco', participante.endereco || '');
        codigoEstrutura += criarCampoFormulario('Bairro', 'text', 'bairro', participante.bairro || '');
        codigoEstrutura += criarCampoFormulario('Cidade', 'text', 'cidade', participante.cidade || '');
        codigoEstrutura += criarCampoFormulario('Estado (UF)', 'text', 'estado', participante.estado || '');
        codigoEstrutura += criarSeletor('Paróquia de Origem', 'id_paroquia', paroquias.map(p => ({ id: p.id_paroquia, nome: p.nome_paroquia })), participante.id_paroquia, true);
        codigoEstrutura += `<div id="recipiente-seletor-capela" style="grid-column: 1 / -1;">`;
        codigoEstrutura += criarSeletor('Capela / Comunidade', 'capela', [], '', true);
        codigoEstrutura += `</div>`;
        codigoEstrutura += criarSeletor('Curso / Turma Matriculada', 'id_curso', cursos.map(c => ({ id: c.id_curso, nome: c.nome_curso })), participante.id_curso, true);
        codigoEstrutura += `<div class="p-md fundo-secundario borda-padrao raio-sm mt-md" style="grid-column: 1 / -1;">Código de Acesso do Aluno: <strong>${participante.codigo_acesso || '-'}</strong></div>`;
        codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
        codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
        codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarParticipante()">Atualizar</button>';
        codigoEstrutura += '</div>';

        codigoEstrutura += '</form>';

        document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;

        const seletorParoquia = document.getElementById('id_paroquia');
        if (seletorParoquia) {
            seletorParoquia.addEventListener('change', () => window.atualizarSeletorCapelas());
        }

        if (typeof window.atualizarSeletorCapelas === 'function') {
            await window.atualizarSeletorCapelas(participante.capela || '');
        }

        Interface.abrirJanela('janela-formulario');
    }
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
        id_participante: registroEmEdicao || Utilidades.gerarId(),
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
        id_paroquia: document.getElementById('id_paroquia').value,
        capela: document.getElementById('capela')?.value || '',
        id_curso: document.getElementById('id_curso').value,
        codigo_acesso: registroEmEdicao ? undefined : Math.floor(100000 + Math.random() * 900000).toString()
    };

    if (registroEmEdicao) {
        const pAntigo = await bd.obter('participantes', registroEmEdicao);
        if (pAntigo) participante.codigo_acesso = pAntigo.codigo_acesso;
    }

    await bd.salvar('participantes', participante);
    Utilidades.notificacao(registroEmEdicao ? 'Participante atualizado!' : 'Participante salvo com sucesso!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}

function abrirModalImportacao() {
    document.getElementById('titulo-janela').textContent = 'Importar Participantes';
    
    let codigoEstrutura = `
        <div class="flex flex-coluna gap-md">
            <div class="p-md fundo-secundario borda-padrao raio-sm texto-sm">
                <p class="peso-bold mb-xs cor-texto-escuro">Instruções para importação:</p>
                <ul style="padding-left: 1.5rem; list-style-type: disc; margin-top: 8px; margin-bottom: 0;">
                    <li style="margin-bottom: 4px;">Sua planilha deve ter cabeçalhos exatos na primeira linha.</li>
                    <li style="margin-bottom: 4px;">Colunas <strong>obrigatórias</strong>: Nome, Curso, Paroquia.</li>
                    <li>Colunas opcionais: CPF, RG, Nascimento, Email, Telefone, Endereço, Bairro, Cidade, Estado e Capela.</li>
                </ul>
            </div>
            
            <div class="mt-sm mb-sm">
                <input type="file" id="arquivo-excel" accept=".xlsx, .xls" style="display: none;" onchange="window.atualizarRotuloArquivo(this)" />
                <label for="arquivo-excel" class="btn btn-secundario largura-total">
                    <span id="texto-arquivo-selecionado">Selecione um arquivo para importação</span>
                </label>
            </div>
            
            <div id="resultado-validacao" class="oculto"></div>

            <div class="flex justifica-fim gap-md pt-md borda-topo mt-sm">
                <button type="button" class="btn btn-secundario" onclick="Interface.fecharJanela('janela-formulario')">Cancelar</button>
                <button type="button" class="btn btn-primario" id="btn-processar-excel" onclick="processarPlanilha()">Validar Planilha</button>
            </div>
        </div>
    `;

    document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
    Interface.abrirJanela('janela-formulario');
}

window.atualizarRotuloArquivo = function(input) {
    const span = document.getElementById('texto-arquivo-selecionado');
    if (input.files && input.files.length > 0) {
        span.innerHTML = '<strong>Arquivo selecionado:</strong> ' + input.files[0].name;
    } else {
        span.textContent = 'Selecione um arquivo para importação';
    }
};

const normalizarTexto = (texto) => {
    if (!texto) return "";
    return texto.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

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
        
        const nomePlanilha = linha.Nome || linha.NOME || linha.nome;
        const cursoPlanilha = linha.Curso || linha.CURSO || linha.curso;
        const paroquiaPlanilha = linha.Paroquia || linha.PAROQUIA || linha.paroquia || linha['Paróquia'];

        if (!nomePlanilha) {
            erros.push(`Linha ${linhaNum}: Nome do participante em branco.`);
            return;
        }
        if (!cursoPlanilha) {
            erros.push(`Linha ${linhaNum}: (${nomePlanilha}) Curso não informado.`);
            return;
        }
        if (!paroquiaPlanilha) {
            erros.push(`Linha ${linhaNum}: (${nomePlanilha}) Paróquia não informada.`);
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
                email: linha.Email || linha.EMAIL || participanteExistente.email || '',
                telefone: linha.Telefone || linha.WhatsApp || participanteExistente.telefone || '',
                endereco: linha.Endereco || linha.Endereço || participanteExistente.endereco || '',
                bairro: linha.Bairro || participanteExistente.bairro || '',
                cidade: linha.Cidade || participanteExistente.cidade || 'Curitiba',
                estado: linha.Estado || linha.UF || participanteExistente.estado || 'PR',
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
                email: linha.Email || linha.EMAIL || '',
                telefone: linha.Telefone || linha.WhatsApp || '',
                endereco: linha.Endereco || linha.Endereço || '',
                bairro: linha.Bairro || '',
                cidade: linha.Cidade || 'Curitiba',
                estado: linha.Estado || linha.UF || 'PR',
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
            <div class="p-md borda-erro fundo-branco raio-sm mb-md borda-esquerda-grossa">
                <h4 class="texto-erro peso-bold mb-sm">Atenção: ${erros.length} erros encontrados</h4>
                <ul class="cor-texto-escuro texto-sm max-altura-rolagem" style="max-height: 150px; overflow-y: auto; padding-left: 1.5rem; list-style-type: disc;">
                    ${erros.map(e => `<li>${e}</li>`).join('')}
                </ul>
                <p class="texto-sm mt-sm">Corrija estes erros e tente novamente.</p>
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
                    Pronto para incluir <strong>${novos}</strong> novos participantes e atualizar <strong>${atualizacoes}</strong> registros já existentes.
                </p>
                ${erros.length > 0 ? '<p class="texto-sm texto-aviso mt-xs">Nota: Se você prosseguir, apenas os participantes válidos serão importados.</p>' : ''}
            </div>
        `;
    }

    divResultado.innerHTML = html;

    const containerBotoes = divResultado.nextElementSibling;
    if (validos.length > 0) {
        window._dadosImportacaoPendentes = validos;
        containerBotoes.innerHTML = `
            <button type="button" class="btn btn-secundario" onclick="Interface.fecharJanela('janela-formulario')">Cancelar</button>
            <button type="button" class="btn btn-sucesso" onclick="efetivarImportacaoExcel()">Confirmar Importação de ${validos.length} alunos</button>
        `;
    } else {
        containerBotoes.innerHTML = `
            <button type="button" class="btn btn-secundario" onclick="Interface.fecharJanela('janela-formulario')">Fechar</button>
        `;
    }
}

async function efetivarImportacaoExcel() {
    const dados = window._dadosImportacaoPendentes;
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

    window._dadosImportacaoPendentes = null;
    Utilidades.notificacao(`${salvosComSucesso} participantes processados com sucesso!`, 'sucesso');
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}