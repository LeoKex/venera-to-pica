const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Database = require('better-sqlite3');

const CURRENT_DIR = __dirname;
const args = process.argv.slice(2);
const VENERA_FILE = args[0] || path.join(CURRENT_DIR, 'data.venera');
const OUTPUT_FILE = args[1] || path.join(CURRENT_DIR, 'userData.picadata');
const TEMP_VENERA = path.join(CURRENT_DIR, '_temp_venera');
const TEMP_PICA = path.join(CURRENT_DIR, '_temp_pica');

function cleanTemp() {
    try { if (fs.existsSync(TEMP_VENERA)) fs.rmSync(TEMP_VENERA, { recursive: true, force: true }); } catch (e) { }
    try { if (fs.existsSync(TEMP_PICA)) fs.rmSync(TEMP_PICA, { recursive: true, force: true }); } catch (e) { }
}

function extractZip(zipFile, destDir) {
    console.log('[Extract] ' + path.basename(zipFile));
    fs.mkdirSync(destDir, { recursive: true });
    const tempZip = zipFile + '.temp.zip';
    fs.copyFileSync(zipFile, tempZip);
    try {
        execSync('powershell -Command "Expand-Archive -Path \'' + tempZip + '\' -DestinationPath \'' + destDir + '\' -Force"', { stdio: 'pipe' });
    } finally {
        try { if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip); } catch (e) { }
    }
}

function createZip(sourceDir, outputFile) {
    console.log('[Pack] Creating: ' + path.basename(outputFile));
    const zipFile = outputFile.replace('.picadata', '.zip');
    try { if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile); } catch (e) { }
    try { if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile); } catch (e) { }
    execSync('powershell -Command "Compress-Archive -Path \'' + sourceDir + '\\*\' -DestinationPath \'' + zipFile + '\'"', { stdio: 'pipe' });
    fs.renameSync(zipFile, outputFile);
}

// Venera uses sourceKey.hashCode as type, PicaComic uses fixed integers
// Mapping from Venera type values to PicaComic type values
// Based on analysis of both apps' source code:
//   PicaComic: 0=picacg, 1=ehentai, 2=jm, 3=hitomi, 4=wnacg, 6=nhentai
//   Venera: uses Dart String.hashCode of the source key
const VENERA_TO_PICA_TYPE = {
    553570794: 0,   // picacg
    385625716: 1,   // ehentai
    769844263: 2,   // jm
    258019538: 3,   // hitomi (exhentai)
    264196719: 6,   // nhentai
};

// Detect source from cover_path or ID pattern for unknown types
function detectSourceType(row) {
    const cover = (row.cover_path || '').toLowerCase();
    const id = (row.id || row.target || '').toString();

    if (cover.includes('jmapiproxy') || cover.includes('jm')) return 2;       // jm
    if (cover.includes('nhentai.net')) return 6;                               // nhentai
    if (cover.includes('picacomic.com')) return 0;                             // picacg
    if (id.includes('e-hentai.org') || cover.includes('ehgt.org')) return 1;   // ehentai
    if (id.includes('exhentai.org') || cover.includes('gold-usergeneratedcontent')) return 1; // exhentai
    if (cover.includes('hitomi.la')) return 3;                                 // hitomi
    if (cover.includes('wnacg')) return 4;                                     // wnacg

    return row.type; // fallback to original type
}

function convertType(veneraType, row) {
    // First try direct mapping
    if (VENERA_TO_PICA_TYPE[veneraType] !== undefined) {
        return VENERA_TO_PICA_TYPE[veneraType];
    }
    // Fallback: detect from cover_path/ID pattern
    return detectSourceType(row);
}

