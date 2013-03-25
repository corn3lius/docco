/**
It's easier to have this file in js and require it, vs parsing the json.
For one, you can add usefule comments!
*/
module.exports = { 
  ".coffee":    {"name": "coffeescript", "symbol": "#"},
  ".litcoffee": {"name": "coffeescript", "symbol": "#", "literate": true},
  ".ls":        {"name": "livescript", "symbol": "#"},
  ".rb":        {"name": "ruby", "symbol": "#"},
  ".py":        {"name": "python", "symbol": "#"},
  ".feature":   {"name": "gherkin", "symbol": "#"},
  ".yaml":      {"name": "yaml", "symbol": "#"},
  ".tex":       {"name": "tex", "symbol": "%"},
  ".latex":     {"name": "tex", "symbol": "%"},
  ".js":        {
    name: "javascript", 
    symbol: "//", 
    start_block: /^\/\x2a\x2a/,  // => "/**"
    end_block: /^\x2a\//         // => "*/"
  },
  ".java":      {"name": "java", "symbol": "//"},
  ".sass":      {"name": "sass", "symbol": "//"},
  ".scss":      {"name": "scss", "symbol": "//"},
  ".c":         {"name": "c", "symbol": "//"},
  ".h":         {"name": "c", "symbol": "//"},
  ".cpp":       {"name": "cpp", "symbol": "//"},
  ".php":       {"name": "php", "symbol": "//"},
  ".hs":        {"name": "haskell", "symbol": "--"},
  ".erl":       {"name": "erlang", "symbol": "%"},
  ".hrl":       {"name": "erlang", "symbol": "%"},
  ".md":        {"name": "markdown", "symbol": ""},
  ".markdown":  {"name": "markdown", "symbol": ""},
  ".less":      {"name": "scss", "symbol": "//"},
  ".m":         {"name": "objc", "symbol": "//"},
  ".scala":     {"name": "scala", "symbol": "//"},
  ".cs":        {"name": "c#", "symbol": "//"},
  ".scm":       {"name": "scheme", "symbol": ";;"},
  "Makefile":   {"name": "make", "symbol": "#"}
};