'use strict';
/* jshint node:true */
var fs = require('fs');
var http = require('http');
var express = require('express');
var httpProxy = require('http-proxy');

// Create server

var app = express();
var server = http.createServer(app);
var oneDay = 24*60*60*1000;

app.use('/lbcd/app', express.static(__dirname + '/lbcd/app'));
app.use('/favicon.png', express.static(__dirname + '/lbcd/app/template/favicon.png', { maxAge: oneDay }));

// Configure routes

var proxy = httpProxy.createProxyServer({});

var apiUrl = process.env.API_URL || 'https://api.cbd.int';

app.get   ('/lbcd/app/*', function(req, res) { res.status(404).send('404'); } );
app.get   ('/public/*',   function(req, res) { res.status(404).send('404'); } );
app.all   ('/api/*',      function(req, res) { proxy.web(req, res, { target: apiUrl, changeOrigin: true, secure: false } ); } );

// Configure index.html

app.get('/lbcd*', function(req, res) {
	fs.readFile(__dirname + '/lbcd/app/template/template.html', 'utf8', function (error, text) {
		res.send(text);
	});
});

// START HTTP SERVER

app.listen(process.env.PORT || 2030, '0.0.0.0', function () {
	console.log('Server listening on %j', this.address());
});

// Handle proxy errors ignore

proxy.on('error', function (e,req, res) {
    console.error('proxy error:', e);
    res.status(502).send();
});
