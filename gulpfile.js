'use strict';

var gulp = require('gulp');
var sass = require('gulp-sass');
var bulkSass = require('gulp-sass-bulk-import');
var rev = require('gulp-rev');

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
var DATA_PATH = './data'

// Tasks
gulp.task('sass', function () {
    gulp.src(BUILD_PATHS.stylesheets)
        .pipe(bulkSass())
        .pipe(sass().on('error', sass.logError))
        .pipe(sass())
        .pipe(rev())
        .pipe(gulp.dest(BUNDLE_PATH))
        .pipe(rev.manifest('rev_manifest.json'))
        .pipe(gulp.dest(DATA_PATH));
});

gulp.task('sass:watch', function () {
    gulp.watch(WATCH_PATHS.stylesheets, ['sass']);
});

// Default task
gulp.task('default', [
    'sass',
    'sass:watch',
]);
