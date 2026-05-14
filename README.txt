# Consultor de CTe - Sistema de Extração e Rastreio

Este projeto automatiza a recolha de chaves de acesso de CTe de um sistema legado e verifica o estado de cancelamento diretamente na SEFAZ.

## 1. Requisitos do Sistema e Instalação

### Ambiente Python (Para o Extrator):
1.  **Instalação do Python:**
    -   Aceda a [python.org](https://www.python.org/downloads/) e descarregue a versão mais recente para o seu sistema.
    -   **Importante:** Durante a instalação no Windows, marque a caixa **"Add Python to PATH"**.
2.  **Bibliotecas Necessárias:**
    -   Abra o terminal ou prompt de comando e execute:
        `pip install pyautogui pyperclip`
    -   *Nota:* O `pyautogui` controla a interface e o `pyperclip` gere a área de transferência

### Ambiente Node.js (Para o Rastreador):
1.  **Instalação do Node.js:**

2.  **Bibliotecas Necessárias:**
    -   No terminal, dentro da pasta do projeto, execute:
        `npm install axios`
    -   *Nota:* O `axios` é utilizado para as requisições SOAP à SEFAZ

## 2. Como Utilizar

### Passo 1: Extração das Chaves (extrator.py)
1.  Abra o sistema onde as chaves estão listadas.
2.  Execute: `python extrator.py`.
3.  Tem 5 segundos para clicar no primeiro campo de chave do seu sistema .
4.  O robô irá percorrer os campos e salvar as chaves no ficheiro 'chaves_limpas.txt' 
5.  **Emergência:** Para parar, arraste o rato violentamente para qualquer canto do monitor

### Passo 2: Verificação na SEFAZ (rastreador.js)
1.  Certifique-se de que o Certificado Digital (.pfx) está no caminho configurado no código 
2.  Verifique se a senha do certificado está correta na variável `SENHA_CERTIFICADO` 
3.  Execute: `node rastreador.js`.
4.  O script consultará a SEFAZ e alertará caso encontre chaves canceladas (Status 101 ou 135)

## 3. Configurações e Limites
-   O extrator está configurado para 1500 chaves por padrão 
-   O rastreador processa lotes de chaves com pausas para evitar bloqueios de IP (Erro 403) .


