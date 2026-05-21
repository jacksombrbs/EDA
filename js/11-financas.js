async function renderizarFinancas(conteudo) {
    const despesas = await bd.obterTodos('financas');
    const pagamentos = await bd.obterTodos('pagamentos');
    const participantes = await bd.obterTodos('participantes');

    let codigoEstrutura = '<div class="fundo-branco borda-padrao raio-md p-md mb-lg"><div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Fluxo de Caixa</h2>';
    codigoEstrutura += '<button class="btn btn-primario" onclick="abrirFormularioFinanca()">+ Registrar Nova Transação (Saída)</button>';
    codigoEstrutura += '</div>';

    let transacoes = [];

    pagamentos.forEach(p => {
        const aluno = participantes.find(al => al.id_participante === p.id_participante);
        const nomeAluno = aluno ? aluno.nome_participante : 'Aluno Não Identificado';
        const valorLimpo = parseFloat(String(p.valor || 0).replace('.', '').replace(',', '.'));
        transacoes.push({
            id: p.id_pagamento,
            data: p.data_pagamento,
            descricao: `Recebimento de ${p.tipo_pagamento} - Aluno: ${nomeAluno}`,
            tipo: 'Entrada',
            valor: valorLimpo,
            podeExcluir: false
        });
    });

    despesas.forEach(d => {
        const valorLimpo = parseFloat(String(d.valor || 0).replace('.', '').replace(',', '.'));
        transacoes.push({
            id: d.id_despesa,
            data: d.data || d.data_despesa,
            descricao: d.descricao,
            tipo: 'Saída',
            valor: valorLimpo,
            podeExcluir: true
        });
    });

    transacoes.sort((a, b) => new Date(b.data) - new Date(a.data));

    const totalEntradas = transacoes.filter(t => t.tipo === 'Entrada').reduce((acc, t) => acc + t.valor, 0);
    const totalSaidas = transacoes.filter(t => t.tipo === 'Saída').reduce((acc, t) => acc + t.valor, 0);
    const saldoCaixa = totalEntradas - totalSaidas;

    codigoEstrutura += `
        <div class="grid grid-auto-adaptavel gap-md mb-lg">
            <div class="flex flex-coluna p-md borda-padrao raio-md borda-sucesso fundo-cinza">
                <span class="texto-sm peso-bold cor-texto-claro">(+) TOTAL ENTRADAS</span>
                <h3 class="texto-xl peso-bold texto-sucesso mt-sm">${Utilidades.formatarMoeda(totalEntradas)}</h3>
            </div>
            <div class="flex flex-coluna p-md borda-padrao raio-md borda-erro fundo-cinza">
                <span class="texto-sm peso-bold cor-texto-claro">(-) TOTAL SAÍDAS</span>
                <h3 class="texto-xl peso-bold texto-erro mt-sm">${Utilidades.formatarMoeda(totalSaidas)}</h3>
            </div>
            <div class="flex flex-coluna p-md borda-padrao raio-md ${saldoCaixa >= 0 ? 'borda-sucesso' : 'borda-erro'} fundo-cinza">
                <span class="texto-sm peso-bold cor-texto-claro">(=) SALDO EM CAIXA</span>
                <h3 class="texto-xl peso-bold ${saldoCaixa >= 0 ? 'texto-sucesso' : 'texto-erro'} mt-sm">${Utilidades.formatarMoeda(saldoCaixa)}</h3>
            </div>
        </div>`;

    codigoEstrutura += Busca.criarCampoBusca('busca-livro-caixa', 'Filtrar extrato...');

    if (transacoes.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhuma transação anotada no livro caixa.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-padrao raio-md fundo-branco"><table class="tabela-base" id="tabela-livro-caixa"><thead><tr>';
        codigoEstrutura += '<th>Data</th><th>Descrição da Operação</th><th class="texto-centro">Natureza</th><th class="texto-direita">Valor</th><th>Ações</th></tr></thead><tbody>';

        transacoes.forEach(t => {
            const corTexto = t.tipo === 'Entrada' ? 'texto-sucesso' : 'texto-erro';
            const prefixo = t.tipo === 'Entrada' ? '+' : '-';

            codigoEstrutura += `<tr>
                        <td class="cor-texto-escuro">${Utilidades.formatarData(t.data)}</td>
                        <td class="peso-bold cor-texto-escuro">${t.descricao}</td>
                        <td class="texto-centro">
                            <span class="fundo-cinza ${corTexto} peso-bold texto-sm" style="padding: 4px 10px; border-radius: var(--raio-sm); display: inline-block;">
                                ${t.tipo}
                            </span>
                        </td>
                        <td class="texto-direita peso-bold ${corTexto}">${prefixo} ${Utilidades.formatarMoeda(t.valor)}</td>
                        <td>
                            ${t.podeExcluir ? `
                                <div class="flex gap-sm">
                                    <button class="btn btn-secundario-2 btn-pequeno" onclick="editarFinanca('${t.id}')">Editar</button>
                                    <button class="btn btn-perigo btn-pequeno" onclick="excluirFinanca('${t.id}')">Excluir</button>
                                </div>
                            ` : '<span class="texto-sm texto-italico cor-texto-claro">Registro de Aluno</span>'}
                        </td>
                     </tr>`;
        });
        codigoEstrutura += '</tbody></table></div>';
    }
    codigoEstrutura += '</div>';

    conteudo.innerHTML = codigoEstrutura;

    document.getElementById('busca-livro-caixa')?.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        const linhas = document.querySelectorAll('#tabela-livro-caixa tbody tr');
        linhas.forEach(linha => {
            const texto = linha.textContent.toLowerCase();
            linha.classList.toggle('oculto', !texto.includes(termo));
        });
    });
}

