async function renderizarAvisos(conteudo) {
    const avisos = await bd.obterTodos('avisos');
    const participantes = await bd.obterTodos('participantes');

    let codigoEstrutura = '<div class="cartao-padrao mb-lg">';
    codigoEstrutura += criarCabecalhoSecao('Mural de Avisos', criarBotao('+ Novo Aviso', 'abrirFormularioAviso()'));
    
    codigoEstrutura += Busca.criarCampoBusca('busca-avisos', 'Buscar por título ou participante...');

    if (avisos.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhum aviso cadastrado ainda.</p>';
    } else {
        let linhasAvisos = '';

        avisos.forEach((aviso, index) => {
            const participante = participantes.find(p => String(p.id_participante) === String(aviso.id_participante));
            const nomeParticipante = participante ? (participante.nome_participante || participante.nome) : 'Geral';
            const textoMensagem = aviso.conteudo || aviso.conteudoAviso || '';
            
            const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            const celularParticipante = participante ? (participante.celular_participante || participante.celular || participante.telefone || '') : '';
            const tituloCod = encodeURIComponent(aviso.titulo || '');
            const conteudoCod = encodeURIComponent(textoMensagem || '');

            linhasAvisos += `<tr class="${classeFundo} transicao hover-fundo-superficie-3 peso-bold" data-busca="${(aviso.titulo || '').toLowerCase()} ${nomeParticipante.toLowerCase()}">
                <td class="p-md texto-esquerda cor-texto-escuro peso-medium">${nomeParticipante}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${aviso.titulo}</td>
                <td class="p-md texto-esquerda cor-texto-claro">${textoMensagem}</td>
                <td class="p-md texto-esquerda">
                    ${criarAcoesTabela([
                        { rotulo: 'Editar', acao: `editarAviso('${aviso.id_aviso}')` },
                        { rotulo: 'Reenviar', acao: `enviarAvisoWhatsApp('${celularParticipante}','${tituloCod}','${conteudoCod}')` },
                        { rotulo: 'Excluir', acao: `excluirAviso('${aviso.id_aviso}')`, perigo: true }
                    ])}
                </td>
            </tr>`;
        });

        codigoEstrutura += criarContainerTabela(
            ['Destinatário', 'Título', 'Mensagem / Conteúdo', 'Ações'],
            linhasAvisos,
            '',
            'tabela-corpo-avisos'
        );
    }
    codigoEstrutura += '</div>';
    conteudo.innerHTML = codigoEstrutura;

    Busca.vincularFiltro('busca-avisos', 'tabela-corpo-avisos');
}

async function abrirFormularioAviso(idAviso = null) {
    modoEdicao = 'avisos';
    registroEmEdicao = idAviso;
    document.getElementById('titulo-janela').textContent = idAviso ? 'Editar Aviso' : 'Novo Aviso';

    const participantes = await bd.obterTodos('participantes');
    participantes.sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));
    const hojeIso = new Date().toISOString().split('T')[0];
    let aviso = { id_aviso: '', id_participante: '', titulo: '', conteudo: '', data_aviso: hojeIso };
    
    if (idAviso) {
        try {
            const encontrado = await bd.obter('avisos', idAviso);
            if (encontrado) {
                aviso = encontrado;
                if (!aviso.conteudo && aviso.conteudoAviso) {
                    aviso.conteudo = aviso.conteudoAviso;
                }
                if (!aviso.data_aviso && aviso.data) {
                    aviso.data_aviso = aviso.data;
                }
                if (!aviso.data_aviso) {
                    aviso.data_aviso = hojeIso;
                }
            }
        } catch (err) {
            aviso.data_aviso = hojeIso;
        }
    }

    let formHTML = '<form id="form-aviso" class="flex flex-coluna gap-md" onsubmit="event.preventDefault();">';

    formHTML += `<input type="hidden" id="id_aviso" value="${aviso.id_aviso || ''}">`;

    formHTML += '<div class="w-total">' + criarSeletor('Destinatário', 'id_participante', participantes.map(p => ({ id: p.id_participante, nome: p.nome_participante || p.nome })), aviso.id_participante) + '</div>';

    formHTML += '<div class="flex flex-linha md-flex-coluna gap-md w-total">';
    
    formHTML += '<div class="flex flex-coluna flex-1">';
    formHTML += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Título do Aviso / Assunto</label>';
    formHTML += `<input type="text" id="titulo_aviso" value="${aviso.titulo || ''}" placeholder="Digite o título..." class="campo-padrao">`;
    formHTML += '</div>';

    formHTML += '<div class="flex flex-coluna flex-2">';
    formHTML += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Data de Registro</label>';

    let dataFormatada = '';
    try {
        dataFormatada = Utilidades.formatarData(aviso.data_aviso || hojeIso);
    } catch (e) {
        dataFormatada = aviso.data_aviso || hojeIso;
    }
    formHTML += `<input type="text" id="data_aviso" data-real="${aviso.data_aviso || hojeIso}" value="${dataFormatada}" readonly class="campo-somente-leitura">`;
    formHTML += '</div>';
    
    formHTML += '</div>';

    formHTML += '<div class="flex flex-coluna w-total">';
    formHTML += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Conteúdo / Mensagem</label>';
    formHTML += `<textarea id="conteudo_aviso" rows="4" placeholder="Digite o corpo do aviso..." class="campo-padrao area-texto-padrao">${aviso.conteudo || ''}</textarea>`;
    formHTML += '</div>';

    formHTML += '<div class="flex itens-centro gap-sm mb-sm">';
    formHTML += `<input type="checkbox" id="enviar_whatsapp" class="checkbox-padrao cursor-apontador" ${idAviso ? '' : ''}>`;
    formHTML += '<label for="enviar_whatsapp" class="cursor-apontador peso-medium cor-texto-escuro texto-md sem-selecao">Disparar mensagem via WhatsApp ao salvar</label>';
    formHTML += '</div>';

    formHTML += criarRodapeFormulario('salvarAviso()', idAviso ? 'Atualizar Aviso' : 'Salvar Aviso');
    formHTML += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formHTML;
    Interface.abrirJanela('janela-formulario');
}

