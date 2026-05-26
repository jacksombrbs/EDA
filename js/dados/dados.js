async function renderizarDados(conteudo) {
    AppEstado.backupRestauracaoSelecionado = null;

    let codigo = '<div class="pagina-conteudo pagina-dados">';
    codigo += criarCabecalhoSecao('Dados do Sistema');
    codigo += '<div class="grade-paineis-dados">';
    codigo += `
        <section class="cartao-suave painel-dados">
            <div>
                <h3 class="texto-md peso-bold cor-texto-primario m-zero">Exportar Dados</h3>
                <p class="texto-sm cor-texto-claro mt-xs">Gera um arquivo completo com todos os dados do sistema.</p>
            </div>
            <div class="resumo-backup-dados">
                <p class="texto-sm cor-texto-escuro m-zero">Use este arquivo para guardar uma cópia de segurança.</p>
            </div>
            <div class="rodape-painel-dados">
                ${criarBotao('Exportar Backup', 'exportarBackupCompleto()', 'primario')}
            </div>
        </section>

        <section class="cartao-suave painel-dados">
            <div>
                <h3 class="texto-md peso-bold cor-texto-primario m-zero">Restaurar Dados</h3>
                <p class="texto-sm cor-texto-claro mt-xs">Substitui apenas as áreas marcadas pelo conteúdo do backup.</p>
            </div>
            <label for="arquivo-backup-completo" class="botao-padrao botao-secundario w-total texto-centro">Selecionar Backup</label>
            <input id="arquivo-backup-completo" class="oculto" type="file" accept=".json" onchange="selecionarArquivoBackupCompleto(this)">
            <div id="resumo-backup-completo" class="resumo-backup-dados">
                <p class="texto-sm cor-texto-claro m-zero">Nenhum arquivo selecionado.</p>
            </div>
            <div id="controles-restauracao-backup" class="oculto">
                <details class="detalhes-dados" open>
                    <summary>
                        <span class="titulo-detalhes-dados">Áreas para restaurar</span>
                        <span id="contador-restauracao-backup" class="indicador-contagem-dados"></span>
                    </summary>
                    <div class="corpo-detalhes-dados">
                        <div class="barra-acoes-dados mb-sm">
                            ${criarBotao('Selecionar Todos', "alternarTabelasRestauracao(true)", 'contorno', 'botao-pequeno')}
                            ${criarBotao('Limpar', "alternarTabelasRestauracao(false)", 'contorno', 'botao-pequeno')}
                        </div>
                        <div id="lista-restauracao-backup"></div>
                    </div>
                </details>
            </div>
            <div class="rodape-painel-dados flex gap-sm md-flex-coluna">
                ${criarBotao('Restaurar Backup', 'importarBackupCompleto()', 'primario', 'md-w-total')}
                ${criarBotao('Limpar Dados', 'limparBanco()', 'perigo', 'md-w-total')}
            </div>
        </section>
    `;
    codigo += '</div></div>';

    conteudo.innerHTML = codigo;
}

