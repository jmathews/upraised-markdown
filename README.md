# upraised-markdown

An Upraised dialect of markdown, implemented with [markdown-js], to capture key elements of Upraised content / metadata.  Includes tests.

Key differences:

* Inline or block equation, returned as `<span>` or `<p>` with `class="equation"`
```text
    This is an equation: %% 1 + 2 = 3 %%

    And a block equation:
    %% 4 + 5 = 9
```
* Inline defined term, with optional definition, returned as `<span>` of `class="term"` with an optional `data-definition` attribute.
```text
    The two {{parallel | side by side and having the same distance continuously between them}} lines will never meet.

    The {{parallelogram}} is a type of trapezoid.
```
* Block-level callout, with inline formatting, returned as `<p>`with `class="callout"`
```text
    !! This is really *important*!
```
* No headers or code blocks

[markdown-js]: https://github.com/evilstreak/markdown-js


## Usage

The basic interface is:
```js
md_content = "Hello.\n\n* This is markdown.\n* It is fun\n* Love it or leave it."
html_content = markdown.toHTML( md_content, 'Upraised' );
```


### Node

The simple way to use it with Node is:

```js
var markdown = require( "markdown" ).markdown;
console.log( markdown.toHTML( "Hello *World*!" ) );
```

### Browser

It also works in a browser; here is a complete example:

```html
<!DOCTYPE html>
<html>
  <body>
    <textarea id="text-input" oninput="this.editor.update()"
              rows="6" cols="60">Type **Markdown** here.</textarea>
    <div id="preview"> </div>
    <script src="lib/markdown.js"></script>
    <script>
      function Editor(input, preview) {
        this.update = function () {
          preview.innerHTML = markdown.toHTML(input.value, 'Upraised');
        };
        input.editor = this;
        this.update();
      }
      var $ = function (id) { return document.getElementById(id); };
      new Editor($("text-input"), $("preview"));
    </script>
  </body>
</html>
```

### More Options

If you want more control check out the documentation in
[the .js files under src/][src_folder] which details all the methods and parameters
available (including examples!). One day we'll get the docs generated
and hosted somewhere for nicer browsing.

[src_folder]: https://github.com/evilstreak/markdown-js/blob/master/src

Meanwhile, here's an example of using the multi-step processing to
make wiki-style linking work by filling in missing link references:

```js
var md = require( "markdown" ).markdown,
    text = "[Markdown] is a simple text-based [markup language]\n" +
           "created by [John Gruber]\n\n" +
           "[John Gruber]: http://daringfireball.net";

// parse the markdown into a tree and grab the link references
var tree = md.parse( text ),
    refs = tree[ 1 ].references;

// iterate through the tree finding link references
( function find_link_refs( jsonml ) {
  if ( jsonml[ 0 ] === "link_ref" ) {
    var ref = jsonml[ 1 ].ref;

    // if there's no reference, define a wiki link
    if ( !refs[ ref ] ) {
      refs[ ref ] = {
        href: "http://en.wikipedia.org/wiki/" + ref.replace(/\s+/, "_" )
      };
    }
  }
  else if ( Array.isArray( jsonml[ 1 ] ) ) {
    jsonml[ 1 ].forEach( find_link_refs );
  }
  else if ( Array.isArray( jsonml[ 2 ] ) ) {
    jsonml[ 2 ].forEach( find_link_refs );
  }
} )( tree );

// convert the tree into html
var html = md.renderJsonML( md.toHTMLTree( tree ) );
console.log( html );
```

## Intermediate Representation

Internally the process to convert a chunk of Markdown into a chunk of
HTML has three steps:

1. Parse the Markdown into a JsonML tree. Any references found in the
   parsing are stored in the attribute hash of the root node under the
   key `references`.
2. Convert the Markdown tree into an HTML tree. Rename any nodes that
   need it (`bulletlist` to `ul` for example) and lookup any references
   used by links or images. Remove the references attribute once done.
3. Stringify the HTML tree being careful not to wreck whitespace where
   whitespace is important (surrounding inline elements for example).

Each step of this process can be called individually if you need to do
some processing or modification of the data at an intermediate stage.
For example, you may want to grab a list of all URLs linked to in the
document before rendering it to HTML which you could do by recursing
through the HTML tree looking for `a` nodes.

## Building and Testing markdown-js

We use [Grunt](http://gruntjs.com/) to build and run markdown-js's tests.
Make sure you run `npm install` to install the developer dependencies for
the project, then you can:

    $ npm test

To run our test suite. If you'd like to build markdown-js, you can run:

    $ ./node_modules/.bin/grunt all

This command will run all the tests, then output a concatenated markdown.js
and markdown.min.js in the `dist/` directory for use in a browser application.

## Building a custom markdown-js

By default, you will get the [Gruber] and [Maruku] dialects included when you
run `grunt all`. However, you can create a custom build using the following
syntax if you don't want to include Maruku support.

    $ ./node_modules/.bin/grunt "custom:-dialects/maruku"

[Gruber]: http://daringfireball.net/projects/markdown/syntax
[Maruku]: http://maruku.rubyforge.org/maruku.html

## Running Tests

To run the tests under Node you will need tap installed (it's listed as a
`devDependencies` so `npm install` from the checkout should be enough), then do

    $ npm test

## License

Released under the MIT license.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