function convertLocalFavoriteDb(veneraDbPath, picaDbPath) {
    console.log('[Convert] Favorites database...');
    if (fs.existsSync(picaDbPath)) fs.unlinkSync(picaDbPath);

    const veneraDb = new Database(veneraDbPath, { readonly: true });
    const picaDb = new Database(picaDbPath);

    const tables = veneraDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    console.log('  Source tables: ' + tables.join(', '));

    picaDb.exec('CREATE TABLE IF NOT EXISTS folder_order (folder_name text primary key, order_value int)');
    picaDb.exec('CREATE TABLE IF NOT EXISTS folder_sync (folder_name text primary key, time TEXT, key TEXT, sync_data TEXT)');

    const favoriteTables = ['感兴趣', '最爱', '追更', '看过', '抛弃', '猎奇'];
    let orderIndex = 0;

    for (const tableName of favoriteTables) {
        if (tables.includes(tableName)) {
            const rows = veneraDb.prepare('SELECT * FROM "' + tableName + '"').all();
            if (rows.length > 0) {
                picaDb.exec('CREATE TABLE IF NOT EXISTS "' + tableName + '" (target text, name TEXT, author TEXT, type int, tags TEXT, cover_path TEXT, time TEXT, display_order int, last_update_time TEXT DEFAULT NULL, has_new_update INTEGER DEFAULT 0, last_check_time INTEGER DEFAULT NULL, primary key (target, type))');
                const insert = picaDb.prepare('INSERT OR REPLACE INTO "' + tableName + '" (target, name, author, type, tags, cover_path, time, display_order) VALUES (@id, @name, @author, @type, @tags, @cover_path, @time, @display_order)');
                const insertMany = picaDb.transaction((rows) => {
                    for (const row of rows) {
                        const newType = convertType(row.type, row);
                        insert.run({ id: row.id || row.target, name: row.name, author: row.author, type: newType, tags: row.tags || '', cover_path: row.cover_path, time: row.time, display_order: row.display_order });
                    }
                });
                insertMany(rows);
                console.log('  Converted ' + rows.length + ' "' + tableName + '" records');
                picaDb.prepare('INSERT OR IGNORE INTO folder_order VALUES (?, ?)').run(tableName, orderIndex++);
            }
        }
    }

    if (tables.includes('folder_order')) {
        const rows = veneraDb.prepare('SELECT * FROM folder_order').all();
        for (const row of rows) {
            try {
                picaDb.prepare('INSERT OR IGNORE INTO folder_order VALUES (?, ?)').run(row.folder_name, row.order_value);
            } catch (e) { }
        }
    }

    const skipTables = ['感兴趣', '最爱', '推荐', 'folder_order', 'folder_sync', 'sqlite_sequence', '追更', '看过', '抛弃', '猎奇'];
    for (const table of tables) {
        if (skipTables.includes(table)) continue;
        try {
            const rows = veneraDb.prepare('SELECT * FROM "' + table + '"').all();
            if (rows.length === 0) continue;
            const cols = Object.keys(rows[0]);
            const colDefs = cols.map(c => '"' + c + '" TEXT').join(', ');
            const placeholders = cols.map(c => '@' + c).join(', ');
            const colNames = cols.map(c => '"' + c + '"').join(', ');
            picaDb.exec('CREATE TABLE IF NOT EXISTS "' + table + '" (' + colDefs + ')');
            const insert = picaDb.prepare('INSERT OR REPLACE INTO "' + table + '" (' + colNames + ') VALUES (' + placeholders + ')');
            const insertMany = picaDb.transaction((rows) => { for (const row of rows) insert.run(row); });
            insertMany(rows);
            console.log('  Copied table ' + table + ': ' + rows.length + ' records');
        } catch (e) {
            console.log('  Skipped table ' + table + ': ' + e.message);
        }
    }

    veneraDb.close();
    picaDb.close();
}

function convertHistoryDb(veneraDbPath, picaDbPath) {
    console.log('[Convert] History database...');
    if (!fs.existsSync(veneraDbPath)) { console.log('  No history, skipping'); return; }
    if (fs.existsSync(picaDbPath)) fs.unlinkSync(picaDbPath);

    const veneraDb = new Database(veneraDbPath, { readonly: true });
    const picaDb = new Database(picaDbPath);
    const tables = veneraDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);

    for (const table of tables) {
        if (table === 'sqlite_sequence') continue;
        try {
            const colsInfo = veneraDb.prepare('PRAGMA table_info("' + table + '")').all();
            const colDefs = colsInfo.map(c => '"' + c.name + '" ' + (c.type || 'TEXT')).join(', ');
            picaDb.exec('CREATE TABLE IF NOT EXISTS "' + table + '" (' + colDefs + ')');
            const rows = veneraDb.prepare('SELECT * FROM "' + table + '"').all();
            if (rows.length === 0) continue;
            const hasType = colsInfo.some(c => c.name === 'type');
            const cols = Object.keys(rows[0]);
            const placeholders = cols.map(c => '@' + c).join(', ');
            const colNames = cols.map(c => '"' + c + '"').join(', ');
            const insert = picaDb.prepare('INSERT OR REPLACE INTO "' + table + '" (' + colNames + ') VALUES (' + placeholders + ')');
            const insertMany = picaDb.transaction((rows) => {
                for (const row of rows) {
                    if (hasType) row.type = convertType(row.type, row);
                    insert.run(row);
                }
            });
            insertMany(rows);
            console.log('  Converted table ' + table + ': ' + rows.length + ' records');
        } catch (e) {
            console.log('  Skipped table ' + table + ': ' + e.message);
        }
    }
    veneraDb.close();
    picaDb.close();
}

