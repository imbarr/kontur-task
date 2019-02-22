const fs = require('fs');
const path = require('path');
const encoding = require('./config').fileEncoding;

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

function* lines(file) {
    let content = fs.readFileSync(file, encoding).split(/\r\n|\n|\r/);
    for(let i in content)
        yield content[i];
}

module.exports = {
    tree,
    lines
};
