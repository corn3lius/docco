// Generated by CoffeeScript 1.6.2
(function() {
  var Docco, commander, config, configure, document, exec, ext, format, fs, getLanguage, highlight, l, languages, marked, parse, path, run, spawn, version, write, _, _ref,
    __slice = [].slice;

  document = function(options, callback) {
    if (options == null) {
      options = {};
    }
    configure(options);
    return exec("mkdir -p " + config.output, function() {
      var complete, files, nextFile;

      callback || (callback = function(error) {
        if (error) {
          throw error;
        }
      });
      complete = function() {
        return exec(["cp -f " + config.css + " " + config.output, fs.existsSync(config["public"]) ? "cp -fR " + config["public"] + " " + config.output : void 0].join(' && '), callback);
      };
      files = config.sources.slice();
      nextFile = function() {
        var source;

        source = files.shift();
        return fs.readFile(source, function(error, buffer) {
          var code, sections;

          if (error) {
            return callback(error);
          }
          code = buffer.toString();
          sections = parse(source, code);
          format(source, sections);
          write(source, sections);
          if (files.length) {
            return nextFile();
          } else {
            return complete();
          }
        });
      };
      return nextFile();
    });
  };

  parse = function(source, code) {
    var codeText, docsText, hasCode, i, lang, line, lines, match, prev, save, sections, _i, _j, _len, _len1;

    lines = code.split('\n');
    sections = [];
    lang = getLanguage(source);
    hasCode = docsText = codeText = '';
    save = function() {
      sections.push({
        docsText: docsText,
        codeText: codeText
      });
      return hasCode = docsText = codeText = '';
    };
    processCommentLine = function(line) {
      // save any code section, if any
      if (hasCode) {
        save();
      }
      // extract text from comment and append to docsText
      docsText += (line = line.replace(lang.commentMatcher, '')) + '\n';
      // huh?  diff pattern triggers save?
      if (/^(---+|===+)$/.test(line)) {
        save();
      }
      prev = 'text';
    };
    processCodeLine = function(line) {
      // we're not in comment block, so append line to code block
      hasCode = true;
      codeText += line + '\n';
      prev = 'code';
    };
    if (lang.literate) {
      for (i = _i = 0, _len = lines.length; _i < _len; i = ++_i) {
        line = lines[i];
        lines[i] = /^\s*$/.test(line) ? '' : (match = /^([ ]{4}|\t)/.exec(line)) ? line.slice(match[0].length) : lang.symbol + ' ' + line;
      }
    }
    var inCommenBlock = false;
    for (_j = 0, _len1 = lines.length; _j < _len1; _j++) {
      line = lines[_j];
      if (lang.comment_start_block && line.match(lang.comment_start_block)) {
        inCommenBlock = true;
      } else if (lang.comment_end_block && line.match(lang.comment_end_block)) {
        inCommenBlock = false;
      } else if (inCommenBlock) {
        processCommentLine(line);
      } else if ((!line && prev === 'text') || (line.match(lang.commentMatcher) && !line.match(lang.commentFilter))) {
        // if blank line and finishing text block
        // or we have a legit single comment line (it's not escaped/filtered)
        processCommentLine(line);
      } else {
        processCodeLine(line);
      }
    }
    save();
    return sections;
  };

  format = function(source, sections) {
    var code, i, language, section, _i, _len, _results;

    language = getLanguage(source);
    _results = [];
    for (i = _i = 0, _len = sections.length; _i < _len; i = ++_i) {
      section = sections[i];
      code = highlight(language.name, section.codeText).value;
      code = code.replace(/\s+$/, '');
      section.codeHtml = "<div class='highlight'><pre>" + code + "</pre></div>";
      _results.push(section.docsHtml = marked(section.docsText));
    }
    return _results;
  };

  write = function(source, sections) {
    var destination, first, hasTitle, html, title;

    destination = function(file) {
      return path.join(config.output, path.basename(file, path.extname(file)) + '.html');
    };
    first = marked.lexer(sections[0].docsText)[0];
    hasTitle = first && first.type === 'heading' && first.depth === 1;
    title = hasTitle ? first.text : path.basename(source);
    html = config.template({
      sources: config.sources,
      css: path.basename(config.css),
      title: title,
      hasTitle: hasTitle,
      sections: sections,
      path: path,
      destination: destination
    });
    console.log("docco: " + source + " -> " + (destination(source)));
    return fs.writeFileSync(destination(source), html);
  };

  config = {
    layout: 'parallel',
    output: 'docs/',
    template: null,
    css: null,
    extension: null
  };

  configure = function(options) {
    var dir;

    _.extend(config, _.pick.apply(_, [options].concat(__slice.call(_.keys(config)))));
    if (options.template) {
      config.layout = null;
    } else {
      dir = config.layout = "" + __dirname + "/resources/" + config.layout;
      if (fs.existsSync("" + dir + "/public")) {
        config["public"] = "" + dir + "/public";
      }
      config.template = "" + dir + "/docco.jst";
      config.css = options.css || ("" + dir + "/docco.css");
    }
    config.template = _.template(fs.readFileSync(config.template).toString());
    return config.sources = options.args.filter(function(source) {
      var lang;

      lang = getLanguage(source, config);
      if (!lang) {
        console.warn("docco: skipped unknown type (" + lang + ")");
      }
      return lang;
    }).sort();
  };

  _ = require('underscore');

  fs = require('fs');

  path = require('path');

  marked = require('marked');

  commander = require('commander');

  highlight = require('highlight.js').highlight;

  _ref = require('child_process'), spawn = _ref.spawn, exec = _ref.exec;

  languages = require("./resources/languages");
  for (ext in languages) {
    l = languages[ext];
    l.commentMatcher = RegExp("^\\s*" + l.symbol + "\\s?");
    l.commentFilter = /(^#![/]|^\s*#\{)/;
    if (l.start_block && l.end_block) {
      l.comment_start_block = new RegExp(l.start_block);
      l.comment_end_block = new RegExp(l.end_block);
    }
  }

  getLanguage = function(source) {
    var codeExt, codeLang, lang;

    ext = config.extension || path.extname(source) || path.basename(source);
    lang = languages[ext];
    if (lang && lang.name === 'markdown') {
      codeExt = path.extname(path.basename(source, ext));
      if (codeExt && (codeLang = languages[codeExt])) {
        lang = _.extend({}, codeLang, {
          literate: true
        });
      }
    }
    return lang;
  };

  version = JSON.parse(fs.readFileSync("" + __dirname + "/package.json")).version;

  run = function(args) {
    var c;

    if (args == null) {
      args = process.argv;
    }
    c = config;
    commander.version(version).usage('[options] files').option('-r, --recursive', 'recursively generate docs', c.recursive).option('-l, --layout [name]', 'choose a layout (parallel, linear or classic)', c.layout).option('-o, --output [path]', 'output to a given folder', c.output).option('-c, --css [file]', 'use a custom css file', c.css).option('-t, --template [file]', 'use a custom .jst template', c.template).option('-e, --extension [ext]', 'assume a file extension for all inputs', c.extension).parse(args).name = "docco";
    if (commander.args.length) {
      if (commander.recursive) {
        var src = commander.args[0];
        var dest = commander.output ? commander.output : path.normalize(__dirname + '/../docs');
        var recursive_docco = require(__dirname + '/lib/recursive_docco');
        return recursive_docco.recurse(src, dest);
      } else {
        return document(commander);
      }
    } else {
      return console.log(commander.helpInformation());
    }
  };

  Docco = module.exports = {
    run: run,
    document: document,
    parse: parse,
    version: version
  };

}).call(this);
