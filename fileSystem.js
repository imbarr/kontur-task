const fs = require('fs');
const path = require('path');

function* listFiles(file) {
  let stats = fs.lstatSync(file);
  if(stats.isDirectory()) {
      let content = fs.readdirSync(file);
      for(let i in content)
          yield* listFiles(path.resolve(file, content[i]));
  }
  else {
      yield file;
  }
}

function* lines(file) {
    let content = fs.readFileSync(file, 'utf8').split(/\r\n|\n|\r/);
    for(let i in content)
        yield content[i];
}

module.exports = {
    listFiles,
    lines
};
