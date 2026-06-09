class BancoDados {
    constructor() {
        this.nomeBanco = BANCO_DADOS_NOME;
        this.versao = BANCO_DADOS_VERSAO;
        this.banco = null;
        this.promessaInicializacao = null;
        this.tabelas = TABELAS_BANCO_DADOS;
    }

    obterConfiguracaoTabela(nomeTabela) {
        return this.tabelas.find(tabela => tabela.nome === nomeTabela);
    }

    inicializar() {
        if (this.banco) return Promise.resolve(this.banco);
        if (this.promessaInicializacao) return this.promessaInicializacao;

        this.promessaInicializacao = new Promise((resolver, rejeitar) => {
            const requisicao = indexedDB.open(this.nomeBanco, this.versao);

            requisicao.onerror = () => {
                this.promessaInicializacao = null;
                rejeitar(requisicao.error);
            };

            requisicao.onsuccess = async evento => {
                try {
                    this.banco = evento.target.result;
                    await this.registrarMetadados();
                    resolver(this.banco);
                } catch (erro) {
                    this.promessaInicializacao = null;
                    rejeitar(erro);
                }
            };

            requisicao.onupgradeneeded = evento => {
                this.banco = evento.target.result;
                this.tabelas.forEach(tabela => {
                    if (!this.banco.objectStoreNames.contains(tabela.nome)) {
                        this.banco.createObjectStore(tabela.nome, { keyPath: tabela.chave });
                    }
                });
            };
        });

        return this.promessaInicializacao;
    }

    registrarMetadados() {
        if (!this.banco || !this.banco.objectStoreNames.contains('configuracoes')) {
            return Promise.resolve();
        }

        return this.salvar('configuracoes', {
            chave: 'metadados',
            versao_aplicativo: VERSAO_APLICATIVO,
            versao_dados: VERSAO_DADOS_APLICATIVO,
            atualizado_em: new Date().toISOString()
        });
    }

    criarTransacao(nomeTabela, modo = 'readonly') {
        const tabela = this.obterConfiguracaoTabela(nomeTabela);
        if (!tabela) throw new Error(`Tabela não configurada: ${nomeTabela}`);
        return {
            nome: tabela.nome,
            transacao: this.banco.transaction([tabela.nome], modo)
        };
    }

    salvar(nomeTabela, dados) {
        return new Promise((resolver, rejeitar) => {
            const { nome, transacao } = this.criarTransacao(nomeTabela, 'readwrite');
            const armazenamento = transacao.objectStore(nome);
            const requisicao = armazenamento.put(dados);

            requisicao.onsuccess = () => resolver(dados);
            requisicao.onerror = () => rejeitar(requisicao.error);
        });
    }

    obter(nomeTabela, chave) {
        return new Promise((resolver, rejeitar) => {
            const { nome, transacao } = this.criarTransacao(nomeTabela);
            const armazenamento = transacao.objectStore(nome);
            const requisicao = armazenamento.get(chave);

            requisicao.onsuccess = () => resolver(requisicao.result);
            requisicao.onerror = () => rejeitar(requisicao.error);
        });
    }

    obterTodos(nomeTabela) {
        return new Promise((resolver, rejeitar) => {
            const { nome, transacao } = this.criarTransacao(nomeTabela);
            const armazenamento = transacao.objectStore(nome);
            const requisicao = armazenamento.getAll();

            requisicao.onsuccess = () => resolver(requisicao.result || []);
            requisicao.onerror = () => rejeitar(requisicao.error);
        });
    }

    async buscarComFiltro(nomeTabela, filtro) {
        const todos = await this.obterTodos(nomeTabela);
        return todos.filter(filtro);
    }

    excluir(nomeTabela, chave) {
        return new Promise((resolver, rejeitar) => {
            const { nome, transacao } = this.criarTransacao(nomeTabela, 'readwrite');
            const armazenamento = transacao.objectStore(nome);
            const requisicao = armazenamento.delete(chave);

            requisicao.onsuccess = () => resolver();
            requisicao.onerror = () => rejeitar(requisicao.error);
        });
    }

    limparTabela(nomeTabela) {
        return new Promise((resolver, rejeitar) => {
            const { nome, transacao } = this.criarTransacao(nomeTabela, 'readwrite');
            const armazenamento = transacao.objectStore(nome);
            const requisicao = armazenamento.clear();

            requisicao.onsuccess = () => resolver();
            requisicao.onerror = () => rejeitar(requisicao.error);
        });
    }

    obterNomesTabelas() {
        return this.tabelas.map(tabela => tabela.nome);
    }

    async exportarDados() {
        const dados = {};

        for (const tabela of this.tabelas) {
            dados[tabela.nome] = await this.obterTodos(tabela.nome);
        }

        return {
            metadados: {
                nome_sistema: NOME_INSTITUCIONAL,
                versao_aplicativo: VERSAO_APLICATIVO,
                versao_dados: VERSAO_DADOS_APLICATIVO,
                data_exportacao: new Date().toISOString()
            },
            tabelas: dados
        };
    }

    obterTabelasBackup(dadosBackup) {
        if (!dadosBackup || typeof dadosBackup !== 'object') return {};
        if (dadosBackup.tabelas && typeof dadosBackup.tabelas === 'object') return dadosBackup.tabelas;

        return dadosBackup;
    }

    validarBackup(dadosBackup, tabelasSelecionadas = null) {
        const tabelasBackup = this.obterTabelasBackup(dadosBackup);
        const tabelasValidas = this.tabelas
            .filter(tabela => Array.isArray(tabelasBackup[tabela.nome]))
            .map(tabela => tabela.nome);

        if (tabelasValidas.length === 0) {
            throw new Error('O arquivo selecionado não possui tabelas reconhecidas para restauração.');
        }

        const nomesSelecionados = tabelasSelecionadas && tabelasSelecionadas.length > 0
            ? tabelasSelecionadas
            : tabelasValidas;
        const tabelasParaRestaurar = this.tabelas.filter(tabela => nomesSelecionados.includes(tabela.nome));

        if (tabelasParaRestaurar.length === 0) {
            throw new Error('Selecione ao menos uma área válida para restaurar.');
        }

        for (const tabela of tabelasParaRestaurar) {
            if (!Array.isArray(tabelasBackup[tabela.nome])) {
                throw new Error(`O backup não contém a área "${tabela.rotulo}".`);
            }

            tabelasBackup[tabela.nome].forEach((registro, indice) => {
                const chave = registro?.[tabela.chave];
                if (!registro || typeof registro !== 'object' || chave === null || chave === undefined || String(chave).trim() === '') {
                    throw new Error(`A área "${tabela.rotulo}" possui um registro inválido na posição ${indice + 1}.`);
                }
            });
        }

        return { tabelasBackup, tabelasValidas, tabelasParaRestaurar };
    }

    substituirTabelas(tabelasParaRestaurar, tabelasBackup) {
        return new Promise((resolver, rejeitar) => {
            const nomesTabelas = tabelasParaRestaurar.map(tabela => tabela.nome);
            const transacao = this.banco.transaction(nomesTabelas, 'readwrite');

            transacao.oncomplete = () => resolver();
            transacao.onerror = () => rejeitar(new Error('Não foi possível restaurar o backup. Nenhum dado foi alterado.'));
            transacao.onabort = () => rejeitar(new Error('A restauração foi cancelada. Nenhum dado foi alterado.'));

            tabelasParaRestaurar.forEach(tabela => {
                const armazenamento = transacao.objectStore(tabela.nome);
                armazenamento.clear();
                tabelasBackup[tabela.nome].forEach(registro => armazenamento.put(registro));
            });
        });
    }

    async importarDados(dadosBackup, tabelasSelecionadas = null) {
        const { tabelasBackup, tabelasParaRestaurar } = this.validarBackup(dadosBackup, tabelasSelecionadas);

        await this.substituirTabelas(tabelasParaRestaurar, tabelasBackup);

        await this.registrarMetadados();
    }
}

const bd = new BancoDados();
