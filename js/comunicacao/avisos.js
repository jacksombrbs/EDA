async function renderizarAvisos(conteudo) {
    const [avisos, participantes] = await Promise.all([
        bd.obterTodos('avisos'),
        bd.obterTodos('participantes')
    ]);

    let codigo = '<div class="pagina-conteudo">';
    codigo += criarCabecalhoSecao('Mural de Avisos', criarBotao('+ Novo Aviso', 'abrirFormularioAviso()'));
    codigo += Busca.criarCampoBusca('busca-avisos', 'Buscar por título ou participante...');
    codigo += avisos.length
        ? renderizarTabelaAvisos(avisos, participantes)
        : criarMensagemVazia('Nenhum aviso cadastrado ainda.');
    codigo += '</div>';

    conteudo.innerHTML = codigo;
    Busca.vincularFiltro('busca-avisos', 'corpo-tabela-avisos');
}

async function abrirFormularioAviso(id = null) {
    AppEstado.modoEdicao = 'avisos';
    AppEstado.registroEmEdicao = id;

    const [participantes, aviso] = await Promise.all([
        bd.obterTodos('participantes'),
        id ? bd.obter('avisos', id) : Promise.resolve(null)
    ]);

    participantes.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    document.getElementById('titulo-janela').textContent = id ? 'Editar Aviso' : 'Novo Aviso';

    const dados = aviso || { data: new Date().toISOString().split('T')[0], id_participante: null };
    const opcoesParticipantes = [{ id: '', nome: 'Aviso geral' }, ...participantes.map(participante => ({ id: participante.id, nome: participante.nome }))];

    let formulario = '<form id="formulario-aviso" class="flex flex-coluna gap-md" onsubmit="salvarAviso(event)">';
    formulario += '<div class="w-total">' + criarSeletor('Destinatário', 'id_participante', opcoesParticipantes, dados.id_participante || '') + '</div>';
    formulario += '<div class="flex flex-linha md-flex-coluna gap-md w-total">';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Título do Aviso', 'text', 'titulo', dados.titulo || '', 'Digite o título...', true) + '</div>';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Data', 'date', 'data', dados.data || new Date().toISOString().split('T')[0], '', true) + '</div>';
    formulario += '</div>';
    formulario += criarAreaTexto('Mensagem', 'mensagem', dados.mensagem || '', 4, true);
    formulario += '<label class="flex itens-centro gap-sm mb-sm cursor-apontador">';
    formulario += '<input type="checkbox" id="enviar_whatsapp" class="checkbox-padrao cursor-apontador">';
    formulario += '<span class="peso-medium cor-texto-escuro texto-md sem-selecao">Enviar via WhatsApp ao salvar</span>';
    formulario += '</label>';
    formulario += criarRodapeFormulario('', id ? 'Atualizar Aviso' : 'Salvar Aviso', { tipoSalvar: 'submit' });
    formulario += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formulario;
    Interface.abrirJanela('janela-formulario');
}

async function salvarAviso(evento) {
    if (evento) evento.preventDefault();

    const dados = obterDadosFormularioAviso();
    if (!validarAviso(dados)) return;

    await bd.salvar('avisos', montarAviso(dados, AppEstado.registroEmEdicao));
    Utilidades.notificacao(AppEstado.registroEmEdicao ? 'Aviso atualizado com sucesso!' : 'Aviso cadastrado com sucesso!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    await renderizarAbaAtual();

    if (dados.enviar_whatsapp && dados.id_participante) {
        const participante = await bd.obter('participantes', dados.id_participante);
        enviarAvisoWhatsApp(participante?.telefone, dados.titulo, dados.mensagem);
    }
}

async function editarAviso(id) {
    await abrirFormularioAviso(id);
}

async function excluirAviso(id) {
    if (!confirm('Deseja realmente excluir este aviso?')) return;

    await bd.excluir('avisos', id);
    Utilidades.notificacao('Aviso excluído com sucesso!', 'sucesso');
    await renderizarAbaAtual();
}

function obterDadosFormularioAviso() {
    return {
        id_participante: document.getElementById('id_participante')?.value || null,
        titulo: document.getElementById('titulo')?.value.trim() || '',
        mensagem: document.getElementById('mensagem')?.value.trim() || '',
        data: document.getElementById('data')?.value || '',
        enviar_whatsapp: document.getElementById('enviar_whatsapp')?.checked || false
    };
}

function validarAviso(dados) {
    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Título do Aviso', valor: dados.titulo },
        { nome: 'Mensagem', valor: dados.mensagem },
        { nome: 'Data', valor: dados.data }
    ])) {
        return false;
    }

    return Validacao.validarCampoData(dados.data, 'Data');
}

function montarAviso(dados, id = null) {
    return {
        id: id || Utilidades.gerarId(),
        id_participante: dados.id_participante || null,
        titulo: dados.titulo,
        mensagem: dados.mensagem,
        data: dados.data
    };
}

function renderizarTabelaAvisos(avisos, participantes) {
    const linhas = avisos
        .sort((a, b) => new Date(b.data) - new Date(a.data))
        .map((aviso, indice) => {
            const participante = participantes.find(item => String(item.id) === String(aviso.id_participante));
            const nomeParticipante = participante?.nome || 'Geral';
            const telefone = participante?.telefone || '';
            const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            return `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml(`${aviso.titulo || ''} ${nomeParticipante}`)}">
                <td class="p-md texto-esquerda cor-texto-escuro peso-medium">${Utilidades.escaparHtml(nomeParticipante)}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.escaparHtml(aviso.titulo)}</td>
                <td class="p-md texto-esquerda cor-texto-claro">${Utilidades.escaparHtml(aviso.mensagem)}</td>
                <td class="p-md texto-esquerda">${Utilidades.formatarData(aviso.data)}</td>
                <td class="p-md texto-esquerda">${criarAcoesTabela([
                    { rotulo: 'Editar', acao: `editarAviso('${aviso.id}')` },
                    { rotulo: 'Reenviar', acao: `reenviarAviso('${aviso.id}')` },
                    { rotulo: 'Excluir', acao: `excluirAviso('${aviso.id}')`, perigo: true }
                ])}</td>
            </tr>`;
        }).join('');

    return criarContainerTabela(
        ['Destinatário', 'Título', 'Mensagem', 'Data', 'Ações'],
        linhas,
        '',
        'corpo-tabela-avisos'
    );
}

async function reenviarAviso(id) {
    const aviso = await bd.obter('avisos', id);
    if (!aviso?.id_participante) return Utilidades.notificacao('Aviso geral não possui destinatário de WhatsApp.', 'aviso');

    const participante = await bd.obter('participantes', aviso.id_participante);
    enviarAvisoWhatsApp(participante?.telefone, aviso.titulo, aviso.mensagem);
}
