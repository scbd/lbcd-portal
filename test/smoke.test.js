'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const pkg = require('../package.json');

const root = path.join(__dirname, '..');

let server;
let baseUrl;
let output = '';

before(async () => {
    server = spawn(process.execPath, ['server.js'], {
        cwd: root,
        env: { ...process.env, PORT: '0', API_URL: 'http://127.0.0.1:9' },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    server.stdout.on('data', (d) => { output += d; });
    server.stderr.on('data', (d) => { output += d; });

    baseUrl = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('server did not start:\n' + output)), 10000);
        server.stdout.on('data', () => {
            const m = /Server listening on .*"port":(\d+)/.exec(output);
            if (m) { clearTimeout(timer); resolve('http://127.0.0.1:' + m[1]); }
        });
        server.on('exit', (code) => { clearTimeout(timer); reject(new Error('server exited ' + code + ':\n' + output)); });
    });
});

after(() => { if (server) server.kill(); });

function satisfies(version, range) {
    const v = version.replace(/^v/, '').split('.').map(Number);
    const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    return range.split('||').some((part) => {
        const m = /^\s*(\^|>=)(\d+)\.(\d+)\.(\d+)\s*$/.exec(part);
        assert.ok(m, 'unsupported engines range part: ' + part);
        const min = [Number(m[2]), Number(m[3]), Number(m[4])];
        return m[1] === '^' ? v[0] === min[0] && cmp(v, min) >= 0 : cmp(v, min) >= 0;
    });
}

test('node version satisfies engines.node', () => {
    assert.ok(satisfies(process.version, pkg.engines.node), `${process.version} does not satisfy ${pkg.engines.node}`);
});

const pages = ['/lbcd', '/lbcd/', '/lbcd/about', '/lbcd/legal', '/lbcd/step1', '/lbcd/step2', '/lbcd/partners',
    '/lbcd/case-studies', '/lbcd/resources', '/lbcd/news', '/lbcd/events'];

for (const page of pages) {
    test(`page ${page} returns the app template`, async () => {
        const res = await fetch(baseUrl + page);
        assert.equal(res.status, 200);
        assert.match(res.headers.get('content-type'), /text\/html/);
        const body = await res.text();
        assert.match(body, /<title>Cultural and Bioligical Biodiversity<\/title>/);
        assert.match(body, /ng-controller="TemplateController"/);
    });
}

const assets = [
    ['/favicon.png', /image\/png/],
    ['/lbcd/app/css/cultural.css', /text\/css/],
    ['/lbcd/app/js/boot.js', /javascript/],
    ['/lbcd/app/views/index.html', /text\/html/],
    ['/lbcd/app/images/cultural-logo.png', /image\/png/],
    ['/lbcd/app/libs/requirejs/require.js', /javascript/],
    ['/lbcd/app/libs/angular/angular.min.js', /javascript/],
    ['/lbcd/app/libs/bootstrap/dist/css/bootstrap.min.css', /text\/css/],
];

for (const [asset, type] of assets) {
    test(`static asset ${asset} is served`, async () => {
        const res = await fetch(baseUrl + asset);
        assert.equal(res.status, 200);
        assert.match(res.headers.get('content-type'), type);
        assert.ok((await res.arrayBuffer()).byteLength > 0);
    });
}

test('missing app file returns 404', async () => {
    const res = await fetch(baseUrl + '/lbcd/app/does-not-exist.js');
    assert.equal(res.status, 404);
    assert.equal(await res.text(), '404');
});

// runs before the proxy test, which logs an expected proxy error
test('server log is clean', () => {
    const lines = output.split('\n').filter((l) => l.trim() && !/^Server listening on /.test(l));
    assert.deepEqual(lines, []);
});

test('api proxy returns 502 when upstream is unreachable', async () => {
    const res = await fetch(baseUrl + '/api/v2013/thesaurus/domains');
    assert.equal(res.status, 502);
});
