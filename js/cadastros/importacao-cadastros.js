function abrirModalImportacaoParoquias() {
    document.getElementById('titulo-janela').textContent = 'Importar Paróquias (Excel/CSV)';

    const codigo = `
        <div class="flex flex-coluna gap-md">
            <div class="p-md fundo-branco borda-1 borda-solida borda-cor-padrao raio-sm texto-md">
                <p class="peso-bold mb-xs cor-texto-primario">Instruções para a sua planilha:</p>
                <p class="mb-sm cor-texto-escuro">A primeira linha deve conter <strong>exatamente</strong> os seguintes cabeçalhos:</p>
                <div class="grupo-cabecalhos-planilha">
                    <div class="linha-cabecalhos-planilha">
                        <strong class="cor-texto-erro">Obrigatórios:</strong>
                        <div class="lista-cabecalhos-planilha"><span class="cabecalho-planilha">Paroquia</span></div>
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

    document.getElementById('conteudo-formulario').innerHTML = codigo;
    Interface.abrirJanela('janela-formulario');
}

function atualizarRotuloArquivoParoquia(input) {
    const texto = document.getElementById('texto-arquivo-selecionado-paroquia');
    if (!texto) return;

    texto.innerHTML = input.files?.length
        ? `<strong>Arquivo:</strong> ${Utilidades.escaparHtml(input.files[0].name)}`
        : 'Nenhum arquivo selecionado';
}

async function processarPlanilhaParoquias() {
    const inputArquivo = document.getElementById('arquivo-excel-paroquia');
    if (!inputArquivo.files || inputArquivo.files.length === 0) {
        Utilidades.notificacao('Selecione um arquivo Excel/CSV primeiro.', 'erro');
        return;
    }

    const leitor = new FileReader();
    leitor.onload = async evento => {
        try {
            const workbook = XLSX.read(evento.target.result, { type: 'binary' });
            const planilha = workbook.Sheets[workbook.SheetNames[0]];
            const linhas = XLSX.utils.sheet_to_json(planilha);

            if (linhas.length === 0) {
                Utilidades.notificacao('A planilha parece estar vazia.', 'aviso');
                return;
            }

            const existentes = await bd.obterTodos('paroquias');
            const validos = [];
            const erros = [];

            linhas.forEach((linha, indice) => {
                const numeroLinha = indice + 2;
                const nome = linha.Paroquia || linha.Paróquia || linha.PAROQUIA;
                const setor = linha.Setor || linha.SETOR || '';
                const capelasTexto = linha.Capelas || linha.CAPELAS || '';

                if (!nome) {
                    erros.push(`Linha ${numeroLinha}: coluna Paroquia em branco.`);
                    return;
                }

                const nomeTexto = nome.toString().trim();
                const existente = existentes.find(paroquia => (paroquia.nome || '').toLowerCase() === nomeTexto.toLowerCase());

                validos.push({
                    id: existente?.id || Utilidades.gerarId(),
                    nome: nomeTexto,
                    setor: setor.toString(),
                    capelas: capelasTexto
                        ? capelasTexto.toString().split(',').map(capela => capela.trim()).filter(Boolean)
                        : [],
                    atualizacao: Boolean(existente)
                });
            });

            exibirResultadoImportacaoParoquias(validos, erros);
        } catch (erro) {
            const resultado = document.getElementById('resultado-validacao-paroquia');
            resultado.innerHTML = '<p class="cor-texto-erro">Erro ao processar o arquivo. Verifique o formato.</p>';
            resultado.classList.remove('oculto');
        }
    };

    leitor.readAsBinaryString(inputArquivo.files[0]);
}

function exibirResultadoImportacaoParoquias(validos, erros) {
    const resultado = document.getElementById('resultado-validacao-paroquia');
    resultado.classList.remove('oculto');

    let html = '';

    if (erros.length > 0) {
        html += `
            <div class="p-md fundo-branco raio-sm mb-md borda-1 borda-solida borda-destaque-erro">
                <h4 class="cor-texto-erro peso-bold mb-sm">Atenção: ${erros.length} erro(s) encontrado(s)</h4>
                <ul class="cor-texto-escuro texto-sm lista-rolagem-pequena">
                    ${erros.map(erro => `<li>${Utilidades.escaparHtml(erro)}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    if (validos.length > 0) {
        const novos = validos.filter(item => !item.atualizacao).length;
        const atualizacoes = validos.filter(item => item.atualizacao).length;

        html += `
            <div class="p-md fundo-branco raio-sm borda-1 borda-solida borda-destaque-sucesso">
                <h4 class="cor-texto-sucesso peso-bold mb-sm">Planilha validada com sucesso!</h4>
                <p class="texto-sm cor-texto-escuro">
                    Pronto para incluir <strong>${novos}</strong> nova(s) paróquia(s) e atualizar <strong>${atualizacoes}</strong> registro(s).
                </p>
            </div>
        `;
        AppEstado.importacaoParoquiasPendentes = validos;

        document.getElementById('recipiente-botoes-importacao-paroquias').outerHTML = criarRodapeFormulario(
            'efetivarImportacaoExcelParoquias()',
            `Confirmar Importação de ${validos.length} registros`,
            {
                id: 'recipiente-botoes-importacao-paroquias',
                classesExtras: 'mt-lg md-flex-coluna',
                varianteSalvar: 'sucesso'
            }
        );
        Interface.decorarBotoesModal();
    } else {
        html += '<p class="texto-sm cor-texto-erro">Nenhum registro válido encontrado.</p>';
    }

    resultado.innerHTML = html;
}

async function efetivarImportacaoExcelParoquias() {
    const dados = AppEstado.importacaoParoquiasPendentes;
    if (!dados || dados.length === 0) return;

    let processados = 0;
    for (const paroquia of dados) {
        await bd.salvar('paroquias', {
            id: paroquia.id,
            nome: paroquia.nome,
            setor: paroquia.setor,
            capelas: paroquia.capelas
        });
        processados++;
    }

    AppEstado.importacaoParoquiasPendentes = [];
    Utilidades.notificacao(`${processados} paróquia(s) processada(s) com sucesso!`, 'sucesso');
    Interface.fecharJanela('janela-formulario');
    await renderizarAbaAtual();
}

function abrirModalImportacao() {
    document.getElementById('titulo-janela').textContent = 'Importar Participantes (Excel/CSV)';

    const codigo = `
        <div class="flex flex-coluna gap-md">
            <div class="p-md fundo-branco borda-1 borda-solida borda-cor-padrao raio-sm texto-md">
                <p class="peso-bold mb-xs cor-texto-primario">Instruções para a sua planilha:</p>
                <p class="mb-sm cor-texto-escuro">A primeira linha deve conter <strong>exatamente</strong> os seguintes cabeçalhos:</p>
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
                id: 'recipiente-botoes-importacao-participantes',
                classesExtras: 'mt-lg md-flex-coluna',
                atributosSalvar: 'id="botao-processar-excel"'
            })}
        </div>
    `;

    document.getElementById('conteudo-formulario').innerHTML = codigo;
    Interface.abrirJanela('janela-formulario');
}

function atualizarRotuloArquivo(input) {
    const texto = document.getElementById('texto-arquivo-selecionado');
    if (!texto) return;

    texto.innerHTML = input.files?.length
        ? `<strong>Arquivo:</strong> ${Utilidades.escaparHtml(input.files[0].name)}`
        : 'Nenhum arquivo selecionado';
}

async function processarPlanilha() {
    const inputArquivo = document.getElementById('arquivo-excel');
    if (!inputArquivo.files || inputArquivo.files.length === 0) {
        Utilidades.notificacao('Selecione um arquivo Excel/CSV primeiro.', 'erro');
        return;
    }

    const leitor = new FileReader();
    leitor.onload = async evento => {
        try {
            const workbook = XLSX.read(evento.target.result, { type: 'binary' });
            const planilha = workbook.Sheets[workbook.SheetNames[0]];
            const linhas = XLSX.utils.sheet_to_json(planilha);

            if (linhas.length === 0) {
                Utilidades.notificacao('A planilha parece estar vazia.', 'aviso');
                return;
            }

            const resultado = await validarDadosPlanilha(linhas);
            exibirResultadoValidacao(resultado.validos, resultado.erros);
        } catch (erro) {
            const resultado = document.getElementById('resultado-validacao');
            resultado.innerHTML = '<p class="cor-texto-erro">Erro ao processar o arquivo. Verifique o formato.</p>';
            resultado.classList.remove('oculto');
        }
    };

    leitor.readAsBinaryString(inputArquivo.files[0]);
}

function normalizarTextoImportacao(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

async function validarDadosPlanilha(linhasExcel) {
    const [cursos, paroquias, participantesExistentes] = await Promise.all([
        bd.obterTodos('cursos'),
        bd.obterTodos('paroquias'),
        bd.obterTodos('participantes')
    ]);

    const mapaCursos = new Map(cursos.map(curso => [normalizarTextoImportacao(curso.nome), curso.id]));
    const mapaParoquias = new Map(paroquias.map(paroquia => [normalizarTextoImportacao(paroquia.nome), paroquia.id]));
    const validos = [];
    const erros = [];

    linhasExcel.forEach((linha, indice) => {
        const numeroLinha = indice + 2;
        const nome = linha.Nome || linha.NOME || '';
        const cursoTexto = linha.Curso || linha.CURSO || '';
        const paroquiaTexto = linha.Paroquia || linha.Paróquia || linha.PAROQUIA || '';

        if (!nome || !cursoTexto || !paroquiaTexto) {
            erros.push(`Linha ${numeroLinha}: Nome, Curso e Paroquia são obrigatórios.`);
            return;
        }

        const idCurso = mapaCursos.get(normalizarTextoImportacao(cursoTexto));
        const idParoquia = mapaParoquias.get(normalizarTextoImportacao(paroquiaTexto));

        if (!idCurso) erros.push(`Linha ${numeroLinha}: curso não encontrado (${cursoTexto}).`);
        if (!idParoquia) erros.push(`Linha ${numeroLinha}: paróquia não encontrada (${paroquiaTexto}).`);
        if (!idCurso || !idParoquia) return;

        const existente = participantesExistentes.find(participante =>
            normalizarTextoImportacao(participante.nome) === normalizarTextoImportacao(nome)
            && String(participante.id_curso) === String(idCurso)
        );

        validos.push({
            id: existente?.id || Utilidades.gerarId(),
            nome: nome.toString().trim(),
            status: (linha.Status || linha.STATUS || 'Ativo').toString().trim() || 'Ativo',
            id_paroquia: idParoquia,
            capela: (linha.Capela || linha.CAPELA || '').toString().trim(),
            id_curso: idCurso,
            email: (linha.Email || linha.EMAIL || '').toString().trim(),
            telefone: (linha.Telefone || linha.TELEFONE || '').toString().trim(),
            cpf: (linha.CPF || '').toString().trim(),
            rg: (linha.RG || '').toString().trim(),
            data_nascimento: linha.Nascimento || linha.NASCIMENTO || '',
            endereco: (linha.Endereco || linha.Endereço || linha.ENDERECO || '').toString().trim(),
            bairro: (linha.Bairro || linha.BAIRRO || '').toString().trim(),
            codigo_acesso: existente?.codigo_acesso || '',
            atualizacao: Boolean(existente)
        });
    });

    return { validos, erros };
}

function exibirResultadoValidacao(validos, erros) {
    const resultado = document.getElementById('resultado-validacao');
    resultado.classList.remove('oculto');

    let html = '';

    if (erros.length > 0) {
        html += `
            <div class="p-md fundo-branco raio-sm mb-md borda-1 borda-solida borda-destaque-erro">
                <h4 class="cor-texto-erro peso-bold mb-sm">Atenção: ${erros.length} erro(s) encontrado(s)</h4>
                <ul class="cor-texto-escuro texto-sm lista-rolagem-pequena">
                    ${erros.map(erro => `<li>${Utilidades.escaparHtml(erro)}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    if (validos.length > 0) {
        const novos = validos.filter(item => !item.atualizacao).length;
        const atualizacoes = validos.filter(item => item.atualizacao).length;

        html += `
            <div class="p-md fundo-branco raio-sm borda-1 borda-solida borda-destaque-sucesso">
                <h4 class="cor-texto-sucesso peso-bold mb-sm">Planilha validada com sucesso!</h4>
                <p class="texto-sm cor-texto-escuro">
                    Pronto para incluir <strong>${novos}</strong> participante(s) e atualizar <strong>${atualizacoes}</strong> registro(s).
                </p>
            </div>
        `;
        AppEstado.importacaoParticipantesPendentes = validos;

        document.getElementById('recipiente-botoes-importacao-participantes').outerHTML = criarRodapeFormulario(
            'efetivarImportacaoExcelParticipantes()',
            `Confirmar Importação de ${validos.length} registros`,
            {
                id: 'recipiente-botoes-importacao-participantes',
                classesExtras: 'mt-lg md-flex-coluna',
                varianteSalvar: 'sucesso'
            }
        );
        Interface.decorarBotoesModal();
    } else {
        html += '<p class="texto-sm cor-texto-erro">Nenhum registro válido encontrado.</p>';
    }

    resultado.innerHTML = html;
}

async function efetivarImportacaoExcelParticipantes() {
    const dados = AppEstado.importacaoParticipantesPendentes;
    if (!dados || dados.length === 0) return;

    let processados = 0;
    for (const participante of dados) {
        const codigoAcesso = participante.codigo_acesso || await gerarCodigoAcessoUnico(participante.id);

        await bd.salvar('participantes', {
            id: participante.id,
            nome: participante.nome,
            status: participante.status,
            id_paroquia: participante.id_paroquia,
            capela: participante.capela,
            id_curso: participante.id_curso,
            email: participante.email,
            telefone: participante.telefone,
            cpf: participante.cpf,
            rg: participante.rg,
            data_nascimento: participante.data_nascimento,
            endereco: participante.endereco,
            bairro: participante.bairro,
            codigo_acesso: codigoAcesso
        });
        processados++;
    }

    AppEstado.importacaoParticipantesPendentes = [];
    Utilidades.notificacao(`${processados} participante(s) processado(s) com sucesso!`, 'sucesso');
    Interface.fecharJanela('janela-formulario');
    await renderizarAbaAtual();
}
