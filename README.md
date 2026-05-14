# Arquitetura e Justificativa de Configurações - Rastreador CT-e

Este documento detalha as decisões arquiteturais e as configurações de limitação de taxa (throttling) implementadas no script `rastreador.js`. Todas as métricas foram ajustadas em resposta direta às regras de segurança do Ambiente Autorizador da SEFAZ (SVRS e Nacional) referentes ao "Consumo Indevido".

## 1. Controle Volumétrico Seguro (Pausa de 3000ms)
- **A Regra da SEFAZ:** O Manual de Orientação do Contribuinte (MOC) estabelece um teto volumétrico estrito de 600 consultas a cada 5 minutos (300 segundos) por certificado digital. Ultrapassar esse limite gera a Rejeição 656 (Consumo Indevido).
- **A Configuração:** `PAUSA_ENTRE_RAJADAS = 3000`
- **Justificativa Técnica:** Ao definir um delay de 3000 milissegundos entre as rajadas de requisições, o script garante um rendimento máximo teórico de cerca de 425 a 450 requisições por 5 minutos. Isso mantém a aplicação operando com uma margem de segurança de ~25% abaixo do teto da SEFAZ, folga vital para absorver oscilações de latência da rede (jitter) sem risco de estourar a cota.

## 2. Mitigação de WAF e Prevenção de DDoS (Lotes de 5 chaves)
- **A Regra da SEFAZ:** O Web Application Firewall (WAF) dos servidores estaduais monitora anomalias de conexão na camada TCP. Picos instantâneos de dezenas/centenas de requisições na mesma fração de segundo são rotulados heurísticamente como ataque de Negação de Serviço (DDoS), resultando em corte de conexão (HTTP Erro 403 Forbidden).
- **A Configuração:** `CHAVES_POR_RAZADA = 5`
- **Justificativa Técnica:** O interpretador do Node.js (non-blocking I/O) poderia disparar milhares de chaves simultaneamente. A limitação artificial para apenas 5 conexões HTTPS abertas em paralelo atua como uma camuflagem de tráfego. O balanceador de carga da SEFAZ absorve 5 requests paralelos do mesmo IP como tráfego legítimo de um sistema comercial padrão, sem engatilhar os filtros de segurança primários.

## 3. Data Sanitization (Filtro Módulo 11)
- **A Regra da SEFAZ:** Qualquer requisição cujo parâmetro XML seja inválido consome a cota de tráfego e contabiliza negativamente para a regra das 60 rejeições (looping). Mais de 60 rejeições em 5 minutos geram bloqueio.
- **A Configuração:** Função `validarChaveSefaz()` implementada antes do loop de requisições.
- **Justificativa Técnica:** A aplicação do algoritmo do Módulo 11 (dígito verificador) localmente na memória descarta chaves corrompidas ou mal digitadas na origem. Isso preserva 100% da cota de requisições do Web Service exclusivamente para chaves matematicamente íntegras, evitando o bloqueio por "comportamento de looping".

## 4. Circuit Breaker (Disjuntor de Segurança)
- **A Regra da SEFAZ:** A punição por Consumo Indevido bloqueia o certificado no Web Service por 1 hora. Se o cliente realizar uma nova requisição durante este período, o cronômetro de 1 hora é reiniciado.
- **A Configuração:** Interceptação dos cStats `656` e `678` com interrupção síncrona (`break`).
- **Justificativa Técnica:** Este bloco atua como o disjuntor principal da aplicação (State Management). Ao identificar a punição ativa no parser do XML, o script aplica um `break` fatal no loop principal. Isso desliga a comunicação instantaneamente e de forma autônoma, garantindo que o software não renove a punição governamental indefinidamente.
