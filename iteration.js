/** Обертка над итерируемыми объектами, реализующая методы для ленивых вычислений. */
class Lazy {
    constructor(iterable) {
        this.iterable = iterable;
    }

    flatMap(mapping) {
        return new Lazy(function* () {
            for(let x of this.iterable)
                yield* mapping(x);
        }.call(this));
    }

    map(mapping) {
        return new Lazy(function* () {
            for(let x of this.iterable)
                yield mapping(x);
        }.call(this));
    }

    reduce(reducer, initial) {
        let accumulator = initial;
        for(let x of this.iterable)
            accumulator = reducer(accumulator, x);
        return accumulator
    }

    filter(predicate) {
        return new Lazy(function* () {
            for(let x of this.iterable)
                if(predicate(x))
                    yield x;
        }.call(this))
    }

    [Symbol.iterator]() {
        return this.iterable[Symbol.iterator]();
    }
}

module.exports = Lazy;