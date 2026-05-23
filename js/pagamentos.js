async function renderizarPagamentos(conteudo) {
    const pagamentos = await bd.obterTodos('pagamentos');
    let lotes = [];
    try { lotes = await bd.obterTodos('pagamentos_lote'); } catch (e) {}
    const participantes = await bd.obterTodos('participantes');
    const paroquias = await bd.obterTodos('paroquias');

    let codigoEstrutura = '<div class="fundo-branco borda-1 borda-solida borda-cor-padrao raio-md p-md mb-lg">';
    codigoEstrutura += '<div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Controle de Pagamentos</h2>';
    codigoEstrutura += '<div class="flex gap-sm md-flex-coluna">';
    codigoEstrutura += '<button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-medium transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3" onclick="abrirFormularioPagamentoLote()">Pagamento em Lote (Paróquia)</button>';
    codigoEstrutura += '<button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-medium transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 hover-fundo-marca-escuro" onclick="abrirFormularioPagamento()">Novo Pagamento Individual</button>';
    codigoEstrutura += '</div></div>';

    codigoEstrutura += Busca.criarCampoBusca('busca-pagamentos', 'Buscar por descrição...');

    if (lotes && lotes.length > 0) {
        codigoEstrutura += '<h3 class="texto-md peso-bold cor-texto-primario mb-sm mt-md">Recibos em Lote (Paróquias)</h3>';
        codigoEstrutura += '<div class="rolagem-x borda-1 borda-solida borda-cor-padrao raio-md overflow-hidden pos-relativa mb-lg"><table class="w-total borda-colapso texto-md" id="tabela-lotes"><thead><tr>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Paróquia</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Tipo</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Descrição</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Valor Total</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Data</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Ações</th></tr></thead><tbody>';

        lotes.sort((a, b) => {
            const paroquiaA = paroquias.find(p => p.id_paroquia === a.id_paroquia);
            const paroquiaB = paroquias.find(p => p.id_paroquia === b.id_paroquia);
            const nomeA = paroquiaA ? (paroquiaA.nome_paroquia || '') : '';
            const nomeB = paroquiaB ? (paroquiaB.nome_paroquia || '') : '';
            const cmpParo = nomeA.localeCompare(nomeB);
            if (cmpParo !== 0) return cmpParo;
            return new Date(a.data_pagamento) - new Date(b.data_pagamento);
        });

        lotes.forEach((lote, index) => {
            const paroquia = paroquias.find(p => p.id_paroquia === lote.id_paroquia);
            const nomeParoquia = paroquia ? paroquia.nome_paroquia : 'Paróquia não encontrada';
            const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            codigoEstrutura += `<tr class="${classeFundo} transicao hover-fundo-superficie-3">
                    <td class="p-md texto-esquerda cor-texto-escuro peso-medium">${nomeParoquia}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${lote.tipo_pagamento || '-'}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${lote.descricao || '-'}</td>
                    <td class="p-md texto-esquerda peso-bold cor-texto-sucesso">${Utilidades.formatarMoeda(lote.valor_total)}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.formatarData(lote.data_pagamento)}</td>
                    <td class="p-md texto-esquerda">
                        <div class="flex gap-sm">
                            <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-escuro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="acionarReciboDiretoLote('${lote.id_lote}')">Recibo</button>
                            <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-escuro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="editarPagamentoLote('${lote.id_lote}')">Editar</button>
                            <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-erro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="excluirPagamentoLote('${lote.id_lote}')">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
        codigoEstrutura += '</tbody></table></div>';
    }

    codigoEstrutura += '<h3 class="texto-md peso-bold cor-texto-primario mb-sm mt-md">Pagamentos Individuais</h3>';
    
    if (pagamentos.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-md">Nenhum pagamento cadastrado ainda.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-1 borda-solida borda-cor-padrao raio-md overflow-hidden pos-relativa"><table class="w-total borda-colapso texto-md" id="tabela-pagamentos"><thead><tr>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Aluno</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Tipo</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Descrição</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Valor</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Data</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Ações</th></tr></thead><tbody>';

        pagamentos.sort((a, b) => {
            const alunoA = participantes.find(p => p.id_participante === a.id_participante);
            const alunoB = participantes.find(p => p.id_participante === b.id_participante);
            const nomeA = alunoA ? (alunoA.nome_participante || '') : '';
            const nomeB = alunoB ? (alunoB.nome_participante || '') : '';
            const cmpNome = nomeA.localeCompare(nomeB);
            if (cmpNome !== 0) return cmpNome;
            return new Date(a.data_pagamento) - new Date(b.data_pagamento);
        });

        pagamentos.forEach((pagamento, index) => {
            const aluno = participantes.find(p => p.id_participante === pagamento.id_participante);
            const nomeAluno = aluno ? aluno.nome_participante : 'Aluno não encontrado';
            const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            codigoEstrutura += `<tr class="${classeFundo} transicao hover-fundo-superficie-3">
                    <td class="p-md texto-esquerda cor-texto-escuro peso-medium">${nomeAluno}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${pagamento.tipo_pagamento || '-'}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${pagamento.descricao || '-'}</td>
                    <td class="p-md texto-esquerda peso-bold cor-texto-sucesso">${Utilidades.formatarMoeda(pagamento.valor)}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.formatarData(pagamento.data_pagamento)}</td>
                    <td class="p-md texto-esquerda">
                        <div class="flex gap-sm">
                            <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-escuro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="acionarReciboDireto('${pagamento.id_pagamento}')">Recibo</button>
                            <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-escuro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="editarPagamento('${pagamento.id_pagamento}')">Editar</button>
                            <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-erro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="excluirPagamento('${pagamento.id_pagamento}')">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
        codigoEstrutura += '</tbody></table></div>';
    }
    codigoEstrutura += '</div>';

    conteudo.innerHTML = codigoEstrutura;

    document.getElementById('busca-pagamentos')?.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        const linhas = document.querySelectorAll('#tabela-pagamentos tbody tr');
        linhas.forEach(linha => {
            const texto = linha.textContent.toLowerCase();
            linha.classList.toggle('oculto', !texto.includes(termo));
        });
        const linhasLote = document.querySelectorAll('#tabela-lotes tbody tr');
        if (linhasLote) {
            linhasLote.forEach(linha => {
                const texto = linha.textContent.toLowerCase();
                linha.classList.toggle('oculto', !texto.includes(termo));
            });
        }
    });
}

