let backupRestauracaoSelecionado = null;

async function exportarCopiaSeguranca(tabelasSelecionadas = null) {
    const dados = await bd.exportarDados(tabelasSelecionadas);
    const json = JSON.stringify(dados, null, 2);
    const arquivoBlob = new Blob([json], { type: 'application/json' });
    const endereco = URL.createObjectURL(arquivoBlob);
    const ligacao = document.createElement('a');
    ligacao.href = endereco;
    ligacao.download = `copia_seguranca_comissao_biblico_catequetica_${new Date().toISOString().split('T')[0]}.json`;
    ligacao.click();
    URL.revokeObjectURL(endereco);
    Utilidades.notificacao('Cópia de segurança criada com sucesso!');
}

async function obterQuantidadesTabelasDados() {
    const pares = await Promise.all(TABELAS_BANCO_DADOS.map(async tabela => {
        try {
            const registros = await bd.obterTodos(tabela.nome);
            return [tabela.nome, registros.length];
        } catch (erro) {
            console.error(erro);
            return [tabela.nome, 0];
        }
    }));

    return Object.fromEntries(pares);
}

function criarListaTabelasDados(prefixo, opcoes = {}) {
    const tabelas = opcoes.tabelas || TABELAS_BANCO_DADOS;
    const quantidades = opcoes.quantidades || {};
    const marcado = opcoes.marcado !== false;

    return `
        <div class="grade-selecao-dados">
            ${tabelas.map(tabela => {
                const quantidade = quantidades[tabela.nome];
                const textoQuantidade = Number.isFinite(quantidade) ? `${quantidade} reg.` : '';

                return `
                    <label class="item-selecao-dados" data-item-dados="${prefixo}-${tabela.nome}">
                        <input type="checkbox" class="checkbox-padrao" name="${prefixo}-dados" value="${tabela.nome}" onchange="atualizarContadorTabelasDados('${prefixo}')" ${marcado ? 'checked' : ''}>
                        <span class="texto-sm cor-texto-escuro flex-1">${tabela.rotulo}</span>
                        <span class="contagem-tabela-dados" data-contagem-dados="${prefixo}-${tabela.nome}">${textoQuantidade}</span>
                    </label>
                `;
            }).join('')}
        </div>
    `;
}

function obterTabelasMarcadasDados(prefixo) {
    return Array.from(document.querySelectorAll(`input[name="${prefixo}-dados"]:checked`)).map(campo => campo.value);
}

function alternarTabelasDados(prefixo, marcado) {
    document.querySelectorAll(`input[name="${prefixo}-dados"]`).forEach(campo => {
        campo.checked = marcado;
    });
    atualizarContadorTabelasDados(prefixo);
}

function atualizarContadorTabelasDados(prefixo) {
    const contador = document.getElementById(`contador-${prefixo}-dados`);
    if (!contador) return;

    const campos = Array.from(document.querySelectorAll(`input[name="${prefixo}-dados"]`));
    const selecionados = campos.filter(campo => campo.checked).length;
    const rotuloArea = campos.length === 1 ? 'área' : 'áreas';
    contador.textContent = `${selecionados} de ${campos.length} ${rotuloArea}`;
}

function obterRotuloTabelaDados(nomeTabela) {
    const tabela = TABELAS_BANCO_DADOS.find(item => item.nome === nomeTabela);
    return tabela ? tabela.rotulo : nomeTabela;
}

function obterTabelasArquivoBackup(dados) {
    const metadados = dados.__metadados || {};
    const tabelasMetadados = Array.isArray(metadados.tabelas_exportadas) ? metadados.tabelas_exportadas : [];
    const tabelasObjeto = Object.keys(dados).filter(chave => !chave.startsWith('__') && Array.isArray(dados[chave]));
    const tabelasArquivo = tabelasMetadados.length > 0 ? tabelasMetadados : tabelasObjeto;
    const tabelasPermitidas = new Set(TABELAS_BANCO_DADOS.map(tabela => tabela.nome));

    return tabelasArquivo.filter(tabela => tabelasPermitidas.has(tabela) && Array.isArray(dados[tabela]));
}

function obterQuantidadeTabelaBackup(dados, tabela) {
    const contagens = dados.__metadados?.registros_por_tabela || {};
    if (Number.isFinite(Number(contagens[tabela]))) return Number(contagens[tabela]);
    return Array.isArray(dados[tabela]) ? dados[tabela].length : 0;
}

