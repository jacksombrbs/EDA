async function renderizarAvisos(conteudo) {
    const avisos = await bd.obterTodos('avisos');
    const participantes = await bd.obterTodos('participantes');

    let codigoEstrutura = '<div class="fundo-branco borda-1 borda-solida borda-cor-padrao raio-md p-md mb-lg">';
    codigoEstrutura += '<div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Mural de Avisos</h2>';
    codigoEstrutura += '<button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-medium transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 hover-fundo-marca-escuro" onclick="abrirFormularioAviso()">+ Novo Aviso</button>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += Busca.criarCampoBusca('busca-avisos', 'Buscar por título ou participante...');

    if (avisos.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhum aviso cadastrado ainda.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-1 borda-solida borda-cor-padrao raio-md overflow-hidden pos-relativa"><table class="w-total borda-colapso texto-md"><thead><tr>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Destinatário</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Título</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Mensagem / Conteúdo</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Ações</th></tr></thead><tbody id="tabela-corpo-avisos">';

        avisos.forEach((aviso, index) => {
            const participante = participantes.find(p => String(p.id_participante) === String(aviso.id_participante));
            const nomeParticipante = participante ? (participante.nome_participante || participante.nome) : 'Geral';
            const textoMensagem = aviso.conteudo || aviso.conteudoAviso || '';
            
            const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            const celularParticipante = participante ? (participante.celular_participante || participante.celular || participante.telefone || '') : '';
            const tituloCod = encodeURIComponent(aviso.titulo || '');
            const conteudoCod = encodeURIComponent(textoMensagem || '');

            codigoEstrutura += `<tr class="${classeFundo} transicao hover-fundo-superficie-3 peso-bold" data-busca="${(aviso.titulo || '').toLowerCase()} ${nomeParticipante.toLowerCase()}">
                <td class="p-md texto-esquerda cor-texto-escuro peso-medium">${nomeParticipante}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${aviso.titulo}</td>
                <td class="p-md texto-esquerda cor-texto-claro">${textoMensagem}</td>
                <td class="p-md texto-esquerda">
                    <div class="flex gap-sm">
                        <button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-escuro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="editarAviso('${aviso.id_aviso}')">Editar</button>
                        <button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-escuro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="enviarAvisoWhatsApp('${celularParticipante}','${tituloCod}','${conteudoCod}')">Reenviar</button>
                        <button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-erro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="excluirAviso('${aviso.id_aviso}')">Excluir</button>
                    </div>
                </td>
            </tr>`;
        });

        codigoEstrutura += '</tbody></table></div>';
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

    formHTML += '<div class="w-total">' + criarSeletor('Aluno / Destinatário', 'id_participante', participantes.map(p => ({ id: p.id_participante, nome: p.nome_participante || p.nome })), aviso.id_participante) + '</div>';

    formHTML += '<div class="flex flex-linha md-flex-coluna gap-md w-total">';
    
    formHTML += '<div class="flex flex-coluna flex-1">';
    formHTML += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Título do Aviso / Assunto</label>';
    formHTML += `<input type="text" id="titulo_aviso" value="${aviso.titulo || ''}" placeholder="Digite o título..." class="w-total p-sm px-md min-h-44 fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm cor-texto-escuro texto-md transicao focus-sem-outline focus-borda-marca">`;
    formHTML += '</div>';

    formHTML += '<div class="flex flex-coluna flex-2">';
    formHTML += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Data de Registro</label>';

    let dataFormatada = '';
    try {
        dataFormatada = Utilidades.formatarData(aviso.data_aviso || hojeIso);
    } catch (e) {
        dataFormatada = aviso.data_aviso || hojeIso;
    }
    formHTML += `<input type="text" id="data_aviso" data-real="${aviso.data_aviso || hojeIso}" value="${dataFormatada}" readonly class="w-total p-sm px-md min-h-44 fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm cor-texto-claro texto-md sem-outline" style="cursor: not-allowed;">`;
    formHTML += '</div>';
    
    formHTML += '</div>';

    formHTML += '<div class="flex flex-coluna w-total">';
    formHTML += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Conteúdo / Mensagem</label>';
    formHTML += `<textarea id="conteudo_aviso" rows="4" placeholder="Digite o corpo do aviso..." class="w-total p-sm px-md fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm cor-texto-escuro texto-md transicao focus-sem-outline focus-borda-marca" style="resize: vertical;">${aviso.conteudo || ''}</textarea>`;
    formHTML += '</div>';

    formHTML += '<div class="flex itens-centro gap-sm mb-sm">';
    formHTML += `<input type="checkbox" id="enviar_whatsapp" class="cursor-apontador" style="width: 18px; height: 18px; accent-color: var(--cor-marca-700);" ${idAviso ? '' : ''}>`;
    formHTML += '<label for="enviar_whatsapp" class="cursor-apontador peso-medium cor-texto-escuro texto-md select-none">Disparar mensagem via WhatsApp ao salvar</label>';
    formHTML += '</div>';

    formHTML += '<div class="flex justifica-fim gap-sm pt-sm md-flex-coluna">';
    formHTML += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3 md-w-total" onclick="Interface.fecharJanela(\'janela-formulario\')">Cancelar</button>';
    formHTML += `<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 sombra-1 hover-fundo-marca-escuro md-w-total" onclick="salvarAviso()">${idAviso ? 'Atualizar Aviso' : 'Salvar Aviso'}</button>`;
    formHTML += '</div>';
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

    if (!titulo) return Utilidades.notificacao('O título do aviso é obrigatório.', 'erro');
    if (!conteudoAviso) return Utilidades.notificacao('O conteúdo do aviso é obrigatório.', 'erro');
    if (!id_participante) return Utilidades.notificacao('Selecione um participante.', 'erro');
    if (!data_aviso) return Utilidades.notificacao('A data é obrigatória.', 'erro');

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