function processarRegraValor(idParticipanteElement, tipoPagamentoElement, valorElement, participantes, cursos) {
    const tipo = tipoPagamentoElement.value;
    const idParticipante = idParticipanteElement.value;

    if (tipo === 'Outros' || !tipo) {
        valorElement.readOnly = false;
        if (!registroEmEdicao) valorElement.value = '';
        return;
    }

    if (idParticipante) {
        const participante = participantes.find(p => String(p.id_participante) === String(idParticipante));
        if (participante && participante.id_curso) {
            const curso = cursos.find(c => String(c.id_curso) === String(participante.id_curso));
            if (curso) {
                if (tipo === 'Inscrição') {
                    valorElement.value = curso.valor_inscricao || 0;
                } else if (tipo === 'Mensalidade') {
                    valorElement.value = curso.valor_mensalidade || 0;
                }
                valorElement.readOnly = true;
                return;
            }
        }
    }
    valorElement.readOnly = false;
}

async function editarPagamento(idPagamento) {
    await abrirFormularioPagamento(idPagamento);
}

async function abrirFormularioPagamento(idPagamento = null) {
    modoEdicao = 'pagamentos';
    registroEmEdicao = idPagamento;
    
    let pagamento = null;
    if (idPagamento) {
        pagamento = await bd.obter('pagamentos', idPagamento);
        if (!pagamento) return;
        document.getElementById('titulo-janela').textContent = 'Editar Pagamento Individual';
    } else {
        document.getElementById('titulo-janela').textContent = 'Novo Pagamento Individual';
    }

    const participantes = await bd.obterTodos('participantes');
    const cursos = await bd.obterTodos('cursos');
    participantes.sort((a, b) => a.nome_participante.localeCompare(b.nome_participante));

    const dataIso = pagamento ? pagamento.data_pagamento : new Date().toISOString().split('T')[0];
    const dataFormatada = Utilidades.formatarData(dataIso);

    let codigoEstrutura = '<form id="formulario-pagamento" class="flex flex-coluna gap-md w-total">';
    codigoEstrutura += criarSeletor('Aluno Vinculado', 'id_participante', participantes.map(p => ({ id: p.id_participante, nome: p.nome_participante })), pagamento ? pagamento.id_participante : '', true);
    
    codigoEstrutura += '<div class="flex gap-md w-total md-flex-coluna">';
    codigoEstrutura += '<div style="flex: 1;">' + criarSeletor('Tipo de Pagamento', 'tipo_pagamento', ['Inscrição', 'Mensalidade', 'Outros'], pagamento ? pagamento.tipo_pagamento : '', true) + '</div>';
    codigoEstrutura += '<div style="flex: 1;">' + criarCampoFormulario('Valor Pago (R$)', 'number', 'valor', pagamento ? pagamento.valor : '', 'Ex: 150.00', true) + '</div>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += '<div class="flex gap-md w-total md-flex-coluna">';
    codigoEstrutura += '<div style="flex: 1;">' + criarCampoFormulario('Referência / Descrição', 'text', 'descricao', pagamento ? pagamento.descricao : '', 'Ex: Parcela 01', true) + '</div>';
    codigoEstrutura += '<div style="flex: 1;" class="flex flex-coluna w-total">';
    codigoEstrutura += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Data do Recebimento</label>';
    codigoEstrutura += '<input type="text" value="' + dataFormatada + '" readonly class="w-total p-sm px-md min-h-44 fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm cor-texto-claro texto-md sem-outline" style="cursor: not-allowed;">';
    codigoEstrutura += '<input type="hidden" id="data_pagamento" value="' + dataIso + '">';
    codigoEstrutura += '</div>';
    codigoEstrutura += '</div>';
    
    const textoBotaoSalvar = pagamento ? 'Atualizar' : 'Salvar';

    codigoEstrutura += '<div class="flex justifica-fim gap-sm pt-sm md-flex-coluna w-total">';
    codigoEstrutura += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3 md-w-total" onclick="Interface.fecharJanela(\'janela-formulario\')">Cancelar</button>';
    codigoEstrutura += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3 md-w-total" onclick="acionarRecibo()">Gerar Recibo</button>';
    codigoEstrutura += `<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 sombra-1 hover-fundo-marca-escuro md-w-total" onclick="salvarPagamento()">${textoBotaoSalvar}</button>`;
    codigoEstrutura += '</div></form>';

    document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;

    const elParticipante = document.getElementById('id_participante');
    const elTipo = document.getElementById('tipo_pagamento');
    const elValor = document.getElementById('valor');

    elParticipante.addEventListener('change', () => processarRegraValor(elParticipante, elTipo, elValor, participantes, cursos));
    elTipo.addEventListener('change', () => processarRegraValor(elParticipante, elTipo, elValor, participantes, cursos));

    if (pagamento && (pagamento.tipo_pagamento === 'Inscrição' || pagamento.tipo_pagamento === 'Mensalidade')) {
        elValor.readOnly = true;
    }

    Interface.abrirJanela('janela-formulario');
}

async function abrirFormularioPagamentoLote(idLote = null) {
    modoEdicao = 'pagamentos_lote';
    registroEmEdicao = idLote;
    
    let lote = null;
    if (idLote) {
        lote = await bd.obter('pagamentos_lote', idLote);
        if (!lote) return;
        document.getElementById('titulo-janela').textContent = 'Editar Pagamento em Lote';
    } else {
        document.getElementById('titulo-janela').textContent = 'Novo Pagamento em Lote';
    }

    const paroquias = await bd.obterTodos('paroquias');
    const participantes = await bd.obterTodos('participantes');
    const cursos = await bd.obterTodos('cursos');
    paroquias.sort((a, b) => a.nome_paroquia.localeCompare(b.nome_paroquia));

    const dataIso = lote ? lote.data_pagamento : new Date().toISOString().split('T')[0];
    const dataFormatada = Utilidades.formatarData(dataIso);

    let codigoEstrutura = '<form id="formulario-pagamento-lote" class="flex flex-coluna gap-md w-total">';
    codigoEstrutura += criarSeletor('Paróquia (Pagadora)', 'id_paroquia_lote', paroquias.map(p => ({ id: p.id_paroquia, nome: p.nome_paroquia })), lote ? lote.id_paroquia : '', true);
    codigoEstrutura += '<div class="flex flex-coluna w-total">';
    codigoEstrutura += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Alunos Pagantes</label>';
    codigoEstrutura += '<div id="lista-alunos-lote" class="borda-1 borda-solida borda-cor-padrao raio-md p-md fundo-superficie-2" style="max-height: 180px; overflow-y: auto;">';
    if (!lote) codigoEstrutura += '<span class="texto-sm cor-texto-claro">Selecione uma paróquia para listar os alunos vinculados.</span>';
    codigoEstrutura += '</div></div>';
    
    codigoEstrutura += '<div class="flex gap-md w-total md-flex-coluna">';
    codigoEstrutura += '<div style="flex: 1;">' + criarSeletor('Tipo de Pagamento', 'tipo_pagamento_lote', ['Inscrição', 'Mensalidade', 'Outros'], lote ? lote.tipo_pagamento : '', true) + '</div>';
    codigoEstrutura += '<div style="flex: 1;">' + criarCampoFormulario('Valor Unitário (R$)', 'number', 'valor_unitario_lote', lote ? lote.valor_unitario : '', 'Ex: 150.00', true) + '</div>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += '<div class="flex gap-md w-total md-flex-coluna">';
    codigoEstrutura += '<div style="flex: 1;">' + criarCampoFormulario('Referência / Descrição', 'text', 'descricao_lote', lote ? lote.descricao : '', 'Ex: Parcela 01', true) + '</div>';
    codigoEstrutura += '<div style="flex: 1;" class="flex flex-coluna w-total">';
    codigoEstrutura += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Data do Recebimento</label>';
    codigoEstrutura += '<input type="text" value="' + dataFormatada + '" readonly class="w-total p-sm px-md min-h-44 fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm cor-texto-claro texto-md sem-outline" style="cursor: not-allowed;">';
    codigoEstrutura += '<input type="hidden" id="data_pagamento_lote" value="' + dataIso + '">';
    codigoEstrutura += '</div>';
    codigoEstrutura += '</div>';
    
    const textoBotaoSalvar = lote ? 'Atualizar Lote' : 'Salvar Lote';

    codigoEstrutura += '<div class="flex justifica-fim gap-sm pt-sm md-flex-coluna w-total">';
    codigoEstrutura += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3 md-w-total" onclick="Interface.fecharJanela(\'janela-formulario\')">Cancelar</button>';
    codigoEstrutura += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3 md-w-total" onclick="acionarReciboLoteModal()">Gerar Recibo</button>';
    codigoEstrutura += `<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 sombra-1 hover-fundo-marca-escuro md-w-total" onclick="salvarPagamentoLote()">${textoBotaoSalvar}</button>`;
    codigoEstrutura += '</div></form>';

    document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;

    const elParoquia = document.getElementById('id_paroquia_lote');
    const elTipoLote = document.getElementById('tipo_pagamento_lote');
    const elValorLote = document.getElementById('valor_unitario_lote');

    function renderizarCheckboxes(idParoquia) {
        const alunosParoquia = participantes.filter(p => String(p.id_paroquia) === String(idParoquia));
        const container = document.getElementById('lista-alunos-lote');
        
        if(alunosParoquia.length === 0) {
            container.innerHTML = '<span class="texto-sm cor-texto-claro">Nenhum aluno cadastrado para esta paróquia.</span>';
        } else {
            let htmlAlunos = '<div class="grid gap-xs" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">';
            alunosParoquia.forEach(aluno => {
                const checked = (lote && lote.id_participantes) 
                    ? (lote.id_participantes.includes(aluno.id_participante) ? 'checked' : '') 
                    : 'checked';
                
                htmlAlunos += `<label class="flex itens-centro gap-sm cursor-apontador fundo-branco p-sm borda-1 borda-solida borda-cor-padrao raio-sm hover-fundo-superficie-3"><input type="checkbox" name="alunos_lote" value="${aluno.id_participante}" data-nome="${aluno.nome_participante}" ${checked} onchange="reavaliarValorLote()"> <span class="cor-texto-escuro texto-sm truncate">${aluno.nome_participante}</span></label>`;
            });
            htmlAlunos += '</div>';
            container.innerHTML = htmlAlunos;
            if (!lote) reavaliarValorLote();
        }
    }

    function reavaliarValorLote() {
        const checkboxes = document.querySelectorAll('input[name="alunos_lote"]:checked');
        if (checkboxes.length > 0) {
            const tempInput = document.createElement('input');
            tempInput.value = checkboxes[0].value;
            processarRegraValor(tempInput, elTipoLote, elValorLote, participantes, cursos);
        } else {
            if (elTipoLote.value !== 'Outros') elValorLote.value = '';
            elValorLote.readOnly = false;
        }
    }

    window.reavaliarValorLote = reavaliarValorLote;
    
    if (lote && lote.id_paroquia) {
        renderizarCheckboxes(lote.id_paroquia);
    }
    
    elParoquia.addEventListener('change', (e) => renderizarCheckboxes(e.target.value));
    elTipoLote.addEventListener('change', reavaliarValorLote);

    if (lote && (lote.tipo_pagamento === 'Inscrição' || lote.tipo_pagamento === 'Mensalidade')) {
        elValorLote.readOnly = true;
    }

    Interface.abrirJanela('janela-formulario');
}

async function editarPagamentoLote(idLote) {
    await abrirFormularioPagamentoLote(idLote);
}

async function excluirPagamento(idPagamento) {
    if (confirm('Deseja realmente excluir este registro de pagamento? O saldo do livro caixa será afetado.')) {
        await bd.excluir('pagamentos', idPagamento);
        Utilidades.notificacao('Pagamento excluído com sucesso!', 'sucesso');
        renderizarAbaAtual();
    }
}

async function excluirPagamentoLote(idLote) {
    if (confirm('Deseja realmente excluir este lote? Todos os pagamentos individuais vinculados a ele também serão excluídos.')) {
        const pagamentos = await bd.obterTodos('pagamentos');
        const vinculados = pagamentos.filter(p => p.id_lote === idLote);
        
        for (let p of vinculados) {
            await bd.excluir('pagamentos', p.id_pagamento);
        }
        
        await bd.excluir('pagamentos_lote', idLote);
        Utilidades.notificacao('Lote e pagamentos vinculados excluídos!', 'sucesso');
        renderizarAbaAtual();
    }
}

async function salvarPagamento() {
    const id_participante = document.getElementById('id_participante').value;
    const tipo_pagamento = document.getElementById('tipo_pagamento').value;
    const descricao = document.getElementById('descricao').value.trim();
    const valor = document.getElementById('valor').value;
    const data_pagamento = document.getElementById('data_pagamento').value;

    if (!id_participante || !tipo_pagamento || !valor || !data_pagamento) {
        Utilidades.notificacao('Por favor, preencha todos os campos obrigatórios.', 'erro');
        return;
    }

    const valorNumerico = parseFloat(String(valor).replace('.', '').replace(',', '.'));
    if (isNaN(valorNumerico)) {
        Utilidades.notificacao('O valor digitado é inválido.', 'erro');
        return;
    }

    const pagamento = {
        id_pagamento: registroEmEdicao || Utilidades.gerarId(),
        id_participante,
        tipo_pagamento,
        descricao,
        valor: valorNumerico,
        data_pagamento
    };

    try {
        await bd.salvar('pagamentos', pagamento);
        Utilidades.notificacao(registroEmEdicao ? 'Pagamento atualizado!' : 'Pagamento cadastrado!', 'sucesso');
        Interface.fecharJanela('janela-formulario');
        renderizarAbaAtual();
    } catch (erro) {
        Utilidades.notificacao('Erro ao salvar o pagamento.', 'erro');
    }
}

async function salvarPagamentoLote() {
    const idParoquia = document.getElementById('id_paroquia_lote').value;
    const checkboxes = document.querySelectorAll('input[name="alunos_lote"]:checked');
    const tipoPagamento = document.getElementById('tipo_pagamento_lote').value;
    const descricao = document.getElementById('descricao_lote').value.trim();
    const valorUnitario = document.getElementById('valor_unitario_lote').value;
    const dataPagamento = document.getElementById('data_pagamento_lote').value;

    if (!idParoquia || checkboxes.length === 0 || !tipoPagamento || !valorUnitario || !dataPagamento) {
        Utilidades.notificacao('Preencha os campos e selecione ao menos um aluno pagante.', 'erro');
        return;
    }

    const valorUnitarioNumerico = parseFloat(String(valorUnitario).replace('.', '').replace(',', '.'));
    if (isNaN(valorUnitarioNumerico)) {
        Utilidades.notificacao('O valor unitário digitado é inválido.', 'erro');
        return;
    }

    const id_lote = registroEmEdicao || Utilidades.gerarId();
    const listaIds = [];
    const nomesAlunos = [];

    checkboxes.forEach(box => {
        listaIds.push(box.value);
        nomesAlunos.push(box.getAttribute('data-nome'));
    });

    const valorTotal = valorUnitarioNumerico * listaIds.length;

    const lote = {
        id_lote: id_lote,
        id_paroquia: idParoquia,
        id_participantes: listaIds,
        nomes_participantes: nomesAlunos,
        tipo_pagamento: tipoPagamento,
        descricao: descricao,
        valor_unitario: valorUnitarioNumerico,
        valor_total: valorTotal,
        data_pagamento: dataPagamento
    };

    try {
        if (registroEmEdicao) {
            const pagamentosAntigos = await bd.obterTodos('pagamentos');
            const vinculados = pagamentosAntigos.filter(p => p.id_lote === id_lote);
            for (let p of vinculados) {
                await bd.excluir('pagamentos', p.id_pagamento);
            }
        }

        await bd.salvar('pagamentos_lote', lote);

        for (let idParticipante of listaIds) {
            const pagamento = {
                id_pagamento: Utilidades.gerarId(),
                id_participante: idParticipante,
                tipo_pagamento: tipoPagamento,
                descricao: descricao,
                valor: valorUnitarioNumerico,
                data_pagamento: dataPagamento,
                id_lote: id_lote
            };
            await bd.salvar('pagamentos', pagamento);
        }

        Utilidades.notificacao('Pagamentos em lote salvos com sucesso!', 'sucesso');
        Interface.fecharJanela('janela-formulario');
        renderizarAbaAtual();
    } catch (erro) {
        Utilidades.notificacao('Erro ao salvar em lote.', 'erro');
    }
}

async function acionarReciboDireto(idPagamento) {
    const pagamento = await bd.obter('pagamentos', idPagamento);
    if (!pagamento) return;

    const p = await bd.obter('participantes', pagamento.id_participante);
    const nomeAluno = p ? p.nome_participante : 'Aluno não identificado';
    const dataFormatada = Utilidades.formatarData(pagamento.data_pagamento);
    const descFinal = pagamento.tipo_pagamento ? `${pagamento.tipo_pagamento} - ${pagamento.descricao}` : pagamento.descricao;

    gerarReciboGenerico(nomeAluno, pagamento.valor, descFinal, dataFormatada);
}

async function acionarReciboDiretoLote(idLote) {
    const lote = await bd.obter('pagamentos_lote', idLote);
    if (!lote) return;

    const paroquia = await bd.obter('paroquias', lote.id_paroquia);
    const nomeParoquia = paroquia ? paroquia.nome_paroquia : 'Paróquia';
    
    const dataFormatada = Utilidades.formatarData(lote.data_pagamento);
    const descFinal = lote.tipo_pagamento ? `${lote.tipo_pagamento} - ${lote.descricao}` : lote.descricao;

    gerarReciboLoteTemplate(nomeParoquia, lote.nomes_participantes, lote.valor_total, descFinal, dataFormatada);
}

async function acionarRecibo() {
    const idParticipante = document.getElementById('id_participante').value;
    const tipoPagamento = document.getElementById('tipo_pagamento').value;
    const descricao = document.getElementById('descricao').value.trim();
    const valor = document.getElementById('valor').value;
    const dataPagamento = document.getElementById('data_pagamento').value;

    if (!idParticipante || !valor || !dataPagamento) {
        Utilidades.notificacao('Preencha os dados do pagamento antes de gerar o recibo.', 'erro');
        return;
    }

    const p = await bd.obter('participantes', idParticipante);
    const nomeAluno = p ? p.nome_participante : 'Aluno não identificado';
    const dataFormatada = Utilidades.formatarData(dataPagamento);
    const descFinal = tipoPagamento ? `${tipoPagamento} - ${descricao}` : descricao;

    gerarReciboGenerico(nomeAluno, valor, descFinal, dataFormatada);
}

async function acionarReciboLoteModal() {
    const idParoquia = document.getElementById('id_paroquia_lote').value;
    const checkboxes = document.querySelectorAll('input[name="alunos_lote"]:checked');
    const tipoPagamento = document.getElementById('tipo_pagamento_lote').value;
    const descricao = document.getElementById('descricao_lote').value.trim();
    const valorUnitario = document.getElementById('valor_unitario_lote').value;
    const dataPagamento = document.getElementById('data_pagamento_lote').value;

    if (!idParoquia || checkboxes.length === 0 || !valorUnitario || !dataPagamento) {
        Utilidades.notificacao('Preencha os dados antes de gerar o recibo do lote.', 'erro');
        return;
    }

    const paroquia = await bd.obter('paroquias', idParoquia);
    const nomeParoquia = paroquia ? paroquia.nome_paroquia : 'Paróquia';
    
    const nomesAlunos = Array.from(checkboxes).map(box => box.getAttribute('data-nome'));
    
    const valorUnitarioNumerico = parseFloat(String(valorUnitario).replace('.', '').replace(',', '.'));
    const valorTotal = valorUnitarioNumerico * nomesAlunos.length;
    
    const dataFormatada = Utilidades.formatarData(dataPagamento);
    const descFinal = tipoPagamento ? `${tipoPagamento} - ${descricao}` : descricao;

    gerarReciboLoteTemplate(nomeParoquia, nomesAlunos, valorTotal, descFinal, dataFormatada);
}

function gerarReciboGenerico(nomeAluno, valor, descricao, data) {
    const valorNumerico = typeof valor === 'string' ? parseFloat(valor.replace('.', '').replace(',', '.')) : valor;
    const valorFormatado = valorNumerico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const janelaRecibo = window.open('', '_blank');
    if (!janelaRecibo) {
        Utilidades.notificacao('Habilite os pop-ups do seu navegador para visualizar o recibo.', 'alerta');
        return;
    }

    const htmlDoRecibo = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Recibo de Pagamento - ${nomeAluno}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #333; background-color: #fff; }
                .recibo-container { border: 2px solid #333; border-radius: 8px; padding: 30px; max-width: 700px; margin: 0 auto; }
                .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 20px; margin-bottom: 30px; }
                .header h2 { margin: 0 0 5px 0; font-size: 18px; color: #555; }
                .header h1 { margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px; }
                .valor-box { font-size: 22px; font-weight: bold; text-align: right; margin-bottom: 30px; color: #2c3e50; }
                .content { font-size: 18px; line-height: 1.8; text-align: justify; }
                .content strong { text-transform: uppercase; }
                .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
                .assinatura-box { width: 250px; text-align: center; border-top: 1px solid #333; padding-top: 10px; font-size: 14px; }
                @media print { body { padding: 0; } .recibo-container { border: 1px solid #000; box-shadow: none; } }
            </style>
        </head>
        <body>
            <div class="recibo-container">
                <div class="header">
                    <h2>Escola Catequética Discípulo Amado</h2>
                    <h1>R E C I B O</h1>
                </div>
                
                <div class="valor-box">
                    Valor: ${valorFormatado}
                </div>
                
                <div class="content">
                    <p>Recebemos de <strong>${nomeAluno}</strong>, a importância de <strong>${valorFormatado}</strong>, referente a <strong>${descricao}</strong>.</p>
                    <p>Por ser verdade, firmamos o presente recibo.</p>
                </div>
                
                <div class="footer">
                    <div>
                        <p>Local e Data: <strong>Curitiba, ${data}</strong></p>
                    </div>
                    <div class="assinatura-box">
                        Assinatura do Recebedor<br>
                        <span style="font-size: 12px; color: #666;">Escola Catequética Discípulo Amado</span>
                    </div>
                </div>
            </div>
            <script>
                window.onload = function() {
                    setTimeout(() => { window.print(); }, 300);
                };
            </script>
        </body>
        </html>
    `;

    janelaRecibo.document.open();
    janelaRecibo.document.write(htmlDoRecibo);
    janelaRecibo.document.close();
}

function gerarReciboLoteTemplate(nomeParoquia, nomesAlunos, valorTotal, descricao, data) {
    const valorFormatado = valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const janelaRecibo = window.open('', '_blank');
    if (!janelaRecibo) {
        Utilidades.notificacao('Habilite os pop-ups do seu navegador para visualizar o recibo.', 'alerta');
        return;
    }

    const htmlDoRecibo = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Recibo de Pagamento - ${nomeParoquia}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #333; background-color: #fff; }
                .recibo-container { border: 2px solid #333; border-radius: 8px; padding: 30px; max-width: 700px; margin: 0 auto; }
                .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 20px; margin-bottom: 30px; }
                .header h2 { margin: 0 0 5px 0; font-size: 18px; color: #555; }
                .header h1 { margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px; }
                .valor-box { font-size: 22px; font-weight: bold; text-align: right; margin-bottom: 30px; color: #2c3e50; }
                .content { font-size: 16px; line-height: 1.6; text-align: justify; }
                .content strong { text-transform: uppercase; }
                .lista-alunos { margin: 15px 0; padding-left: 20px; font-size: 14px; column-count: 2; }
                .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
                .assinatura-box { width: 250px; text-align: center; border-top: 1px solid #333; padding-top: 10px; font-size: 14px; }
                @media print { body { padding: 0; } .recibo-container { border: 1px solid #000; box-shadow: none; } }
            </style>
        </head>
        <body>
            <div class="recibo-container">
                <div class="header">
                    <h2>Escola Catequética Discípulo Amado</h2>
                    <h1>R E C I B O</h1>
                </div>
                
                <div class="valor-box">
                    Total Recebido: ${valorFormatado}
                </div>
                
                <div class="content">
                    <p>Recebemos de <strong>${nomeParoquia}</strong>, a importância total de <strong>${valorFormatado}</strong>, referente a <strong>${descricao}</strong> dos seguintes alunos vinculados:</p>
                    <ul class="lista-alunos">
                        ${nomesAlunos.map(nome => `<li>${nome}</li>`).join('')}
                    </ul>
                    <p>Por ser verdade, firmamos o presente recibo.</p>
                </div>
                
                <div class="footer">
                    <div>
                        <p>Local e Data: <strong>Curitiba, ${data}</strong></p>
                    </div>
                    <div class="assinatura-box">
                        Assinatura do Recebedor<br>
                        <span style="font-size: 12px; color: #666;">Escola Catequética Discípulo Amado</span>
                    </div>
                </div>
            </div>
            <script>
                window.onload = function() {
                    setTimeout(() => { window.print(); }, 300);
                };
            </script>
        </body>
        </html>
    `;

    janelaRecibo.document.open();
    janelaRecibo.document.write(htmlDoRecibo);
    janelaRecibo.document.close();
}