function obterMapaQuantidadesBackup(dados, tabelas) {
    return Object.fromEntries(tabelas.map(tabela => [tabela, obterQuantidadeTabelaBackup(dados, tabela)]));
}

function formatarDataHoraBackup(valor) {
    if (!valor) return 'Data não informada';
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return 'Data não informada';
    return data.toLocaleString('pt-BR');
}

async function renderizarDados(conteudo) {
    backupRestauracaoSelecionado = null;
    const quantidades = await obterQuantidadesTabelasDados();

    let codigoEstrutura = '<div class="pagina-conteudo pagina-dados">';
    codigoEstrutura += criarCabecalhoSecao('Dados do Sistema');

    codigoEstrutura += '<div class="grade-paineis-dados">';

    codigoEstrutura += `
        <section class="cartao-suave painel-dados">
            <div class="cabecalho-painel-dados">
                <div>
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Exportar Dados</h3>
                    <p class="texto-sm cor-texto-claro m-zero">Arquivo de backup do sistema.</p>
                </div>
            </div>
            <details class="detalhes-dados">
                <summary>
                    <span class="titulo-detalhes-dados">Áreas incluídas</span>
                    <span id="contador-backup-dados" class="indicador-contagem-dados"></span>
                </summary>
                <div class="corpo-detalhes-dados">
                    <div class="barra-acoes-dados mb-sm">
                        ${criarBotao('Selecionar Todos', "alternarTabelasDados('backup', true)", 'contorno', 'botao-pequeno')}
                        ${criarBotao('Limpar', "alternarTabelasDados('backup', false)", 'contorno', 'botao-pequeno')}
                    </div>
                    ${criarListaTabelasDados('backup', { quantidades })}
                </div>
            </details>
            <div class="rodape-painel-dados">
                ${criarBotao('Exportar Backup', 'exportarBackupSelecionado()', 'primario')}
            </div>
        </section>
    `;

    codigoEstrutura += `
        <section class="cartao-suave painel-dados">
            <div class="cabecalho-painel-dados">
                <div>
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Restaurar Dados</h3>
                    <p class="texto-sm cor-texto-claro m-zero">Substitui as áreas marcadas pelo conteúdo do backup.</p>
                </div>
            </div>
            ${criarBotao('Selecionar Backup', 'escolherArquivoBackupRestauracao()', 'contorno')}
            <div id="resumo-arquivo-backup" class="resumo-backup-dados">
                <p class="texto-sm cor-texto-claro m-zero">Nenhum arquivo selecionado.</p>
            </div>
            <div id="controles-restauracao-dados" class="oculto">
                <details class="detalhes-dados" open>
                    <summary>
                        <span class="titulo-detalhes-dados">Áreas para restaurar</span>
                        <span id="contador-restauracao-dados" class="indicador-contagem-dados"></span>
                    </summary>
                    <div class="corpo-detalhes-dados">
                        <div class="barra-acoes-dados mb-sm">
                            ${criarBotao('Selecionar Todos', "alternarTabelasDados('restauracao', true)", 'contorno', 'botao-pequeno')}
                            ${criarBotao('Limpar', "alternarTabelasDados('restauracao', false)", 'contorno', 'botao-pequeno')}
                        </div>
                        <div id="lista-restauracao-dados"></div>
                    </div>
                </details>
            </div>
            <div class="rodape-painel-dados">
                ${criarBotao('Restaurar Backup', 'restaurarBackupSelecionado()', 'primario', 'oculto', 'button', 'id="botao-restaurar-dados" disabled')}
            </div>
        </section>
    `;

    codigoEstrutura += '</div></div>';
    conteudo.innerHTML = codigoEstrutura;

    atualizarContadorTabelasDados('backup');
}

async function exportarBackupSelecionado() {
    const tabelas = obterTabelasMarcadasDados('backup');
    if (tabelas.length === 0) {
        Utilidades.notificacao('Selecione ao menos uma área para exportar.', 'erro');
        return;
    }

    await exportarCopiaSeguranca(tabelas);
}

