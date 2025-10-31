/** Throw when a function is not implemented */
export class NotImplemented extends Error {
    constructor() {
        super('This function has not been implemented');
    }
}

/** Used to get a object's prototype chain */
export function getPrototypeChain(obj) {
    let currentPrototype = Object.getPrototypeOf(obj);
    let prototypeChain = '';

    while (currentPrototype !== null) {
        prototypeChain += currentPrototype.constructor.name + ' ';
        currentPrototype = Object.getPrototypeOf(currentPrototype);
    }

    return prototypeChain;
}

/** 
 * Returns the number of characters (char) in the string (str)
 */
export function countChar(str, char) {
    let count = 0;
    for (let i = 0; i < str.length; i++) {
        const currentChar = str[i];

        if (currentChar === char)
            count++;
    }

    return count;
}
