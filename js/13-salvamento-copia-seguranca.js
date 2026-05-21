async function exportarCopiaSeguranca() {
    const dados = await bd.exportarDados();
    const json = JSON.stringify(dados, null, 2);
    const arquivoBlob = new Blob([json], { type: 'application/json' });
    const endereco = URL.createObjectURL(arquivoBlob);
    const ligacao = document.createElement('a');
    ligacao.href = endereco;
    ligacao.download = `copia_seguranca_escola_${new Date().toISOString().split('T')[0]}.json`;
    ligacao.click();
    URL.revokeObjectURL(endereco);
    Utilidades.notificacao('Cópia de segurança criada com sucesso!');
}

async function importarCopiaSeguranca() {
    const campo = document.createElement('input');
    campo.type = 'file';
    campo.accept = '.json';
    campo.onchange = async (e) => {
        const arquivo = e.target.files[0];
        if (!arquivo) return;

        const leitor = new FileReader();
        leitor.onload = async (evento) => {
            try {
                const dados = JSON.parse(evento.target.result);
                await bd.importarDados(dados);
                Utilidades.notificacao('Dados restaurados com sucesso!');
                renderizarAbaAtual();
            } catch (erro) {
                Utilidades.notificacao('Erro ao restaurar dados: ' + erro.message, 'erro');
            }
        };
        leitor.readAsText(arquivo);
    };
    campo.click();
}