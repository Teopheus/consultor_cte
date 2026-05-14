const fs = require('fs');
const https = require('https');
const axios = require('axios');
const { exec } = require('child_process');

// ==========================================
// 1. CONFIGURAÇÕES BASE
// ==========================================
const CAMINHO_CERTIFICADO = 'C:/Users/Thomas Albuquerque/Desktop/extrator/TRANSAGIL TRANSPORTES DE CARGA LTDA_07199061000179.pfx'; 
const SENHA_CERTIFICADO = 'AGIL0001';      
const ARQUIVO_CHAVES = './chaves_limpas.txt';
const URL_SEFAZ = 'https://cte.svrs.rs.gov.br/ws/CTeConsultaV4/CTeConsultaV4.asmx';

// ==========================================
// 2. CONFIGURAÇÕES DE VELOCIDADE (OTIMIZADO)
// ==========================================
const CHAVES_POR_RAZADA = 5; // Consulta 5 chaves AO MESMO TEMPO
const PAUSA_ENTRE_RAJADAS = 3000; // Pausa de 3 segundos entre as rajadas

const httpsAgent = new https.Agent({
    pfx: fs.readFileSync(CAMINHO_CERTIFICADO),
    passphrase: SENHA_CERTIFICADO,
    rejectUnauthorized: false
});

// ==========================================
// FUNÇÃO: Validador de Dígito (Módulo 11)
// ==========================================
function validarChaveSefaz(chave) {
    if (!chave || chave.length !== 44 || !/^\d+$/.test(chave)) return false;

    const base = chave.substring(0, 43);
    const digitoVerificador = parseInt(chave.charAt(43));

    let soma = 0;
    let peso = 2;

    for (let i = 42; i >= 0; i--) {
        soma += parseInt(base.charAt(i)) * peso;
        peso++;
        if (peso > 9) peso = 2;
    }

    const resto = soma % 11;
    const digitoCalculado = (resto === 0 || resto === 1) ? 0 : 11 - resto;

    return digitoCalculado === digitoVerificador;
}

function montarXml(chave) {
    return `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><cteDadosMsg xmlns="http://www.portalfiscal.inf.br/cte/wsdl/CTeConsultaV4"><consSitCTe versao="4.00" xmlns="http://www.portalfiscal.inf.br/cte"><tpAmb>1</tpAmb><xServ>CONSULTAR</xServ><chCTe>${chave}</chCTe></consSitCTe></cteDadosMsg></soap12:Body></soap12:Envelope>`;
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função isolada para consultar UMA chave (Com Disjuntor, Alerta Sonoro e Bloco Vermelho)
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

        // DISJUNTOR: Bloqueio de Consumo Indevido da SEFAZ
        if (status === '656' || status === '678') {
            return { chave, status: 'erro_fatal_consumo', motivo };
        }

        if (status === '101' || status === '135') {
            // Códigos de cor nativos do terminal (Fundo Vermelho, Texto Branco, Negrito)
            const bgRed = "\x1b[41m";
            const fgWhite = "\x1b[37m";
            const bold = "\x1b[1m";
            const reset = "\x1b[0m";

            console.log("\n");
            console.log(`${bgRed}${fgWhite}${bold}==============================================================${reset}`);
            console.log(`${bgRed}${fgWhite}${bold} 🚨 ALERTA: CT-E CANCELADO ENCONTRADO! 🚨                     ${reset}`);
            console.log(`${bgRed}${fgWhite}${bold}==============================================================${reset}`);
            console.log(`${bgRed}${fgWhite}${bold} 📄 CHAVE:  ${chave}                 ${reset}`);
            console.log(`${bgRed}${fgWhite}${bold} 📌 MOTIVO: ${status} - ${motivo.padEnd(38, ' ')}${reset}`);
            console.log(`${bgRed}${fgWhite}${bold}==============================================================${reset}`);
            console.log("\n");
            
            // Dispara um bipe no Windows
            exec('powershell.exe -c "[console]::beep(1000, 500)"');
            
            return { chave, status: 'cancelada' };
        } else if (status !== '100') {
            console.log(`⚠️ Status ${status} - Chave ${chave} (${motivo})`);
        }
        return { chave, status: 'ok' };

    } catch (erro) {
        if (erro.response && erro.response.status === 403) {
            return { chave, status: 'erro_fatal_403' };
        }
        return { chave, status: 'erro_conexao' };
    }
}

// ==========================================
// 3. O GERENCIADOR DE LOTE
// ==========================================
async function iniciarTurbo() {
    console.log("Lendo e validando chaves localmente...");
    
    const chavesLidas = fs.readFileSync(ARQUIVO_CHAVES, 'utf-8')
        .split('\n')
        .map(c => c.trim())
        .filter(c => c.length === 44);

    // --- NOVA BLINDAGEM: Filtra as chaves inválidas matematicamente ---
    const chaves = chavesLidas.filter(chave => {
        const ehValida = validarChaveSefaz(chave);
        if (!ehValida) {
            console.log(`🗑️ DESCARTADA: Chave inválida (Erro de Módulo 11) -> ${chave}`);
        }
        return ehValida;
    });

    const chavesSujas = chavesLidas.length - chaves.length;
    
    const totalLotes = Math.ceil(chaves.length / CHAVES_POR_RAZADA);
    const tempoEstimado = Math.ceil((totalLotes * PAUSA_ENTRE_RAJADAS) / 1000 / 60);

    console.log(`\n📁 Total original: ${chavesLidas.length}`);
    console.log(`🗑️ Chaves sujas/inválidas descartadas: ${chavesSujas}`);
    console.log(`✅ Chaves reais para consultar: ${chaves.length}`);
    console.log(`🚀 Iniciando... (Lotes de ${CHAVES_POR_RAZADA}) | Tempo estimado: ~${tempoEstimado} minutos.\n`);

    for (let i = 0; i < chaves.length; i += CHAVES_POR_RAZADA) {
        
        const loteDeChaves = chaves.slice(i, i + CHAVES_POR_RAZADA);
        const numeroLoteAtual = Math.floor(i / CHAVES_POR_RAZADA) + 1;

        process.stdout.write(`Processando Lote ${numeroLoteAtual}/${totalLotes} (${loteDeChaves.length} chaves simultâneas)... `);

        // Dispara todas as consultas desse lote AO MESMO TEMPO
        const promessas = loteDeChaves.map(chave => consultarChaveIndividual(chave));
        const resultados = await Promise.all(promessas);

        // --- VERIFICAÇÃO DO DISJUNTOR ---
        if (resultados.some(r => r.status === 'erro_fatal_consumo')) {
            console.log("\n🛑 ALARME SEFAZ: Consumo Indevido detectado!");
            console.log("🛑 SCRIPT ABORTADO PARA EVITAR PUNIÇÃO MAIOR.");
            console.log("🕒 O seu certificado está bloqueado. Aguarde EXATAMENTE 61 MINUTOS antes de rodar novamente.");
            break; 
        }

        if (resultados.some(r => r.status === 'erro_fatal_403')) {
            console.log("\n🛑 SCRIPT ABORTADO: Bloqueio 403 (IP bloqueado pelo Firewall da SEFAZ).");
            break;
        }

        console.log(`Concluído.`);

        // Pausa entre as rajadas para esfriar o IP
        await delay(PAUSA_ENTRE_RAJADAS);
    }

    console.log("\n✅ Varredura concluída!");
}

iniciarTurbo();