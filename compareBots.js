const fs = require('fs');
const path = require('path');
const deepDiff = require('deep-diff');
const base64 = require('js-base64').Base64;

const outputPath = 'bots/comparisons/bot_comparison_prod_vs_homolog.json';

const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}
// Função para carregar e decodificar o bot
function loadAndDecodeBot(filePath) {
  const botData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Decodificar os diálogos
  const decodedDialogs = botData.dialogs.map(encodedDialog => {
    const decoded = base64.decode(encodedDialog);
    return JSON.parse(decoded);  // Converter a string JSON decodificada em objeto JavaScript
  });

  return decodedDialogs;
}

// Função para normalizar os dados e remover campos irrelevantes
function normalizeBotData(decodedDialogs) {
  decodedDialogs.forEach(dialog => {
    dialog.config.cells.forEach(cell => {
      delete cell.id;
      delete cell.position;
      delete cell.size;

      // Remover atributos visuais que não impactam o comportamento
      if (cell.attrs) {
        delete cell.attrs
      }

      if (cell.events) {
        delete cell.events;
      }

    });
  });
  return decodedDialogs;
}

// Carregar e comparar os arquivos dos bots de produção e homologação
const botProdDialogs = loadAndDecodeBot('export_builder_prod.json');  // Arquivo do bot de produção
const botHomologDialogs = loadAndDecodeBot('export_builder_homolog.json');  // Arquivo do bot de homologação

// Normalizar os dados dos bots
const botProdNormalized = normalizeBotData(botProdDialogs);
const botHomologNormalized = normalizeBotData(botHomologDialogs);

// Comparar os diálogos decodificados e normalizados dos dois bots
const diff = deepDiff(botProdNormalized, botHomologNormalized);

// Verificar se há diferenças
if (diff) {
  fs.writeFileSync(outputPath, JSON.stringify(diff, null, 4));
  //fs.writeFileSync('bot_normalized_1.json', JSON.stringify(botProdNormalized, null, 4));
  //fs.writeFileSync('bot_normalized_2.json', JSON.stringify(botHomologNormalized, null, 4));
  //fs.writeFileSync('botDialogs_1.json', JSON.stringify(botProdDialogs, null, 4));
  //fs.writeFileSync('botDialogs_2.json', JSON.stringify(botHomologDialogs, null, 4));
  console.log("Diferenças encontradas entre os bots de produção e homologação. Resultado salvo em bot_comparison_prod_vs_homolog.json");
} else {
  //fs.writeFileSync('bot_normalized_1.json', JSON.stringify(bot1Normalized, null, 4));
  //fs.writeFileSync('bot_normalized_2.json', JSON.stringify(bot2Normalized, null, 4));
  console.log("Os bots de produção e homologação são idênticos após a normalização.");
}
