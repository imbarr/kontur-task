const readline = require('readline');
const execute = require('./program');
const fs = require('fs');

const rl = readline.createInterface({
    input: process.stdin,
});

console.log('Please, write your command!');
rl.on('line', (command) => {
    let tokens = command.trim().split(/ +/);
    if(tokens[0].length === 0)
        return;
    try {
        let result = execute(...tokens);
        if (typeof result === 'string')
            console.log(result);
        else
        //Правильнее было бы печатать результат построчно, но тогда не будут проходить тесты
            console.log(result.reduce((a, b) => a + '\n' + b, ''));
    }
    catch (error) {
        // Проверка, является ли ошибка системной.
        if('errno' in error) {
            console.log('system error occurred');
        }
        else {
            console.log('unknown error occurred, exiting...');
            process.exit(1);
        }
    }
});