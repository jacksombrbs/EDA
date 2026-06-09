async function garantirCodigoAcessoParticipante(participante) {
    if (participante.codigo_acesso) return participante;

    participante.codigo_acesso = await gerarCodigoAcessoUnico(participante.id);
    await bd.salvar('participantes', participante);
    return participante;
}

async function obterDadosCartaoParticipante(participante) {
    const [curso, paroquia] = await Promise.all([
        participante.id_curso ? bd.obter('cursos', participante.id_curso) : Promise.resolve(null),
        participante.id_paroquia ? bd.obter('paroquias', participante.id_paroquia) : Promise.resolve(null)
    ]);

    return {
        participante,
        curso: curso?.nome || '-',
        paroquia: paroquia?.nome || '-'
    };
}

function criarEstilosCartoesAcesso(individual = false) {
    const margemPagina = individual ? '8mm' : '4mm';
    const espacamentoGrade = individual ? '6mm' : '2mm';

    return `
        @page { size: A4 portrait; margin: ${margemPagina}; }
        body { margin: 0; background: #ffffff; }
        .grade-cartoes-acesso {
            display: grid;
            grid-template-columns: repeat(2, 9.9cm);
            gap: ${espacamentoGrade};
            justify-content: center;
            align-content: start;
        }
        .folha-cartao-individual {
            min-height: 190mm;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding-top: 18mm;
        }
        .cartao-acesso {
            width: 9.9cm;
            height: 5.58cm;
            padding: 4mm;
            overflow: hidden;
            border: 1mm solid var(--cor-documento-vinho);
            border-radius: 3mm;
            background: #ffffff;
            page-break-inside: avoid;
            break-inside: avoid;
            font-family: var(--fonte-documento);
        }
        .topo-cartao-acesso {
            display: flex;
            align-items: center;
            gap: 2.5mm;
            margin-bottom: 1.6mm;
            padding-bottom: 1.4mm;
            border-bottom: 0.4mm solid var(--cor-documento-dourado);
        }
        .logo-cartao-acesso {
            width: 9mm;
            height: 9mm;
            object-fit: contain;
        }
        .marca-cartao-acesso {
            margin: 0;
            color: var(--cor-documento-vinho);
            font-size: 7.8pt;
            font-weight: 800;
            text-transform: uppercase;
        }
        .submarca-cartao-acesso {
            margin: 1mm 0 0;
            color: var(--cor-documento-azul);
            font-size: 6pt;
            font-weight: 700;
            text-transform: uppercase;
        }
        .nome-cartao-acesso {
            margin: 0 0 1.8mm;
            color: var(--cor-documento-azul);
            font-size: 15pt;
            font-weight: 900;
            line-height: 1.08;
            text-transform: uppercase;
        }
        .linha-cartao-acesso {
            margin: 1.2mm 0;
            color: var(--cor-documento-texto);
            font-size: 8pt;
            line-height: 1.25;
        }
        .linha-paroquia-cartao {
            font-size: 10.8pt;
            font-weight: 800;
        }
        .linha-curso-cartao {
            font-size: 8.5pt;
        }
        .linha-cartao-acesso strong {
            color: var(--cor-documento-vinho);
        }
        .status-ativo-cartao {
            color: #047857;
            font-weight: 800;
        }
        .status-inativo-cartao {
            color: #b91c1c;
            font-weight: 900;
        }
        .codigo-cartao-acesso {
            margin-top: 2mm;
            padding: 1.5mm 2.5mm;
            border-radius: 2mm;
            background: #ffffff;
            color: var(--cor-documento-vinho);
            font-size: 13pt;
            font-weight: 900;
            text-align: center;
            letter-spacing: 1.5pt;
        }
        @media print {
            body { margin: 0; }
            .cartao-acesso { box-shadow: none; }
            ${individual ? '.cartao-acesso { page-break-after: always; }' : ''}
        }
    `;
}

