const { tree, lines } = require('./fileSystem');
const Lazy = require('./iteration');
const path = require('path');
const columns = require('./config').columns;

/**
 * Пара из имени файла и строки.
 *
 * @typedef {Object} Line
 * @property {string} text - Строка из файла.
 * @property {string} file - Имя файла.
 */

/**
 * Внутреннее представление TODO_ комментария.
 *
 * @typedef {Object} TodoRepr
 * @property {string} name - Имя пользователя.
 * @property {string} date - Когда был оставлен комментарий. Дата в формате ГГГГ-ММ-ДД.
 * @property {string} file - Имя файла.
 * @property {string} comment - Комментарий.
 * @property {string} importance - Важность комментария. "!", если комментарий содержит
 *     восклицательный знак, иначе пустая строка.
 */


/** Минимальная ширина столбцов. */
const columnsMinWidth = {};
for(let column in columns.names)
    columnsMinWidth[column] = columns.names[column].length

const todoRegex = /\/\/ *TODO *:? *([^;]*(?=;)|);? *(\d{4}-\d{2}-\d{2}(?=;)|);? *([^!;]*(!?)[^;]*)/i;

/**
 * Парсинг TodoRepr из Line.
 *
 * @param {Line} line
 * @returns {TodoRepr|null} TodoRepr или null, если строка не содержит TODO_ комментария
 */
function parseTodo(line) {
    let match = line.text.match(todoRegex);
    if(match === null)
        return null;
    // Валидация даты.
    return isNaN(Date.parse(match.date))
        ? {
            name: match[1],
            date: match[2],
            file: line.file,
            comment: match[3],
            importance: match[4]
        }
        : null;
}

/**
 * Получить все TodoRepr из .js файлов в текущей директории.
 *
 * @returns {Lazy.<TodoRepr>}
 */
function allTodos() {
    // Считывание содержимого папки будет происходить каждый раз при вводе команды пользователем.
    // Это нужно для того, чтобы результат работы команд был всегда актуальным, даже если содержимое папки изменилось.
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

/**
 * Получить необходимую ширину столбцов для отображения всех TodoRepr.
 *
 * @param {Lazy.<TodoRepr>} todos
 * @returns {Object}
 */
function getColumnsWidth(todos) {
    return todos.reduce((acc, x) => {
        let result = {};
        for(let column in acc) {
            result[column] = Math.min(Math.max(acc[column], x[column].length), columns.maxWidth[column])
        }
        return result
    }, columnsMinWidth);
}

/**
 * Перевод TodoRepr в строку таблицы.
 *
 * @param {TodoRepr} todoRepr
 * @param {Object} columnsWidth - Ширина столбцов.
 * @returns {string}
 */
function todoToString(todoRepr, columnsWidth) {
    function changeLength(string, length) {
        return string.length <= length
            ? string + ' '.repeat(length - string.length)
            : string.slice(0, length - 3) + '...'
    }

    return '  ' +
        changeLength(todoRepr.importance, columnsWidth.importance) + '  |  ' +
        changeLength(todoRepr.name, columnsWidth.name) + '  |  ' +
        changeLength(todoRepr.date, columnsWidth.date) + '  |  ' +
        changeLength(todoRepr.comment, columnsWidth.comment) + '  |  ' +
        changeLength(todoRepr.file, columnsWidth.file) + '  '
}

/**
 * Перевод всех TodoRepr в текстовую таблицу.
 *
 * @param {Lazy.<TodoRepr>} todos
 * @param {Function} [comparator] - Компаратор, применяющийся при сортировке.
 * @returns {Lazy.<string>}
 */
function asStrings(todos, comparator) {
    return new Lazy(function* () {
        // Итерация по todos происходит дважды - при вычислении необходимой ширины столбцов
        // и при конвертации в строки. Поэтому выгрузка в массив необходима даже при отсутствии сортировки.
        let array = Array.from(todos);
        if(comparator !== undefined)
            array.sort(comparator);
        let widths = getColumnsWidth(array);
        // Вывод заголовка. Функция todoToString работает с columns.names так же, как и с TodoRepr.
        yield todoToString(columns.names, widths);
        let widthsArray = Object.values(widths);
        // Суммарная ширина табцицы = совокупная ширина всех столбцов + 4 пробела для каждого столбца
        // + вертикальная черта для каждого столбца, кроме последнего.
        let totalWidth = widthsArray.reduce((a, b) => a + b) + 5*widthsArray.length - 1;
        yield '-'.repeat(totalWidth);
        yield* new Lazy(array).map(x => todoToString(x, widths));
        yield '-'.repeat(totalWidth);
    }())
}

/**
 * Функция, реализующая функционал консольной утилиты.
 *
 * @param {string} command - Имя команды.
 * @param {...string} params - Параметры комманды.
 * @returns {string|Lazy.<string>} - Результат работы, либо сообщение по умолчанию,
 *     если функция не умеет обрабатывать заданную команду.
 */
function program(command, ...params) {
    // Более функциональный подход, чем при использовании switch...case. Источник:
    // https://codeburst.io/alternative-to-javascripts-switch-statement-with-a-functional-twist-3f572787ba1c
    return match(command)
        .on('exit', () =>
            process.exit(0))
        .on('show', () =>
            asStrings(allTodos()))
        .on('important', () =>
            asStrings(allTodos().filter(x => x.importance === '!')))
        .on('user', () =>
            match(params[0])
                .on(undefined, () =>
                    "missing parameter 'user'")
                .otherwise(() =>
                    asStrings(allTodos().filter(x => x.name.toLowerCase().startsWith(params[0].toLowerCase())))))
        .on('sort', () =>
            match(params[0])
                .on('importance', () => {
                    let count = (todo) => (todo.comment.match(/!/g) || []).length;
                    return asStrings(allTodos(), (a, b) => count(b) - count(a))
                })
                .on('user', () =>
                    asStrings(allTodos(), (a, b) =>
                        a.name.toLowerCase() < b.name.toLowerCase() && a.name !== "" || b.name === ""
                            ? -1
                            : a.name.toLowerCase() > b.name.toLowerCase() || (a.name === "" && b.name !== "")))
                .on('date', () =>
                    asStrings(allTodos(), (a, b) => b.date < a.date ? -1 : b.date > a.date))
                .on(undefined, () =>
                    "missing parameter 'sorting option'")
                .otherwise(() =>
                    "wrong sorting option"))
        .on('date', () =>
            match(params[0])
                .on(undefined, () =>
                    "missing parameter 'date'")
                .on((date) => date.match(/^\d{4}(-\d{2}(-\d{2})?)?$/) === null, () =>
                    "wrong date format")
                .otherwise(() =>
                    asStrings(allTodos().filter(x => x.date >= params[0]))))
        .otherwise(() =>
            "wrong command")
}

/**
 * Контекст функционального switch...case.
 *
 * @typedef {Object} SwitchContext
 * @property on - Аналог 'case'.
 * @property otherwise - Аналог 'default'.
 */

/**
 * Получить контекст для вычисленного значения.
 *
 * @function
 * @param x - Вычисленное значение.
 * @returns {SwitchContext}
 */
const matched = x => ({
    on: () => matched(x),
    otherwise: () => x,
});

/**
 * Получить контекст для невычисленного значения.
 * @param x - Невычисленное значение.
 * @returns {SwitchContext}
 */
const match = x => ({
    on: (pred, fn) => {
        let condition = typeof pred === 'function'
            ? pred(x)
            : pred === x;
        return (condition ? matched(fn(x)) : match(x))
    },
    otherwise: fn => fn(x),
});

module.exports = program;