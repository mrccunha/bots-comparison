const fs = require('fs');
const deepDiff = require('deep-diff');
const base64 = require('js-base64').Base64;

// Função para carregar e decodificar o bot
function loadAndDecodeBot(filePath) {
  const botData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
 
  // Decodificar os diálogos
  const decodedDialogs = botData.dialogs.map(encodedDialog => {
    const decoded = base64.decode(encodedDialog);
    return JSON.parse(decoded); // Converter a string JSON decodificada em objeto JavaScript
  });
 
  return decodedDialogs;
}

// Função para normalizar os dados
function normalizeBotData(decodedDialogs) {
  decodedDialogs.forEach(dialog => {
    dialog.config.cells.forEach(cell => {
      // Remover IDs e outros campos irrelevantes para a comparação
      delete cell.id;
      delete cell.position;
      delete cell.size;

      //Verificar se attrs existe e possui a propriedade label
      if (cell.attrs && cell.attrs.label) {
        delete cell.attrs.label.text; //Remover texto do label
      }

      if (cell.attrs && cell.attrs.title) {
        delete cell.attrs.title.text;
      }
    });
  });
  return decodedDialogs;
}

// Carregar e decodificar os dois bots
const bot1Dialogs = loadAndDecodeBot('arquivo1.json');
const bot2Dialogs = loadAndDecodeBot('arquivo2.json');

// Normalizar os dados dos bots
const bot1Normalized = normalizeBotData(bot1Dialogs);
const bot2Normalized = normalizeBotData(bot2Dialogs);

// Comparar os diálogos decodificados e normalizados dos dois bots
const diff = deepDiff(bot1Normalized, bot2Normalized);

// Verificar se há diferenças
if (diff) {
  fs.writeFileSync('bot_comparison_result.json', JSON.stringify(diff, null, 4));
  //fs.writeFileSync('bot_normalized_1.json', JSON.stringify(bot1Normalized, null, 4));
  //fs.writeFileSync('bot_normalized_2.json', JSON.stringify(bot2Normalized, null, 4));
  //fs.writeFileSync('botDialogs_1.json', JSON.stringify(bot1Dialogs, null, 4));
  //fs.writeFileSync('botDialogs_2.json', JSON.stringify(bot2Dialogs, null, 4));
  console.log("Diferenças encontradas. Resultado salvo em bot_comparison_result.json");
} else {
  //fs.writeFileSync('bot_normalized_1.json', JSON.stringify(bot1Normalized, null, 4));
  //fs.writeFileSync('bot_normalized_2.json', JSON.stringify(bot2Normalized, null, 4));
  console.log("Os bots são idênticos após a normalização.");
}
