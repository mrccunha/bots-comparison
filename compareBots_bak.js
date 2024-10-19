const fs = require('fs');
const path = require('path');
const deepDiff = require('deep-diff');
const base64 = require('js-base64').Base64;

const outputPath = 'bots/bot_comparison_prod_vs_homolog.json';
const outputPathNormalized1 = 'bots/bot_normalized_1.json';
const outputPathNormalized2 = 'bots/bot_normalized_2.json';

const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

// Função para carregar e decodificar o bot
function loadAndDecodeBot(filePath) {
    try {
        // Carregar o arquivo JSON
        const botData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Decodificar os diálogos (assumindo que estão em base64)
        const decodedDialogs = botData.dialogs.map(encodedDialog => {
            try {
                // Limpar a string base64 para remover caracteres inválidos
                const cleanedBase64 = encodedDialog.replace(/[^A-Za-z0-9+/=]/g, '');

                // Garantir que a string tenha o comprimento correto para ser decodificada (múltiplo de 4)
                const padding = cleanedBase64.length % 4;
                if (padding > 0) {
                    cleanedBase64 += '='.repeat(4 - padding);
                }

                // Decodificar base64 e converter para JSON
                const decoded = base64.decode(cleanedBase64);
                return JSON.parse(decoded);
            } catch (error) {
                console.error(`Erro ao decodificar diálogo: ${error.message}`);
                return null; // Retorna null para evitar falhas
            }
        });

        return decodedDialogs.filter(dialog => dialog !== null); // Filtrar diálogos decodificados corretamente

    } catch (error) {
        console.error(`Erro ao carregar e decodificar o arquivo ${filePath}: ${error.message}`);
        return null; // Retorna null em caso de erro
    }
}

// Função para normalizar os dados e remover campos irrelevantes
function normalizeBotData(decodedDialogs) {
    decodedDialogs.forEach(dialog => {
        if (dialog.config && dialog.config.cells) {
            dialog.config.cells.forEach(cell => {
                delete cell.id;
                delete cell.position;
                delete cell.size;

                // Remover atributos visuais que não impactam o comportamento
                if (cell.attrs) {
                    delete cell.attrs;
                }

                if (cell.events) {
                    delete cell.events;
                }
            });
        }
    });
    return decodedDialogs;
}

// Carregar e comparar os arquivos dos bots de produção e homologação
const botProdDialogs = loadAndDecodeBot('export_builder_prod.json');  // Arquivo do bot de produção
const botHomologDialogs = loadAndDecodeBot('export_builder_homolog.json');  // Arquivo do bot de homologação

if (!botProdDialogs || !botHomologDialogs) {
    console.error("Erro ao carregar um ou ambos os bots.");
    process.exit(1); // Encerra o processo em caso de erro
}

// Normalizar os dados dos bots
const botProdNormalized = normalizeBotData(botProdDialogs);
const botHomologNormalized = normalizeBotData(botHomologDialogs);

// Comparar os diálogos decodificados e normalizados dos dois bots
const diff = deepDiff(botProdNormalized, botHomologNormalized);

// Verificar se há diferenças
if (diff) {
    fs.writeFileSync(outputPath, JSON.stringify(diff, null, 4));
    fs.writeFileSync(outputPathNormalized1, JSON.stringify(botProdDialogs, null, 4));
    fs.writeFileSync(outputPathNormalized2, JSON.stringify(botHomologDialogs, null, 4));
    console.log("Diferenças encontradas entre os bots de produção e homologação. Resultado salvo em bot_comparison_prod_vs_homolog.json");
} else {
    console.log("Os bots de produção e homologação são idênticos após a normalização.");
}
