const CHAVE_CONFIGURACAO_PIX = 'pix';

async function obterConfiguracaoPix() {
    await bd.inicializar();

    const configuracao = await bd.obter('configuracoes', CHAVE_CONFIGURACAO_PIX);
    return configuracao?.chave_pix ? configuracao : {
        chave: CHAVE_CONFIGURACAO_PIX,
        chave_pix: '',
        nome: NOME_INSTITUCIONAL,
        cidade: 'CURITIBA'
    };
}

async function abrirConfiguracaoPix() {
    const configuracao = await obterConfiguracaoPix();
    document.getElementById('titulo-janela').textContent = 'Configuração do Pix';

    let formulario = '<form novalidate id="formulario-pix" class="flex flex-coluna gap-md w-total" onsubmit="salvarConfiguracaoPix(event)">';
    formulario += criarCampoFormulario('Chave Pix', 'text', 'pix_chave', configuracao.chave_pix || '', 'CPF, CNPJ, email, telefone ou chave aleatória', true);
    formulario += criarCampoFormulario('Nome do Recebedor', 'text', 'pix_nome', configuracao.nome || NOME_INSTITUCIONAL, 'Nome exibido no pagamento', true);
    formulario += criarCampoFormulario('Cidade do Recebedor', 'text', 'pix_cidade', configuracao.cidade || 'CURITIBA', 'Ex: CURITIBA', true);
    formulario += criarRodapeFormulario('', 'Salvar Configuração', {
        tipoSalvar: 'submit'
    });
    formulario += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formulario;
    Interface.abrirJanela('janela-formulario');
}

async function salvarConfiguracaoPix(evento) {
    evento?.preventDefault();

    const chave = document.getElementById('pix_chave')?.value.trim() || '';
    const nome = document.getElementById('pix_nome')?.value.trim() || '';
    const cidade = document.getElementById('pix_cidade')?.value.trim() || '';

    if (!chave || !nome || !cidade) {
        Utilidades.notificacao('Preencha todos os dados do Pix.', 'erro');
        return false;
    }

    const nomeNormalizado = normalizarTextoPix(nome);
    const cidadeNormalizada = normalizarTextoPix(cidade);

    if (nomeNormalizado.length > 25) {
        Utilidades.notificacao('O nome do recebedor deve ter no máximo 25 caracteres.', 'erro');
        return false;
    }

    if (cidadeNormalizada.length > 15) {
        Utilidades.notificacao('A cidade do recebedor deve ter no máximo 15 caracteres.', 'erro');
        return false;
    }

    const configuracao = {
        chave: CHAVE_CONFIGURACAO_PIX,
        chave_pix: chave,
        nome: nomeNormalizado,
        cidade: cidadeNormalizada
    };

    try {
        await bd.inicializar();
        await bd.salvar('configuracoes', configuracao);
    } catch (erro) {
        Utilidades.notificacao('Não foi possível salvar a configuração do Pix.', 'erro');
        return false;
    }

    Interface.fecharJanela('janela-formulario');
    Utilidades.notificacao('Configuração do Pix salva com sucesso!', 'sucesso');
    return true;
}

async function gerarPixPagamento(idPagamento) {
    const pagamento = await bd.obter('pagamentos', idPagamento);
    if (!pagamento) {
        Utilidades.notificacao('Pagamento não encontrado.', 'erro');
        return;
    }

    const participante = await bd.obter('participantes', pagamento.id_participante);
    if (!participante) {
        Utilidades.notificacao('Não foi possível localizar o participante do pagamento.', 'erro');
        return;
    }

    const configuracao = await obterConfiguracaoPix();
    const chave = configuracao.chave_pix || '';

    if (!chave) {
        Utilidades.notificacao('Configure o Pix uma única vez usando o botão "Configurar Pix" antes de gerar pagamentos.', 'aviso');
        return;
    }

    const descricao = pagamento.descricao || pagamento.tipo || 'Pagamento';
    const payload = montarPayloadPix({
        chave,
        nome: configuracao.nome || NOME_INSTITUCIONAL,
        cidade: configuracao.cidade || 'CURITIBA',
        valor: pagamento.valor,
        pagador: participante.nome,
        descricao,
        identificador: montarIdentificadorPix(participante.nome, descricao)
    });

    mostrarPixGerado(payload, participante.nome || '', descricao, pagamento.valor);
}

async function gerarPixFinanca(idFinanca) {
    const financa = await bd.obter('financas', idFinanca);
    if (!financa || financa.tipo !== 'Entrada') {
        Utilidades.notificacao('Entrada não encontrada.', 'erro');
        return;
    }

    const configuracao = await obterConfiguracaoPix();
    if (!configuracao.chave_pix) {
        Utilidades.notificacao('Configure o Pix antes de gerar o pagamento.', 'aviso');
        return;
    }

    const descricao = financa.descricao || financa.categoria || 'Pagamento';
    const payload = montarPayloadPix({
        chave: configuracao.chave_pix,
        nome: configuracao.nome || NOME_INSTITUCIONAL,
        cidade: configuracao.cidade || 'CURITIBA',
        valor: financa.valor,
        pagador: financa.pagador || '',
        descricao,
        identificador: montarIdentificadorPix(financa.pagador || '', descricao)
    });

    mostrarPixGerado(payload, financa.pagador || '', descricao, financa.valor);
}

