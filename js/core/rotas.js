const ROTAS_ABAS = {
    cursos: conteudo => renderizarCursos(conteudo),
    paroquias: conteudo => renderizarParoquias(conteudo),
    palestrantes: conteudo => renderizarPalestrantes(conteudo),
    disciplinas: conteudo => renderizarDisciplinas(conteudo),
    participantes: conteudo => renderizarParticipantes(conteudo),
    frequencia: conteudo => renderizarFrequencia(conteudo),
    atividades: conteudo => renderizarAtividades(conteudo),
    pagamentos: conteudo => renderizarPagamentos(conteudo),
    avisos: conteudo => renderizarAvisos(conteudo),
    financas: conteudo => renderizarFinancas(conteudo),
    relatorios: conteudo => renderizarRelatorios(conteudo),
    dados: conteudo => renderizarDados(conteudo)
};

async function renderizarAbaAtual() {
    const conteudo = document.getElementById('conteudo-administracao');
    if (!conteudo) return;

    try {
        await bd.inicializar();
        Interface.fecharJanela('janela-formulario');
        conteudo.innerHTML = '';

        const renderizarAba = ROTAS_ABAS[AppEstado.abaAtual] || ROTAS_ABAS[ABA_INICIAL];
        await renderizarAba(conteudo);
    } catch (erro) {
        console.error(erro);
        conteudo.innerHTML = `
            <div class="pagina-conteudo">
                ${criarMensagemVazia('Não foi possível abrir esta aba. Verifique o console para detalhes.')}
            </div>
        `;
        Utilidades.notificacao('Não foi possível abrir esta aba.', 'erro');
    }
}
