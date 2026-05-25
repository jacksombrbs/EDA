async function renderizarPagamentos(conteudo) {
    const pagamentos = await bd.obterTodos('pagamentos');
    let lotes = [];
    try { lotes = await bd.obterTodos('pagamentos_lote'); } catch (e) {}
    const participantes = await bd.obterTodos('participantes');
    const paroquias = await bd.obterTodos('paroquias');

    let codigoEstrutura = '<div class="cartao-padrao mb-lg">';
    const botoesCabecalho = '<div class="flex gap-sm md-flex-coluna">'
        + criarBotao('Pagamento em Lote (Paróquia)', 'abrirFormularioPagamentoLote()', 'secundario')
        + criarBotao('Novo Pagamento Individual', 'abrirFormularioPagamento()')
        + '</div>';
    codigoEstrutura += criarCabecalhoSecao('Controle de Pagamentos', botoesCabecalho);

    codigoEstrutura += Busca.criarCampoBusca('busca-pagamentos', 'Buscar por descrição...');

    if (lotes && lotes.length > 0) {
        codigoEstrutura += '<h3 class="texto-md peso-bold cor-texto-primario mb-sm mt-md">Recibos em Lote (Paróquias)</h3>';
        let linhasLotes = '';

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

            linhasLotes += `<tr class="${classeFundo} transicao hover-fundo-superficie-3">
                    <td class="p-md texto-esquerda cor-texto-escuro peso-medium">${nomeParoquia}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${lote.tipo_pagamento || '-'}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${lote.descricao || '-'}</td>
                    <td class="p-md texto-esquerda peso-bold cor-texto-sucesso">${Utilidades.formatarMoeda(lote.valor_total)}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.formatarData(lote.data_pagamento)}</td>
                    <td class="p-md texto-esquerda">
                        ${criarAcoesTabela([
                            { rotulo: 'Recibo', acao: `acionarReciboDiretoLote('${lote.id_lote}')` },
                            { rotulo: 'Editar', acao: `editarPagamentoLote('${lote.id_lote}')` },
                            { rotulo: 'Excluir', acao: `excluirPagamentoLote('${lote.id_lote}')`, perigo: true }
                        ])}
                    </td>
                </tr>`;
        });
        codigoEstrutura += criarContainerTabela(
            ['Paróquia', 'Tipo', 'Descrição', 'Valor Total', 'Data', 'Ações'],
            linhasLotes,
            'tabela-lotes',
            'corpo-tabela-lotes',
            'mb-lg'
        );
    }

    codigoEstrutura += '<h3 class="texto-md peso-bold cor-texto-primario mb-sm mt-md">Pagamentos Individuais</h3>';
    
    if (pagamentos.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhum pagamento cadastrado ainda.</p>';
    } else {
        let linhasPagamentos = '';

        pagamentos.sort((a, b) => {
            const participanteA = participantes.find(p => p.id_participante === a.id_participante);
            const participanteB = participantes.find(p => p.id_participante === b.id_participante);
            const nomeA = participanteA ? (participanteA.nome_participante || '') : '';
            const nomeB = participanteB ? (participanteB.nome_participante || '') : '';
            const cmpNome = nomeA.localeCompare(nomeB);
            if (cmpNome !== 0) return cmpNome;
            return new Date(a.data_pagamento) - new Date(b.data_pagamento);
        });

        pagamentos.forEach((pagamento, index) => {
            const participante = participantes.find(p => p.id_participante === pagamento.id_participante);
            const nomeParticipante = participante ? participante.nome_participante : 'Participante não encontrado';
            const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            linhasPagamentos += `<tr class="${classeFundo} transicao hover-fundo-superficie-3">
                    <td class="p-md texto-esquerda cor-texto-escuro peso-medium">${nomeParticipante}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${pagamento.tipo_pagamento || '-'}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${pagamento.descricao || '-'}</td>
                    <td class="p-md texto-esquerda peso-bold cor-texto-sucesso">${Utilidades.formatarMoeda(pagamento.valor)}</td>
                    <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.formatarData(pagamento.data_pagamento)}</td>
                    <td class="p-md texto-esquerda">
                        ${criarAcoesTabela([
                            { rotulo: 'Recibo', acao: `acionarReciboDireto('${pagamento.id_pagamento}')` },
                            { rotulo: 'Editar', acao: `editarPagamento('${pagamento.id_pagamento}')` },
                            { rotulo: 'Excluir', acao: `excluirPagamento('${pagamento.id_pagamento}')`, perigo: true }
                        ])}
                    </td>
                </tr>`;
        });
        codigoEstrutura += criarContainerTabela(
            ['Participante', 'Tipo', 'Descrição', 'Valor', 'Data', 'Ações'],
            linhasPagamentos,
            'tabela-pagamentos',
            'corpo-tabela-pagamentos'
        );
    }
    codigoEstrutura += '</div>';

    conteudo.innerHTML = codigoEstrutura;

    Busca.vincularFiltro('busca-pagamentos', 'corpo-tabela-pagamentos');
    Busca.vincularFiltro('busca-pagamentos', 'corpo-tabela-lotes');
}