function mostrarPixGerado(payload, pagador, descricao, valor) {
    const identificacao = montarDescricaoPix(pagador, descricao);
    document.getElementById('titulo-janela').textContent = 'Pagamento via Pix';
    
    document.getElementById('conteudo-formulario').innerHTML = `
        <div class="flex flex-coluna gap-md w-total">
            <!-- Apenas o QR Code fica centralizado -->
            <div class="pix-geracao flex flex-coluna itens-centro mb-xs">
                <div id="qrcode-pix" class="qrcode-pix"></div>
            </div>
            
            <!-- Dados do pagamento e Textarea ficam fora da centralização e com w-total -->
            <div class="w-total">
                <p class="texto-md"><strong>Valor:</strong> ${Utilidades.formatarMoeda(valor)}</p>
                <p class="texto-md mb-sm"><strong>Identificação:</strong> ${Utilidades.escaparHtml(identificacao || 'Pagamento')}</p>
                <textarea id="codigo-pix-gerado" class="campo-padrao w-total" rows="4" readonly>${Utilidades.escaparHtml(payload)}</textarea>
            </div>
            
            ${criarRodapeModal([
                { rotulo: 'Cancelar', acao: "Interface.fecharJanela('janela-formulario')", variante: 'secundario' },
                { rotulo: 'Copiar Código Pix', acao: 'copiarCodigoPixGerado()', variante: 'primario'  }
            ])}
        </div>
    `;
    
    Interface.abrirJanela('janela-formulario');
    const recipiente = document.getElementById('qrcode-pix');
    if (!recipiente || typeof QRCode !== 'function') {
        Utilidades.notificacao('O gerador do QR Code não está disponível.', 'erro');
        return;
    }
    recipiente.innerHTML = '';
    new QRCode(recipiente, { text: payload, width: 260, height: 260, correctLevel: QRCode.CorrectLevel.M });
}

async function salvarPagamentoEGerarPix() {
    const configuracao = await obterConfiguracaoPix();
    if (!configuracao.chave_pix) {
        Utilidades.notificacao('Configure o Pix primeiro. Essa configuração será reutilizada nos próximos pagamentos.', 'aviso');
        await abrirConfiguracaoPix();
        return;
    }

    const pagamentos = await salvarPagamento({ fecharJanela: true, renderizar: true, notificar: true });
    if (!pagamentos || pagamentos.length === 0) return;

    if (pagamentos.length === 1) {
        await gerarPixPagamento(pagamentos[0].id);
        return;
    }

    Utilidades.notificacao('Foram gerados vários pagamentos. Gere o Pix individualmente na lista de pagamentos.', 'aviso');
}

function copiarCodigoPixGerado() {
    const codigo = document.getElementById('codigo-pix-gerado')?.value || '';
    if (!codigo) return;
    Utilidades.copiarParaClipboard(codigo);
}

function montarPayloadPix(dados = {}) {
    const chave = String(dados.chave || '').trim();
    const nome = normalizarTextoPix(dados.nome || NOME_INSTITUCIONAL).slice(0, 25);
    const cidade = normalizarTextoPix(dados.cidade || 'CURITIBA').slice(0, 15);
    const valor = Utilidades.normalizarValorMonetario(dados.valor).toFixed(2);
    const identificador = normalizarTextoPix(dados.identificador || montarIdentificadorPix(dados.pagador, dados.descricao))
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 25) || 'PAGAMENTO';

    const campoGui = montarCampoPix('00', 'br.gov.bcb.pix');
    const campoChave = montarCampoPix('01', chave);
    const descricao = montarDescricaoPix(dados.pagador, dados.descricao);
    const limiteDescricao = Math.min(72, Math.max(0, 99 - campoGui.length - campoChave.length - 4));
    const campoDescricao = descricao.slice(0, limiteDescricao);
    const campoConta = campoGui
        + campoChave
        + (campoDescricao ? montarCampoPix('02', campoDescricao) : '');

    const campoAdicional = montarCampoPix('05', identificador);

    let payload = '000201';
    payload += montarCampoPix('26', campoConta);
    payload += '52040000';
    payload += '5303986';
    payload += montarCampoPix('54', valor);
    payload += '5802BR';
    payload += montarCampoPix('59', nome);
    payload += montarCampoPix('60', cidade);
    payload += montarCampoPix('62', campoAdicional);
    payload += '6304';

    return payload + calcularCrc16(payload);
}

function montarCampoPix(id, valor) {
    const conteudo = String(valor ?? '');
    return `${id}${String(conteudo.length).padStart(2, '0')}${conteudo}`;
}

function montarDescricaoPix(pagador = '', descricao = '') {
    const nome = normalizarTextoPix(pagador).split(' ').filter(Boolean).slice(0, 2).join(' ');
    const descricaoNormalizada = normalizarTextoPix(descricao);
    return [nome, descricaoNormalizada].filter(Boolean).join(' | ').slice(0, 99);
}

function montarIdentificadorPix(pagador = '', descricao = '') {
    const nome = normalizarTextoPix(pagador).split(' ').filter(Boolean).slice(0, 2).join('');
    const descricaoNormalizada = normalizarTextoPix(descricao).replace(/ /g, '');
    return `${nome}${descricaoNormalizada}`.slice(0, 25) || 'PAGAMENTO';
}

function normalizarTextoPix(texto = '') {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function calcularCrc16(texto = '') {
    let crc = 0xFFFF;

    for (let indice = 0; indice < texto.length; indice++) {
        crc ^= texto.charCodeAt(indice) << 8;

        for (let bit = 0; bit < 8; bit++) {
            crc = crc & 0x8000
                ? (crc << 1) ^ 0x1021
                : crc << 1;
            crc &= 0xFFFF;
        }
    }

    return crc.toString(16).toUpperCase().padStart(4, '0');
}