function escolherArquivoBackupRestauracao() {
    const campoArquivo = document.createElement('input');
    campoArquivo.type = 'file';
    campoArquivo.accept = '.json';

    campoArquivo.onchange = () => {
        const arquivo = campoArquivo.files?.[0];
        if (!arquivo) return;

        const leitor = new FileReader();
        leitor.onload = evento => {
            try {
                const dados = JSON.parse(evento.target.result);
                carregarBackupRestauracao(dados, arquivo.name);
            } catch (erro) {
                console.error(erro);
                Utilidades.notificacao('Não foi possível ler este arquivo de backup.', 'erro');
            }
        };
        leitor.onerror = () => Utilidades.notificacao('Não foi possível abrir o arquivo selecionado.', 'erro');
        leitor.readAsText(arquivo);
    };

    campoArquivo.click();
}

function carregarBackupRestauracao(dados, nomeArquivo) {
    if (!dados || typeof dados !== 'object') {
        Utilidades.notificacao('O arquivo selecionado não possui um backup válido.', 'erro');
        return;
    }

    const tabelas = obterTabelasArquivoBackup(dados);
    if (tabelas.length === 0) {
        Utilidades.notificacao('Nenhuma área reconhecida foi encontrada neste backup.', 'erro');
        return;
    }

    backupRestauracaoSelecionado = { dados, nomeArquivo, tabelas };
    renderizarResumoBackupRestauracao();
    renderizarSelecaoRestauracaoBackup();
}

function renderizarResumoBackupRestauracao() {
    const resumo = document.getElementById('resumo-arquivo-backup');
    if (!resumo || !backupRestauracaoSelecionado) return;

    const { dados, nomeArquivo, tabelas } = backupRestauracaoSelecionado;
    const metadados = dados.__metadados || {};
    const dataBackup = formatarDataHoraBackup(metadados.exportado_em || metadados.atualizado_em);
    const linhasTabelas = tabelas.map(tabela => {
        const quantidade = obterQuantidadeTabelaBackup(dados, tabela);
        const rotuloQuantidade = quantidade === 1 ? 'registro' : 'registros';

        return `
            <div class="linha-tabela-backup">
                <span>${Utilidades.escaparHtml(obterRotuloTabelaDados(tabela))}</span>
                <strong>${quantidade} ${rotuloQuantidade}</strong>
            </div>
        `;
    }).join('');

    resumo.innerHTML = `
        <p class="texto-sm cor-texto-escuro mb-xs"><strong>Arquivo:</strong> ${Utilidades.escaparHtml(nomeArquivo)}</p>
        <p class="texto-sm cor-texto-claro mb-sm"><strong>Gerado em:</strong> ${dataBackup}</p>
        <div class="lista-tabelas-backup">${linhasTabelas}</div>
    `;
}

function renderizarSelecaoRestauracaoBackup() {
    if (!backupRestauracaoSelecionado) return;

    const controles = document.getElementById('controles-restauracao-dados');
    const lista = document.getElementById('lista-restauracao-dados');
    const botaoRestaurar = document.getElementById('botao-restaurar-dados');
    if (!controles || !lista || !botaoRestaurar) return;

    const tabelas = TABELAS_BANCO_DADOS.filter(tabela => backupRestauracaoSelecionado.tabelas.includes(tabela.nome));
    const quantidades = obterMapaQuantidadesBackup(backupRestauracaoSelecionado.dados, backupRestauracaoSelecionado.tabelas);
    lista.innerHTML = criarListaTabelasDados('restauracao', { tabelas, quantidades });

    controles.classList.remove('oculto');
    botaoRestaurar.classList.remove('oculto');
    botaoRestaurar.disabled = false;
    atualizarContadorTabelasDados('restauracao');
}

async function restaurarBackupSelecionado() {
    if (!backupRestauracaoSelecionado) {
        Utilidades.notificacao('Escolha um arquivo de backup antes de restaurar.', 'erro');
        return;
    }

    const tabelas = obterTabelasMarcadasDados('restauracao');
    if (tabelas.length === 0) {
        Utilidades.notificacao('Selecione ao menos uma área para restaurar.', 'erro');
        return;
    }

    const nomes = tabelas.map(obterRotuloTabelaDados).join(', ');
    const confirmou = confirm(`O arquivo "${backupRestauracaoSelecionado.nomeArquivo}" substituirá os dados atuais em: ${nomes}.\n\nDeseja continuar?`);
    if (!confirmou) return;

    try {
        await bd.importarDados(backupRestauracaoSelecionado.dados, tabelas);
        Utilidades.notificacao('Dados restaurados com sucesso!', 'sucesso');
        renderizarAbaAtual();
    } catch (erro) {
        console.error(erro);
        Utilidades.notificacao(erro.message || 'Erro ao restaurar os dados.', 'erro');
    }
}
