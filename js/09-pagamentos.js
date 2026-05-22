async function renderizarPagamentos(conteudo) {
    const pagamentos = await bd.obterTodos('pagamentos');
    let lotes = [];
    try { lotes = await bd.obterTodos('pagamentos_lote'); } catch (e) {}
    const participantes = await bd.obterTodos('participantes');
    const paroquias = await bd.obterTodos('paroquias');

    let codigoEstrutura = '<div class="fundo-branco borda-padrao raio-md p-md mb-lg"><div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Controle de Pagamentos</h2>';
    codigoEstrutura += '<div class="flex gap-sm md-flex-coluna">';
    codigoEstrutura += '<button class="btn btn-secundario" onclick="abrirFormularioPagamentoLote()">Pagamento em Lote (Paróquia)</button>';
    codigoEstrutura += '<button class="btn btn-primario" onclick="abrirFormularioPagamento()">Novo Pagamento Individual</button>';
    codigoEstrutura += '</div></div>';

    codigoEstrutura += Busca.criarCampoBusca('busca-pagamentos', 'Buscar por descrição...');

    if (lotes && lotes.length > 0) {
        codigoEstrutura += '<h3 class="texto-md peso-bold cor-texto-primario mb-sm mt-md">Recibos em Lote (Paróquias)</h3>';
        codigoEstrutura += '<div class="rolagem-x borda-padrao raio-md fundo-branco mb-lg"><table class="tabela-base" id="tabela-lotes"><thead><tr>';
        codigoEstrutura += '<th>Paróquia</th><th>Tipo</th><th>Descrição</th><th>Valor Total</th><th>Data</th><th>Ações</th></tr></thead><tbody>';

        lotes.sort((a, b) => {
            const paroquiaA = paroquias.find(p => p.id_paroquia === a.id_paroquia);
            const paroquiaB = paroquias.find(p => p.id_paroquia === b.id_paroquia);
            const nomeA = paroquiaA ? (paroquiaA.nome_paroquia || '') : '';
            const nomeB = paroquiaB ? (paroquiaB.nome_paroquia || '') : '';
            const cmpParo = nomeA.localeCompare(nomeB);
            if (cmpParo !== 0) return cmpParo;
            return new Date(a.data_pagamento) - new Date(b.data_pagamento);
        });

        lotes.forEach((lote) => {
            const paroquia = paroquias.find(p => p.id_paroquia === lote.id_paroquia);
            const nomeParoquia = paroquia ? paroquia.nome_paroquia : 'Paróquia não encontrada';

            codigoEstrutura += `<tr>
                    <td class="peso-bold cor-texto-escuro">${nomeParoquia}</td>
                    <td class="cor-texto-escuro">${lote.tipo_pagamento || '-'}</td>
                    <td class="cor-texto-escuro">${lote.descricao || '-'}</td>
                    <td class="peso-bold cor-sucesso">${Utilidades.formatarMoeda(lote.valor_total)}</td>
                    <td class="cor-texto-escuro">${Utilidades.formatarData(lote.data_pagamento)}</td>
                    <td>
                        <div class="flex gap-sm">
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="acionarReciboDiretoLote('${lote.id_lote}')">Recibo</button>
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="editarPagamentoLote('${lote.id_lote}')">Editar</button>
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="excluirPagamentoLote('${lote.id_lote}')">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
        codigoEstrutura += '</tbody></table></div>';
    }

    codigoEstrutura += '<h3 class="texto-md peso-bold cor-texto-primario mb-sm mt-md">Pagamentos Individuais</h3>';
    
    if (pagamentos.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro fundo-cinza borda-padrao raio-md">Nenhum pagamento cadastrado ainda.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-padrao raio-md fundo-branco"><table class="tabela-base" id="tabela-pagamentos"><thead><tr>';
        codigoEstrutura += '<th>Aluno</th><th>Tipo</th><th>Descrição</th><th>Valor</th><th>Data</th><th>Ações</th></tr></thead><tbody>';

        pagamentos.sort((a, b) => {
            const alunoA = participantes.find(p => p.id_participante === a.id_participante);
            const alunoB = participantes.find(p => p.id_participante === b.id_participante);
            const nomeA = alunoA ? (alunoA.nome_participante || '') : '';
            const nomeB = alunoB ? (alunoB.nome_participante || '') : '';
            const cmpNome = nomeA.localeCompare(nomeB);
            if (cmpNome !== 0) return cmpNome;
            return new Date(a.data_pagamento) - new Date(b.data_pagamento);
        });

        pagamentos.forEach((pagamento) => {
            const aluno = participantes.find(p => p.id_participante === pagamento.id_participante);
            const nomeAluno = aluno ? aluno.nome_participante : 'Aluno não encontrado';

            codigoEstrutura += `<tr>
                    <td class="peso-bold cor-texto-escuro">${nomeAluno}</td>
                    <td class="cor-texto-escuro">${pagamento.tipo_pagamento || '-'}</td>
                    <td class="cor-texto-escuro">${pagamento.descricao || '-'}</td>
                    <td class="peso-bold cor-sucesso">${Utilidades.formatarMoeda(pagamento.valor)}</td>
                    <td class="cor-texto-escuro">${Utilidades.formatarData(pagamento.data_pagamento)}</td>
                    <td>
                        <div class="flex gap-sm">
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="acionarReciboDireto('${pagamento.id_pagamento}')">Recibo</button>
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="editarPagamento('${pagamento.id_pagamento}')">Editar</button>
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="excluirPagamento('${pagamento.id_pagamento}')">Excluir</button>
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

async function abrirFormularioPagamento() {
    modoEdicao = 'pagamentos';
    registroEmEdicao = null;
    document.getElementById('titulo-janela').textContent = 'Novo Pagamento Individual';

    const participantes = await bd.obterTodos('participantes');
    const cursos = await bd.obterTodos('cursos');
    participantes.sort((a, b) => a.nome_participante.localeCompare(b.nome_participante));

    let codigoEstrutura = '<form id="formulario-pagamento" class="grid grid-auto-adaptavel gap-md">';
    codigoEstrutura += criarSeletor('Aluno Vinculado', 'id_participante', participantes.map(p => ({ id: p.id_participante, nome: p.nome_participante })), '', true);
    codigoEstrutura += criarSeletor('Tipo de Pagamento', 'tipo_pagamento', ['Inscrição', 'Mensalidade', 'Outros'], '', true);
    codigoEstrutura += criarCampoFormulario('Referência / Descrição', 'text', 'descricao', '', 'Ex: Parcela 01', true);
    codigoEstrutura += criarCampoFormulario('Valor Pago (R$)', 'number', 'valor', '', 'Ex: 150.00', true);
    codigoEstrutura += criarCampoFormulario('Data do Recebimento', 'date', 'data_pagamento', new Date().toISOString().split('T')[0], '', true);
    
    codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
    codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="Interface.fecharJanela(\'janela-formulario\')">Cancelar</button>';
    codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="acionarRecibo()">Gerar Recibo</button>';
    codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarPagamento()">Salvar</button>';
    codigoEstrutura += '</div></form>';

    document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;

    const elParticipante = document.getElementById('id_participante');
    const elTipo = document.getElementById('tipo_pagamento');
    const elValor = document.getElementById('valor');

    elParticipante.addEventListener('change', () => processarRegraValor(elParticipante, elTipo, elValor, participantes, cursos));
    elTipo.addEventListener('change', () => processarRegraValor(elParticipante, elTipo, elValor, participantes, cursos));

    Interface.abrirJanela('janela-formulario');
}

async function editarPagamento(idPagamento) {
    const pagamento = await bd.obter('pagamentos', idPagamento);
    if (!pagamento) return;

    const participantes = await bd.obterTodos('participantes');
    const cursos = await bd.obterTodos('cursos');
    participantes.sort((a, b) => a.nome_participante.localeCompare(b.nome_participante));

    modoEdicao = 'pagamentos';
    registroEmEdicao = idPagamento;
    document.getElementById('titulo-janela').textContent = 'Editar Pagamento Individual';

    let codigoEstrutura = '<form id="formulario-pagamento" class="grid grid-auto-adaptavel gap-md">';
    codigoEstrutura += criarSeletor('Aluno Vinculado', 'id_participante', participantes.map(p => ({ id: p.id_participante, nome: p.nome_participante })), pagamento.id_participante, true);
    codigoEstrutura += criarSeletor('Tipo de Pagamento', 'tipo_pagamento', ['Inscrição', 'Mensalidade', 'Outros'], pagamento.tipo_pagamento, true);
    codigoEstrutura += criarCampoFormulario('Referência / Descrição', 'text', 'descricao', pagamento.descricao, 'Ex: Parcela 01', true);
    codigoEstrutura += criarCampoFormulario('Valor Pago (R$)', 'number', 'valor', pagamento.valor, 'Ex: 150.00', true);
    codigoEstrutura += criarCampoFormulario('Data do Recebimento', 'date', 'data_pagamento', pagamento.data_pagamento, '', true);
    
    codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
    codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="Interface.fecharJanela(\'janela-formulario\')">Cancelar</button>';
    codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="acionarRecibo()">Gerar Recibo</button>';
    codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarPagamento()">Atualizar</button>';
    codigoEstrutura += '</div></form>';

    document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;

    const elParticipante = document.getElementById('id_participante');
    const elTipo = document.getElementById('tipo_pagamento');
    const elValor = document.getElementById('valor');

    elParticipante.addEventListener('change', () => processarRegraValor(elParticipante, elTipo, elValor, participantes, cursos));
    elTipo.addEventListener('change', () => processarRegraValor(elParticipante, elTipo, elValor, participantes, cursos));

    if (pagamento.tipo_pagamento === 'Inscrição' || pagamento.tipo_pagamento === 'Mensalidade') {
        elValor.readOnly = true;
    }

    Interface.abrirJanela('janela-formulario');
}

async function abrirFormularioPagamentoLote() {
    modoEdicao = 'pagamentos_lote';
    registroEmEdicao = null;
    document.getElementById('titulo-janela').textContent = 'Novo Pagamento em Lote';

    const paroquias = await bd.obterTodos('paroquias');
    const participantes = await bd.obterTodos('participantes');
    const cursos = await bd.obterTodos('cursos');
    paroquias.sort((a, b) => a.nome_paroquia.localeCompare(b.nome_paroquia));

    let codigoEstrutura = '<form id="formulario-pagamento-lote" class="grid grid-auto-adaptavel gap-md">';
    codigoEstrutura += criarSeletor('Paróquia (Pagadora)', 'id_paroquia_lote', paroquias.map(p => ({ id: p.id_paroquia, nome: p.nome_paroquia })), '', true);
    codigoEstrutura += '<div class="flex flex-coluna" style="grid-column: 1 / -1;">';
    codigoEstrutura += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Alunos Pagantes *</label>';
    codigoEstrutura += '<div id="lista-alunos-lote" class="borda-padrao raio-md p-md fundo-cinza" style="max-height: 180px; overflow-y: auto;">';
    codigoEstrutura += '<span class="texto-sm cor-texto-claro">Selecione uma paróquia para listar os alunos vinculados.</span>';
    codigoEstrutura += '</div></div>';
    codigoEstrutura += criarSeletor('Tipo de Pagamento', 'tipo_pagamento_lote', ['Inscrição', 'Mensalidade', 'Outros'], '', true);
    codigoEstrutura += criarCampoFormulario('Referência / Descrição', 'text', 'descricao_lote', '', 'Ex: Parcela 01', true);
    codigoEstrutura += criarCampoFormulario('Valor Unitário (R$)', 'number', 'valor_unitario_lote', '', 'Ex: 150.00', true);
    codigoEstrutura += criarCampoFormulario('Data do Recebimento', 'date', 'data_pagamento_lote', new Date().toISOString().split('T')[0], '', true);
    
    codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
    codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="Interface.fecharJanela(\'janela-formulario\')">Cancelar</button>';
    codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="acionarReciboLoteModal()">Gerar Recibo do Lote</button>';
    codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarPagamentoLote()">Salvar Lote</button>';
    codigoEstrutura += '</div></form>';

    document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;

    const elParoquia = document.getElementById('id_paroquia_lote');
    const elTipoLote = document.getElementById('tipo_pagamento_lote');
    const elValorLote = document.getElementById('valor_unitario_lote');

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

    elParoquia.addEventListener('change', (e) => {
        const idParoquia = e.target.value;
        const alunosParoquia = participantes.filter(p => String(p.id_paroquia) === String(idParoquia));
        const container = document.getElementById('lista-alunos-lote');
        
        if(alunosParoquia.length === 0) {
            container.innerHTML = '<span class="texto-sm cor-texto-claro">Nenhum aluno cadastrado para esta paróquia.</span>';
        } else {
            let htmlAlunos = '<div class="grid gap-xs" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">';
            alunosParoquia.forEach(aluno => {
                htmlAlunos += `<label class="flex itens-centro gap-sm cursor-apontador bg-branco p-xs borda-padrao raio-sm hover-fundo-secundario"><input type="checkbox" name="alunos_lote" value="${aluno.id_participante}" data-nome="${aluno.nome_participante}" checked onchange="reavaliarValorLote()"> <span class="cor-texto-escuro texto-sm truncate">${aluno.nome_participante}</span></label>`;
            });
            htmlAlunos += '</div>';
            container.innerHTML = htmlAlunos;
            window.reavaliarValorLote = reavaliarValorLote;
            reavaliarValorLote();
        }
    });

    elTipoLote.addEventListener('change', reavaliarValorLote);

    Interface.abrirJanela('janela-formulario');
}

async function editarPagamentoLote(idLote) {
    const lote = await bd.obter('pagamentos_lote', idLote);
    if (!lote) return;

    modoEdicao = 'pagamentos_lote';
    registroEmEdicao = idLote;
    document.getElementById('titulo-janela').textContent = 'Editar Pagamento em Lote';

    const paroquias = await bd.obterTodos('paroquias');
    const participantes = await bd.obterTodos('participantes');
    const cursos = await bd.obterTodos('cursos');
    paroquias.sort((a, b) => a.nome_paroquia.localeCompare(b.nome_paroquia));

    let codigoEstrutura = '<form id="formulario-pagamento-lote" class="grid grid-auto-adaptavel gap-md">';
    codigoEstrutura += criarSeletor('Paróquia (Pagadora)', 'id_paroquia_lote', paroquias.map(p => ({ id: p.id_paroquia, nome: p.nome_paroquia })), lote.id_paroquia, true);
    codigoEstrutura += '<div class="flex flex-coluna" style="grid-column: 1 / -1;">';
    codigoEstrutura += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Alunos Pagantes *</label>';
    codigoEstrutura += '<div id="lista-alunos-lote" class="borda-padrao raio-md p-md fundo-cinza" style="max-height: 180px; overflow-y: auto;"></div></div>';
    codigoEstrutura += criarSeletor('Tipo de Pagamento', 'tipo_pagamento_lote', ['Inscrição', 'Mensalidade', 'Outros'], lote.tipo_pagamento, true);
    codigoEstrutura += criarCampoFormulario('Referência / Descrição', 'text', 'descricao_lote', lote.descricao, 'Ex: Parcela 01', true);
    codigoEstrutura += criarCampoFormulario('Valor Unitário (R$)', 'number', 'valor_unitario_lote', lote.valor_unitario, 'Ex: 150.00', true);
    codigoEstrutura += criarCampoFormulario('Data do Recebimento', 'date', 'data_pagamento_lote', lote.data_pagamento, '', true);
    
    codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
    codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="Interface.fecharJanela(\'janela-formulario\')">Cancelar</button>';
    codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="acionarReciboLoteModal()">Gerar Recibo</button>';
    codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarPagamentoLote()">Atualizar Lote</button>';
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
                const checked = (lote.id_participantes && lote.id_participantes.includes(aluno.id_participante)) ? 'checked' : '';
                htmlAlunos += `<label class="flex itens-centro gap-sm cursor-apontador bg-branco p-xs borda-padrao raio-sm hover-fundo-secundario"><input type="checkbox" name="alunos_lote" value="${aluno.id_participante}" data-nome="${aluno.nome_participante}" ${checked} onchange="reavaliarValorLote()"> <span class="cor-texto-escuro texto-sm truncate">${aluno.nome_participante}</span></label>`;
            });
            htmlAlunos += '</div>';
            container.innerHTML = htmlAlunos;
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
    renderizarCheckboxes(lote.id_paroquia);
    
    elParoquia.addEventListener('change', (e) => renderizarCheckboxes(e.target.value));
    elTipoLote.addEventListener('change', reavaliarValorLote);

    if (lote.tipo_pagamento === 'Inscrição' || lote.tipo_pagamento === 'Mensalidade') {
        elValorLote.readOnly = true;
    }

    Interface.abrirJanela('janela-formulario');
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