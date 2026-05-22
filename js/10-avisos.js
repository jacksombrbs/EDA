async function renderizarAvisos(conteudo) {
    const avisos = await bd.obterTodos('avisos');
    const participantes = await bd.obterTodos('participantes');

    let codigoEstrutura = '<div class="fundo-branco borda-padrao raio-md p-md mb-lg"><div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Mural de Avisos</h2>';
    codigoEstrutura += '<button class="btn btn-primario" onclick="abrirFormularioAviso()">+ Novo Aviso</button>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += Busca.criarCampoBusca('busca-avisos', 'Buscar por título...');

    if (avisos.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhum aviso cadastrado ainda.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-padrao raio-md fundo-branco"><table class="tabela-base" id="tabela-avisos"><thead><tr>';
        codigoEstrutura += '<th>Título</th><th>Aluno Vinculado</th><th>Data</th><th>Ações</th></tr></thead><tbody>';

        avisos.forEach((aviso) => {
            const aluno = participantes.find(p => p.id_participante === aviso.id_participante);
            const nomeAluno = aluno ? aluno.nome_participante : '<span class="cor-texto-claro texto-italico">Geral / Não vinculado</span>';

            codigoEstrutura += `<tr>
                    <td class="peso-bold cor-texto-escuro">${aviso.titulo_aviso}</td>
                    <td class="cor-texto-escuro">${nomeAluno}</td>
                    <td class="cor-texto-escuro">${Utilidades.formatarData(aviso.data_aviso)}</td>
                    <td>
                        <div class="flex gap-sm">
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="editarAviso('${aviso.id_aviso}')">Editar</button>
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="excluirAviso('${aviso.id_aviso}')">Excluir</button>
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="reenviarAvisoWhatsApp('${aviso.celular_aviso || ''}', '${encodeURIComponent(aviso.titulo_aviso)}', '${encodeURIComponent(aviso.conteudo_aviso || '')}')">Reenviar</button>
                        </div>
                    </td>
                </tr>`;
        });
        codigoEstrutura += '</tbody></table></div>';
    }
    codigoEstrutura += '</div>';

    conteudo.innerHTML = codigoEstrutura;

    document.getElementById('busca-avisos')?.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        const linhas = document.querySelectorAll('#tabela-avisos tbody tr');
        linhas.forEach(linha => {
            const texto = linha.textContent.toLowerCase();
            linha.classList.toggle('oculto', !texto.includes(termo));
        });
    });
}

function abrirFormularioAviso() {
    modoEdicao = 'avisos';
    registroEmEdicao = null;
    document.getElementById('titulo-janela').textContent = 'Novo Aviso';

    bd.obterTodos('participantes').then(participantes => {
        participantes.sort((a, b) => a.nome_participante.localeCompare(b.nome_participante));

        let codigoEstrutura = '<form id="formulario-aviso" class="grid grid-auto-adaptavel gap-md">';
        
        codigoEstrutura += criarCampoFormulario('Título do Aviso', 'text', 'titulo_aviso', '', '', true);
        codigoEstrutura += criarCampoFormulario('Data', 'date', 'data_aviso', new Date().toISOString().split('T')[0], '', true);
        
        codigoEstrutura += criarSeletor('Destinatário / Aluno Vinculado', 'id_participante', participantes.map(p => ({ id: p.id_participante, nome: p.nome_participante })), '', false);
        
        codigoEstrutura += criarCampoFormulario('Celular (WhatsApp)', 'text', 'celular_aviso', '');
        codigoEstrutura += criarAreaTexto('Conteúdo (Mensagem)', 'conteudo_aviso', '', 5, true);

        codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
        codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
        codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="executarSalvarAviso(false)">Salvar</button>';
        codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="executarSalvarAviso(true)">Enviar via WhatsApp</button>';
        codigoEstrutura += '</div>';

        codigoEstrutura += '</form>';

        document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
        
        document.getElementById('id_participante').addEventListener('change', async (e) => {
            const id = e.target.value;
            if (id) {
                const p = await bd.obter('participantes', id);
                if (p) {
                    document.getElementById('celular_aviso').value = p.telefone_participante || p.telefone || p.whatsapp || p.celular || '';
                }
            } else {
                document.getElementById('celular_aviso').value = '';
            }
        });

        Interface.abrirJanela('janela-formulario');
    });
}

