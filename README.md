Automação e Validação de Chaves CT-e (SEFAZ)
Este repositório contém um conjunto de scripts desenvolvidos para automatizar a extração de chaves de acesso de Conhecimento de Transporte Eletrônico (CT-e) de interfaces gráficas e, em seguida, consultar seus respectivos status de cancelamento diretamente no Web Service da SEFAZ (RS - V4).

A solução é dividida em duas etapas principais:

Extrator (extrator.py): Script em Python para captura automatizada de tela e teclado.

Rastreador (rastreador.js): Script em Node.js para requisições em lote via SOAP utilizando certificado digital.

Pré-requisitos
Para executar os scripts, você precisará ter instalado em sua máquina:

Python 3.x

Node.js (versão 14 ou superior recomendada)

Certificado Digital (A1) no formato .pfx válido.

Instalação e Configuração
1. Configurando o ambiente Python (Extrator)
Abra o terminal na pasta do projeto e instale as bibliotecas necessárias para a automação de interface:

pip install pyautogui pyperclip

2. Configurando o ambiente Node.js (Rastreador)
Na mesma pasta, inicialize o projeto Node (caso ainda não exista o package.json) e instale o cliente HTTP necessário para as requisições SOAP

npm init -y
npm install axios

(As bibliotecas fs e https já são nativas do Node.js).

Como Executar
Passo 1: Extração das Chaves (extrator.py)
O script Python assume o controle do teclado para varrer campos de um sistema e copiar as chaves de 44 dígitos, salvando-as em um arquivo de texto.

Configurações internas antes de rodar:
Abra o arquivo extrator.py e ajuste as variáveis de configuração conforme a necessidade do seu sistema logístico:

TOTAL_CHAVES: Quantidade de campos que o robô deve ler.

TECLA_PROXIMO: Tecla utilizada para pular para o próximo campo no sistema (ex: 'tab' ou 'down').

Execução:

Execute o script no terminal:

python extrator.py

Você terá 5 segundos para clicar no primeiro campo de chave do sistema alvo.

Parada de Emergência: Caso precise interromper o robô antes do fim, arraste o cursor do mouse rapidamente para qualquer um dos quatro cantos do monitor (recurso nativo do PyAutoGUI).

Resultado: O script gerará um arquivo chamado chaves_limpas.txt no mesmo diretório, contendo apenas chaves válidas (44 números).

Passo 2: Consulta na SEFAZ (rastreador.js)
O script Node.js consome o arquivo gerado pelo extrator e realiza consultas assíncronas no endpoint CTeConsultaV4 da SEFAZ, utilizando o certificado digital da empresa.

Configurações internas antes de rodar:
Abra o arquivo rastreador.js e configure obrigatoriamente os seguintes campos:

CAMINHO_CERTIFICADO: Caminho para o seu arquivo .pfx (ex: ./certificado.pfx).

SENHA_CERTIFICADO: Senha do certificado digital.

CHAVES_POR_RAZADA: Quantidade de requisições simultâneas (Cuidado com bloqueios 403 da SEFAZ, o padrão é 1).

PAUSA_ENTRE_RAJADAS: Tempo de espera entre os lotes em milissegundos.

Execução:
Certifique-se de que o arquivo chaves_limpas.txt e o certificado .pfx estão no mesmo diretório do script e execute:

node rastreador.js

Resultado: O terminal exibirá o progresso dos lotes processados e alertará destacadamente caso encontre chaves com status 101 (Cancelamento) ou 135 (Evento registrado e vinculado a CT-e). Erros de conexão ou bloqueios (403) também serão informados no console.
