SourceFile
  = ws decls:List__TopLevelDeclaration ws
    {
      decls.forEach(d => (d.root = true));
      return { kind: "source", decls };
    }

TopLevelDeclaration
  = ImportDeclaration
  / TreeDeclaration

ImportDeclaration
  = "import" ws body:(x:ImportBody ws "from" ws { return x; })? module:string
    { return { kind: "import", body, module }; }

ImportBody
  = defaultName:Identifier
    { return { kind: "default", defaultName }; }
  / "*" ws "as" ws name:Identifier
    { return { kind: "namespace", name }; }
  / "{" ws bindings:CommaList__NameBinding ws "}"
    { return { kind: "bindings", bindings }; }

NameBinding
  = name:Identifier newName:(ws "as" ws x:Identifier { return x; })?
    { return [name, newName]; }

TreeDeclaration
  = cs:DecoratorChain?
    "tree" ws name:PascalCaseIdentifier ws
    "{" ws decls:List__TreeSubDeclaration ws "}"
    { return { kind: "tree", name, decorators: cs || [], decls, root: false }; }

TreeSubDeclaration
  = TreeDeclaration
  / NodeDeclaration
  / UnionDeclaration
  / PropertyDeclaration

UnionDeclaration
  = cs:DecoratorChain?
    "union" ws name:PascalCaseIdentifier ws
    "{" ws decls:List__UnionSubDeclaration ws "}"
    { return { kind: "union", name, decorators: cs || [], decls }; }

UnionSubDeclaration
  = TreeDeclaration
  / NodeDeclaration

NodeDeclaration
  = cs:DecoratorChain?
    "node" ws name:PascalCaseIdentifier ws
    decls:("{" ws ds:List__PropertyDeclaration ws "}" { return ds; })?
    { return { kind: "node", name, decorators: cs || [], decls: decls || [] }; }

PropertyDeclaration
  = cs:DecoratorChain?
    name:CamelCaseIdentifier ws ":" ws type:Type
    { return { kind: "prop", name, decorators: cs || [], type }; }

Type
  = head:PostfixType tail:(ws "|" ws item:PostfixType { return item; })*
    { return tail.length === 0 ? head : { kind: "union", choices: [head].concat(tail) }; }

PostfixType
  = type:AtomType makers:(
        "[]" { return t => ({ kind: "array", element: t }); }
      / "?" { return t => ({ kind: "optional", type: t }); }
    )*
    { return makers.reduce((t, f) => f(t), type); }

AtomType
  = "(" pair:(
      ws head:Type
      tail:(ws "," ws item:Type { return item; })* ws comma:","?
      {
        const elements = [head].concat(tail);
        if (!comma && elements.length === 1) {
          return [false, elements[0]];
        }
        return [true, { kind: "tuple", elements }];
      }
    )? ")"
    returnType:(ws "=>" ws x:Type { return x; })?
    {
      const [isTuple, ts] = pair ? pair : [true, { kind: "tuple", elements: [] }];
      if (returnType) {
        return { kind: "function", argumentTypes: isTuple ? ts.elements : ts, returnType };
      }
      return ts;
    }
  / TypeName
  / NodeDeclaration

TypeName
  = "boolean"
  / "number"
  / "string"
  / PascalCaseIdentifier

// Decorator
// =========

DecoratorChain
  = head:Decorator ws tail:(item:Decorator ws { return item; })*
    { return [head].concat(tail); }

Decorator
  = "@" name:CamelCaseIdentifier "(" ws args:List__JSON_text? ws ")"
    { return { kind: "decorator", name, args: args || [] }; }

// Identifier
// ==========

PascalCaseIdentifier "PascalCase identifier"
  = [A-Z][A-Za-z0-9_]*
    { return text(); }

CamelCaseIdentifier "camelCase identifier"
  = [a-z][A-Za-z0-9_]*
    { return text(); }

