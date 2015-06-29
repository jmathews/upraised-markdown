if (typeof define !== 'function') { var define = require('amdefine')(module) }
define(['../markdown_helpers', './dialect_helpers', './gruber', '../parser'], function (MarkdownHelpers, DialectHelpers, Gruber, Markdown) {

  var Upraised = DialectHelpers.subclassDialect( Gruber ),
      extract_attr = MarkdownHelpers.extract_attr,
      mk_block = MarkdownHelpers.mk_block,
      forEach = MarkdownHelpers.forEach;

  Upraised.block.atxHeader =
  Upraised.block.setextHeader =
  Upraised.block.code =
  // Upraised.block.horizRule =
  // Upraised.block.blockquote =
  function (text) {
    return;
  };

  Upraised.block.commentHeader = function commentHeader( block, next) {
    var m = block.match( /^(\/\/)(.*?)(?:\n|$)/ );

    if ( !m )
      return undefined;

    if ( m[0].length < block.length )
      next.unshift( mk_block( block.substr( m[0].length ), block.trailing, block.lineNumber + 2 ) );

    return [ ];
  };

  Upraised.block.blockHeader = function blockHeader( block, next ) {
    var m = block.match( /^([@$#][\w\-]+)(\/\w+)?\s*(.*?)\s*(?:\n|$)/ );

    if ( !m )
      return undefined;

    switch (m[1][0]) {
    case '$':
      header = ['section'];
      break;
    case '#':
      header = ['field'];
      break;
    case '@':
      header = ['reference'];
    }

    var attrs = {};

    attrs.type = m[1].slice(1).toLowerCase();

    if (m[3]) {
      var parts = m[3].split(/\s*\/\/\s*/);
      attrs.value = parts[0];
      if (parts[1]) {
        attrs.comment = parts[1];
      }
    }

    if (m[2]) {
      attrs.lang = m[2].slice(1);
    }

    header.push(attrs);

    // Array.prototype.push.apply(header, this.processInline(m[ 2 ]));

    if ( m[0].length < block.length )
      next.unshift( mk_block( block.substr( m[0].length ), block.trailing, block.lineNumber + 2 ) );

    return [ header ];
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
          class: 'term',
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