function montarHtmlCartaoParticipante(dadosCartao) {
    const caminhoMarca = new URL(CAMINHO_MARCA_INSTITUCIONAL, window.location.href).href;
    const { participante, curso, paroquia } = dadosCartao;
    const status = participante.status || 'Ativo';
    const classeStatus = Utilidades.participanteEstaAtivo(participante) ? 'status-ativo-cartao' : 'status-inativo-cartao';

    return `
        <article class="cartao-acesso">
            <div class="topo-cartao-acesso">
                <img src="${caminhoMarca}" alt="${Utilidades.escaparHtml(NOME_INSTITUCIONAL)}" class="logo-cartao-acesso">
                <div>
                    <p class="marca-cartao-acesso">${Utilidades.escaparHtml(NOME_INSTITUCIONAL)}</p>
                    <p class="submarca-cartao-acesso">${Utilidades.escaparHtml(SUBTITULO_INSTITUCIONAL)}</p>
                </div>
            </div>
            <h1 class="nome-cartao-acesso">${Utilidades.escaparHtml(participante.nome || '-')}</h1>
            <p class="linha-cartao-acesso linha-paroquia-cartao"><strong>Paróquia:</strong> ${Utilidades.escaparHtml(paroquia)}</p>
            <p class="linha-cartao-acesso linha-curso-cartao"><strong>Curso:</strong> ${Utilidades.escaparHtml(curso)}</p>
            <p class="linha-cartao-acesso ${classeStatus}"><strong>Status:</strong> ${Utilidades.escaparHtml(status)}</p>
            <div class="codigo-cartao-acesso">${Utilidades.escaparHtml(participante.codigo_acesso || '-')}</div>
        </article>
    `;
}

function montarHtmlCartoesAcesso(dadosCartoes, individual = false) {
    const classeFolha = individual ? 'folha-cartao-individual' : 'grade-cartoes-acesso';
    return `<section class="${classeFolha}">${dadosCartoes.map(montarHtmlCartaoParticipante).join('')}</section>`;
}

async function imprimirCartaoParticipante(idParticipante) {
    let participante = await bd.obter('participantes', idParticipante);
    if (!participante) {
        Utilidades.notificacao('Participante não encontrado.', 'erro');
        return;
    }

    participante = await garantirCodigoAcessoParticipante(participante);
    const dadosCartao = await obterDadosCartaoParticipante(participante);

    abrirDocumentoImpressao(
        `Cartão de Acesso - ${participante.nome || 'Participante'}`,
        montarHtmlCartoesAcesso([dadosCartao], true),
        { incluirCabecalho: false, estilosExtras: criarEstilosCartoesAcesso(true) }
    );
}

async function abrirModalCartoesParticipantes() {
    const cursos = await bd.obterTodos('cursos');
    cursos.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    document.getElementById('titulo-janela').textContent = 'Imprimir Cartões de Acesso';

    let html = '<form novalidate class="flex flex-coluna gap-md w-total" onsubmit="event.preventDefault();">';
    html += criarSeletor('Curso', 'id_curso_cartoes', cursos.map(curso => ({ id: curso.id, nome: curso.nome })), '', true);
    html += '<label class="flex itens-centro gap-sm cursor-apontador cartao-suave">';
    html += '<input type="checkbox" id="somente_ativos_cartoes" class="checkbox-padrao" checked>';
    html += '<span class="texto-md cor-texto-escuro">Imprimir somente participantes ativos</span>';
    html += '</label>';
    html += criarRodapeFormulario('imprimirCartoesSelecionados()', 'Imprimir Cartões', {
        varianteSalvar: 'secundario'
    });
    html += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = html;
    Interface.abrirJanela('janela-formulario');
}

async function imprimirCartoesSelecionados() {
    const idCurso = document.getElementById('id_curso_cartoes')?.value || '';
    const somenteAtivos = document.getElementById('somente_ativos_cartoes')?.checked;

    if (!idCurso) {
        Utilidades.notificacao('Selecione um curso para imprimir os cartões.', 'erro');
        return;
    }

    const participantes = await bd.obterTodos('participantes');
    const participantesCurso = participantes
        .filter(participante => String(participante.id_curso) === String(idCurso))
        .filter(participante => !somenteAtivos || Utilidades.participanteEstaAtivo(participante))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    if (participantesCurso.length === 0) {
        Utilidades.notificacao('Nenhum participante encontrado para este curso.', 'aviso');
        return;
    }

    const dadosCartoes = [];
    for (const participanteOriginal of participantesCurso) {
        const participante = await garantirCodigoAcessoParticipante(participanteOriginal);
        dadosCartoes.push(await obterDadosCartaoParticipante(participante));
    }

    Interface.fecharJanela('janela-formulario');
    abrirDocumentoImpressao(
        'Cartões de Acesso',
        montarHtmlCartoesAcesso(dadosCartoes, false),
        { incluirCabecalho: false, estilosExtras: criarEstilosCartoesAcesso(false) }
    );
}

