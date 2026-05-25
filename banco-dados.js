const TABELAS_BANCO_DADOS = [
    { nome: 'cursos', chave: 'id_curso', rotulo: 'Cursos' },
    { nome: 'paroquias', chave: 'id_paroquia', rotulo: 'Paróquias' },
    { nome: 'palestrantes', chave: 'id_palestrante', rotulo: 'Palestrantes' },
    { nome: 'disciplinas', chave: 'id_disciplina', rotulo: 'Disciplinas' },
    { nome: 'participantes', chave: 'id_participante', rotulo: 'Participantes' },
    { nome: 'frequencia', chave: 'id_frequencia', rotulo: 'Frequência' },
    { nome: 'atividades', chave: 'id_atividade', rotulo: 'Atividades' },
    { nome: 'pagamentos', chave: 'id_pagamento', rotulo: 'Pagamentos individuais' },
    { nome: 'pagamentos_lote', chave: 'id_lote', rotulo: 'Pagamentos em lote' },
    { nome: 'avisos', chave: 'id_aviso', rotulo: 'Avisos' },
    { nome: 'financas', chave: 'id_despesa', rotulo: 'Livro caixa' },
    { nome: 'configuracoes', chave: 'chave', rotulo: 'Configurações' }
];

class BancoDados {
    constructor() {
        this.nomeBanco = 'escolaDiscipuloAmado';
        this.versao = 5;
        this.versaoDados = 1;
        this.nomeSistema = 'Comissão Bíblico-Catequética';
        this.bancoInterno = null;
        this.inicializar();
    }

    inicializar() {
        return new Promise((resolve, reject) => {
            const requisicao = indexedDB.open(this.nomeBanco, this.versao);

            requisicao.onerror = () => {
                console.error('Erro ao abrir banco de dados:', requisicao.error);
                reject(requisicao.error);
            };

            requisicao.onsuccess = () => {
                this.bancoInterno = requisicao.result;
                console.log('Banco de dados aberto com sucesso na versão', this.versao);
                this.registrarMetadados().catch(erro => console.warn('Não foi possível registrar os metadados do banco:', erro));
                resolve(this.bancoInterno);
            };

            requisicao.onupgradeneeded = (evento) => {
                const bancoInterno = evento.target.result;
                const transacao = evento.target.transaction;

                const tabelas = TABELAS_BANCO_DADOS;

                tabelas.forEach(tabela => {
                    let armazenamento;
                    if (!bancoInterno.objectStoreNames.contains(tabela.nome)) {
                        armazenamento = bancoInterno.createObjectStore(tabela.nome, { keyPath: tabela.chave });
                    } else {
                        armazenamento = transacao.objectStore(tabela.nome);
                    }

                    const criarIndice = (nome, campo, unico = false) => {
                        if (!armazenamento.indexNames.contains(nome)) {
                            armazenamento.createIndex(nome, campo, { unique: unico });
                        }
                    };
                    
                    if (tabela.nome === 'cursos') {
                        criarIndice('nome_curso', 'nome_curso');
                        criarIndice('ano_curso', 'ano_curso');
                    }
                    if (tabela.nome === 'paroquias') {
                        criarIndice('nome_paroquia', 'nome_paroquia');
                    }
                    if (tabela.nome === 'palestrantes') {
                        criarIndice('nome_palestrante', 'nome_palestrante');
                    }
                    if (tabela.nome === 'participantes') {
                        criarIndice('nome_participante', 'nome_participante');
                        criarIndice('codigo_acesso', 'codigo_acesso', true);
                        criarIndice('id_curso', 'id_curso');
                        criarIndice('cpf', 'cpf');
                        criarIndice('id_paroquia', 'id_paroquia');
                        criarIndice('capela', 'capela'); 
                    }
                    if (tabela.nome === 'disciplinas') {
                        criarIndice('id_curso', 'id_curso');
                        criarIndice('nome_disciplina', 'nome_disciplina');
                    }
                    if (tabela.nome === 'frequencia') {
                        criarIndice('id_curso', 'id_curso');
                        criarIndice('id_disciplina', 'id_disciplina');
                        criarIndice('data', 'data');
                    }
                    if (tabela.nome === 'atividades') {
                        criarIndice('id_disciplina', 'id_disciplina');
                        criarIndice('id_participante', 'id_participante');
                    }
                    if (tabela.nome === 'pagamentos') {
                        criarIndice('id_participante', 'id_participante');
                        criarIndice('tipo_pagamento', 'tipo_pagamento');
                        criarIndice('data_pagamento', 'data_pagamento');
                        criarIndice('id_lote', 'id_lote');
                    }
                    if (tabela.nome === 'pagamentos_lote') {
                        criarIndice('id_paroquia', 'id_paroquia');
                        criarIndice('data_pagamento', 'data_pagamento');
                    }
                    if (tabela.nome === 'financas') {
                        criarIndice('data_despesa', 'data_despesa');
                    }
                });
            };
        });
    }

    criarMetadados() {
        return {
            chave: 'metadados_sistema',
            nome_sistema: this.nomeSistema,
            versao_banco: this.versao,
            versao_dados: this.versaoDados,
            atualizado_em: new Date().toISOString()
        };
    }

    async registrarMetadados() {
        if (!this.bancoInterno || !this.bancoInterno.objectStoreNames.contains('configuracoes')) return;
        await this.salvar('configuracoes', this.criarMetadados());
    }

