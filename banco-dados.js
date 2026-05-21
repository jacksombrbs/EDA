class BancoDados {
    constructor() {
        this.nomeBanco = 'escolaDiscipuloAmado';
        this.versao = 4;
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
                resolve(this.bancoInterno);
            };

            requisicao.onupgradeneeded = (evento) => {
                const bancoInterno = evento.target.result;
                const transacao = evento.target.transaction;

                const tabelas = [
                    { nome: 'cursos', chave: 'id_curso' },
                    { nome: 'paroquias', chave: 'id_paroquia' },
                    { nome: 'palestrantes', chave: 'id_palestrante' },
                    { nome: 'disciplinas', chave: 'id_disciplina' },
                    { nome: 'participantes', chave: 'id_participante' },
                    { nome: 'frequencia', chave: 'id_frequencia' },
                    { nome: 'atividades', chave: 'id_atividade' },
                    { nome: 'pagamentos', chave: 'id_pagamento' },
                    { nome: 'pagamentos_lote', chave: 'id_lote' },
                    { nome: 'avisos', chave: 'id_aviso' },
                    { nome: 'financas', chave: 'id_despesa' }
                ];

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

    async exportarDados() {
        const tabelas = [
            'cursos', 'paroquias', 'palestrantes', 'disciplinas', 'participantes',
            'frequencia', 'atividades', 'pagamentos', 'pagamentos_lote', 'avisos', 'financas'
        ];

        const dados = {};
        for (const tabela of tabelas) {
            dados[tabela] = await this.obterTodos(tabela);
        }

        return dados;
    }

    async importarDados(dados) {
        for (const tabela in dados) {
            await this.limparTabela(tabela);
            if (dados[tabela]) {
                for (const registro of dados[tabela]) {
                    await this.salvar(tabela, registro);
                }
            }
        }
    }
}

const bd = new BancoDados();