function processarRegraValor(idParticipanteElement, tipoPagamentoElement, valorElement, participantes, cursos, pagamentos = []) {
    const tipo = tipoPagamentoElement.value;
    const idParticipante = idParticipanteElement.value;

    const elQtd = document.getElementById('quantidade');
    const elQtdLote = document.getElementById('quantidade_lote');
    let qtd = elQtd ? (parseInt(elQtd.value) || 1) : (elQtdLote ? (parseInt(elQtdLote.value) || 1) : 1);

    const containerQtd = document.getElementById('container-quantidade');
    const containerQtdLote = document.getElementById('container-quantidade-lote');
    if (containerQtd) containerQtd.style.display = tipo === 'Mensalidade' ? 'block' : 'none';
    if (containerQtdLote) containerQtdLote.style.display = tipo === 'Mensalidade' ? 'block' : 'none';

    if (tipo === 'Outros' || !tipo) {
        valorElement.readOnly = false;
        if (elQtd) elQtd.removeAttribute('max');
        return;
    }

    if (idParticipante) {
        const participante = participantes.find(p => String(p.id_participante) === String(idParticipante));
        if (participante && participante.id_curso) {
            const curso = cursos.find(c => String(c.id_curso) === String(participante.id_curso));
            if (curso) {
                if (tipo === 'Inscrição') {
                    valorElement.value = curso.valor_inscricao || 0;
                    if (elQtd) elQtd.removeAttribute('max');
                } else if (tipo === 'Mensalidade') {

                    const mensalidadesJaPagas = pagamentos
                        .filter(p => String(p.id_participante) === String(idParticipante) 
                                  && p.tipo_pagamento === 'Mensalidade' 
                                  && p.id_pagamento !== registroEmEdicao)
                        .reduce((total, p) => total + (parseInt(p.quantidade) || 1), 0);
                    
                    const totalPermitidoCurso = curso.quantidade_mensalidades || 0;
                    let maxPermitido = totalPermitidoCurso - mensalidadesJaPagas;
                    if (maxPermitido < 0) maxPermitido = 0;

                    if (elQtd) {
                        elQtd.setAttribute('max', maxPermitido);
                        
                        if (qtd > maxPermitido) {
                            qtd = maxPermitido;
                            elQtd.value = qtd;
                            
                            if (maxPermitido === 0) {
                                Utilidades.notificacao('Este participante já quitou todas as mensalidades do curso.', 'aviso');
                            } else {
                                Utilidades.notificacao(`Limite atingido. Restam apenas ${maxPermitido} mensalidade(s).`, 'aviso');
                            }
                        }
                    }

                    valorElement.value = (curso.valor_mensalidade || 0) * qtd;
                }
                valorElement.readOnly = true;
                return;
            }
        }
    }
    valorElement.readOnly = false;
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
    const pagamentos = await bd.obterTodos('pagamentos');
    participantes.sort((a, b) => a.nome_participante.localeCompare(b.nome_participante));

    const dataIso = pagamento ? pagamento.data_pagamento : new Date().toISOString().split('T')[0];
    const dataFormatada = Utilidades.formatarData(dataIso);

    let codigoEstrutura = '<form id="formulario-pagamento" class="flex flex-coluna gap-md w-total">';
    codigoEstrutura += criarSeletor('Participante', 'id_participante', participantes.map(p => ({ id: p.id_participante, nome: p.nome_participante })), pagamento ? pagamento.id_participante : '', true);
    
    codigoEstrutura += '<div class="flex gap-md w-total md-flex-coluna">';
    codigoEstrutura += '<div class="flex-2">' + criarSeletor('Tipo de Pagamento', 'tipo_pagamento', ['Inscrição', 'Mensalidade', 'Outros'], pagamento ? pagamento.tipo_pagamento : '', true) + '</div>';
    
    const displayQtd = (pagamento && pagamento.tipo_pagamento === 'Mensalidade') ? 'block' : 'none';
    codigoEstrutura += `<div class="flex-1" id="container-quantidade" style="display: ${displayQtd};">` + criarCampoFormulario('Qtd. Meses', 'number', 'quantidade', pagamento ? (pagamento.quantidade || 1) : 1, 'Ex: 2', false) + '</div>';
    codigoEstrutura += '<div class="flex-2">' + criarCampoFormulario('Valor Total (R$)', 'number', 'valor', pagamento ? pagamento.valor : '', 'Ex: 150.00', true) + '</div>';
    codigoEstrutura += '</div>';    
    codigoEstrutura += '<div class="flex gap-md w-total md-flex-coluna">';
    codigoEstrutura += '<div class="flex-1">' + criarCampoFormulario('Referência / Descrição', 'text', 'descricao', pagamento ? pagamento.descricao : '', 'Ex: Parcela 01', true) + '</div>';
    codigoEstrutura += '<div class="flex-1 flex flex-coluna w-total">';
    codigoEstrutura += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Data do Recebimento</label>';
    codigoEstrutura += '<input type="text" value="' + dataFormatada + '" readonly class="campo-somente-leitura">';
    codigoEstrutura += '<input type="hidden" id="data_pagamento" value="' + dataIso + '">';
    codigoEstrutura += '</div>';
    codigoEstrutura += '</div>';
    
    const textoBotaoSalvar = pagamento ? 'Atualizar Pagamento' : 'Salvar Pagamento';

    codigoEstrutura += criarRodapeFormulario('salvarPagamento()', textoBotaoSalvar, {
        botoesExtras: criarBotao('Salvar e Gerar Recibo', 'salvarPagamentoEGerarRecibo()', 'secundario', 'md-w-total')
    });
    codigoEstrutura += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;

    const elParticipante = document.getElementById('id_participante');
    const elTipo = document.getElementById('tipo_pagamento');
    const elValor = document.getElementById('valor');

elParticipante.addEventListener('change', () => processarRegraValor(elParticipante, elTipo, elValor, participantes, cursos, pagamentos));
    elTipo.addEventListener('change', () => processarRegraValor(elParticipante, elTipo, elValor, participantes, cursos, pagamentos));

    const elQtd = document.getElementById('quantidade');
    if (elQtd) elQtd.addEventListener('input', () => processarRegraValor(elParticipante, elTipo, elValor, participantes, cursos, pagamentos));

    if (pagamento && (pagamento.tipo_pagamento === 'Inscrição' || pagamento.tipo_pagamento === 'Mensalidade')) {
        elValor.readOnly = true;
    }

    Interface.abrirJanela('janela-formulario');
}

