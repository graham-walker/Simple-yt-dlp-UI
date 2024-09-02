const fs = require('fs');

const { hashFile, generateHash } = require('./util.js');

const mismatchesFile = './mismatches.txt';

(async () => {
    try {
        console.time('Verified file hashes');

        const fileHashPairs = fs.readFileSync(hashFile).toString().split('\n').filter(fileHashPair => fileHashPair).map(fileHashPair => ({
            hash: fileHashPair.split('\t')[0],
            path: fileHashPair.split('\t')[1],
        }));

        let mismatches = 0;
        let log = '';
        
        for (let fileHashPair of fileHashPairs) {
            if (!fs.existsSync(fileHashPair.path)) {
                const message = `MISSING FILE\t${fileHashPair.path}`;
                console.log(message);
                mismatches++;
                log += message + '\n';
                continue;
            }

            const md5 = await generateHash(fileHashPair.path);
            if (md5 !== fileHashPair.hash) {
                const message = `CURRENT HASH ${md5} !== ORIGINAL HASH ${fileHashPair.hash}\t${fileHashPair.path}`;
                console.log(message);
                mismatches++;
                log += message + '\n';
            }
        }

        if (mismatches === 0) {
            console.log('No mismatches found');
        } else {
            fs.writeFileSync(mismatchesFile, log);
            console.log(`Wrote mismatches to ${mismatchesFile}`);
        }

        console.timeEnd('Verified file hashes');
    } catch (err) {
        console.error(err);
    }
})();
