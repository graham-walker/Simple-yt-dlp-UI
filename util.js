const fs = require('fs');
const crypto = require('crypto');

const hashFile = './md5s.txt';

function generateHash(file) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(file);

        stream.on('data', (data) => {
            hash.update(data);
        });

        stream.on('end', () => {
            resolve(hash.digest('hex'));
        });

        stream.on('error', (err) => {
            reject(err);
        });
    });
}

module.exports = { hashFile, generateHash };
