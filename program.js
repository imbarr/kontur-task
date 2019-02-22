const { tree, lines } = require('./fileSystem');
const Lazy = require('./iteration');
const path = require('path');
const columns = require('./config').columns;

const todoRegex = /\/\/ *TODO *:? *([^;]*(?=;)|);? *(\d{4}-\d{2}-\d{2}(?=;)|);? *([^!]*(!?).*)/i;
const columnsMinWidth = {};
for(let column in columns.names)
    columnsMinWidth[column] = columns.names[column].length

function parseTodo(line) {
    let match = line.text.match(todoRegex);
    return match == null
        ? null
        : {
            name: match[1],
            date: match[2],
            file: line.file,
            comment: match[3],
            importance: match[4]
        };
}

function allTodos() {
    return new Lazy(tree('.'))
        .filter(x => /^.*\.js$/.test(x))
        .flatMap(file =>
            new Lazy(lines(file))
                .map(line => {
                    return {
                        file: path.basename(file),
                        text: line
                    };
        }))
        .map(parseTodo)
        .filter(x => x != null)
}

function getColumnsWidth(todos) {
    return todos.reduce((acc, x) => {
        let result = {};
        for(let column in acc) {
            result[column] = Math.min(Math.max(acc[column], x[column].length), columns.maxWidth[column])
        }
        return result
    }, columnsMinWidth);
}

function todoToString(todo, columnsWidth) {
    function changeLength(string, length) {
        return string.length <= length
            ? string + ' '.repeat(length - string.length)
            : string.slice(0, length - 3) + '...'
    }

    return '  ' +
        changeLength(todo.importance, columnsWidth.importance) + '  |  ' +
        changeLength(todo.name, columnsWidth.name) + '  |  ' +
        changeLength(todo.date, columnsWidth.date) + '  |  ' +
        changeLength(todo.comment, columnsWidth.comment) + '  |  ' +
        changeLength(todo.file, columnsWidth.file) + '  '
}

function asStrings(todos, comparator) {
    return new Lazy(function* () {
        let array = Array.from(todos);
        if(comparator !== undefined)
            array.sort(comparator);
        let widths = getColumnsWidth(array);
        yield todoToString(columns.names, widths);
        let widthsArray = Object.values(widths);
        let totalWidth = widthsArray.reduce((a, b) => a + b) + 5*widthsArray.length - 1;
        yield '-'.repeat(totalWidth);
        yield* new Lazy(array).map(x => todoToString(x, widths));
        yield '-'.repeat(totalWidth);
    }())
}

const program = withDefault({
    exit: () =>
        process.exit(0),
    show: () =>
        asStrings(allTodos()),
    important: () =>
        asStrings(allTodos().filter(x => x.importance === '!')),
    user: name =>
        asStrings(allTodos().filter(x => x.name.toLowerCase().startsWith(name.toLowerCase()))),
    sort: column =>
        withDefault({
            importance: () =>
                asStrings(allTodos(), (a, b) => {
                    return count(b.comment, '!') - count(a.comment, '!')
                }),
            user: () =>
                asStrings(allTodos(), (a, b) =>
                    a.name.toLowerCase() < b.name.toLowerCase() && a.name !== "" || b.name === ""
                        ? -1
                        : a.name.toLowerCase() > b.name.toLowerCase() || (a.name === "" && b.name !== "")),
            date: () =>
                asStrings(allTodos(), (a, b) => b.date < a.date ? -1 : b.date > a.date),
            'default': () =>
                "wrong sorting option"
        })(column)(),
    date: (date) =>
        asStrings(allTodos().filter(x => x.date >= date)),
    'default': () =>
        "wrong command"
});

function withDefault(object) {
    return function (command) {
        if(command in object && command !== 'default')
            return object[command];
        return object['default'];
    }
}

function count(string, char) {
    let c = 0;
    for(let i = 0; i < string.length; i++)
        if(string.charAt(i) === char)
            c++;
    return c;
}

module.exports = program;