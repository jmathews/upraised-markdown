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


  Markdown.dialects.Upraised = Upraised;
  Markdown.buildBlockOrder ( Upraised.block );
  Markdown.buildInlinePatterns( Markdown.dialects.Upraised.inline );

  return Upraised;
});
