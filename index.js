const readline = require('readline');
const program = require('./program');

const rl = readline.createInterface({
    input: process.stdin,
});

console.log('Please, write your command!');
rl.on('line', (command) => {
    let tokens = command.split(/ +/);
    if(tokens[0].length === 0)
        return;
    let result = program(tokens[0])(...tokens.slice(1));
    if(typeof result === 'string')
        console.log(result);
    else
        console.log(result.reduce((a, b) => a + '\n' + b, ''));
});