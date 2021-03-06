'use strict';

window.name = 'NG_DEFER_BOOTSTRAP!';

require.config({
    baseUrl : '/lbcd/app/js',
    paths: {
        'angular'              : '../libs/angular/angular',
        'angular-route'        : '../libs/angular-route/angular-route',
        'ng-breadcrumbs'       : '../libs/ng-breadcrumbs/dist/js/ng-breadcrumbs',
        'async'                : '../libs/requirejs-plugins/src/async',
        'domReady'             : '../libs/requirejs-domready/domReady',
        'jquery'               : '../libs/jquery/jquery',
        'bootstrap'            : '../libs/bootstrap/dist/js/bootstrap.min',
        'underscore'           : '../libs/underscore/underscore',
        'linqjs'               : '../libs/linqjs/linq',
        'moment'               : '../libs/moment/min/moment-with-langs.min',
        'bootstrap-datepicker' : '../libs/bootstrap-datepicker/js/bootstrap-datepicker'        
    },
    shim: {
        'angular'              : { 'deps': ['jquery'], 'exports': 'angular' },
        'angular-route'        : { 'deps': ['angular'] },
        'bootstrap'            : { 'deps': ['jquery'] },
        'bootstrap-datepicker' : { 'deps': ['jquery'] },
        'underscore'           : { 'exports': '_' }
    }
});

require(['angular', 'angular-route', 'bootstrap', 'domReady', 'bootstrap-datepicker'], function (ng) {

    // NOTE: place operations that need to initialize prior to app start here using the `run` function on the top-level module

    require(['domReady!', 'main'], function (document) {
        ng.bootstrap(document, ['app']);
        ng.resumeBootstrap();
    });
});

