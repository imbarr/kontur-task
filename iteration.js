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