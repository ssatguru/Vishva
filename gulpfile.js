/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var gulp = require('gulp');

var ts = require("gulp-typescript");

gulp.task("default", function () {
    var tsResult = gulp.src("src/ts/*.ts")
        .pipe(ts({
              noImplicitAny: false,
              out: "Vishva-merged.js"
        }));
    return tsResult.js.pipe(gulp.dest("public_html/js"));
});