async function exportarBackupCompleto() {
    const dados = await bd.exportarDados();
    const json = JSON.stringify(dados, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const endereco = URL.createObjectURL(blob);
    const ligacao = document.createElement('a');
    ligacao.href = endereco;
    ligacao.download = `backup_comissao_biblico_catequetica_${new Date().toISOString().split('T')[0]}.json`;
    ligacao.click();
    URL.revokeObjectURL(endereco);
    Utilidades.notificacao('Backup exportado com sucesso!');
}

function selecionarArquivoBackupCompleto(input) {
    AppEstado.arquivoBackupSelecionado = input.files?.[0] || null;
    AppEstado.backupRestauracaoSelecionado = null;
    const resumo = document.getElementById('resumo-backup-completo');
    const controles = document.getElementById('controles-restauracao-backup');
    const lista = document.getElementById('lista-restauracao-backup');

    if (controles) controles.classList.add('oculto');
    if (lista) lista.innerHTML = '';

    if (!resumo) return;
    if (!AppEstado.arquivoBackupSelecionado) {
        resumo.innerHTML = '<p class="texto-sm cor-texto-claro m-zero">Nenhum arquivo selecionado.</p>';
        return;
    }

    resumo.innerHTML = `<p class="texto-sm cor-texto-claro m-zero">Lendo arquivo: ${Utilidades.escaparHtml(AppEstado.arquivoBackupSelecionado.name)}</p>`;

    const leitor = new FileReader();
    leitor.onload = evento => {
        try {
            const dados = JSON.parse(evento.target.result);
            const validacao = bd.validarBackup(dados);
            AppEstado.backupRestauracaoSelecionado = {
                dados,
                nomeArquivo: AppEstado.arquivoBackupSelecionado.name,
                tabelasBackup: validacao.tabelasBackup,
                tabelasValidas: validacao.tabelasValidas
            };

            renderizarResumoBackupCompleto();
            renderizarSelecaoRestauracaoBackup();
        } catch (erro) {
            const mensagem = erro instanceof SyntaxError
                ? 'Arquivo de backup inválido. Verifique se o arquivo está em formato JSON.'
                : (erro.message || 'Arquivo de backup inválido.');
            resumo.innerHTML = `<p class="texto-sm cor-texto-erro m-zero">${Utilidades.escaparHtml(mensagem)}</p>`;
        }
    };
    leitor.onerror = () => {
        resumo.innerHTML = '<p class="texto-sm cor-texto-erro m-zero">Não foi possível ler o arquivo selecionado.</p>';
    };
    leitor.readAsText(AppEstado.arquivoBackupSelecionado);
}

function renderizarResumoBackupCompleto() {
    const resumo = document.getElementById('resumo-backup-completo');
    const backup = AppEstado.backupRestauracaoSelecionado;
    if (!resumo || !backup) return;

    const linhas = backup.tabelasValidas.map(nomeTabela => {
        const tabela = TABELAS_BANCO_DADOS.find(item => item.nome === nomeTabela);
        const quantidade = Array.isArray(backup.tabelasBackup[nomeTabela]) ? backup.tabelasBackup[nomeTabela].length : 0;
        const textoQuantidade = quantidade === 1 ? 'registro' : 'registros';

        return `
            <div class="linha-tabela-backup">
                <span>${Utilidades.escaparHtml(tabela?.rotulo || nomeTabela)}</span>
                <strong>${quantidade} ${textoQuantidade}</strong>
            </div>
        `;
    }).join('');

    resumo.innerHTML = `
        <p class="texto-sm cor-texto-escuro mb-xs"><strong>Arquivo:</strong> ${Utilidades.escaparHtml(backup.nomeArquivo)}</p>
        <div class="lista-tabelas-backup">${linhas}</div>
    `;
}

function renderizarSelecaoRestauracaoBackup() {
    const backup = AppEstado.backupRestauracaoSelecionado;
    const controles = document.getElementById('controles-restauracao-backup');
    const lista = document.getElementById('lista-restauracao-backup');
    if (!backup || !controles || !lista) return;

    const tabelas = TABELAS_BANCO_DADOS.filter(tabela => backup.tabelasValidas.includes(tabela.nome));
    lista.innerHTML = criarListaTabelasRestauracao(tabelas, backup.tabelasBackup);
    controles.classList.remove('oculto');
    atualizarContadorRestauracao();
}

function criarListaTabelasRestauracao(tabelas, tabelasBackup) {
    return `
        <div class="grade-selecao-dados">
            ${tabelas.map(tabela => {
                const quantidade = Array.isArray(tabelasBackup[tabela.nome]) ? tabelasBackup[tabela.nome].length : 0;
                return `
                    <label class="item-selecao-dados">
                        <input type="checkbox" class="checkbox-padrao" name="restauracao-backup" value="${tabela.nome}" onchange="atualizarContadorRestauracao()" checked>
                        <span class="texto-sm cor-texto-escuro flex-1">${Utilidades.escaparHtml(tabela.rotulo)}</span>
                        <span class="contagem-tabela-dados">${quantidade} reg.</span>
                    </label>
                `;
            }).join('')}
        </div>
    `;
}

function obterTabelasMarcadasRestauracao() {
    return Array.from(document.querySelectorAll('input[name="restauracao-backup"]:checked')).map(campo => campo.value);
}

function alternarTabelasRestauracao(marcado) {
    document.querySelectorAll('input[name="restauracao-backup"]').forEach(campo => {
        campo.checked = marcado;
    });
    atualizarContadorRestauracao();
}

function atualizarContadorRestauracao() {
    const contador = document.getElementById('contador-restauracao-backup');
    if (!contador) return;

    const campos = Array.from(document.querySelectorAll('input[name="restauracao-backup"]'));
    const marcados = campos.filter(campo => campo.checked).length;
    const rotulo = campos.length === 1 ? 'área' : 'áreas';
    contador.textContent = `${marcados} de ${campos.length} ${rotulo}`;
}

async function importarBackupCompleto() {
    const backup = AppEstado.backupRestauracaoSelecionado;

    if (!backup) {
        Utilidades.notificacao('Selecione um arquivo de backup válido.', 'aviso');
        return;
    }

    const tabelasSelecionadas = obterTabelasMarcadasRestauracao();
    if (tabelasSelecionadas.length === 0) {
        Utilidades.notificacao('Selecione ao menos uma área para restaurar.', 'erro');
        return;
    }

    try {
        bd.validarBackup(backup.dados, tabelasSelecionadas);
        const nomes = tabelasSelecionadas
            .map(nomeTabela => TABELAS_BANCO_DADOS.find(item => item.nome === nomeTabela)?.rotulo || nomeTabela)
            .join(', ');
        if (!confirm(`Restaurar este backup vai substituir os dados atuais em: ${nomes}.\n\nDeseja continuar?`)) return;

        await bd.importarDados(backup.dados, tabelasSelecionadas);
        AppEstado.arquivoBackupSelecionado = null;
        AppEstado.backupRestauracaoSelecionado = null;
        Utilidades.notificacao('Backup restaurado com sucesso!');
        await renderizarAbaAtual();
    } catch (erro) {
        Utilidades.notificacao(erro.message || 'Não foi possível restaurar o backup.', 'erro');
    }
}

async function limparBanco() {
    if (!confirm('Deseja apagar todos os dados do sistema? Esta ação não pode ser desfeita.')) return;

    for (const tabela of TABELAS_BANCO_DADOS) {
        await bd.limparTabela(tabela.nome);
    }

    await bd.registrarMetadados();
    Utilidades.notificacao('Dados apagados com sucesso.');
    await renderizarAbaAtual();
}