async function editarPagamento(idPagamento) {
    await abrirFormularioPagamento(idPagamento);
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
    const pagamentos = await bd.obterTodos('pagamentos');
    paroquias.sort((a, b) => a.nome_paroquia.localeCompare(b.nome_paroquia));

    const dataIso = lote ? lote.data_pagamento : new Date().toISOString().split('T')[0];
    const dataFormatada = Utilidades.formatarData(dataIso);

    let codigoEstrutura = '<form id="formulario-pagamento-lote" class="flex flex-coluna gap-md w-total">';
    codigoEstrutura += criarSeletor('Paróquia (Pagadora)', 'id_paroquia_lote', paroquias.map(p => ({ id: p.id_paroquia, nome: p.nome_paroquia })), lote ? lote.id_paroquia : '', true);
    codigoEstrutura += '<div class="flex flex-coluna w-total">';
    codigoEstrutura += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Participantes</label>';
    codigoEstrutura += '<div id="lista-participantes-lote" class="cartao-suave lista-rolagem-media">';
    if (!lote) codigoEstrutura += '<span class="texto-sm cor-texto-claro">Selecione uma paróquia para listar os participantes.</span>';
    codigoEstrutura += '</div></div>';
    
    codigoEstrutura += '<div class="flex gap-md w-total md-flex-coluna">';
    codigoEstrutura += '<div class="flex-2">' + criarSeletor('Tipo de Pagamento', 'tipo_pagamento_lote', ['Inscrição', 'Mensalidade', 'Outros'], lote ? lote.tipo_pagamento : '', true) + '</div>';
    
    const displayQtdLote = (lote && lote.tipo_pagamento === 'Mensalidade') ? 'block' : 'none';
    codigoEstrutura += `<div class="flex-1" id="container-quantidade-lote" style="display: ${displayQtdLote};">` + criarCampoFormulario('Qtd. Meses', 'number', 'quantidade_lote', lote ? (lote.quantidade || 1) : 1, 'Ex: 2', false) + '</div>';
    codigoEstrutura += '<div class="flex-2">' + criarCampoFormulario('Valor Unitário (R$)', 'number', 'valor_unitario_lote', lote ? lote.valor_unitario : '', 'Ex: 150.00', true) + '</div>';
    codigoEstrutura += '</div>';    
    codigoEstrutura += '<div class="flex gap-md w-total md-flex-coluna">';
    codigoEstrutura += '<div class="flex-1">' + criarCampoFormulario('Referência / Descrição', 'text', 'descricao_lote', lote ? lote.descricao : '', 'Ex: Parcela 01', true) + '</div>';
    codigoEstrutura += '<div class="flex-1 flex flex-coluna w-total">';
    codigoEstrutura += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Data do Recebimento</label>';
    codigoEstrutura += '<input type="text" value="' + dataFormatada + '" readonly class="campo-somente-leitura">';
    codigoEstrutura += '<input type="hidden" id="data_pagamento_lote" value="' + dataIso + '">';
    codigoEstrutura += '</div>';
    codigoEstrutura += '</div>';
    
    const textoBotaoSalvar = lote ? 'Atualizar Lote' : 'Salvar Lote';

    codigoEstrutura += criarRodapeFormulario('salvarPagamentoLote()', textoBotaoSalvar, {
        botoesExtras: criarBotao('Salvar e Gerar Recibo', 'salvarPagamentoLoteEGerarRecibo()', 'secundario', 'md-w-total')
    });
    codigoEstrutura += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;

    const elParoquia = document.getElementById('id_paroquia_lote');
    const elTipoLote = document.getElementById('tipo_pagamento_lote');
    const elValorLote = document.getElementById('valor_unitario_lote');

    function renderizarCheckboxes(idParoquia) {
        const participantesParoquia = participantes.filter(p => String(p.id_paroquia) === String(idParoquia));
        const container = document.getElementById('lista-participantes-lote');
        
        if(participantesParoquia.length === 0) {
            container.innerHTML = '<span class="texto-sm cor-texto-claro">Nenhum participante cadastrado para esta paróquia.</span>';
        } else {
            let htmlParticipantes = '<div class="grade-responsiva-participantes">';
            participantesParoquia.forEach(participante => {
                const checked = (lote && lote.id_participantes) 
                    ? (lote.id_participantes.includes(participante.id_participante) ? 'checked' : '') 
                    : 'checked';
                
                htmlParticipantes += `<label class="flex itens-centro gap-sm cursor-apontador fundo-branco p-sm borda-1 borda-solida borda-cor-padrao raio-sm hover-fundo-superficie-3"><input type="checkbox" class="checkbox-padrao" name="participantes_lote" value="${participante.id_participante}" data-nome="${participante.nome_participante}" ${checked} onchange="reavaliarValorLote()"> <span class="cor-texto-escuro texto-sm texto-truncado">${participante.nome_participante}</span></label>`;
            });
            htmlParticipantes += '</div>';
            container.innerHTML = htmlParticipantes;
            if (!lote) reavaliarValorLote();
        }
    }

function reavaliarValorLote() {
        const marcadores = document.querySelectorAll('input[name="participantes_lote"]:checked');
        const tipoLote = elTipoLote.value;
        const elQtdLote = document.getElementById('quantidade_lote');
        let qtdLote = elQtdLote ? (parseInt(elQtdLote.value) || 1) : 1;

        const containerQtdLote = document.getElementById('container-quantidade-lote');
        if (containerQtdLote) containerQtdLote.style.display = tipoLote === 'Mensalidade' ? 'block' : 'none';

        if (marcadores.length === 0) {
            if (tipoLote !== 'Outros') elValorLote.value = '';
            elValorLote.readOnly = false;
            if (elQtdLote) elQtdLote.removeAttribute('max');
            return;
        }

        if (tipoLote === 'Mensalidade') {
            let menorLimiteRestante = Infinity;
            let nomeParticipanteLimitante = '';
            let valorMensalidadePadrao = 0;

            marcadores.forEach(marcador => {
                const idPart = marcador.value;
                const nomePart = marcador.getAttribute('data-nome');
                const participante = participantes.find(p => String(p.id_participante) === String(idPart));
                
                if (participante && participante.id_curso) {
                    const curso = cursos.find(c => String(c.id_curso) === String(participante.id_curso));
                    if (curso) {
                        valorMensalidadePadrao = curso.valor_mensalidade || 0;
                        
                        const pagas = pagamentos
                            .filter(p => String(p.id_participante) === String(idPart) 
                                      && p.tipo_pagamento === 'Mensalidade' 
                                      && p.id_lote !== registroEmEdicao)
                            .reduce((total, p) => total + (parseInt(p.quantidade) || 1), 0);
                            
                        let restante = (curso.quantidade_mensalidades || 0) - pagas;
                        if (restante < 0) restante = 0;

                        if (restante < menorLimiteRestante) {
                            menorLimiteRestante = restante;
                            nomeParticipanteLimitante = nomePart;
                        }
                    }
                }
            });

            if (menorLimiteRestante !== Infinity && elQtdLote) {
                elQtdLote.setAttribute('max', menorLimiteRestante);
                if (qtdLote > menorLimiteRestante) {
                    qtdLote = menorLimiteRestante;
                    elQtdLote.value = qtdLote;
                    
                    if (menorLimiteRestante === 0) {
                        Utilidades.notificacao(`O participante ${nomeParticipanteLimitante} já quitou o curso. Desmarque-o para prosseguir.`, 'aviso');
                    } else {
                        Utilidades.notificacao(`Quantidade ajustada para ${menorLimiteRestante} devido ao limite de ${nomeParticipanteLimitante}.`, 'aviso');
                    }
                }
            }
            
            elValorLote.value = valorMensalidadePadrao * qtdLote;
            elValorLote.readOnly = true;

        } else if (tipoLote === 'Inscrição') {
            const primeiroPart = participantes.find(p => String(p.id_participante) === String(marcadores[0].value));
            if (primeiroPart && primeiroPart.id_curso) {
                const curso = cursos.find(c => String(c.id_curso) === String(primeiroPart.id_curso));
                if (curso) elValorLote.value = curso.valor_inscricao || 0;
            }
            elValorLote.readOnly = true;
            if (elQtdLote) elQtdLote.removeAttribute('max');
        } else {
            elValorLote.readOnly = false;
            if (elQtdLote) elQtdLote.removeAttribute('max');
        }
    }

    window.reavaliarValorLote = reavaliarValorLote;
    
    if (lote && lote.id_paroquia) {
        renderizarCheckboxes(lote.id_paroquia);
    }
    
    elParoquia.addEventListener('change', (e) => renderizarCheckboxes(e.target.value));
    elTipoLote.addEventListener('change', reavaliarValorLote);
    
    const elQtdLote = document.getElementById('quantidade_lote');
    if (elQtdLote) elQtdLote.addEventListener('input', reavaliarValorLote);

    if (lote && (lote.tipo_pagamento === 'Inscrição' || lote.tipo_pagamento === 'Mensalidade')) {
        elValorLote.readOnly = true;
    }

    Interface.abrirJanela('janela-formulario');
}