function abrirFormularioFinanca() {
    modoEdicao = 'financas';
    registroEmEdicao = null;
    document.getElementById('titulo-janela').textContent = 'Nova Transação (Saída)';

    let codigoEstrutura = '<form id="formulario-despesa" class="grid grid-auto-adaptavel gap-md">';
    codigoEstrutura += criarCampoFormulario('Descrição *', 'text', 'descricao', '', 'Ex: Compra de material', true);
    codigoEstrutura += criarCampoFormulario('Valor (R$) *', 'text', 'valor', '0,00', '', true);
    codigoEstrutura += criarCampoFormulario('Data *', 'date', 'data', new Date().toISOString().split('T')[0], '', true);
    codigoEstrutura += criarCampoFormulario('Categoria', 'text', 'categoria', '', 'Ex: Manutenção');
    
    codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
    codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
    codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarFinanca()">Salvar</button>';
    codigoEstrutura += '</div>';
    codigoEstrutura += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
    Interface.abrirJanela('janela-formulario');
}

async function editarFinanca(idDespesa) {
    const despesa = await bd.obter('financas', idDespesa);
    if (despesa) {
        modoEdicao = 'financas';
        registroEmEdicao = idDespesa;
        document.getElementById('titulo-janela').textContent = 'Editar Transação';

        const valorFormatado = String(despesa.valor || '0').replace('.', ',');

        let codigoEstrutura = '<form id="formulario-despesa" class="grid grid-auto-adaptavel gap-md">';
        codigoEstrutura += criarCampoFormulario('Descrição *', 'text', 'descricao', despesa.descricao || '', '', true);
        codigoEstrutura += criarCampoFormulario('Valor (R$) *', 'text', 'valor', valorFormatado, '', true);
        codigoEstrutura += criarCampoFormulario('Data *', 'date', 'data', despesa.data || despesa.data_despesa || '', '', true);
        codigoEstrutura += criarCampoFormulario('Categoria', 'text', 'categoria', despesa.categoria || '');
        
        codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
        codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
        codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarFinanca()">Atualizar</button>';
        codigoEstrutura += '</div>';
        codigoEstrutura += '</form>';

        document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
        Interface.abrirJanela('janela-formulario');
    }
}

async function salvarFinanca() {
    const descricao = document.getElementById('descricao').value.trim();
    const valorRaw = document.getElementById('valor').value;
    const data = document.getElementById('data').value;
    const categoria = document.getElementById('categoria').value.trim();

    if (!descricao || !valorRaw || !data) {
        Utilidades.notificacao('Preencha todos os campos obrigatórios (*).', 'erro');
        return;
    }

    let valorNum = parseFloat(String(valorRaw).replace(/\./g, '').replace(',', '.'));
    if (isNaN(valorNum)) {
        Utilidades.notificacao('Por favor, insira um valor numérico válido.', 'erro');
        return;
    }

    const transacao = {
        id_despesa: registroEmEdicao || Utilidades.gerarId(),
        descricao,
        valor: valorNum,
        data,
        categoria
    };

    try {
        await bd.salvar('financas', transacao);
        Utilidades.notificacao(registroEmEdicao ? 'Transação atualizada com sucesso!' : 'Transação registrada com sucesso!', 'sucesso');
        Interface.fecharJanela('janela-formulario');
        renderizarAbaAtual();
    } catch (erro) {
        console.error(erro);
        Utilidades.notificacao('Erro ao registrar transação.', 'erro');
    }
}

async function excluirFinanca(idDespesa) {
    if (confirm('Deseja realmente excluir esta transação do livro caixa?')) {
        await bd.excluir('financas', idDespesa);
        Utilidades.notificacao('Transação excluída com sucesso!', 'sucesso');
        renderizarAbaAtual();
    }
}