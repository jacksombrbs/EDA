async function renderizarFinancas(conteudo) {
    const despesas = await bd.obterTodos('financas');
    const pagamentos = await bd.obterTodos('pagamentos');
    const participantes = await bd.obterTodos('participantes');

    const transacoes = montarTransacoes(despesas, pagamentos, participantes);
    const resumo = calcularResumoFinancas(transacoes);

    let codigoEstrutura = '<div class="fundo-branco borda-1 borda-solida borda-cor-padrao raio-md p-md mb-lg">';
    codigoEstrutura += '<div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Livro Caixa</h2>';
    codigoEstrutura += '<button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-medium transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 hover-fundo-marca-escuro" onclick="abrirFormularioFinanca()">+ Nova Transação</button>';
    codigoEstrutura += '</div>';

    codigoEstrutura += `
        <div class="flex flex-linha gap-md mb-md md-flex-coluna">
            <div class="flex flex-coluna p-md borda-1 borda-solida borda-cor-padrao raio-md fundo-toast-sucesso flex-1">
                <span class="texto-sm peso-bold cor-texto-claro">Total Entradas</span>
                <h3 class="texto-xl peso-bold cor-texto-sucesso mt-sm">${Utilidades.formatarMoeda(resumo.totalEntradas)}</h3>
            </div>
            <div class="flex flex-coluna p-md borda-1 borda-solida borda-cor-padrao raio-md fundo-toast-erro flex-1">
                <span class="texto-sm peso-bold cor-texto-claro">Total Saídas</span>
                <h3 class="texto-xl peso-bold cor-texto-erro mt-sm">${Utilidades.formatarMoeda(resumo.totalSaidas)}</h3>
            </div>
            <div class="flex flex-coluna p-md borda-1 borda-solida borda-cor-padrao ${resumo.saldo >= 0 ? 'fundo-toast-sucesso' : 'fundo-toast-erro'} raio-md fundo-cinza flex-1">
                <span class="texto-sm peso-bold cor-texto-claro">Saldo em Caixa</span>
                <h3 class="texto-xl peso-bold ${resumo.saldo >= 0 ? 'cor-texto-sucesso' : 'cor-texto-erro'} mt-sm">${Utilidades.formatarMoeda(resumo.saldo)}</h3>
            </div>
        </div>`;

    codigoEstrutura += Busca.criarCampoBusca('busca-livro-caixa', 'Filtrar extrato...');

    if (transacoes.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhuma transação anotada no livro caixa.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-1 borda-solida borda-cor-padrao raio-md fundo-branco"><table class="w-total borda-colapso texto-md" id="tabela-livro-caixa"><thead><tr>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Data</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Descrição</th>';
        codigoEstrutura += '<th class="p-md texto-centro peso-bold cor-texto-primario fundo-cinza">Natureza</th>';
        codigoEstrutura += '<th class="p-md texto-direita peso-bold cor-texto-primario fundo-cinza">Valor</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Ações</th>';
        codigoEstrutura += '</tr></thead><tbody>';

        transacoes.forEach((t, index) => {
            const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
            const corTexto = t.tipo === 'Entrada' ? 'cor-texto-sucesso' : 'cor-texto-erro';
            const prefixo = t.tipo === 'Entrada' ? '+' : '-';

            codigoEstrutura += `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${(t.descricao || '').toLowerCase()}">`;
            codigoEstrutura += `<td class="p-md cor-texto-escuro">${Utilidades.formatarData(t.data)}</td>`;
            codigoEstrutura += `<td class="p-md cor-texto-escuro">${t.descricao}</td>`;
            codigoEstrutura += `<td class="p-md texto-centro"><span class="fundo-cinza ${corTexto} peso-bold texto-sm" style="padding: 4px 10px; border-radius: var(--raio-sm); display: inline-block;">${t.tipo}</span></td>`;
            codigoEstrutura += `<td class="p-md texto-centro peso-bold ${corTexto}">${prefixo} ${Utilidades.formatarMoeda(t.valor)}</td>`;
            codigoEstrutura += `<td class="p-md">`;

            if (t.podeExcluir) {
                codigoEstrutura += `<div class="flex gap-sm">
                    <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-escuro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="editarFinanca('${t.id}')">Editar</button>
                    <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-erro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="excluirFinanca('${t.id}')">Excluir</button>
                </div>`;
            } else {
                codigoEstrutura += '<span class="texto-sm texto-italico cor-texto-claro">Registro de Aluno</span>';
            }

            codigoEstrutura += `</td></tr>`;
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

function montarTransacoes(despesas = [], pagamentos = [], participantes = []) {
    const transacoes = [];

    pagamentos.forEach(p => {
        const aluno = participantes.find(al => String(al.id_participante) === String(p.id_participante));
        const nomeAluno = aluno ? (aluno.nome_participante || aluno.nome) : 'Aluno Não Identificado';
        const valorLimpo = parseFloat(String(p.valor || 0).replace(/\./g, '').replace(',', '.'));
        transacoes.push({
            id: p.id_pagamento,
            data: p.data_pagamento || p.data || new Date().toISOString().split('T')[0],
            descricao: `Recebimento de ${p.tipo_pagamento || 'Pagamento'} - Aluno: ${nomeAluno}`,
            tipo: 'Entrada',
            valor: isNaN(valorLimpo) ? 0 : valorLimpo,
            podeExcluir: false
        });
    });

    despesas.forEach(d => {
        const valorLimpo = parseFloat(String(d.valor || 0).replace(/\./g, '').replace(',', '.'));
        transacoes.push({
            id: d.id_despesa || d.id || Utilidades.gerarId(),
            data: d.data || d.data_despesa || new Date().toISOString().split('T')[0],
            descricao: d.descricao || 'Despesa',
            tipo: 'Saída',
            valor: isNaN(valorLimpo) ? 0 : valorLimpo,
            podeExcluir: true
        });
    });

    transacoes.sort((a, b) => new Date(b.data) - new Date(a.data));
    return transacoes;
}

function calcularResumoFinancas(transacoes = []) {
    const totalEntradas = transacoes.filter(t => t.tipo === 'Entrada').reduce((acc, t) => acc + (t.valor || 0), 0);
    const totalSaidas = transacoes.filter(t => t.tipo === 'Saída').reduce((acc, t) => acc + (t.valor || 0), 0);
    const saldo = totalEntradas - totalSaidas;
    return { totalEntradas, totalSaidas, saldo };
}

async function abrirFormularioFinanca(idDespesa = null) {
    modoEdicao = 'financas';
    registroEmEdicao = idDespesa;
    document.getElementById('titulo-janela').textContent = idDespesa ? 'Editar Transação' : 'Nova Transação';

    const hojeIso = new Date().toISOString().split('T')[0];
    let despesa = { id_despesa: '', descricao: '', valor: '0,00', data: hojeIso, categoria: '' };

    if (idDespesa) {
        try {
            const obtido = await bd.obter('financas', idDespesa);
            if (obtido) {
                despesa = {
                    id_despesa: obtido.id_despesa || obtido.id || idDespesa,
                    descricao: obtido.descricao || '',
                    valor: String(obtido.valor || obtido.valor_despesa || 0).toString().replace('.', ','),
                    data: obtido.data || obtido.data_despesa || hojeIso,
                    categoria: obtido.categoria || ''
                };
            }
        } catch (err) {
            despesa.data = hojeIso;
        }
    }

    let formHTML = '<form id="formulario-despesa" class="flex flex-coluna gap-md" onsubmit="event.preventDefault();">';
    formHTML += `<input type="hidden" id="id_despesa" value="${despesa.id_despesa || ''}">`;

    formHTML += criarCampoFormulario('Descrição', 'text', 'descricao', despesa.descricao || '', 'Ex: Compra de material', true);

    formHTML += '<div class="flex flex-linha md-flex-coluna gap-md w-total">';
    formHTML += '<div class="flex flex-coluna flex-1">';
    formHTML += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Valor (R$)</label>';
    formHTML += `<input type="text" id="valor" value="${despesa.valor || '0,00'}" placeholder="0,00" class="w-total p-sm px-md min-h-44 fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm cor-texto-escuro texto-md transicao focus-sem-outline focus-borda-marca">`;
    formHTML += '</div>';
    formHTML += '<div class="flex flex-coluna flex-1">';
    formHTML += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Data</label>';
    let dataFormatada = '';
    try {
        dataFormatada = Utilidades.formatarData(despesa.data || hojeIso);
    } catch (e) {
        dataFormatada = despesa.data || hojeIso;
    }
    formHTML += `<input type="text" id="data" data-real="${despesa.data || hojeIso}" value="${dataFormatada}" readonly class="w-total p-sm px-md min-h-44 fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm cor-texto-claro texto-md sem-outline" style="cursor: not-allowed;">`;
    formHTML += '</div>';
    formHTML += '</div>';

    formHTML += '<div class="flex justifica-fim gap-md pt-sm md-flex-coluna">';
    formHTML += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3 md-w-total" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
    formHTML += `<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 sombra-1 hover-fundo-marca-escuro md-w-total" onclick="salvarFinanca()">${idDespesa ? 'Atualizar' : 'Salvar'}</button>`;
    formHTML += '</div>';

    formHTML += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formHTML;
    Interface.abrirJanela('janela-formulario');
}

async function editarFinanca(idDespesa) {
    await abrirFormularioFinanca(idDespesa);
}

async function salvarFinanca() {
    const id_field = document.getElementById('id_despesa');
    const id_despesa = id_field && id_field.value ? id_field.value : (registroEmEdicao || Utilidades.gerarId());

    const descricao = document.getElementById('descricao').value.trim();
    const valorRaw = document.getElementById('valor').value;
    const dataElem = document.getElementById('data');
    const data = (dataElem && dataElem.dataset && dataElem.dataset.real) ? dataElem.dataset.real : new Date().toISOString().split('T')[0];
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
        id_despesa,
        descricao,
        valor: valorNum,
        data,
        categoria
    };

    try {
        await bd.salvar('financas', transacao);
        Utilidades.notificacao(id_field && id_field.value ? 'Transação atualizada com sucesso!' : 'Transação registrada com sucesso!', 'sucesso');
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