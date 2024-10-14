const fs = require('fs');
const path = require('path');
const deepDiff = require('deep-diff');
// Caso você esteja usando Node.js, você pode precisar de uma biblioteca como axios para fazer fetch de arquivos
const fetch = require('node-fetch');
const base64 = require('js-base64').Base64;

const outputPath = 'bots/bot_comparison_prod_vs_homolog.json';

const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

// Função para carregar e decodificar o bot
function loadAndDecodeBot(filePath) {
    return fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro ao carregar o arquivo: ${response.statusText}`);
            }
            return response.text(); // Lê como texto
        })
        .then(content => {
            const base64PartStart = content.lastIndexOf('["eyJuYW1l"'); // Identifica onde começa a parte base64

            const initialPart = content.substring(0, base64PartStart); // Parte inicial
            const base64Part = content.substring(base64PartStart); // Parte em base64

            // Decodifica a parte em base64
            let decodedDialogs = {};
            if (base64Part) {
                const cleanedBase64 = base64Part.replace(/[\r\n]+/g, '');
                const decodedString = atob(cleanedBase64);
                decodedDialogs = JSON.parse(decodedString);
            }

            // Retorna o JSON combinado
            return {
                initial: JSON.parse(initialPart), // Parte inicial como objeto JSON
                dialogs: decodedDialogs // Parte decodificada
            };
        })
        .catch(error => {
            console.error('Erro ao processar o bot:', error);
            return null; // Retorna null em caso de erro
        });
}

// Função para normalizar os dados e remover campos irrelevantes
function normalizeBotData(decodedDialogs) {
    if (!Array.isArray(decodedDialogs)) {
        return decodedDialogs; // Retorna como está se não for um array
    }

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
Promise.all([
    loadAndDecodeBot('export_builder_prod.json'),
    loadAndDecodeBot('export_builder_homolog.json')
]).then(([botProdResult, botHomologResult]) => {
    if (botProdResult && botHomologResult) {
        const botProdNormalized = normalizeBotData(botProdResult.dialogs);
        const botHomologNormalized = normalizeBotData(botHomologResult.dialogs);

        // Comparar os diálogos decodificados e normalizados dos dois bots
        const diff = deepDiff(botProdNormalized, botHomologNormalized);

        // Verificar se há diferenças
        if (diff) {
            fs.writeFileSync(outputPath, JSON.stringify(diff, null, 4));
            fs.writeFileSync('bot_normalized_1.json', JSON.stringify(botProdNormalized, null, 4));
            fs.writeFileSync('bot_normalized_2.json', JSON.stringify(botHomologNormalized, null, 4));
            console.log("Diferenças encontradas entre os bots de produção e homologação. Resultado salvo em bot_comparison_prod_vs_homolog.json");
        } else {
            console.log("Os bots de produção e homologação são idênticos após a normalização.");
        }
    } else {
        console.error('Erro ao carregar um ou ambos os bots.');
    }
}).catch(error => {
    console.error('Erro ao processar os bots: ', error);
});
