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

  Upraised.block.sectionHeader = function sectionHeader( block, next ) {
    var m = block.match( /^([@$]\w+)\s*(.*?)\s*(?:\n|$)/ );

    if ( !m )
      return undefined;

    var element;

    if (m[1][0] === '$') {
      element = 'section';
    } else {
      element = 'field';
    }

    element += '-' + m[1].slice(1);

    var header = [ element ];

    if (m[2]) {
      header.push({
        'data-value': m[2]
      });
    }
    // Array.prototype.push.apply(header, this.processInline(m[ 2 ]));

    if ( m[0].length < block.length )
      next.unshift( mk_block( block.substr( m[0].length ), block.trailing, block.lineNumber + 2 ) );

    return [ header ];
  },


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

  var problemStepOrAnswerSchema = {
    'field-image': true,
    p: true,
    ul: true,
    ol: true
  };

  var conceptOrStrategySchema = {
    'field-title': true,
    'field-image': true,
    'field-tease': true,
    'section-introduction': {
      p: true,
      ul: true,
      ol: true
    },
    'section-explanation': {
      'section-problem': problemStepOrAnswerSchema,
      'section-step': problemStepOrAnswerSchema,
      'section-answer': problemStepOrAnswerSchema
    }
  };

  var stdSchema = {
    'section-strategy': conceptOrStrategySchema,
    'section-concept': conceptOrStrategySchema,
    '*': true
  };

  function markError (node) {
    var attrs;
    if (typeof node[1] === 'object') {
      attrs = node[1];
    } else {
      attrs = {};
      node.splice(1, 0, attrs);
    }
    if (attrs.class) {
      attrs.class += ' error';
    } else {
      attrs.class = 'error';
    }
  }

  function buildTree (html) {

    console.error('buildTree called');

    var i, nodes, node;
    var j;
    var stack = [[docSchema, ['html']]];
    var schema, target;

    nodes = html.slice(1);

    for (i = 0; i < nodes.length; i++) {
      node = nodes[i];

      for (j = stack.length - 1; j >= 0; j--) {
        schema = stack[j][0];
        subSchema = schema[node[0]] || schema['*'];
        if (subSchema) break;
      }

      if (!subSchema) {
        // continue at same level, adding an error class to node
        markError(node);
        stack[stack.length - 1][1].push(node);
      } else {
        // reset level, based on closest schema match
        stack = stack.slice(0, j + 1);
        stack[stack.length - 1][1].push(node);
        if (typeof subSchema === 'object') {
          stack.push([subSchema, node]);
        }
      }
    }
    console.error(JSON.stringify(stack[0][1], null, 4));
    return stack[0][1];
  }

  Upraised.buildTree = buildTree;

  Markdown.dialects.Upraised = Upraised;
  Markdown.buildBlockOrder ( Upraised.block );
  Markdown.buildInlinePatterns( Markdown.dialects.Upraised.inline );

  return Upraised;
});