async function editarPagamentoLote(idLote) {
    await abrirFormularioPagamentoLote(idLote);
}

async function salvarPagamento(opcoes = {}) {
    const id_participante = document.getElementById('id_participante').value;
    const tipo_pagamento = document.getElementById('tipo_pagamento').value;
    const descricao = document.getElementById('descricao').value.trim();
    const valor = document.getElementById('valor').value;
    const data_pagamento = document.getElementById('data_pagamento').value;
    const qtdElemento = document.getElementById('quantidade');
    const quantidadeDigitada = qtdElemento ? (parseInt(qtdElemento.value) || 1) : 1;

    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Participante', valor: id_participante },
        { nome: 'Tipo de Pagamento', valor: tipo_pagamento },
        { nome: 'Valor Pago', valor },
        { nome: 'Data do Recebimento', valor: data_pagamento }
    ])) return null;

    if (!Validacao.validarCampoData(data_pagamento, 'Data do Recebimento')) return null;

    const valorValidado = Validacao.validarCampoMonetario(valor, 'Valor pago');
    if (!valorValidado.valido) return null;

    const pagamento = {
        id_pagamento: registroEmEdicao || Utilidades.gerarId(),
        id_participante,
        tipo_pagamento,
        quantidade: tipo_pagamento === 'Mensalidade' ? quantidadeDigitada : 1,
        descricao,
        valor: valorValidado.valor,
        data_pagamento
    };

    try {
        await bd.salvar('pagamentos', pagamento);
        if (opcoes.notificar !== false) Utilidades.notificacao(registroEmEdicao ? 'Pagamento atualizado!' : 'Pagamento cadastrado!', 'sucesso');
        if (opcoes.fecharJanela !== false) Interface.fecharJanela('janela-formulario');
        if (opcoes.renderizar !== false) renderizarAbaAtual();
        return pagamento;
    } catch (erro) {
        Utilidades.notificacao('Erro ao salvar o pagamento.', 'erro');
        return null;
    }
}

