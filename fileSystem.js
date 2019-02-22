const fs = require('fs');
const path = require('path');
const encoding = require('./config').fileEncoding;

/**
 * Получить пути всех файлов в директрории.
 *
 * @param {string} file - Путь до папки.
 * @yields {string} Абсолютные пути всех файлов в папке с учетом вложенности.
 */
function* tree(file) {
  let stats = fs.lstatSync(file);
  if(stats.isDirectory()) {
      let content = fs.readdirSync(file);
      for(let i in content)
          yield* tree(path.resolve(file, content[i]));
  }
  else {
      yield file;
  }
}

/**
 * Построчно считать файл.
 *
 * @param {string} file - Путь до текстового файла.
 * @yields {string} Строки файла.
 */
function* lines(file) {
    // readFileSync считывает весь файл за один раз, целиком загружая его в память.
    // Потоковое чтение было бы предпочтительнее, но для этого пришлось бы писать много
    // низкоуровневого кода, как, например, это сделано здесь:
    // https://github.com/neurosnap/gen-readlines
    let content = fs.readFileSync(file, encoding).split(/\r\n|\n|\r/);
    yield* content;
}

module.exports = {
    tree,
    lines
};
