/*jslint plusplus: false, evil: true, regexp: false */

ns('REA.helpers.haml', function (ns) {

  ns.compileHaml = function (templateId) {

    var tokeniser = new ns.Tokeniser(templateId);
    var outputBuffer = new ns.Buffer();
    var elementStack = [];

    var result = '  with(context) {\n    var html = "";\n';

    // HAML -> TEMPLATELINE* EOF
    tokeniser.getNextToken();
    while (!tokeniser.token.eof) {
      ns.templateLine(tokeniser, elementStack, outputBuffer);
    }

    outputBuffer.append(ns.closeElements(0, elementStack));
    outputBuffer.flush();
    result += outputBuffer.output();

    result += '    return html;\n}\n';

    return new Function('context', result);
  };

  // TEMPLATELINE -> WS* [ELEMENT][IDSELECTOR][CLASSSELECTORS][ATTRIBUTES] [SLASH|CONTENTS] (EOL|EOF)
  ns.templateLine = function (tokeniser, elementStack, outputBuffer) {
    var indent = ns.whitespace(tokeniser);
    var ident = ns.element(tokeniser);
    var id = ns.idSelector(tokeniser);
    var classes = ns.classSelector(tokeniser);
    var attrList = ns.attributeList(tokeniser);

    var currentParsePoint = tokeniser.currentParsePoint();
    var attributesHash = ns.attributeHash(tokeniser);

    var selfClosingTag = false;
    if (tokeniser.token.slash) {
      selfClosingTag = true;
      tokeniser.getNextToken();
    }

    outputBuffer.append(ns.closeElements(indent, elementStack));
    if (ident.length > 0 || id.length > 0 || classes.length > 0) {
      ns.openElement(currentParsePoint, indent, ident, id, classes, attrList, attributesHash, elementStack,
        outputBuffer, selfClosingTag);
    } else if (!tokeniser.token.eol && !tokeniser.token.ws) {
      tokeniser.pushBackToken();
    }

    var contents = tokeniser.skipToEOLorEOF();
    ns.eolOrEof(tokeniser);

    if (!selfClosingTag && contents.length > 0) {
      if (contents.match(/^\\%/)) {
        contents = contents.substring(1);
      }
      var i = indent;
      if (ident.length > 0) {
        i += 1;
      }
      outputBuffer.append(ns.indentText(i) + contents + '\\n');
    }
  };

  ns.attributeHash = function (tokeniser) {
    var attr = '';
    if (tokeniser.token.attributeHash) {
      attr = tokeniser.token.tokenString;
      tokeniser.getNextToken();
    }
    return attr;
  };

  // ATTRIBUTES -> ( ATTRIBUTE* )
  ns.attributeList = function (tokeniser) {
    var attrList = {};
    if (tokeniser.token.openBracket) {
      tokeniser.getNextToken();
      while (!tokeniser.token.closeBracket) {
        var attr = ns.attribute(tokeniser);
        if (attr) {
          attrList[attr.name] = attr.value;
        } else {
          tokeniser.getNextToken();
        }
      }
      tokeniser.getNextToken();
    }
    return attrList;
  };

  // ATTRIBUTE -> IDENTIFIER WS* = WS* STRING
  ns.attribute = function (tokeniser) {
    var attr = null;

    if (tokeniser.token.identifier) {
      var name = tokeniser.token.tokenString;
      tokeniser.getNextToken();
      ns.whitespace(tokeniser);
      if (!tokeniser.token.equal) {
        throw tokeniser.parseError("Expected '=' after attribute name");
      }
      tokeniser.getNextToken();
      ns.whitespace(tokeniser);
      if (!tokeniser.token.string && !tokeniser.token.identifier) {
        throw tokeniser.parseError("Expected a quoted string or an identifier for the attribute value");
      }
      attr = {name: name, value: tokeniser.token.tokenString};
      tokeniser.getNextToken();
    }

    return attr;
  };

  ns.closeElement = function (indent, elementStack) {
    var html = '';
    if (elementStack[indent]) {
      html += ns.indentText(indent) + '</' + elementStack[indent].tag + '>\\n';
      elementStack[indent] = null;
    }
    return html;
  };

  ns.closeElements = function (indent, elementStack) {
    var result = '';
    for (var i = elementStack.length - 1; i >= indent; (i--)) {
      result += ns.closeElement(i, elementStack);
    }
    return result;
  };

  ns.openElement = function (currentParsePoint, indent, ident, id, classes, attributeList, attributeHash,
                             elementStack, outputBuffer, selfClosingTag) {
    var element = ident;
    if (element.length === 0) {
      element = 'div';
    }

    outputBuffer.append(ns.indentText(indent) + '<' + element);
    if (attributeHash.length > 0) {
      outputBuffer.flush();
      outputBuffer.appendToOutputBuffer('    html += REA.helpers.haml.generateElementAttributes(context, "' +
        id + '", ["' +
        classes.join('","') + '"], ' +
        JSON.stringify(attributeList) + ', ' +
        (attributeHash.length > 0 ? '"' + ns.escapeJs(attributeHash) + '"' : 'null') + ', ' +
        currentParsePoint.lineNumber + ', ' + currentParsePoint.characterNumber + ', "' +
        ns.escapeJs(currentParsePoint.currentLine) + '");\n');
    } else {
      outputBuffer.append(ns.escapeJs(ns.generateElementAttributes(null, id, classes, attributeList, null,
        currentParsePoint.lineNumber, currentParsePoint.characterNumber, currentParsePoint.currentLine)));
    }
    if (selfClosingTag) {
      outputBuffer.append("/>\\n");
    } else {
      outputBuffer.append(">\\n");
      elementStack[indent] = { tag: element };
    }
  };

  ns.escapeJs = function (jsStr) {
    return jsStr.replace(/"/g, '\\"');
  };

  ns.combineAttributes = function (attributes, attrName, attrValue) {
    if (attrValue) {
      if (attrName === 'id' && attrValue.toString().length > 0) {
        if (attributes && attributes.id instanceof Array) {
          attributes.id.unshift(attrValue);
        } else if (attributes && attributes.id) {
          attributes.id = [attributes.id, attrValue];
        } else if (attributes) {
          attributes.id = attrValue;
        } else {
          attributes = {id: attrValue};
        }
      }
      else if (attrName === 'class') {
        var classes = [];
        if (attrValue instanceof Array) {
          classes = classes.concat(attrValue);
        } else {
          classes.push(attrValue);
        }
        if (attributes && attributes['class']) {
          attributes['class'] = attributes['class'].concat(classes);
        } else if (attributes) {
          attributes['class'] = classes;
        } else {
          attributes = {'class': classes};
        }
      } else if (attrName !== 'id') {
        if (!attributes) {
          attributes = {};
        }
        attributes[attrName] = attrValue;
      }
    }
    return attributes;
  };

  ns.generateElementAttributes = function (context, id, classes, attrList, attrHash, lineNumber, characterNumber,
                                           currentLine) {
    var attributes = {};

    attributes = ns.combineAttributes(attributes, 'id', id);
    if (classes.length > 0 && classes[0].length > 0) {
      attributes = ns.combineAttributes(attributes, 'class', classes);
    }

    var attr;
    if (attrList) {
      for (attr in attrList) {
        if (attrList.hasOwnProperty(attr)) {
          attributes = ns.combineAttributes(attributes, attr, attrList[attr]);
        }
      }
    }

    if (attrHash && attrHash.length > 0) {
      try {
        attrHash = attrHash.replace('class:', '"class":');
        var hash = new Function('context', 'with(context) { return ' + attrHash + '; }').call(null, context);
        if (hash) {
          for (attr in hash) {
            if (hash.hasOwnProperty(attr)) {
              attributes = ns.combineAttributes(attributes, attr, hash[attr]);
            }
          }
        }
      } catch (e) {
        throw ns.templateError(lineNumber, characterNumber, currentLine, "Error evaluating attribute hash - " + e);
      }
    }

    var html = '';
    if (attributes) {
      for (attr in attributes) {
        if (attributes.hasOwnProperty(attr) && attributes[attr]) {
          if (attr === 'id' && attributes[attr] instanceof Array) {
            html += ' ' + attr + '="' + attributes[attr].join('-') + '"';
          } else if (attr === 'class' && attributes[attr] instanceof Array) {
            html += ' ' + attr + '="' + attributes[attr].join(' ') + '"';
          } else {
            html += ' ' + attr + '="' + ns.attrValue(attr, attributes[attr]) + '"';
          }
        }
      }
    }
    return html;
  };

  ns.attrValue = function (attr, value) {
    if (jQuery.inArray(attr, ['selected', 'checked', 'disabled']) >= 0) {
      return attr;
    } else {
      return value;
    }
  };

  ns.indentText = function (indent) {
    var text = '';
    for (var i = 0; i < indent; i++) {
      text += '  ';
    }
    return text;
  };

  ns.whitespace = function (tokeniser) {
    var indent = 0;
    if (tokeniser.token.ws) {
      indent = tokeniser.token.tokenString.length / 2;
      tokeniser.getNextToken();
    }
    return indent;
  };

  ns.element = function (tokeniser) {
    var ident = '';
    if (tokeniser.token.element) {
      ident = tokeniser.token.tokenString;
      tokeniser.getNextToken();
    }
    return ident;
  };

  ns.eolOrEof = function (tokeniser) {
    if (tokeniser.token.eol) {
      tokeniser.getNextToken();
    } else if (!tokeniser.token.eof) {
      throw tokeniser.parseError("Expected EOL or EOF");
    }
  };

  // IDSELECTOR = # ID
  ns.idSelector = function (tokeniser) {
    var id = '';
    if (tokeniser.token.idSelector) {
      id = tokeniser.token.tokenString;
      tokeniser.getNextToken();
    }
    return id;
  };

  // CLASSSELECTOR = (.CLASS)+
  ns.classSelector = function (tokeniser) {
    var classes = [];

    while (tokeniser.token.classSelector) {
      classes.push(tokeniser.token.tokenString);
      tokeniser.getNextToken();
    }

    return classes;
  };

  ns.templateError = function (lineNumber, characterNumber, currentLine, error) {
    var message = error + " at line " + lineNumber + " and character " + characterNumber +
          ":\n" + currentLine + '\n';
    for (var i = 0; i < characterNumber - 1; i++) {
      message += '-';
    }
    message += '^';
    return message;
  };

  ns.Tokeniser = function (templateId) {
    this.buffer = null;
    if (templateId) {
      var template = document.getElementById(templateId);
      if (template) {
        this.buffer = template.innerHTML;
      }
    }

    this.getNextToken = function () {
      this.token = null;
      if (this.buffer === null || this.buffer.length === 0) {
        this.token = { eof: true, token: 'EOF' };
      } else {
        this.initLine();

        if (!this.token) {
          var ch = this.buffer.charCodeAt(0);
          var ch1 = this.buffer.charCodeAt(1);
          if (this.buffer && (ch === 10 || ch === 13 && ch1 === 10)) {
            this.token = { eol: true, token: 'EOL' };
            if (ch === 13 && ch1 === 10) {
              this.advanceCharsInBuffer(2);
              this.token.matched = ch + ch1;
            } else {
              this.advanceCharsInBuffer(1);
              this.token.matched = ch;
            }
            this.characterNumber = 0;
            this.currentLine = this.getCurrentLine();
          }
        }

        if (!this.token) {
          var ws = this.buffer.match(/^\s+/);
          if (ws) {
            this.token = { ws: true, token: 'WS', tokenString: ws[0], matched: ws[0] };
            this.advanceCharsInBuffer(ws[0].length);
          }
        }

        if (!this.token) {
          var element = this.buffer.match(/^%[a-zA-Z][a-zA-Z0-9]*/);
          if (element) {
            this.token = { element: true, token: 'ELEMENT', tokenString: element[0].substring(1),
              matched: element[0] };
            this.advanceCharsInBuffer(element[0].length);
          }
        }

        if (!this.token) {
          var id = this.buffer.match(/^#[a-zA-Z_\-][a-zA-Z0-9_\-]*/);
          if (id) {
            this.token = { idSelector: true, token: 'ID', tokenString: id[0].substring(1), matched: id[0] };
            this.advanceCharsInBuffer(id[0].length);
          }
        }

        if (!this.token) {
          var c = this.buffer.match(/^\.[a-zA-Z0-9_\-]+/);
          if (c) {
            this.token = { classSelector: true, token: 'CLASS', tokenString: c[0].substring(1), matched: c[0] };
            this.advanceCharsInBuffer(c[0].length);
          }
        }

        if (!this.token) {
          var identifier = this.buffer.match(/^[a-zA-Z][a-zA-Z0-9]*/);
          if (identifier) {
            this.token = { identifier: true, token: 'IDENTIFIER', tokenString: identifier[0], matched: identifier[0] };
            this.advanceCharsInBuffer(identifier[0].length);
          }
        }

        if (!this.token) {
          var str = this.buffer.match(/^[\'][^\']*[\']/);
          if (!str) {
            str = this.buffer.match(/^[\"][^\"]*[\"]/);
          }
          if (str) {
            this.token = { string: true, token: 'STRING', tokenString: str[0].substring(1, str[0].length - 1),
              matched: str[0] };
            this.advanceCharsInBuffer(str[0].length);
          }
        }

        if (!this.token) {
          if (this.buffer && this.buffer.charAt(0) === '{') {
            var i = 0;
            var characterNumberStart = this.characterNumber;
            var lineNumberStart = this.lineNumber;
            while (i < this.buffer.length && this.buffer.charAt(i) !== '}') {
              i++;
            }
            if (i === this.buffer.length) {
              this.characterNumber = characterNumberStart + 1;
              this.lineNumber = lineNumberStart;
              throw this.parseError('Error parsing attribute hash - Did not find a terminating "}"');
            } else {
              this.token = { attributeHash: true, token: 'ATTRHASH', tokenString: this.buffer.substring(0, i + 1),
                matched: this.buffer.substring(0, i + 1) };
              this.advanceCharsInBuffer(i + 1);
            }
          }
        }

        if (!this.token) {
          if (this.buffer && this.buffer.charAt(0) === '(') {
            this.token = { openBracket: true, token: 'OPENBRACKET', tokenString: this.buffer.charAt(0),
              matched: this.buffer.charAt(0) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer && this.buffer.charAt(0) === ')') {
            this.token = { closeBracket: true, token: 'CLOSEBRACKET', tokenString: this.buffer.charAt(0),
              matched: this.buffer.charAt(0) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer && this.buffer.charAt(0) === '=') {
            this.token = { equal: true, token: 'EQUAL', tokenString: this.buffer.charAt(0),
              matched: this.buffer.charAt(0) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer && this.buffer.charAt(0) === '/') {
            this.token = { slash: true, token: 'SLASH', tokenString: this.buffer.charAt(0),
              matched: this.buffer.charAt(0) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (this.token === null) {
          this.token = { unknown: true, token: 'UNKNOWN' };
        }
      }
  //    console.log(this.token.token + ' ' + this.lineNumber + ':' + this.characterNumber +
  //      ' - [' + this.currentLine + ']');
      return this.token;
    };

    this.initLine = function () {
      if (!this.currentLine) {
        this.currentLine = this.getCurrentLine();
        this.lineNumber = 1;
        this.characterNumber = 0;
      }
    };

    this.getCurrentLine = function () {
      var line = this.buffer.match(/^[^\n]*/);
      if (line) {
        return line[0];
      }
      else {
        return '';
      }
    };

    this.parseError = function (error) {
      return ns.templateError(this.lineNumber, this.characterNumber, this.currentLine, error);
    };

    this.skipToEOLorEOF = function () {
      var text = '';

      if (!this.token.eof && !this.token.eol) {
        var line = this.buffer.match(/^[^\n]*/);
        if (line) {
          text = line[0];
          this.advanceCharsInBuffer(text.length);
          this.getNextToken();
        }
      }

      return text;
    };

    this.advanceCharsInBuffer = function (numChars) {
      for (var i = 0; i < numChars; i++) {
        var ch = this.buffer.charCodeAt(i);
        var ch1 = this.buffer.charCodeAt(i + 1);
        if (ch === 13 && ch1 === 10) {
          this.lineNumber++;
          this.characterNumber = 0;
          i++;
        } else if (ch === 10) {
          this.lineNumber++;
          this.characterNumber = 0;
        } else {
          this.characterNumber++;
        }
      }
      this.buffer = this.buffer.substring(numChars);
    };

    this.currentParsePoint = function () {
      return {
        lineNumber: this.lineNumber,
        characterNumber: this.characterNumber,
        currentLine: this.currentLine
      };
    };

    this.pushBackToken = function () {
      if (!this.token.unknown) {
        this.buffer = this.token.matched + this.buffer;
      }
    };
  };

  ns.Buffer = function () {
    this.buffer = '';
    this.outputBuffer = '';

    this.append = function (str) {
      if (str && str.length > 0) {
        this.buffer += str;
      }
    };

    this.appendToOutputBuffer = function (str) {
      if (str && str.length > 0) {
        this.outputBuffer += str;
      }
    };

    this.flush = function () {
      this.outputBuffer += '    html += "' + this.buffer + '";\n';
      this.buffer = '';
    };

    this.output = function () {
      return this.outputBuffer;
    };
  };
});