async function exportarCopiaSeguranca(tabelasSelecionadas = null) {
    const dados = await bd.exportarDados(tabelasSelecionadas);
    const json = JSON.stringify(dados, null, 2);
    const arquivoBlob = new Blob([json], { type: 'application/json' });
    const endereco = URL.createObjectURL(arquivoBlob);
    const ligacao = document.createElement('a');
    ligacao.href = endereco;
    ligacao.download = `copia_seguranca_comissao_biblico_catequetica_${new Date().toISOString().split('T')[0]}.json`;
    ligacao.click();
    URL.revokeObjectURL(endereco);
    Utilidades.notificacao('Cópia de segurança criada com sucesso!');
}
