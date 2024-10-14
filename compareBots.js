const fs = require('fs');
const path = require('path');
const deepDiff = require('deep-diff');
const base64 = require('js-base64').Base64;

const outputPath = 'bots/bot_comparison_prod_vs_homolog.json';

const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}


// Função para carregar e decodificar o bot
function loadAndDecodeBot(filePath) {
  // Carregar o arquivo
  return fetch(filePath)
      .then(response => {
          if (!response.ok) {
              throw new Error(`Erro ao carregar o arquivo: ${response.statusText}`);
          }
          return response.text(); // Lê como texto
      })
      .then(content => {
          const jsonPartEnd = content.lastIndexOf('}');
          const base64PartStart = content.lastIndexOf('["eyJuYW1l"'); // Identifica onde começa a parte base64

          // Separa a parte inicial e a parte em base64
          const initialPart = content.substring(0, base64PartStart); // Parte inicial
          const base64Part = content.substring(base64PartStart); // Parte em base64

          // Decodifica a parte em base64
          let decodedDialogs = {};
          if (base64Part) {
              // Remove qualquer "nova linha" e espaços em branco
              const cleanedBase64 = base64Part.replace(/[\r\n]+/g, '');
              const decodedString = atob(cleanedBase64); // Decodifica de base64 para string
              decodedDialogs = JSON.parse(decodedString); // Converte para JSON
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
const botProdDialogs = loadAndDecodeBot('export_builder_prod.json').then(result => {
  if (result) {
    console.log('Parte Inicial: ', result.initial);
    console.log('Diálogos Decodificados: ', result.dialogs);
  }
});

const botHomologDialogs = loadAndDecodeBot('export_builder_homolog.json');  // Arquivo do bot de homologação

// Normalizar os dados dos bots
const botProdNormalized = normalizeBotData(botProdDialogs);
const botHomologNormalized = normalizeBotData(botHomologDialogs);

// Comparar os diálogos decodificados e normalizados dos dois bots
const diff = deepDiff(botProdNormalized, botHomologNormalized);

// Verificar se há diferenças
if (diff) {
  fs.writeFileSync(outputPath, JSON.stringify(diff, null, 4));
  fs.writeFileSync('bot_normalized_1.json', JSON.stringify(botProdNormalized, null, 4));
  fs.writeFileSync('bot_normalized_2.json', JSON.stringify(botHomologNormalized, null, 4));
  //fs.writeFileSync('botDialogs_1.json', JSON.stringify(botProdDialogs, null, 4));
  //fs.writeFileSync('botDialogs_2.json', JSON.stringify(botHomologDialogs, null, 4));
  console.log("Diferenças encontradas entre os bots de produção e homologação. Resultado salvo em bot_comparison_prod_vs_homolog.json");
} else {
  //fs.writeFileSync('bot_normalized_1.json', JSON.stringify(bot1Normalized, null, 4));
  //fs.writeFileSync('bot_normalized_2.json', JSON.stringify(bot2Normalized, null, 4));
  console.log("Os bots de produção e homologação são idênticos após a normalização.");
}