function convertAppdata(veneraJsonPath, picaDataPath) {
    console.log('[Convert] App settings...');
    const veneraData = JSON.parse(fs.readFileSync(veneraJsonPath, 'utf8'));
    const vSettings = veneraData.settings || {};

    const webdav = vSettings.webdav || [];
    const webdavUrl = webdav[0] || '';

    const defaultSettings = [
        "1", "dd", "1", "0", "1", "1", "1", "1", "0", "1", "0", "0", "0", "0", "1", "1", "0", "0", "0", "0", "0",
        "111111", "", "0", "1111111111", "0", "00", "0", "2", "0", "1",
        "https://www.wnacg.com", "2", "5", "1000", "500", "1", "0", "0", "0", "25", "0", "0", "1", "0,1.0",
        webdavUrl, "0", "0", "https://nhentai.net", "1", "", "", "1", "0", "0", "1", "https://18comic.vip",
        "1", "0", "012345678", "0", "0", "10000", "0", "0", "0", "0",
        "picacg,ehentai,jm,htmanga,nhentai", "picacg,ehentai,jm,htmanga,nhentai", "0", "0", "1", "1", "0",
        "1.0", "", "0", "picacg,Eh主页,Eh热门,禁漫主页,禁漫最新,hitomi,绅士漫画,nhentai", "0", "6", "1", "0",
        "111111", "1", "0", "www.cdntwice.org,www.cdnsha.org,www.cdnaspa.cc,www.cdnntr.cc",
        "https://cdn-msp.jmapiproxy3.cc", "gold-usergeneratedcontent.net", "0", "2.0.11"
    ];

    if (vSettings.theme_mode === 'dark') defaultSettings[32] = "2";

    const picaData = {
        settings: defaultSettings,
        firstUse: ["0", "1", "1", "1", "0"],
        blockingKeywords: vSettings.blockedWords || [],
        favoriteTags: []
    };

    fs.writeFileSync(picaDataPath, JSON.stringify(picaData, null, 2), 'utf8');
    console.log('  Settings converted');

    if (webdavUrl) {
        console.log('  WebDAV URL found: ' + webdavUrl);
        console.log('  Note: You need to reconfigure WebDAV in PicaComic after import');
    }
}

function convertComicSource(veneraDir, picaDir) {
    console.log('[Convert] Comic sources...');
    fs.mkdirSync(picaDir, { recursive: true });
    if (fs.existsSync(veneraDir)) {
        const files = fs.readdirSync(veneraDir);
        for (const file of files) {
            fs.copyFileSync(path.join(veneraDir, file), path.join(picaDir, file));
        }
        console.log('  Copied ' + files.length + ' source files');
    }

    const picacgSrc = path.join(veneraDir, 'picacg.data');
    const picacgDst = path.join(picaDir, 'picacg.data');
    if (fs.existsSync(picacgSrc)) {
        const v = JSON.parse(fs.readFileSync(picacgSrc, 'utf8'));
        fs.writeFileSync(picacgDst, JSON.stringify({
            account: v.account || ['', ''], token: v.token || '',
            user: { id: "", title: "", email: "", name: "", level: 0, exp: 0, avatarUrl: "", frameUrl: null, isPunched: false, slogan: null },
            appChannel: "3", imageQuality: "original"
        }, null, 2), 'utf8');
        console.log('  Converted picacg.data');
    }
}

function main() {
    console.log('');
    console.log('========================================');
    console.log('  Venera to PicaComic v4.2.11 Converter');
    console.log('========================================');
    console.log('');
    console.log('[Input]  ' + VENERA_FILE);
    console.log('[Output] ' + OUTPUT_FILE);
    console.log('');

    if (!fs.existsSync(VENERA_FILE)) {
        console.error('[ERROR] File not found: ' + VENERA_FILE);
        process.exit(1);
    }

    cleanTemp();
    try {
        extractZip(VENERA_FILE, TEMP_VENERA);
        fs.mkdirSync(TEMP_PICA, { recursive: true });

        convertLocalFavoriteDb(path.join(TEMP_VENERA, 'local_favorite.db'), path.join(TEMP_PICA, 'local_favorite.db'));
        convertHistoryDb(path.join(TEMP_VENERA, 'history.db'), path.join(TEMP_PICA, 'history.db'));
        convertAppdata(path.join(TEMP_VENERA, 'appdata.json'), path.join(TEMP_PICA, 'appdata'));
        convertComicSource(path.join(TEMP_VENERA, 'comic_source'), path.join(TEMP_PICA, 'comic_source'));

        const veneraCookies = path.join(TEMP_VENERA, 'cookie.db');
        if (fs.existsSync(veneraCookies)) {
            fs.copyFileSync(veneraCookies, path.join(TEMP_PICA, 'cookies.db'));
            console.log('[Copy] cookies');
        }

        createZip(TEMP_PICA, OUTPUT_FILE);
        const stats = fs.statSync(OUTPUT_FILE);

        console.log('');
        console.log('========================================');
        console.log('[SUCCESS] Conversion complete!');
        console.log('[Output] ' + OUTPUT_FILE);
        console.log('[Size] ' + (stats.size / 1024).toFixed(1) + ' KB');
        console.log('');
        console.log('Next steps:');
        console.log('  1. Copy userData.picadata to your phone');
        console.log('  2. Import in PicaComic v4.2.11');
        console.log('  3. Login with the same account');
        console.log('  4. Reconfigure WebDAV if needed');
        console.log('========================================');
    } catch (error) {
        console.error('');
        console.error('[ERROR] Conversion failed: ' + error.message);
        process.exit(1);
    } finally {
        cleanTemp();
    }
}

main();