    salvar(tabela, dados) {
        return new Promise((resolve, reject) => {
            const transacao = this.bancoInterno.transaction([tabela], 'readwrite');
            const armazenamento = transacao.objectStore(tabela);
            const requisicao = armazenamento.put(dados);

            requisicao.onsuccess = () => resolve(dados);
            requisicao.onerror = () => reject(requisicao.error);
        });
    }

    obter(tabela, id) {
        return new Promise((resolve, reject) => {
            const transacao = this.bancoInterno.transaction([tabela], 'readonly');
            const armazenamento = transacao.objectStore(tabela);
            const requisicao = armazenamento.get(id);

            requisicao.onsuccess = () => resolve(requisicao.result);
            requisicao.onerror = () => reject(requisicao.error);
        });
    }

    obterTodos(tabela) {
        return new Promise((resolve, reject) => {
            const transacao = this.bancoInterno.transaction([tabela], 'readonly');
            const armazenamento = transacao.objectStore(tabela);
            const requisicao = armazenamento.getAll();

            requisicao.onsuccess = () => resolve(requisicao.result);
            requisicao.onerror = () => reject(requisicao.error);
        });
    }

    buscarPorIndice(tabela, nomeIndice, valor) {
        return new Promise((resolve, reject) => {
            const transacao = this.bancoInterno.transaction([tabela], 'readonly');
            const armazenamento = transacao.objectStore(tabela);
            const indice = armazenamento.index(nomeIndice);
            const requisicao = indice.getAll(valor);

            requisicao.onsuccess = () => resolve(requisicao.result);
            requisicao.onerror = () => reject(requisicao.error);
        });
    }

    buscarComFiltro(tabela, filtro) {
        return new Promise((resolve, reject) => {
            const transacao = this.bancoInterno.transaction([tabela], 'readonly');
            const armazenamento = transacao.objectStore(tabela);
            const requisicao = armazenamento.getAll();

            requisicao.onsuccess = () => {
                const resultados = requisicao.result.filter(item => {
                    for (const chave in filtro) {
                        if (typeof filtro[chave] === 'string') {
                            if (!item[chave] || !item[chave].toString().toLowerCase().includes(filtro[chave].toLowerCase())) {
                                return false;
                            }
                        } else if (item[chave] !== filtro[chave]) {
                            return false;
                        }
                    }
                    return true;
                });
                resolve(resultados);
            };

            requisicao.onerror = () => reject(requisicao.error);
        });
    }

    excluir(tabela, id) {
        return new Promise((resolve, reject) => {
            const transacao = this.bancoInterno.transaction([tabela], 'readwrite');
            const armazenamento = transacao.objectStore(tabela);
            const requisicao = armazenamento.delete(id);

            requisicao.onsuccess = () => resolve();
            requisicao.onerror = () => reject(requisicao.error);
        });
    }

    limparTabela(tabela) {
        return new Promise((resolve, reject) => {
            const transacao = this.bancoInterno.transaction([tabela], 'readwrite');
            const armazenamento = transacao.objectStore(tabela);
            const requisicao = armazenamento.clear();

            requisicao.onsuccess = () => resolve();
            requisicao.onerror = () => reject(requisicao.error);
        });
    }

    obterNomesTabelas() {
        return TABELAS_BANCO_DADOS.map(tabela => tabela.nome);
    }

    normalizarTabelas(tabelasSelecionadas) {
        const tabelasPermitidas = this.obterNomesTabelas();
        if (!Array.isArray(tabelasSelecionadas) || tabelasSelecionadas.length === 0) return tabelasPermitidas;
        return tabelasSelecionadas.filter(tabela => tabelasPermitidas.includes(tabela));
    }

    async exportarDados(tabelasSelecionadas = null) {
        const tabelas = this.normalizarTabelas(tabelasSelecionadas);

        const metadadosBase = this.criarMetadados();
        const dados = {
            __metadados: {
                nome_sistema: metadadosBase.nome_sistema,
                versao_banco: metadadosBase.versao_banco,
                versao_dados: metadadosBase.versao_dados,
                tabelas_exportadas: tabelas,
                registros_por_tabela: {},
                exportado_em: new Date().toISOString()
            }
        };

        for (const tabela of tabelas) {
            dados[tabela] = await this.obterTodos(tabela);
            dados.__metadados.registros_por_tabela[tabela] = dados[tabela].length;
        }

        return dados;
    }

    async importarDados(dados, tabelasSelecionadas = null) {
        const metadados = dados.__metadados || {};
        if (metadados.versao_dados && metadados.versao_dados > this.versaoDados) {
            throw new Error('Esta cópia de segurança foi gerada por uma versão mais nova do sistema.');
        }

        const tabelas = this.normalizarTabelas(tabelasSelecionadas).filter(tabela => Object.prototype.hasOwnProperty.call(dados, tabela));

        if (tabelas.length === 0) {
            throw new Error('Nenhuma tabela selecionada foi encontrada nesta cópia de segurança.');
        }

        for (const tabela of tabelas) {
            if (!this.bancoInterno.objectStoreNames.contains(tabela)) continue;

            await this.limparTabela(tabela);
            if (dados[tabela]) {
                for (const registro of dados[tabela]) {
                    await this.salvar(tabela, registro);
                }
            }
        }

        await this.registrarMetadados();
    }
}

const bd = new BancoDados();
