// Add recursion to docco

// http://jashkenas.github.com/docco/
// docco 
//var dir = require('node-dir');
var exec = require('child_process').exec;
var path = require('path');
var _ = require('underscore');
var async = require('async');
var fs = require('fs');
var program = require('commander');


//
// Given srcDir path to where code lives and destDir path where documentation
// should go, generate mappings of input/output file locations
//
function getFileInfo(srcDir, destDir, callback) {
  var pattern = new RegExp('^' + srcDir + '(.*)$');
  var findCmd = "find " + srcDir;
  var split, result, pth, matched;
  var results = [];

  exec(findCmd, [ ], function(err, stdout, stderr) {
    if (err) return callback(err);
    var files = stdout.split('\n');
    files.forEach(function(f) {
      // only look for js/coffee files within srcDir
      if (f.match(/.js|.coffee$/)) {
        split = _.compact(f.match(pattern)[1].split('/'));
        // collect data about srcFile, destFile, and directories that need to be created
        pth = destDir;
        result = {
          srcFile: f,
          dirPaths:[pth],
          dirElems:[]
        };
        split.forEach(function(elem) {

          matched = elem.match(/(.*).js|.coffee$/);
          if (matched) {
            // strip off .js or .coffee suffix and replace with html
            result.filename =  matched[1] + ".html";
            pth += "/" + result.filename;
            result.destFile = pth;
            result.doccoOutput = destDir + '/' + result.filename;
          } else {
            pth += "/" + elem;
            result.dirPaths.push(pth);
            result.dirElems.push(elem);
          }
        });
        results.push(result);
      }
    });
    return callback(null, results);
  });
}

// for each srcFile in fileInfo, run the docco command
function generateDocs(fileInfo, callback) {
  var batched = [];
  var doccoCmd = __dirname + '/../bin/docco ';
  fileInfo.forEach(function(info) {
    batched.push(function(cb) {  exec(doccoCmd + info.srcFile, [ ], cb); });
  });
  async.parallel(batched, callback);
}

// create needed directory tree
function mkDirs(fileInfo, callback) {
  var batched = [];
  fileInfo.forEach(function(info) {
    if (info.dirPaths) {
      info.dirPaths.forEach(function(d) {
        batched.push(function(cb) {
          if (!fs.existsSync(d)) {
            fs.mkdir(d, 0777, cb);
          } else {
            cb();
          }
        });
      });
    }
  });
  async.parallel(batched, callback);
}

// move docco generated file to correct hierarchy
function moveFiles(fileInfo, callback) {
  var batched = [];
  fileInfo.forEach(function(info) {
    batched.push(function(cb) {
      // read docco generated file
      fs.readFile(info.doccoOutput, 'utf8', function (err,data) {
        if (err) return cb(err);
        // find relative path based on how deep the new directory structure is
        var dots = _.map(info.dirElems, function(e) { return '..';}).join('/');
        // modify stylesheet path
        data = data.replace('href="docco.css"', 'href="' + dots + '/docco.css"');
        // store new file contents
        fs.writeFile(info.destFile, data, function(err) {
          if (err) return cb(err);
          // and delete the original
          fs.unlinkSync(info.doccoOutput);
          return cb(null, info.destFile);
        });
      });
    });
  });
  async.parallel(batched, callback);
}


function insertIntoTree(tree, dirs, filename) {
  var path = '.';
  var current = tree;
  dirs.forEach(function(d) {
    path += '/' + d;
    if (!current[d]) current[d] = {};
    current = current[d];
  });
  if (!current.files) current.files = [];
  current.files.push({filename:filename, path:path});
}

// build file tree for document menu
function buildFileTree(fileInfo, callback) {
  var tree = {};
  fileInfo.forEach(function(info) {
    insertIntoTree(tree, info.dirElems, info.filename);
  });
  return callback(null, tree);
}

function getIndexTemplate(templateFilename, callback) {
  // TODO, read this from file!  Quickest right now to do inline
  var template = [];
  template.push('<!DOCTYPE html>');
  template.push('');
  template.push('<html>');
  template.push('<head>');
  template.push('<meta http-equiv="content-type" content="text/html; charset=UTF-8">');
  template.push('<link rel="stylesheet" media="all" href="./docco.css" />');
  template.push('</head>');
  template.push('<body>');
  template.push('<div class="nav"></div>');
  template.push('</body>');
  template.push('</html>');
  return callback(null, template.join('\n'));
}

function getStylesheetAdditions(filename, callback) {
  // TODO: perhaps read this from template file
  var styles = [];
  styles.push('/*--------------------- Nav ----------------------------*/');
  styles.push('');
  styles.push('.nav {}');
  styles.push('.nav ul{margin-top:0px;padding-left:10px;list-style:none;}');
  styles.push('.nav li.folder{}');
  styles.push('.nav span.folder{font-family: "aller-bold";}');
  styles.push('.nav li.file{}');
  return callback(null, styles.join('\n'));

}

// create root/index document html file with document menu
function treeToHtml(tree) {
  var html = [];

  _.each(tree, function(value, key) {
    html.push('<ul>');
    if (_.isArray(value)) {
      value.forEach(function(f) {
        html.push('<li class="file"><a href="' + f.path + '/' + f.filename + '">' + f.filename.match(/^(.*).html$/)[1] + '</a></li>');
      });
    } else {
      html.push('<li class="folder"><span class="folder">' + key + '</span>' + treeToHtml(value) + '</li>');
    }
    html.push("</ul>");
  });

  return html.join('');
}

// create root/index document html file with document menu
function makeIndexFile(filename, fileTree, callback) {
  getIndexTemplate('todo', function(err, htmlTemplate) {
    if (err) return callback(err);
    html = [];
    html.push('<div class="nav">');
    html.push(treeToHtml(fileTree));
    html.push('</div>');
    htmlTemplate = htmlTemplate.replace('<div class="nav"></div>', html.join('\n'));
    fs.writeFile(filename, htmlTemplate, function (err) {
      callback(err, filename);
    });
  });
}

// append our style info to docco.css
function editStylesheet(stylesheetPath, callback) {
  getStylesheetAdditions('ignore', function(err, data) {
    if (err) return callback(err);
    fs.appendFile(stylesheetPath, data, callback);
  });
}

// put it all together here
module.exports.recurse = function(srcDir, destDir) {
  var fileInfo = [];
  var fileTree = {};
  var doccoIndex = destDir + '/docco.html';
  var doccoStylesheet = destDir + '/docco.css';

  var steps = {};
  steps.getFileInfo = function(cb) {
    getFileInfo(srcDir, destDir, function(err, info) {
      fileInfo = info;
      return cb(err, info);
    });
  };
  steps.generateDocs = function(cb) { generateDocs(fileInfo, cb);};
  steps.mkDirs = function(cb) {mkDirs(fileInfo, cb); };
  steps.moveFiles = function(cb) {moveFiles(fileInfo, cb); };
  steps.fileTreeForNav = function(cb) {
    buildFileTree(fileInfo, function(err, tree) {
      fileTree = tree;
      return cb(err, fileTree);
    });
  };
  steps.makeIndexFile = function(cb) {makeIndexFile(doccoIndex, fileTree, cb); };
  steps.editStylesheet = function(cb) {editStylesheet(doccoStylesheet, cb); };

  async.series(steps, function(err, results) {
    if (err) {
      console.log("Error: " + err);
    } else {
      console.log("Created:\n", _.map(results.moveFiles, function(f) { return f; }).join('\n'));
      console.log("\nView documents here: " + results.makeIndexFile);
    }
  });
}