Identifier "identifier"
  = [a-zA-Z_][a-zA-Z0-9_]*
    { return text(); }

// List
// ====

List__TopLevelDeclaration
  = head:TopLevelDeclaration
    tail:(ws item:TopLevelDeclaration { return item; })*
    { return [head].concat(tail); }

List__TreeSubDeclaration
  = head:TreeSubDeclaration
    tail:(ws item:TreeSubDeclaration { return item; })*
    { return [head].concat(tail); }

List__UnionSubDeclaration
  = head:UnionSubDeclaration
    tail:(ws item:UnionSubDeclaration { return item; })*
    { return [head].concat(tail); }

List__PropertyDeclaration
  = head:PropertyDeclaration
    tail:(ws item:PropertyDeclaration { return item; })*
    { return [head].concat(tail); }

List__JSON_text
  = head:JSON_text
    tail:(ws "," ws item:JSON_text { return item; })*
    { return [head].concat(tail); }

CommaList__NameBinding
  = head:NameBinding
    tail:(ws "," ws item:NameBinding { return item; })*
    { return [head].concat(tail); }

// JSON Grammar
// ============
//
// Based on the grammar from RFC 7159 [1].
//
// Note that JSON is also specified in ECMA-262 [2], ECMA-404 [3], and on the
// JSON website [4] (somewhat informally). The RFC seems the most authoritative
// source, which is confirmed e.g. by [5].
//
// [1] http://tools.ietf.org/html/rfc7159
// [2] http://www.ecma-international.org/publications/standards/Ecma-262.htm
// [3] http://www.ecma-international.org/publications/standards/Ecma-404.htm
// [4] http://json.org/
// [5] https://www.tbray.org/ongoing/When/201x/2014/03/05/RFC7159-JSON

// ----- 2. JSON Grammar -----

JSON_text
  = ws value:value ws { return value; }

begin_array     = ws "[" ws
begin_object    = ws "{" ws
end_array       = ws "]" ws
end_object      = ws "}" ws
name_separator  = ws ":" ws
value_separator = ws "," ws

ws "whitespace" = [ \t\n\r]*

// ----- 3. Values -----

value
  = false
  / null
  / true
  / object
  / array
  / number
  / string

false = "false" { return false; }
null  = "null"  { return null;  }
true  = "true"  { return true;  }

// ----- 4. Objects -----

object
  = begin_object
    members:(
      head:member
      tail:(value_separator m:member { return m; })*
      {
        var result = {};

        [head].concat(tail).forEach(function(element) {
          result[element.name] = element.value;
        });

        return result;
      }
    )?
    end_object
    { return members !== null ? members: {}; }

member
  = name:string name_separator value:value {
      return { name: name, value: value };
    }

// ----- 5. Arrays -----

array
  = begin_array
    values:(
      head:value
      tail:(value_separator v:value { return v; })*
      { return [head].concat(tail); }
    )?
    end_array
    { return values !== null ? values : []; }

// ----- 6. Numbers -----

number "number"
  = minus? int frac? exp? { return parseFloat(text()); }

decimal_point
  = "."

digit1_9
  = [1-9]

e
  = [eE]

exp
  = e (minus / plus)? DIGIT+

frac
  = decimal_point DIGIT+

int
  = zero / (digit1_9 DIGIT*)

minus
  = "-"

plus
  = "+"

zero
  = "0"

// ----- 7. Strings -----

string "string"
  = quotation_mark chars:char* quotation_mark { return chars.join(""); }

char
  = unescaped
  / escape
    sequence:(
        '"'
      / "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
    { return sequence; }

escape
  = "\\"

quotation_mark
  = '"'

unescaped
  = [^\0-\x1F\x22\x5C]

// ----- Core ABNF Rules -----

// See RFC 4234, Appendix B (http://tools.ietf.org/html/rfc4234).
DIGIT  = [0-9]
HEXDIG = [0-9a-f]i