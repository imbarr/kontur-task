const { listFiles, lines } = require('./fileSystem');
const Lazy = require('./iteration');

let todos =
    new Lazy(Array.from(listFiles('.')))
        .filter(x => /^.*\.js$/.test(x))
        .flatMap(x => lines(x))
        .filter(x => /\/\/ *TODO.*/.test(x));

for(let line of todos)
    console.log(line);