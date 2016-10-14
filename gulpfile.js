'use strict';

var gulp = require('gulp');
var sass = require('gulp-sass');
var bulkSass = require('gulp-sass-bulk-import');

// Configuration
var BUILD_PATHS = {
    stylesheets: [
        './static/stylesheets/*.scss',
    ]
}

var WATCH_PATHS = {
    stylesheets: [
        './static/stylesheets/**/*.scss',
    ]
}

var BUNDLE_PATH = './static/bundles'

// Tasks
gulp.task('sass', function () {
    gulp.src(BUILD_PATHS.stylesheets)
        .pipe(bulkSass())
        .pipe(sass().on('error', sass.logError))
        .pipe(sass())
        .pipe(gulp.dest(BUNDLE_PATH));
});

gulp.task('sass:watch', function () {
    gulp.watch(WATCH_PATHS.stylesheets, ['sass']);
});

// Default task
gulp.task('default', [
    'sass',
    'sass:watch',
]);
