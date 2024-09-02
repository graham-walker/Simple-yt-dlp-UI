const fs = require('fs');
const path = require('path');

const { hashFile, generateHash } = require('./util.js');

(async () => {
    try {
        console.time('Hashed new files');

        const allFiles = fs.readdirSync('./downloads', { withFileTypes: true, recursive: true }) // { ...recursive: true } requires Node 20 or later
            .filter(dirent => dirent.isFile())
            .map(dirent => path.join(dirent.path, dirent.name).replaceAll('\\', '/')); // Always use POSIX path separator

        let alreadyHashedFiles = [];
        try {
            alreadyHashedFiles = fs.readFileSync(hashFile).toString().split('\n').map(fileAndHash => fileAndHash.split('\t')[1]);
        } catch (err) { }

        const unhashedFiles = allFiles.filter(file => !alreadyHashedFiles.includes(file));

        for (let i = 0; i < unhashedFiles.length; i++) {
            console.log(`Hashing file (${i + 1}/${unhashedFiles.length}): ${unhashedFiles[i]}`);
            const md5 = await generateHash(unhashedFiles[i]);
            fs.appendFileSync(hashFile, `${md5}\t${unhashedFiles[i]}\n`);
        }
        
        console.timeEnd('Hashed new files');
    } catch (err) {
        console.error(err);
    }
})();
