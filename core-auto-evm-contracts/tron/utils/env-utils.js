function getRequiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} env is not specified`);
    }
    return value;
}

module.exports = {
    getRequiredEnv
};
