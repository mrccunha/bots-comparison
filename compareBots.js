const fs = require('fs');
const path = require('path');
const deepDiff = require('deep-diff');
const base64 = require('js-base64').Base64;

const outputPath = 'bots/bot_comparison_prod_vs_homolog.json';
const outputPathNormalized = 'bots/bot_normalized.json';

const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

// Função para carregar e decodificar o bot
function loadAndDecodeBot(filePath) {
    try {
        const botData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        // Decodificar diálogos base64
        const decodedDialogs = botData.dialogs.map(encodedDialog => {
            try {
                return JSON.parse(base64.decode(encodedDialog));
            } catch (error) {
                console.error(`Erro ao decodificar diálogo: ${error.message}`);
                return null;
            }
        }).filter(dialog => dialog !== null); // Filtrar diálogos válidos

        return {
            config: botData.config,
            config_homol: botData.config_homol,
            dialogs: decodedDialogs
        };

    } catch (error) {
        console.error(`Erro ao carregar o arquivo ${filePath}: ${error.message}`);
        return null;
    }
}

// Função para normalizar os dados dos diálogos
function normalizeBotData(botData) {
    botData.dialogs.forEach(dialog => {
        if (dialog.config && dialog.config.cells) {
            dialog.config.cells.forEach(cell => {
                delete cell.id;
                delete cell.position;
                delete cell.size;
                delete cell.attrs; // Remover atributos visuais
                delete cell.events; // Remover eventos
            });
        }
    });
    return botData;
}

// Carregar e comparar os bots de produção e homologação
const botProdData = loadAndDecodeBot('export_builder_prod.json');
const botHomologData = loadAndDecodeBot('export_builder_homolog.json');

if (!botProdData || !botHomologData) {
    console.error("Erro ao carregar um ou ambos os bots.");
    process.exit(1);
}

// Normalizar os dados dos bots
const botProdNormalized = normalizeBotData(botProdData);
const botHomologNormalized = normalizeBotData(botHomologData);

// Comparar os diálogos normalizados dos dois bots
const diff = deepDiff(botProdNormalized.dialogs, botHomologNormalized.dialogs);

// Verificar se há diferenças
if (diff) {
    fs.writeFileSync(outputPath, JSON.stringify(diff, null, 4));
    fs.writeFileSync(outputPathNormalized, JSON.stringify({
        prod: botProdNormalized,
        homolog: botHomologNormalized
    }, null, 4));
    console.log("Diferenças encontradas entre os bots de produção e homologação. Resultado salvo em bot_comparison_prod_vs_homolog.json");
} else {
    console.log("Os bots de produção e homologação são idênticos após a normalização.");
}