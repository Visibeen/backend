const bcrypt = require('bcrypt');
const saltRounds = 10;

gen = async (rawPassword) => {
    return await bcrypt.hash(rawPassword, saltRounds);
};

compare = async (rawPassword, hashPassword) => {
    return await bcrypt.compare(rawPassword, hashPassword);
};

module.exports = {
    gen,
    compare
};