async function editarAviso(idAviso) {
    const aviso = await bd.obter('avisos', idAviso);
    if (aviso) {
        const participantes = await bd.obterTodos('participantes');
        participantes.sort((a, b) => a.nome_participante.localeCompare(b.nome_participante));

        modoEdicao = 'avisos';
        registroEmEdicao = idAviso;
        document.getElementById('titulo-janela').textContent = 'Editar Aviso';

        let codigoEstrutura = '<form id="formulario-aviso" class="grid grid-auto-adaptavel gap-md">';
        
        codigoEstrutura += criarCampoFormulario('Título do Aviso', 'text', 'titulo_aviso', aviso.titulo_aviso, '', true);
        codigoEstrutura += criarCampoFormulario('Data', 'date', 'data_aviso', aviso.data_aviso, '', true);
        
        codigoEstrutura += criarSeletor('Destinatário / Aluno Vinculado', 'id_participante', participantes.map(p => ({ id: p.id_participante, nome: p.nome_participante })), aviso.id_participante, false);
        
        codigoEstrutura += criarCampoFormulario('Celular (WhatsApp)', 'text', 'celular_aviso', aviso.celular_aviso || '');
        codigoEstrutura += criarAreaTexto('Conteúdo (Mensagem)', 'conteudo_aviso', aviso.conteudo_aviso || '', 5, true);

        codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
        codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
        codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="executarSalvarAviso(false)">Atualizar</button>';
        codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="executarSalvarAviso(true)">Enviar via WhatsApp</button>';
        codigoEstrutura += '</div>';

        codigoEstrutura += '</form>';

        document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;

        document.getElementById('id_participante').addEventListener('change', async (e) => {
            const id = e.target.value;
            if (id) {
                const p = await bd.obter('participantes', id);
                if (p) {
                    document.getElementById('celular_aviso').value = p.telefone_participante || p.telefone || p.whatsapp || p.celular || '';
                }
            } else {
                document.getElementById('celular_aviso').value = '';
            }
        });

        Interface.abrirJanela('janela-formulario');
    }
}

async function excluirAviso(idAviso) {
    if (confirm('Deseja realmente excluir este aviso?')) {
        await bd.excluir('avisos', idAviso);
        Utilidades.notificacao('Aviso excluído com sucesso!', 'sucesso');
        renderizarAbaAtual();
    }
}

async function executarSalvarAviso(enviarWhatsApp) {
    const titulo = document.getElementById('titulo_aviso').value.trim();
    const data = document.getElementById('data_aviso').value;
    const conteudoAviso = document.getElementById('conteudo_aviso').value.trim();
    const idParticipante = document.getElementById('id_participante').value || null;
    const celular = document.getElementById('celular_aviso').value.trim();

    if (!titulo || !conteudoAviso) {
        Utilidades.notificacao('Por favor, preencha o Título e o Conteúdo do aviso.', 'erro');
        return;
    }

    if (enviarWhatsApp && !celular) {
        Utilidades.notificacao('Para enviar via WhatsApp, é necessário informar o número do celular.', 'erro');
        return;
    }

    const dados = {
        id_aviso: registroEmEdicao || Utilidades.gerarId(),
        titulo_aviso: titulo,
        data_aviso: data,
        id_participante: idParticipante,
        celular_aviso: celular,
        conteudo_aviso: conteudoAviso
    };

    try {
        await bd.salvar('avisos', dados);
        Utilidades.notificacao(registroEmEdicao ? 'Aviso atualizado!' : 'Aviso cadastrado!', 'sucesso');
        fecharJanela('janela-formulario');
        renderizarAbaAtual();

        if (enviarWhatsApp) {
            reenviarAvisoWhatsApp(celular, encodeURIComponent(titulo), encodeURIComponent(conteudoAviso));
        }
    } catch (erro) {
        Utilidades.notificacao('Erro ao salvar o aviso.', 'erro');
    }
}

function reenviarAvisoWhatsApp(celularBase, tituloCodificado, conteudoCodificado) {
    if (!celularBase) {
        Utilidades.notificacao('Este aviso não possui um número de celular vinculado para reenvio.', 'erro');
        return;
    }

    let telefoneNumerico = String(celularBase).replace(/\D/g, '');
    if (telefoneNumerico.length === 10 || telefoneNumerico.length === 11) {
        telefoneNumerico = '55' + telefoneNumerico;
    }

    const textoMensagem = encodeURIComponent(`*AVISO - Discípulo Amado:* ${decodeURIComponent(tituloCodificado)}\n\n${decodeURIComponent(conteudoCodificado)}`);
    const url = `https://wa.me/${telefoneNumerico}?text=${textoMensagem}`;
    
    window.open(url, '_blank');
}