async function salvarPagamentoEGerarRecibo() {
    const pagamento = await salvarPagamento({ fecharJanela: false, renderizar: false });
    if (!pagamento) return;
    await acionarReciboDireto(pagamento.id_pagamento);
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}

async function salvarPagamentoLote(opcoes = {}) {
    const idParoquia = document.getElementById('id_paroquia_lote').value;
    const marcadores = document.querySelectorAll('input[name="participantes_lote"]:checked');
    const tipoPagamento = document.getElementById('tipo_pagamento_lote').value;
    const descricao = document.getElementById('descricao_lote').value.trim();
    const valorUnitario = document.getElementById('valor_unitario_lote').value;
    const dataPagamento = document.getElementById('data_pagamento_lote').value;
    const qtdLoteElemento = document.getElementById('quantidade_lote');
    const quantidadeLote = qtdLoteElemento ? (parseInt(qtdLoteElemento.value) || 1) : 1;

    if (!idParoquia || marcadores.length === 0 || !tipoPagamento || !valorUnitario || !dataPagamento) {
        Utilidades.notificacao('Preencha os campos e selecione ao menos um participante pagante.', 'erro');
        return null;
    }

    if (!Validacao.validarCampoData(dataPagamento, 'Data do Recebimento')) return null;

    const valorUnitarioValidado = Validacao.validarCampoMonetario(valorUnitario, 'Valor unitário');
    if (!valorUnitarioValidado.valido) return null;

    const id_lote = registroEmEdicao || Utilidades.gerarId();
    const listaIds = [];
    const nomesParticipantes = [];

    marcadores.forEach(marcador => {
        listaIds.push(marcador.value);
        nomesParticipantes.push(marcador.getAttribute('data-nome'));
    });

    const valorTotal = valorUnitarioValidado.valor * listaIds.length;

    const lote = {
        id_lote: id_lote,
        id_paroquia: idParoquia,
        id_participantes: listaIds,
        nomes_participantes: nomesParticipantes,
        tipo_pagamento: tipoPagamento,
        quantidade: tipoPagamento === 'Mensalidade' ? quantidadeLote : 1,
        descricao: descricao,
        valor_unitario: valorUnitarioValidado.valor,
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
                quantidade: tipoPagamento === 'Mensalidade' ? quantidadeLote : 1,
                descricao: descricao,
                valor: valorUnitarioValidado.valor,
                data_pagamento: dataPagamento,
                id_lote: id_lote
            };
            await bd.salvar('pagamentos', pagamento);
        }

        if (opcoes.notificar !== false) Utilidades.notificacao('Pagamentos em lote salvos com sucesso!', 'sucesso');
        if (opcoes.fecharJanela !== false) Interface.fecharJanela('janela-formulario');
        if (opcoes.renderizar !== false) renderizarAbaAtual();
        return lote;
    } catch (erro) {
        Utilidades.notificacao('Erro ao salvar em lote.', 'erro');
        return null;
    }
}