async function editarAviso(idAviso) {
    await abrirFormularioAviso(idAviso);
}

async function salvarAviso() {
    const id_aviso_field = document.getElementById('id_aviso');
    const id_aviso = id_aviso_field && id_aviso_field.value ? id_aviso_field.value : Utilidades.gerarId();

    const titulo = document.getElementById('titulo_aviso').value.trim();
    const conteudoAviso = document.getElementById('conteudo_aviso').value.trim();
    const id_participante = document.getElementById('id_participante').value;
    const dataAvisoElem = document.getElementById('data_aviso');
    const data_aviso = (dataAvisoElem && dataAvisoElem.dataset && dataAvisoElem.dataset.real) ? dataAvisoElem.dataset.real : new Date().toISOString().split('T')[0];
    const enviarWhatsApp = document.getElementById('enviar_whatsapp') ? document.getElementById('enviar_whatsapp').checked : false;

    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Título do Aviso / Assunto', valor: titulo },
        { nome: 'Conteúdo / Mensagem', valor: conteudoAviso },
        { nome: 'Destinatário', valor: id_participante },
        { nome: 'Data de Registro', valor: data_aviso }
    ])) return;

    if (!Validacao.validarCampoData(data_aviso, 'Data de Registro')) return;

    const participantes = await bd.obterTodos('participantes');
    const participante = participantes.find(p => String(p.id_participante) === String(id_participante));
    const celular = participante ? (participante.celular_participante || participante.celular || participante.telefone) : '';

    const dados = {
        id_aviso,
        id_participante,
        titulo,
        conteudo: conteudoAviso,
        data_aviso
    };

    try {
        await bd.salvar('avisos', dados);
        Utilidades.notificacao(id_aviso_field && id_aviso_field.value ? 'Aviso atualizado com sucesso!' : 'Aviso cadastrado com sucesso!', 'sucesso');
        Interface.fecharJanela('janela-formulario');
        renderizarAbaAtual();

        if (enviarWhatsApp) {
            enviarAvisoWhatsApp(celular, encodeURIComponent(titulo), encodeURIComponent(conteudoAviso));
        }
    } catch (erro) {
        Utilidades.notificacao('Erro ao salvar o aviso.', 'erro');
    }
}

function enviarAvisoWhatsApp(celularBase, tituloCodificado, conteudoCodificado) {
    if (!celularBase) {
        Utilidades.notificacao('Este aviso não possui um número de celular registrado.', 'erro');
        return;
    }

    let telefoneNumerico = String(celularBase).replace(/\D/g, '');
    if (telefoneNumerico.length === 10 || telefoneNumerico.length === 11) {
        telefoneNumerico = '55' + telefoneNumerico;
    }

    const mensagemText = `*${decodeURIComponent(tituloCodificado)}*%0A%0A${decodeURIComponent(conteudoCodificado)}`;
    const linkWhatsApp = `https://api.whatsapp.com/send?phone=${telefoneNumerico}&text=${mensagemText}`;
    
    window.open(linkWhatsApp, '_blank');
}

async function excluirAviso(idAviso) {
    if (confirm('Deseja realmente excluir este aviso?')) {
        try {
            await bd.excluir('avisos', idAviso);
            Utilidades.notificacao('Aviso excluído com sucesso!', 'sucesso');
            renderizarAbaAtual();
        } catch (erro) {
            Utilidades.notificacao('Não foi possível excluir o aviso.', 'erro');
        }
    }
}
