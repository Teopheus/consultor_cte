const fs = require('fs');
const https = require('https');
const axios = require('axios');

// ==========================================
// 1. CONFIGURAÇÕES BASE
// ==========================================
const CAMINHO_CERTIFICADO = './certificado.pfx';
const SENHA_CERTIFICADO = '';
const ARQUIVO_CHAVES = './chaves_limpas.txt';
const URL_SEFAZ = 'https://cte.svrs.rs.gov.br/ws/CTeConsultaV4/CTeConsultaV4.asmx';

// ==========================================
// 2. CONFIGURAÇÕES DE VELOCIDADE
// ==========================================
const CHAVES_POR_RAZADA = 1; // Quantas chaves consultar AO MESMO TEMPO
const PAUSA_ENTRE_RAJADAS = 1000; // Tempo de respiro entre as rajadas (em milissegundos)

const httpsAgent = new https.Agent({
    pfx: fs.readFileSync(CAMINHO_CERTIFICADO),
    passphrase: SENHA_CERTIFICADO,
    rejectUnauthorized: false
});

function montarXml(chave) {
    return `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><cteDadosMsg xmlns="http://www.portalfiscal.inf.br/cte/wsdl/CTeConsultaV4"><consSitCTe versao="4.00" xmlns="http://www.portalfiscal.inf.br/cte"><tpAmb>1</tpAmb><xServ>CONSULTAR</xServ><chCTe>${chave}</chCTe></consSitCTe></cteDadosMsg></soap12:Body></soap12:Envelope>`;
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função isolada para consultar UMA chave
async function consultarChaveIndividual(chave) {
    try {
        const resposta = await axios.post(URL_SEFAZ, montarXml(chave), {
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8',
                'SOAPAction': 'http://www.portalfiscal.inf.br/cte/wsdl/CTeConsultaV4/cteConsultaCT'
            },
            httpsAgent: httpsAgent,
            timeout: 10000
        });

        const xml = resposta.data;
        const status = (xml.match(/<cStat>(\d+)<\/cStat>/) || [])[1] || '???';
        const motivo = (xml.match(/<xMotivo>(.*?)<\/xMotivo>/) || [])[1] || '';

        if (status === '101' || status === '135') {
            console.log(`\n🚨 CHAVE CANCELADA ENCONTRADA: ${chave} (Status ${status} - ${motivo}) 🚨\n`);
            return { chave, status: 'cancelada' };
        } else if (status !== '100') {
            console.log(`⚠️ Status ${status} para a chave ${chave} - ${motivo}`);
        }
        return { chave, status: 'ok' };

    } catch (erro) {
        if (erro.response && erro.response.status === 403) {
            console.log(`\n❌ Bloqueio 403 na chave ${chave}.`);
            return { chave, status: 'erro_fatal' };
        }
        // Se der erro 500 ou time-out em uma chave específica, não trava o lote inteiro
        return { chave, status: 'erro_conexao' };
    }
}

// ==========================================
// 3. O GERENCIADOR DE LOTE
// ==========================================
async function iniciarTurbo() {
    const chaves = fs.readFileSync(ARQUIVO_CHAVES, 'utf-8')
        .split('\n')
        .map(c => c.trim())
        .filter(c => c.length === 44);

    const totalLotes = Math.ceil(chaves.length / CHAVES_POR_RAZADA);
    const tempoEstimado = Math.ceil((totalLotes * PAUSA_ENTRE_RAJADAS) / 1000 / 60);

    console.log(` Iniciando... (Lotes de ${CHAVES_POR_RAZADA})`);
    console.log(`📁 Total: ${chaves.length} chaves. Tempo estimado: ~${tempoEstimado} minutos.\n`);

    for (let i = 0; i < chaves.length; i += CHAVES_POR_RAZADA) {
        
        const loteDeChaves = chaves.slice(i, i + CHAVES_POR_RAZADA);
        const numeroLoteAtual = Math.floor(i / CHAVES_POR_RAZADA) + 1;

        process.stdout.write(`Processando Lote ${numeroLoteAtual}/${totalLotes} (${loteDeChaves.length} chaves simultâneas)... `);

        // Dispara todas as consultas desse lote AO MESMO TEMPO
        const promessas = loteDeChaves.map(chave => consultarChaveIndividual(chave));

        // Aguarda todas as respostas da rajada chegarem
        const resultados = await Promise.all(promessas);

        // Verifica se houve algum bloqueio fatal
        if (resultados.some(r => r.status === 'erro_fatal')) {
            console.log("\n🛑 Script abortado por bloqueio da SEFAZ.");
            break;
        }

        console.log(`Concluído.`);

        //  Pausa entre as rajadas para esfriar o IP
        await delay(PAUSA_ENTRE_RAJADAS);
    }

    console.log("\n Varredura concluída!");
}

iniciarTurbo();