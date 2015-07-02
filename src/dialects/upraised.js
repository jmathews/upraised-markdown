if (typeof define !== 'function') { var define = require('amdefine')(module) }
define(['../markdown_helpers', './dialect_helpers', './gruber', '../parser'], function (MarkdownHelpers, DialectHelpers, Gruber, Markdown) {

  var Upraised = DialectHelpers.subclassDialect( Gruber ),
      extract_attr = MarkdownHelpers.extract_attr,
      mk_block = MarkdownHelpers.mk_block,
      forEach = MarkdownHelpers.forEach;

  // A robust regexp for matching URLs. Thanks: https://gist.github.com/dperini/729294
  var urlRegexp = /(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?/i.source;

  Upraised.block.atxHeader =
  Upraised.block.setextHeader =
  Upraised.block.code =
  // Upraised.block.horizRule =
  // Upraised.block.blockquote =
  function (text) {
    return;
  };

  Upraised.block.equationHeader = function equationHeader (block, next) {
    var m = block.match( /^(%%)\s*(.*?)\s*(?:\n|$)/ );

    if ( !m )
      return undefined;

    var header = [ "p", { class: 'equation' }, m[2] ];

    if ( m[0].length < block.length )
      next.unshift( mk_block( block.substr( m[0].length ), block.trailing, block.lineNumber + 2 ) );

    return [ header ];
  };

  Upraised.block.calloutHeader = function equationHeader (block, next) {
    var m = block.match( /^(!!)\s*(.*?)\s*(?:\n|$)/ );

    if ( !m )
      return undefined;

    var header = [ "p", {class: 'callout'} ];

    Array.prototype.push.apply(header, this.processInline(m[ 2 ]));

    if ( m[0].length < block.length )
      next.unshift( mk_block( block.substr( m[0].length ), block.trailing, block.lineNumber + 2 ) );

    return [ header ];
  };

  Upraised.inline['`'] = function (text) {
    return [1, '`'  ];
  };

  Upraised.inline['%%'] = function inlineEquation( text ) {
    // Inline equation block, delimited by '%%'
    var m = text.match( /(%%)(([\s\S]*?)\1)/ );

    if ( m && m[2] )
      return [ m[1].length + m[2].length, [ "span", {class: 'equation'}, m[3].trim() ] ];
    else {
      // TODO: No matching end code found - warn!
      return [ 2, "%%" ];
    }
  };

  Upraised.inline['{{'] = function inlineDefinition( text ) {
    // Inline equation block, delimited by '%%'
    var m = text.match( /(\{\{)([\s\S]*?)(\}\})/ );
    var parts;

    if ( m && m[2] ) {
      parts = m[2].split(/\s*\|\s*/);
      if (parts.length === 2) {
        return [ m[0].length, [ "span", {
          class: 'term definition',
          "data-definition": parts[1].trim()
        }, parts[0].trim()] ];
      } else {
        return [ m[0].length, [ "span", {
          class: 'term'
        }, parts[0].trim() ] ];
      }
    } else {
      // TODO: No matching end code found - warn!
      return [ 2, "{{" ];
    }
  };

  Upraised.inline['!['] = function image( text ) {

    // Without this guard V8 crashes hard on the RegExp
    if (text.indexOf('(') >= 0 && text.indexOf(')') === -1) { return; }

    // Unlike images, alt text is plain text only. no other elements are
    // allowed in there

    // ![Alt text](/path/to/img.jpg "Optional title")
    //      1          2            3       4         <--- captures
    //
    // First attempt to use a strong URL regexp to catch things like parentheses. If it misses, use the
    // old one.
    var m = text.match(new RegExp("^!\\[(.*?)][ \\t]*\\((" + urlRegexp + ")\\)([ \\t])*([\"'].*[\"'])?")) ||
            text.match( /^!\[(.*?)\][ \t]*\([ \t]*([^")]*?)(?:[ \t]+(["'])(.*?)\3)?[ \t]*\)/ );

    if ( m ) {
      if ( m[2] && m[2][0] === "<" && m[2][m[2].length-1] === ">" )
        m[2] = m[2].substring( 1, m[2].length - 1 );

      m[2] = this.dialect.inline.__call__.call( this, m[2], /\\/ )[0];

      var attrs = { alt: m[1], href: m[2] || "" };
      if ( m[4] !== undefined)
        attrs.title = m[4];

      if (attrs.href[0] === '.') { // relative url must be object
        var href = m[2];
        var parts = m[2].split('/');
        var base = parts[parts.length - 1];
        parts = base.split('.');
        var root = parts.slice(0, parts.length - 1).join('.');
        // return [ m[0].length, [ "div", attrs, 'jeff', ['br'] ] ];
        return [ m[0].length, [ 'div', [ "img", attrs ], ['br'], ['em', '$' + root + '$']] ];
      } else {
        return [ m[0].length, [ "img", attrs ] ];
      }

    }

    // ![Alt text][id]
    m = text.match( /^!\[(.*?)\][ \t]*\[(.*?)\]/ );

    if ( m ) {
      // We can't check if the reference is known here as it likely wont be
      // found till after. Check it in md tree->hmtl tree conversion
      return [ m[0].length, [ "img_ref", { alt: m[1], ref: m[2].toLowerCase(), original: m[0] } ] ];
    }

    // Just consume the '!['
    return [ 2, "![" ];
  };



  Markdown.dialects.Upraised = Upraised;
  Markdown.buildBlockOrder ( Upraised.block );
  Markdown.buildInlinePatterns( Markdown.dialects.Upraised.inline );

  return Upraised;
});
