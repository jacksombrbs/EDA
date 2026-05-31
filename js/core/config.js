const ABA_INICIAL = 'cursos';
const NOME_INSTITUCIONAL = 'Comissão Bíblico-Catequética';
const SUBTITULO_INSTITUCIONAL = 'Escola de Catequistas e Cursos de Formação';
const CAMINHO_MARCA_INSTITUCIONAL = 'marca-comissao-desenho.svg';
const VERSAO_APLICATIVO = '1.2.0';
const VERSAO_DADOS_APLICATIVO = 3;
const BANCO_DADOS_NOME = 'escolaDiscipuloAmado_v2';
const BANCO_DADOS_VERSAO = 2;

const TABELAS_BANCO_DADOS = [
    { nome: 'cursos', chave: 'id', rotulo: 'Cursos' },
    { nome: 'paroquias', chave: 'id', rotulo: 'Paróquias' },
    { nome: 'palestrantes', chave: 'id', rotulo: 'Palestrantes' },
    { nome: 'disciplinas', chave: 'id', rotulo: 'Disciplinas' },
    { nome: 'participantes', chave: 'id', rotulo: 'Participantes' },
    { nome: 'frequencias', chave: 'id', rotulo: 'Frequências' },
    { nome: 'atividades', chave: 'id', rotulo: 'Atividades' },
    { nome: 'pagamentos', chave: 'id', rotulo: 'Pagamentos' },
    { nome: 'pagamentos_lote', chave: 'id', rotulo: 'Pagamentos em lote' },
    { nome: 'avisos', chave: 'id', rotulo: 'Avisos' },
    { nome: 'financas', chave: 'id', rotulo: 'Livro caixa' },
    { nome: 'configuracoes', chave: 'chave', rotulo: 'Configurações' }
];

const ICONES_BOTOES_MODAL = [
    { termos: ['Cancelar', 'Fechar'], icone: 'cancelar' },
    { termos: ['Enviar via WhatsApp'], icone: 'enviar' },
    { termos: ['Salvar e Gerar Recibo'], icone: 'recibo' },
    { termos: ['Salvar', 'Atualizar'], icone: 'salvar' },
    { termos: ['Gerar Recibo'], icone: 'recibo' },
    { termos: ['Validar Planilha'], icone: 'validar-planilha' }
];