async function salvarPagamentoLoteEGerarRecibo() {
    const lote = await salvarPagamentoLote({ fecharJanela: false, renderizar: false });
    if (!lote) return;
    await acionarReciboDiretoLote(lote.id_lote);
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
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

async function acionarReciboDireto(idPagamento) {
    const pagamento = await bd.obter('pagamentos', idPagamento);
    if (!pagamento) return;

    const p = await bd.obter('participantes', pagamento.id_participante);
    const nomeParticipante = p ? p.nome_participante : 'Participante não identificado';
    const dataFormatada = Utilidades.formatarData(pagamento.data_pagamento);
    const descFinal = pagamento.tipo_pagamento ? `${pagamento.tipo_pagamento} - ${pagamento.descricao}` : pagamento.descricao;

    gerarReciboGenerico(nomeParticipante, pagamento.valor, descFinal, dataFormatada);
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

function gerarReciboGenerico(nomeParticipante, valor, descricao, data) {
    const valorFormatado = Utilidades.formatarMoeda(valor);

    gerarReciboPadrao(`Recibo de Pagamento - ${nomeParticipante}`, {
        titulo: 'RECIBO DE PAGAMENTO',
        rotuloValor: 'Valor',
        valorFormatado,
        data,
        conteudo: `
            <p>Recebemos de <strong>${nomeParticipante}</strong>, a importância de <strong>${valorFormatado}</strong>, referente a <strong>${descricao}</strong>.</p>
            <p>Por ser verdade, firmamos o presente recibo.</p>
        `,
        rotuloAssinatura: 'Assinatura do Recebedor',
        nomeAssinatura: NOME_INSTITUCIONAL
    });
}

function gerarReciboLoteTemplate(nomeParoquia, nomesParticipantes, valorTotal, descricao, data) {
    const valorFormatado = Utilidades.formatarMoeda(valorTotal);

    gerarReciboPadrao(`Recibo de Pagamento - ${nomeParoquia}`, {
        titulo: 'RECIBO DE PAGAMENTO',
        rotuloValor: 'Total recebido',
        valorFormatado,
        data,
        conteudo: `
            <p>Recebemos de <strong>${nomeParoquia}</strong>, a importância total de <strong>${valorFormatado}</strong>, referente a <strong>${descricao}</strong> dos seguintes participantes vinculados:</p>
            <ul class="lista-participantes">
                ${nomesParticipantes.map(nome => `<li>${nome}</li>`).join('')}
            </ul>
            <p>Por ser verdade, firmamos o presente recibo.</p>
        `,
        rotuloAssinatura: 'Assinatura do Recebedor',
        nomeAssinatura: NOME_INSTITUCIONAL
    });
}
