'use strict';
async function stc(cb) {
    try {
        return (await cb());
    } catch (error) {
        return error;
    }
}

module.exports = stc;